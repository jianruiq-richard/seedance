export const metadata = { title: "Privacy Policy | Seedance" };

export default function PrivacyPage() {
  return (
    <main style={{ maxWidth: 860, margin: "40px auto", padding: 16, lineHeight: 1.7 }}>
      <h1>Privacy Policy</h1>
      <p>Last updated: 2026-02-18</p>

      <p>
        This Privacy Policy describes how Seedance (“we”, “us”) collects, uses, and shares
        information when you use seedance.technology.
      </p>

      <h2>Information we collect</h2>
      <ul>
        <li>Information you provide (e.g., email) when you sign up or contact us</li>
        <li>Usage data (e.g., pages visited, device/browser information)</li>
      </ul>

      <h2>How we use information</h2>
      <ul>
        <li>Provide and improve the service</li>
        <li>Security, fraud prevention, and debugging</li>
        <li>Communicate with you about the service</li>
      </ul>

      <h2>Contact</h2>
      <p>
        Email:{" "}
        <a href="mailto:support@seedance.technology">support@seedance.technology</a>
      </p>
    </main>
  );
}