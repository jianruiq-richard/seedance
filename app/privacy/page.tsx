import { LegalMarkdownPage } from "../components/LegalMarkdownPage";
import { PageShell } from "../components/MarketingShell";

export const metadata = { title: "Privacy Policy | Seedance" };

const contactEmail = "contact@astromar.org";

const sections = [
  {
    title: "Information We Collect",
    body: ["We may collect the following categories of information:"],
    bullets: [
      "Account information, such as your email address, user ID, profile information, authentication status, credits, plan, and billing state.",
      "Generation content, such as prompts, selected models and settings, uploaded reference images, videos, audio files, generated outputs, job status, generation history, and download URLs.",
      "Payment and transaction information, such as plan or credit pack selected, payment status, invoices, and subscription identifiers. We do not store full payment card numbers.",
      "Usage and technical information, such as pages visited, device and browser information, IP address, timestamps, logs, errors, performance data, and interactions with the service.",
      "Communications you send to us, including support requests, feedback, and billing inquiries.",
    ],
  },
  {
    title: "How We Use Information",
    body: ["We use information to:"],
    bullets: [
      "provide, operate, maintain, and improve the service;",
      "process prompts, uploads, and generated images or videos;",
      "manage accounts, credits, subscriptions, billing, and refunds;",
      "save generation history and make outputs available for download;",
      "respond to support, security, billing, and product requests;",
      "detect abuse, prevent fraud, enforce policies, and secure the service;",
      "measure service performance, troubleshoot errors, and improve features;",
      "comply with legal obligations and respond to lawful requests.",
    ],
  },
  {
    title: "AI Processing and Uploaded Content",
    body: [
      "To generate images and videos, we may send your prompts, reference media, selected settings, and related job data to AI model providers, storage providers, and infrastructure providers.",
      "These providers process the data on our behalf or as otherwise described in their own terms.",
      "Please do not upload content that you do not have rights to use or that contains sensitive personal information unless it is necessary for your intended generation and lawful for you to provide.",
    ],
  },
  {
    title: "Cookies and Similar Technologies",
    body: [
      "We and our service providers may use cookies, local storage, pixels, and similar technologies for login, security, preferences, analytics, checkout, and product improvement.",
      "You can adjust cookie settings in your browser, but disabling cookies may affect account login, billing, and other core features.",
    ],
  },
  {
    title: "How We Share Information",
    body: ["We may share information with:"],
    bullets: [
      "service providers that support authentication, hosting, storage, AI generation, analytics, customer support, payments, and email delivery;",
      "payment processors for checkout, subscription, invoice, and refund handling;",
      "law enforcement, regulators, courts, or other parties when required by law;",
      "relevant parties in connection with a merger, acquisition, financing, reorganization, or sale of assets;",
      "other parties with your consent or at your direction.",
    ],
  },
  {
    title: "No Sale of Personal Information",
    body: [
      "We do not sell your personal information in the ordinary meaning of selling it for money.",
    ],
  },
  {
    title: "Data Retention",
    body: [
      "We retain information for as long as needed to provide the service, maintain accounts and generation history, meet legal and accounting requirements, resolve disputes, enforce agreements, and protect the service.",
      "You may request deletion of certain information, subject to legal, security, billing, and backup limitations.",
    ],
  },
  {
    title: "Security",
    body: [
      "We use reasonable administrative, technical, and organizational measures designed to protect information against unauthorized access, loss, misuse, or alteration.",
      "No online service, network, or storage system can be guaranteed to be completely secure.",
    ],
  },
  {
    title: "Your Choices and Rights",
    body: [
      "Depending on where you live, you may have rights to access, correct, delete, export, restrict, or object to certain processing of your personal information.",
      "You may also be able to withdraw consent where processing is based on consent. We may need to verify your identity before responding.",
    ],
  },
  {
    title: "Children",
    body: [
      "The service is not intended for children under 13, and we do not knowingly collect personal information from children under 13.",
      "If you believe a child has provided personal information to us, contact us and we will take appropriate steps to delete it.",
    ],
  },
  {
    title: "International Transfers",
    body: [
      "We may process and store information in the United States and other countries where we or our service providers operate.",
      "Privacy laws in those locations may differ from the laws where you live.",
    ],
  },
  {
    title: "Third-Party Links and Services",
    body: [
      "The service may link to third-party websites or use third-party checkout and account services.",
      "Their privacy practices are governed by their own policies. Please review those policies before providing information to third parties.",
    ],
  },
  {
    title: "Changes to This Policy",
    body: [
      "We may update this Privacy Policy from time to time. The updated version will be posted on this page with a new effective date.",
      "If we make material changes, we may provide additional notice where appropriate.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <PageShell>
      <LegalMarkdownPage
        contactEmail={contactEmail}
        intro={[
          "This Privacy Policy explains how Seedance collects, uses, shares, stores, and protects information when you use seedance.technology and our AI image and video generation services.",
        ]}
        lastUpdated="July 20, 2026"
        sections={sections}
        title="Privacy Policy"
      />
    </PageShell>
  );
}
