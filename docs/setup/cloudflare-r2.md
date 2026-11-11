# Cloudflare R2 setup (video storage)

V4 stores **all lecture videos** in a private Cloudflare R2 bucket. Everything else lives in Supabase.
This takes about 15 minutes in the Cloudflare dashboard. You then run one script to confirm it works.

> **Never paste the keys into chat, commit them to git, or put them in screenshots.**
> They go only in `.env.local` on your machine, and later in the hosting provider's
> environment-variable settings.

---

## Step 1: Create a Cloudflare account and enable R2

1. Sign up at <https://dash.cloudflare.com/sign-up> (or log in to the account V4 will use).
2. In the left sidebar open **R2 Object Storage**.
3. Click **Purchase R2 Plan / Enable R2** and add a payment method.
   - Cloudflare requires a card even for the free tier. **You are not charged** while usage stays
     within the free monthly allowance:

   | Free every month | What it covers for V4 |
   |---|---|
   | 10 GB stored | ~20 hours of 720p lectures at the recommended encoding (~450 MB/h) |
   | 1 million "Class A" operations (uploads, lists) | Far more than admin uploads will need |
   | 10 million "Class B" operations (reads) | Video playback requests |
   | **Egress (students watching): always free** | No bandwidth bill, ever |

   Above 10 GB: about **$0.015 per GB per month** (≈ ₹1.3/GB).

4. **Optional, recommended:** under **Manage Account → Billing → Notifications**, add a billing
   alert (e.g. $1) so you're told before anything is charged.

## Step 2: Create the bucket

1. **R2 Object Storage → Create bucket**
2. Settings:
   | Field | Value |
   |---|---|
   | Bucket name | `v4-videos` |
   | Location | **Automatic**, with location hint **Asia-Pacific (APAC)** (closest to Indian students) |
   | Default storage class | **Standard** (don't pick Infrequent Access, which charges per read) |
3. Click **Create bucket**.
4. Open the bucket → **Settings** and make sure it stays **private**:
   - **Public Development URL (r2.dev): Disabled**
   - **Custom Domains: none** for now

   V4 never exposes the bucket publicly. Students only get presigned links that expire, and only
   after the app checks their enrollment.

## Step 3: CORS policy (lets the admin browser upload directly)

Bucket → **Settings → CORS Policy → Add CORS policy** and paste:

```json
[
  {
    "AllowedOrigins": ["http://localhost:3000"],
    "AllowedMethods": ["GET", "HEAD", "PUT"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag", "Content-Length", "Content-Range"],
    "MaxAgeSeconds": 3600
  }
]
```

- `PUT` is for uploads. `ETag` must be exposed so large uploads can be sent in parts.
- `Content-Range` is needed for seeking in the video player.
- **When the site goes live**, add the real domain to `AllowedOrigins`, e.g.
  `"https://v4.example.com"`. Don't use `"*"`.

## Step 4: Lifecycle rule (clean up failed uploads)

Bucket → **Settings → Object lifecycle rules**:

- Make sure there's a rule that **aborts incomplete multipart uploads after 1 day**. Edit the
  default rule if one exists, otherwise add it with scope "entire bucket".
  This stops half-finished uploads (closed tab, lost Wi-Fi) from quietly using storage.
- **Don't** add any "delete objects after N days" rule.

## Step 5: Create an API token (S3 keys for the V4 server)

1. **R2 Object Storage → Manage R2 API Tokens** (top right of the R2 overview) → **Create API token**
   (choose **Account API token** if asked).
2. Settings:
   | Field | Value |
   |---|---|
   | Token name | `v4-server` |
   | Permissions | **Object Read & Write** (not Admin) |
   | Specify bucket(s) | **Apply to specific buckets only → `v4-videos`** |
   | TTL | Forever (or a long date you'll remember to rotate) |
   | Client IP filtering | Leave empty |
3. Click **Create API Token**. **The secret is shown only once.** Copy these four values
   straight into `.env.local` (Step 6):

   | Shown as | Goes into |
   |---|---|
   | Access Key ID | `R2_ACCESS_KEY_ID` |
   | Secret Access Key | `R2_SECRET_ACCESS_KEY` |
   | Endpoint for S3 clients: `https://<ACCOUNT_ID>.r2.cloudflarestorage.com` | the `<ACCOUNT_ID>` part → `R2_ACCOUNT_ID` |
   | Bucket name | `R2_BUCKET=v4-videos` |

   (Your Account ID is also shown on the R2 overview page, right-hand side.)

## Step 6: Put the keys in `.env.local` and run the check

On your computer, in the repo folder:

```bash
cp .env.example .env.local
```

Edit `.env.local` and fill in the four `R2_*` values. Leave `R2_ENDPOINT` empty for real R2.
`.env.local` is git-ignored.

```bash
npm install
```

```bash
npm run r2:check
```

Expected output: every line `✔` and `All R2 checks passed`. The script:

1. connects to the bucket with your token
2. uploads a test file using a presigned PUT URL (what the admin browser will do)
3. uploads a test file using a multipart upload (what large lecture videos will use)
4. downloads with a presigned GET URL, including a byte-range request (needed for seeking)
5. confirms the bucket **isn't** publicly readable without a signature
6. sends a CORS preflight as `http://localhost:3000` and checks R2 allows it
7. deletes all its test files

If a step fails, the script prints what to fix (usually the CORS policy or the token's bucket scope).

## Later: going live

- Put the same `R2_*` variables in the hosting provider's environment settings.
- Add the production domain to the CORS `AllowedOrigins`.
- Rotate the token if it was ever shared or exposed: create a new one, update the env, then
  delete the old one.
