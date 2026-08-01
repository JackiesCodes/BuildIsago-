import Link from 'next/link';

export const metadata = {
  title: 'Terms of Service',
  description: 'The terms that govern your use of BuildIsago.',
};

// Draft — a reasonable starting point covering the product's actual
// features, but has not been reviewed by a lawyer. Governing law,
// liability limits, and dispute resolution in particular need real
// legal review before this is relied on in production.
export default function TermsPage() {
  return (
    <div className="store-page">
      <div className="container" style={{ maxWidth: 760, padding: '60px 32px 100px' }}>
        <Link href="/" className="back-link">
          &larr; Back to BuildIsago
        </Link>
        <h1 style={{ marginTop: 24 }}>Terms of Service</h1>
        <p style={{ color: 'var(--muted-2)', fontSize: '0.85rem', marginBottom: 32 }}>Last updated: 2026</p>

        <div style={{ color: 'var(--muted)', lineHeight: 1.75 }}>
          <p>By creating an account or using BuildIsago (the &quot;Service&quot;), you agree to these terms.</p>

          <h2>The Service</h2>
          <p>
            BuildIsago provides a client portal and studio dashboard for design and development projects, a
            storefront for digital products, courses (Academy), a freelance talent marketplace, and a startup
            portfolio (Ventures). Some features involve payment via Stripe, either one-time or recurring.
          </p>

          <h2>Accounts</h2>
          <p>
            You&apos;re responsible for keeping your login credentials secure and for all activity under your
            account. We recommend enabling two-factor authentication in Settings. Notify us immediately if you
            suspect unauthorized access.
          </p>

          <h2>Payments</h2>
          <p>
            Prices are shown at the time of purchase. One-time purchases (invoices, digital products, course
            enrollment) and recurring retainers are processed by Stripe. Refunds, where issued, are handled at the
            studio&apos;s discretion unless otherwise required by law.
          </p>

          <h2>Content you provide</h2>
          <p>
            You retain ownership of the files, messages, and material you upload. You grant us the limited right
            to store and display it back to you and, where applicable, the studio or talent you&apos;re working
            with, solely to operate the Service.
          </p>

          <h2>Marketplace and Ventures</h2>
          <p>
            The Marketplace connects clients with independent talent, and Ventures reflects startups the studio is
            independently evaluating or has invested in. BuildIsago facilitates the introduction in both cases but
            is not a party to, and does not guarantee the outcome of, any resulting engagement or investment.
          </p>

          <h2>Acceptable use</h2>
          <p>
            Don&apos;t use the Service to violate the law, infringe on others&apos; rights, or attempt to gain
            unauthorized access to accounts or systems. We may suspend accounts that do.
          </p>

          <h2>Disclaimer and liability</h2>
          <p>
            The Service is provided &quot;as is.&quot; To the extent permitted by law, BuildIsago is not liable for
            indirect or consequential damages arising from your use of the Service.
          </p>

          <h2>Changes</h2>
          <p>We may update these terms from time to time. Continued use of the Service after a change constitutes acceptance.</p>

          <h2>Contact</h2>
          <p>Questions about these terms? Reach us at the contact details on our homepage.</p>
        </div>
      </div>
    </div>
  );
}
