import { Legal } from "@/components/legal";
export const metadata = { title: "Privacy Policy" };
export default function Privacy() {
  return (
    <Legal title="Privacy Policy" updated="[date]">
      <p>This policy explains what personal data [Business legal name] collects, why, and your rights, including under India&rsquo;s Digital Personal Data Protection Act, 2023.</p>
      <h2>What we collect</h2><ul><li>Account details: name, email, phone (optional).</li><li>Learning activity: lectures watched, practice answers, test attempts and scores.</li><li>Purchases: order amounts and payment references (card details are handled by [payment provider], never stored by us).</li><li>Technical data: device and log information needed to run and secure the service.</li></ul>
      <h2>Why we use it</h2><p>To provide courses, practice and tests; show your progress and analytics; process payments; send service emails (like password resets); and keep the service secure.</p>
      <h2>Who we share it with</h2><p>Service providers that host and operate the platform on our behalf: Supabase (database and storage), Vercel (hosting), [payment provider], [email provider]. We don&rsquo;t sell your data. Leaderboards show your name and score to other students who took the same test.</p>
      <h2>Retention</h2><p>We keep your data while your account is active and for [period] afterwards, unless the law requires longer (for example, payment records).</p>
      <h2>Your rights</h2><p>You can access, correct or delete your data, or withdraw consent, by writing to [privacy email]. Grievance officer: [name, email].</p>
      <h2>Children</h2><p>If you are under 18, use the service with a parent&rsquo;s or guardian&rsquo;s consent.</p>
      <h2>Contact</h2><p>[Business legal name], [address], [privacy email].</p>
    </Legal>
  );
}
