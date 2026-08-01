import Link from 'next/link';

export const metadata = {
  title: 'Privacy Policy',
  description: 'How BuildIsago collects, uses, and protects your information.',
};

// Draft — reflects the product's actual data practices as of this
// writing, but has not been reviewed by a lawyer. Treat as a starting
// point, not a compliance guarantee, before relying on it in production
// (GDPR/CCPA specifics, retention schedules, and jurisdiction all need a
// real review pass).
export default function PrivacyPage() {
  return (
    <div className="store-page">
      <div className="container" style={{ maxWidth: 760, padding: '60px 32px 100px' }}>
        <Link href="/" className="back-link">
          &larr; Back to BuildIsago
        </Link>
        <h1 style={{ marginTop: 24 }}>Privacy Policy</h1>
        <p style={{ color: 'var(--muted-2)', fontSize: '0.85rem', marginBottom: 32 }}>Last updated: 2026</p>

        <div style={{ color: 'var(--muted)', lineHeight: 1.75 }}>
          <p>
            This policy describes how BuildIsago (&quot;we,&quot; &quot;us&quot;) collects, uses, and shares
            information when you use our client portal, studio dashboard, storefront, Academy, Marketplace, and
            Ventures pages (together, the &quot;Service&quot;).
          </p>

          <h2>Information we collect</h2>
          <p>
            <strong>Account information:</strong> name, email address, company, and password (stored by our
            authentication provider, never in plain text).
          </p>
          <p>
            <strong>Project content:</strong> files, designs, messages, and other material you or the studio upload
            in connection with a project.
          </p>
          <p>
            <strong>Payment information:</strong> processed directly by Stripe — we never see or store your full
            card number. We retain the resulting transaction records (amount, date, invoice/order reference).
          </p>
          <p>
            <strong>Usage information:</strong> pages visited and actions taken within the Service, used for
            security (e.g. rate-limiting sign-in attempts) and to operate the product.
          </p>

          <h2>How we use it</h2>
          <p>
            To provide the Service (host your projects, process payments, send the emails you&apos;d expect —
            invoices, approvals, messages); to secure accounts (detect abuse, enforce rate limits); and, if you use
            the AI drafting feature, to generate a first draft of your project brief.
          </p>

          <h2>Who we share it with</h2>
          <p>We don&apos;t sell your information. We share what&apos;s necessary with the services that run the product:</p>
          <ul>
            <li><strong>Supabase</strong> — database, authentication, and file storage.</li>
            <li><strong>Stripe</strong> — payment processing for invoices, digital products, courses, and retainers.</li>
            <li><strong>Resend</strong> — transactional email (invoice notices, messages, approval requests).</li>
            <li><strong>Anthropic</strong> — generates an AI first-draft project brief, only when you use that feature.</li>
          </ul>
          <p>Each of these processes data only as needed to provide their part of the Service.</p>

          <h2>Data retention</h2>
          <p>
            We keep account and project data for as long as your account is active. You can request deletion of
            your account and associated data by contacting us — some records (e.g. completed transactions) may be
            retained longer where we have a legal or accounting obligation to do so.
          </p>

          <h2>Your choices</h2>
          <p>
            You can update your profile information from Settings at any time, enable two-factor authentication,
            and request a copy or deletion of your data by contacting us.
          </p>

          <h2>Contact</h2>
          <p>Questions about this policy? Reach us at the contact details on our homepage.</p>
        </div>
      </div>
    </div>
  );
}
