export const metadata = { title: "Terms of Service | Seedance" };

export default function TermsPage() {
  return (
    <main style={{ maxWidth: 860, margin: "40px auto", padding: 16, lineHeight: 1.7 }}>
      <h1>Terms of Service</h1>
      <p>Last updated: 2026-02-18</p>

      <h2>Acceptance</h2>
      <p>By accessing or using seedance.technology, you agree to these Terms.</p>

      <h2>Use of the service</h2>
      <ul>
        <li>You must comply with applicable laws.</li>
        <li>You may not misuse, disrupt, or attempt to access the service unlawfully.</li>
      </ul>

      <h2>Disclaimer</h2>
      <p>The service is provided “as is” without warranties of any kind.</p>

      <h2>Contact</h2>
      <p>
        Email:{" "}
        <a href="mailto:support@seedance.technology">support@seedance.technology</a>
      </p>
    </main>
  );
}