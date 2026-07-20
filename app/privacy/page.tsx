export const metadata = { title: "Privacy Policy | Seedance" };

const contactEmail = "contact@astromar.org";

export default function PrivacyPage() {
  return (
    <main style={{ maxWidth: 860, margin: "40px auto", padding: 16, lineHeight: 1.7 }}>
      <h1>Privacy Policy</h1>
      <p>Last updated: July 20, 2026</p>

      <p>
        This Privacy Policy explains how Seedance (&quot;we&quot;, &quot;us&quot;, or
        &quot;our&quot;) collects, uses, shares, stores, and protects information
        when you use seedance.technology and our AI image and video generation
        services.
      </p>

      <h2>Information We Collect</h2>
      <p>We may collect the following categories of information:</p>
      <ul>
        <li>
          Account information, such as your email address, user ID, profile
          information, authentication status, credits, plan, and billing state.
        </li>
        <li>
          Generation content, such as prompts, selected models and settings,
          uploaded reference images, videos, audio files, generated outputs, job
          status, generation history, and download URLs.
        </li>
        <li>
          Payment and transaction information, such as plan or credit pack
          selected, payment status, invoices, and subscription identifiers. We
          do not store full payment card numbers.
        </li>
        <li>
          Usage and technical information, such as pages visited, device and
          browser information, IP address, timestamps, logs, errors, performance
          data, and interactions with the service.
        </li>
        <li>
          Communications you send to us, including support requests, feedback,
          and billing inquiries.
        </li>
      </ul>

      <h2>How We Use Information</h2>
      <p>We use information to:</p>
      <ul>
        <li>provide, operate, maintain, and improve the service;</li>
        <li>process prompts, uploads, and generated images or videos;</li>
        <li>manage accounts, credits, subscriptions, billing, and refunds;</li>
        <li>save generation history and make outputs available for download;</li>
        <li>respond to support, security, billing, and product requests;</li>
        <li>detect abuse, prevent fraud, enforce policies, and secure the service;</li>
        <li>measure service performance, troubleshoot errors, and improve features;</li>
        <li>comply with legal obligations and respond to lawful requests.</li>
      </ul>

      <h2>AI Processing and Uploaded Content</h2>
      <p>
        To generate images and videos, we may send your prompts, reference
        media, selected settings, and related job data to AI model providers,
        storage providers, and infrastructure providers. These providers process
        the data on our behalf or as otherwise described in their own terms.
      </p>
      <p>
        Please do not upload content that you do not have rights to use or that
        contains sensitive personal information unless it is necessary for your
        intended generation and lawful for you to provide.
      </p>

      <h2>Cookies and Similar Technologies</h2>
      <p>
        We and our service providers may use cookies, local storage, pixels, and
        similar technologies for login, security, preferences, analytics,
        checkout, and product improvement. You can adjust cookie settings in
        your browser, but disabling cookies may affect account login, billing,
        and other core features.
      </p>

      <h2>How We Share Information</h2>
      <p>We may share information with:</p>
      <ul>
        <li>
          service providers that support authentication, hosting, storage, AI
          generation, analytics, customer support, payments, and email delivery;
        </li>
        <li>payment processors for checkout, subscription, invoice, and refund handling;</li>
        <li>law enforcement, regulators, courts, or other parties when required by law;</li>
        <li>
          relevant parties in connection with a merger, acquisition, financing,
          reorganization, or sale of assets;
        </li>
        <li>other parties with your consent or at your direction.</li>
      </ul>
      <p>
        We do not sell your personal information in the ordinary meaning of
        selling it for money.
      </p>

      <h2>Data Retention</h2>
      <p>
        We retain information for as long as needed to provide the service,
        maintain accounts and generation history, meet legal and accounting
        requirements, resolve disputes, enforce agreements, and protect the
        service. You may request deletion of certain information as described
        below, subject to legal, security, billing, and backup limitations.
      </p>

      <h2>Security</h2>
      <p>
        We use reasonable administrative, technical, and organizational measures
        designed to protect information against unauthorized access, loss,
        misuse, or alteration. No online service, network, or storage system can
        be guaranteed to be completely secure.
      </p>

      <h2>Your Choices and Rights</h2>
      <p>
        Depending on where you live, you may have rights to access, correct,
        delete, export, restrict, or object to certain processing of your
        personal information. You may also be able to withdraw consent where
        processing is based on consent. To make a request, contact us at{" "}
        <a href={`mailto:${contactEmail}`}>{contactEmail}</a>. We may need to
        verify your identity before responding.
      </p>

      <h2>Children</h2>
      <p>
        The service is not intended for children under 13, and we do not
        knowingly collect personal information from children under 13. If you
        believe a child has provided personal information to us, contact us and
        we will take appropriate steps to delete it.
      </p>

      <h2>International Transfers</h2>
      <p>
        We may process and store information in the United States and other
        countries where we or our service providers operate. Privacy laws in
        those locations may differ from the laws where you live.
      </p>

      <h2>Third-Party Links and Services</h2>
      <p>
        The service may link to third-party websites or use third-party checkout
        and account services. Their privacy practices are governed by their own
        policies. Please review those policies before providing information to
        third parties.
      </p>

      <h2>Changes to This Policy</h2>
      <p>
        We may update this Privacy Policy from time to time. The updated version
        will be posted on this page with a new effective date. If we make
        material changes, we may provide additional notice where appropriate.
      </p>

      <h2>Contact</h2>
      <p>
        Email:{" "}
        <a href={`mailto:${contactEmail}`}>{contactEmail}</a>
      </p>
    </main>
  );
}
