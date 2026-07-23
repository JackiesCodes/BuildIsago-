import './globals.css';

export const metadata = {
  title: 'BuildIsago Portal',
  description: 'Client portal and studio dashboard for BuildIsago projects.',
  icons: { icon: '/logo-icon.png' },
};

// Runs before first paint so the page never flashes the wrong theme.
// Mirrors lib/theme.js and site/index.html's boot script — same cookie
// name/format so the preference is shared with the marketing site once
// both are on subdomains of buildisago.com. Kept tiny and inline (not
// next/script, no import from lib/theme.js) so it blocks rendering
// until the <html> attribute is set, before React even loads.
const THEME_INIT_SCRIPT = `
(function () {
  try {
    function readCookie(name) {
      var m = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
      return m ? decodeURIComponent(m[1]) : null;
    }
    var pref = readCookie('bi-theme');
    if (pref !== 'light' && pref !== 'dark' && pref !== 'system') {
      var legacy = localStorage.getItem('theme');
      pref = (legacy === 'light' || legacy === 'dark') ? legacy : 'system';
    }
    var effective = (pref === 'light' || pref === 'dark')
      ? pref
      : (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
    document.documentElement.setAttribute('data-theme', effective);
    document.documentElement.setAttribute('data-theme-pref', pref);
  } catch (e) {}
})();
`;

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
