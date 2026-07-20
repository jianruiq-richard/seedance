import { LegalMarkdownPage } from "../components/LegalMarkdownPage";
import { PageShell } from "../components/MarketingShell";

export const metadata = { title: "Terms of Service | Seedance" };

const contactEmail = "contact@astromar.org";

const sections = [
  {
    title: "Acceptance of Terms",
    body: [
      "These Terms of Service govern your access to and use of Seedance and seedance.technology, including our AI video generation, AI image generation, reference upload, credit, billing, and related account features.",
      "By using the service, you agree to these Terms. If you do not agree, do not use the service.",
    ],
  },
  {
    title: "Changes to These Terms",
    body: [
      "We may update these Terms from time to time. The updated version will be posted on this page with a new effective date.",
      "Your continued use of the service after an update means you accept the revised Terms.",
    ],
  },
  {
    title: "Accounts and Eligibility",
    body: [
      "You are responsible for keeping your account credentials secure and for all activity under your account.",
      "You must provide accurate account and billing information and use the service only where permitted by applicable law.",
    ],
  },
  {
    title: "Credits, Billing, and Refunds",
    body: [
      "Certain generation features require credits or a paid plan. Estimated credit usage may be shown before generation, but final processing may vary based on selected model, resolution, duration, references, and other settings.",
      "Purchases, subscription management, and refund handling are subject to the checkout terms shown at purchase and our Refund Policy.",
    ],
  },
  {
    title: "User Content and AI Outputs",
    body: [
      "You may submit prompts, images, videos, audio, and other materials, referred to as User Content, to generate images or videos. You represent that you have the rights and permissions needed to submit that content and to use the resulting outputs.",
      "You keep any rights you have in your User Content. You grant us a limited license to host, process, transmit, store, and display User Content and generated outputs as needed to provide, secure, support, and improve the service.",
      "Generated outputs may not be unique, and similar or identical outputs may be generated for other users.",
    ],
  },
  {
    title: "Acceptable Use",
    body: ["You may not use the service to:"],
    bullets: [
      "violate laws, regulations, or third-party rights;",
      "upload or generate unlawful, harmful, abusive, or exploitative content;",
      "infringe copyrights, trademarks, privacy rights, or publicity rights;",
      "misrepresent generated media as real events or real endorsements;",
      "attempt to bypass safety, billing, rate limit, or access controls;",
      "probe, scrape, overload, reverse engineer, or disrupt the service;",
      "use the service to distribute malware, spam, fraud, or deceptive content.",
    ],
  },
  {
    title: "Service Content and Intellectual Property",
    body: [
      "The website, software, designs, interfaces, trademarks, logos, text, and other service materials are owned by us or our licensors.",
      "Except as expressly allowed by these Terms, you may not copy, modify, distribute, sell, or exploit the service or its materials.",
    ],
  },
  {
    title: "Third-Party Services",
    body: [
      "The service may rely on third-party providers for authentication, payment processing, hosting, storage, analytics, AI model inference, and other infrastructure.",
      "Your use of third-party websites, checkout pages, or linked services is governed by their own terms and policies. We are not responsible for third-party services that we do not control.",
    ],
  },
  {
    title: "Privacy",
    body: [
      "Our Privacy Policy explains how we collect and use information. By using the service, you also agree to our Privacy Policy.",
    ],
  },
  {
    title: "Service Availability and Changes",
    body: [
      "We may modify, suspend, limit, or discontinue any part of the service at any time.",
      "We do not guarantee that the service, generated outputs, storage, downloads, or third-party integrations will always be available, uninterrupted, secure, or error free.",
    ],
  },
  {
    title: "Disclaimers",
    body: [
      "The service and all generated outputs are provided as is and as available.",
      "We do not guarantee that outputs will be accurate, suitable for your intended use, legally safe for commercial use, non-infringing, or free from artifacts, errors, or moderation issues. You are responsible for reviewing outputs before using or publishing them.",
    ],
  },
  {
    title: "Limitation of Liability",
    body: [
      "To the fullest extent permitted by law, we will not be liable for indirect, incidental, special, consequential, exemplary, or punitive damages, or for lost profits, data, goodwill, or business opportunities.",
      "Our total liability for claims related to the service will not exceed the amount you paid to us for the service giving rise to the claim during the three months before the claim arose.",
    ],
  },
  {
    title: "Indemnification",
    body: [
      "You agree to defend, indemnify, and hold us harmless from claims, damages, liabilities, losses, and expenses arising from your use of the service, your User Content, your outputs, your violation of these Terms, or your violation of any law or third-party right.",
    ],
  },
  {
    title: "Termination",
    body: [
      "We may suspend or terminate your access if we believe you violated these Terms, created risk for the service or other users, or used the service unlawfully.",
      "You may stop using the service at any time.",
    ],
  },
  {
    title: "Governing Law",
    body: [
      "These Terms are governed by the laws of the State of California, without regard to conflict of law rules, unless applicable law requires a different governing law.",
    ],
  },
];

export default function TermsPage() {
  return (
    <PageShell>
      <LegalMarkdownPage
        contactEmail={contactEmail}
        intro={[
          "These Terms explain the rules for using Seedance and the responsibilities that apply when you access the service, generate media, upload references, or purchase credits.",
        ]}
        lastUpdated="July 20, 2026"
        sections={sections}
        title="Terms of Service"
      />
    </PageShell>
  );
}
