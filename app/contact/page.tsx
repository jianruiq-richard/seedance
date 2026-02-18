export const metadata = { title: "Contact | Seedance" };

export default function ContactPage() {
  return (
    <main style={{ maxWidth: 860, margin: "40px auto", padding: 16, lineHeight: 1.7 }}>
      <h1>Contact</h1>
      <p>
        Email:{" "}
        <a href="mailto:support@seedance.technology">support@seedance.technology</a>
      </p>
    </main>
  );
} 