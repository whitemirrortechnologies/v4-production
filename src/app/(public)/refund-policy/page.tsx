import { Legal } from "@/components/legal";
export const metadata = { title: "Refund Policy" };
export default function Refunds() {
  return (
    <Legal title="Refund & Cancellation Policy" updated="[date]">
      <p>We want you to be confident before you buy. Most courses have free preview lectures and some tests are free.</p>
      <h2>Eligibility</h2><p>You can request a full refund within [7] days of purchase if you have watched less than [10%] of the course and haven&rsquo;t attempted more than [one] paid test. [Adjust these rules to your business.]</p>
      <h2>Not refundable</h2><ul><li>Requests after the refund window.</li><li>Accounts suspended for sharing access or content.</li><li>[Any other exclusions.]</li></ul>
      <h2>How to request</h2><p>Email [support email] from your registered address with your order date and course. We reply within [3] working days.</p>
      <h2>Processing</h2><p>Approved refunds go back to the original payment method within [5–7] working days. Your access ends when the refund is issued.</p>
    </Legal>
  );
}
