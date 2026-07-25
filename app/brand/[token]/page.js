import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { googleFontsHref } from '@/lib/constants/brandFonts';
import { contrastGrade, contrastRatio } from '@/lib/utils/contrast';

export default async function PublicBrandGuidelinesPage({ params }) {
  const { token } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase.rpc('get_public_brand_kit', { p_token: token }).maybeSingle();

  if (error || !data) notFound();

  const colors = data.colors || [];
  const fontsHref = googleFontsHref([data.heading_font, data.body_font]);

  return (
    <div className="guidelines-page">
      {fontsHref && <link rel="stylesheet" href={fontsHref} />}

      <div className="guidelines-container">
        <p className="guidelines-eyebrow">Brand Guidelines</p>
        <h1 className="guidelines-title" style={{ fontFamily: `'${data.heading_font}', sans-serif` }}>
          {data.project_title}
        </h1>
        {data.tagline && <p className="guidelines-tagline">{data.tagline}</p>}

        {data.voice_tone && (
          <section className="guidelines-section">
            <h2>Voice &amp; Tone</h2>
            <p>{data.voice_tone}</p>
          </section>
        )}

        {colors.length > 0 && (
          <section className="guidelines-section">
            <h2>Color Palette</h2>
            <div className="guidelines-colors">
              {colors.map((c, i) => {
                const vsWhite = contrastGrade(contrastRatio(c.hex, '#ffffff'));
                return (
                  <div className="guidelines-color-card" key={i}>
                    <div className="guidelines-color-swatch" style={{ background: c.hex }} />
                    <div className="guidelines-color-info">
                      <span className="guidelines-color-name">{c.name}</span>
                      <span className="guidelines-color-hex">{c.hex.toUpperCase()}</span>
                      <span className={vsWhite.pass ? 'contrast-pass' : 'contrast-fail'}>
                        {vsWhite.label} on white
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        <section className="guidelines-section">
          <h2>Typography</h2>
          <div className="guidelines-type-sample">
            <p className="guidelines-type-heading" style={{ fontFamily: `'${data.heading_font}', sans-serif` }}>
              {data.heading_font}
            </p>
            <span className="guidelines-type-label">Heading</span>
          </div>
          <div className="guidelines-type-sample">
            <p className="guidelines-type-body" style={{ fontFamily: `'${data.body_font}', sans-serif` }}>
              {data.body_font} — the quick brown fox jumps over the lazy dog.
            </p>
            <span className="guidelines-type-label">Body</span>
          </div>
        </section>

        <p className="guidelines-footer">
          Last updated {new Date(data.updated_at).toLocaleDateString()} · Built with BuildIsago
        </p>
      </div>
    </div>
  );
}
