// Curated Google Fonts covering a real spread of brand personalities —
// geometric/tech, editorial/serif, warm/humanist — rather than an
// exhaustive dropdown of every font on Google Fonts.
export const BRAND_FONTS = [
  'Space Grotesk',
  'Inter',
  'Outfit',
  'Work Sans',
  'DM Sans',
  'Manrope',
  'Sora',
  'Archivo',
  'Poppins',
  'Montserrat',
  'Playfair Display',
  'Fraunces',
  'Lora',
  'Merriweather',
  'JetBrains Mono',
];

export function googleFontsHref(fonts) {
  const unique = Array.from(new Set(fonts.filter(Boolean)));
  if (!unique.length) return null;
  const families = unique
    .map((f) => `family=${encodeURIComponent(f)}:wght@400;500;600;700`)
    .join('&');
  return `https://fonts.googleapis.com/css2?${families}&display=swap`;
}
