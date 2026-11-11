import { Legal } from "@/components/legal";
export const metadata = { title: "Terms of Service" };
export default function Terms() {
  return (
    <Legal title="Terms of Service" updated="[date]">
      <p>These terms govern your use of the [Business legal name] (&ldquo;we&rdquo;) website and services for CAT preparation. By creating an account or making a purchase you agree to them.</p>
      <h2>1. Accounts</h2><p>You must give accurate details and keep your password private. One account is for one person; sharing access or content is not allowed and may lead to suspension without refund.</p>
      <h2>2. Courses, tests and access</h2><p>A purchase gives you a personal, non-transferable right to use the course or test series for the access period shown at checkout. Content stays our property (or our licensors&rsquo;). You may not record, download, copy or redistribute videos, questions or solutions.</p>
      <h2>3. Payments</h2><p>Prices are in Indian Rupees and include applicable taxes unless stated. Payments are processed by [payment provider]. Coupons are subject to their own conditions.</p>
      <h2>4. Refunds</h2><p>See our Refund Policy.</p>
      <h2>5. Acceptable use</h2><p>Don&rsquo;t try to break, overload or access parts of the service you aren&rsquo;t entitled to, and don&rsquo;t post unlawful or abusive content in doubts or reports.</p>
      <h2>6. No guarantee of results</h2><p>We work hard on quality, but we can&rsquo;t guarantee any exam score, rank or admission.</p>
      <h2>7. Changes and termination</h2><p>We may update these terms and the service. We may suspend accounts that break these terms.</p>
      <h2>8. Contact</h2><p>[Business legal name], [registered address], [support email], [phone].</p>
      <h2>9. Governing law</h2><p>These terms are governed by the laws of India; courts at [city] have jurisdiction.</p>
    </Legal>
  );
}
