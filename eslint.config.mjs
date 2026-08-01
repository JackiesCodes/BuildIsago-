import nextConfig from 'eslint-config-next';

const config = [
  ...nextConfig,
  {
    ignores: ['site/**'],
  },
  {
    rules: {
      // Flags syncing local state from an external source (a DOM
      // attribute set by the theme boot script, a URL search param) on
      // mount — a legitimate, deliberate pattern used consistently across
      // ThemeToggle/TopBar/MfaSettings, not a bug. Kept visible as a
      // warning rather than silenced outright.
      'react-hooks/set-state-in-effect': 'warn',
    },
  },
];

export default config;
