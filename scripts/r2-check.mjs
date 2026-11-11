#!/usr/bin/env node
// Verifies the Cloudflare R2 bucket is configured the way V4 needs it.
// Usage: npm run r2:check   (reads .env.local)
// Creates a few small test objects under _r2-check/ and deletes them at the end.

import {
  S3Client,
  HeadBucketCommand,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomBytes } from "node:crypto";

const env = process.env;
const required = ["R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET"];
const missing = required.filter((k) => !env[k]);
if (!env.R2_ENDPOINT && !env.R2_ACCOUNT_ID) missing.push("R2_ACCOUNT_ID");
if (missing.length) {
  console.error(`✘ Missing in .env.local: ${missing.join(", ")}`);
  console.error("  See docs/setup/cloudflare-r2.md, Step 5–6.");
  process.exit(1);
}

const endpoint = env.R2_ENDPOINT || `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
const bucket = env.R2_BUCKET;
const origin = env.APP_ORIGIN || "http://localhost:3000";
const s3 = new S3Client({
  region: "auto",
  endpoint,
  forcePathStyle: true,
  credentials: { accessKeyId: env.R2_ACCESS_KEY_ID, secretAccessKey: env.R2_SECRET_ACCESS_KEY },
});

const runId = `${Date.now()}-${randomBytes(3).toString("hex")}`;
const prefix = `_r2-check/${runId}`;
const created = [];
let failures = 0;

async function step(name, fn, hint) {
  try {
    const note = await fn();
    console.log(`✔ ${name}${note ? ` — ${note}` : ""}`);
    return true;
  } catch (err) {
    failures++;
    console.log(`✘ ${name}\n    ${err?.name ?? "Error"}: ${err?.message ?? err}`);
    if (hint) console.log(`    Fix: ${hint}`);
    return false;
  }
}

console.log(`R2 check → bucket "${bucket}" at ${endpoint}\n`);

const connected = await step(
  "Connect to bucket with API token",
  async () => {
    await s3.send(new HeadBucketCommand({ Bucket: bucket }));
  },
  "Check R2_ACCOUNT_ID, the key pair, the bucket name, and that the token is scoped to this bucket (Step 5)."
);

if (connected) {
  // 1. Presigned PUT — how the admin browser uploads small files.
  const putKey = `${prefix}/presigned-put.bin`;
  const payload = randomBytes(64 * 1024);
  await step(
    "Upload via presigned PUT URL",
    async () => {
      const url = await getSignedUrl(
        s3,
        new PutObjectCommand({ Bucket: bucket, Key: putKey, ContentType: "video/mp4" }),
        { expiresIn: 300 }
      );
      const res = await fetch(url, {
        method: "PUT",
        body: payload,
        headers: { "Content-Type": "video/mp4" },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
      created.push(putKey);
      return `${payload.length / 1024} KB`;
    },
    'Token needs "Object Read & Write" permission.'
  );

  // 2. Multipart upload with presigned part URLs — how large lecture videos are uploaded.
  const mpKey = `${prefix}/multipart.bin`;
  await step(
    "Upload via multipart (2 parts, presigned)",
    async () => {
      const { UploadId } = await s3.send(
        new CreateMultipartUploadCommand({ Bucket: bucket, Key: mpKey, ContentType: "video/mp4" })
      );
      try {
        const parts = [randomBytes(5 * 1024 * 1024), randomBytes(256 * 1024)]; // min part = 5 MiB
        const done = [];
        for (const [i, body] of parts.entries()) {
          const PartNumber = i + 1;
          const url = await getSignedUrl(
            s3,
            new UploadPartCommand({ Bucket: bucket, Key: mpKey, UploadId, PartNumber }),
            { expiresIn: 300 }
          );
          const res = await fetch(url, { method: "PUT", body });
          if (!res.ok) throw new Error(`part ${PartNumber}: HTTP ${res.status}`);
          const ETag = res.headers.get("etag");
          if (!ETag) throw new Error(`part ${PartNumber}: no ETag header returned`);
          done.push({ PartNumber, ETag });
        }
        await s3.send(
          new CompleteMultipartUploadCommand({
            Bucket: bucket,
            Key: mpKey,
            UploadId,
            MultipartUpload: { Parts: done },
          })
        );
        created.push(mpKey);
        return "5.25 MB";
      } catch (e) {
        await s3.send(new AbortMultipartUploadCommand({ Bucket: bucket, Key: mpKey, UploadId })).catch(() => {});
        throw e;
      }
    }
  );

  // 3. Presigned GET with Range — how the player streams and seeks.
  await step(
    "Download via presigned GET with byte range (seeking)",
    async () => {
      const url = await getSignedUrl(s3, new GetObjectCommand({ Bucket: bucket, Key: putKey }), {
        expiresIn: 300,
      });
      const res = await fetch(url, { headers: { Range: "bytes=100-199" } });
      if (res.status !== 206) throw new Error(`expected HTTP 206 Partial Content, got ${res.status}`);
      const got = Buffer.from(await res.arrayBuffer());
      if (!got.equals(payload.subarray(100, 200))) throw new Error("range bytes do not match upload");
      return "HTTP 206, bytes match";
    }
  );

  // 4. Bucket must be private.
  await step(
    "Bucket is private (unsigned request is refused)",
    async () => {
      const res = await fetch(`${endpoint}/${bucket}/${putKey}`);
      if (res.ok) throw new Error(`unsigned GET returned HTTP ${res.status} — object is publicly readable`);
      return `HTTP ${res.status}`;
    },
    "Disable the r2.dev public URL and remove public custom domains (Step 2.4)."
  );

  // 5. CORS preflight for the browser app.
  for (const method of ["PUT", "GET"]) {
    await step(
      `CORS allows ${method} from ${origin}`,
      async () => {
        const url = await getSignedUrl(
          s3,
          method === "PUT"
            ? new PutObjectCommand({ Bucket: bucket, Key: `${prefix}/cors.bin` })
            : new GetObjectCommand({ Bucket: bucket, Key: putKey }),
          { expiresIn: 300 }
        );
        const res = await fetch(url, {
          method: "OPTIONS",
          headers: {
            Origin: origin,
            "Access-Control-Request-Method": method,
            "Access-Control-Request-Headers": method === "PUT" ? "content-type" : "range",
          },
        });
        const allowOrigin = res.headers.get("access-control-allow-origin");
        if (!res.ok || (allowOrigin !== origin && allowOrigin !== "*")) {
          throw new Error(`preflight HTTP ${res.status}, Access-Control-Allow-Origin=${allowOrigin ?? "(none)"}`);
        }
        if (method === "PUT") {
          const expose = (res.headers.get("access-control-expose-headers") || "").toLowerCase();
          if (expose && !expose.includes("etag")) throw new Error("ETag is not in ExposeHeaders");
        }
      },
      `Add the CORS policy from Step 3 with "${origin}" in AllowedOrigins.`
    );
  }

  // Cleanup
  await step("Delete test objects", async () => {
    for (const Key of created) await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key }));
    return `${created.length} removed`;
  });
}

console.log(failures ? `\n✘ ${failures} check(s) failed.` : "\n✔ All R2 checks passed.");
process.exit(failures ? 1 : 0);
