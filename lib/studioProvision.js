// Opening a studio should put you in the studio. Previously a project
// with no kit/scope yet showed a "Create Brand Kit" gate instead, so the
// first thing you met after clicking through was a button, not the tool.
//
// These run during render, so they deliberately do NOT call
// revalidatePath the way the server actions do — that throws mid-render.
// They only touch the database and hand back the row.
//
// project_id is UNIQUE on both tables, so two concurrent first-visits
// can't produce duplicates: the loser's insert conflicts and we re-read
// the winner's row.

const BRAND_KIT_COLUMNS =
  'id, project_id, colors, heading_font, body_font, tagline, voice_tone, share_token, updated_at';

const DEV_SCOPE_COLUMNS =
  'id, project_id, features, tech_stack, phases, risks, repo_owner, repo_name, updated_at';

const DEFAULT_COLORS = [
  { name: 'Primary', hex: '#0b8b9e' },
  { name: 'Accent', hex: '#2cc6d3' },
  { name: 'Ink', hex: '#0c1b21' },
];

async function ensure(supabase, { table, columns, projectId, userId, defaults }) {
  const existing = await supabase.from(table).select(columns).eq('project_id', projectId).maybeSingle();
  if (existing.data) return { data: existing.data, error: null };
  // A read failure is not an absent row — inserting here could mask a
  // permissions or connectivity problem, so surface it instead.
  if (existing.error) return { data: null, error: existing.error };

  const inserted = await supabase
    .from(table)
    .insert({ project_id: projectId, created_by: userId, ...defaults })
    .select(columns)
    .maybeSingle();
  if (inserted.data) return { data: inserted.data, error: null };

  // Lost the race (or RLS blocked the insert) — re-read before giving up.
  const retry = await supabase.from(table).select(columns).eq('project_id', projectId).maybeSingle();
  if (retry.data) return { data: retry.data, error: null };
  return { data: null, error: inserted.error || retry.error };
}

export function ensureBrandKit(supabase, projectId, userId) {
  return ensure(supabase, {
    table: 'project_brand_kits',
    columns: BRAND_KIT_COLUMNS,
    projectId,
    userId,
    defaults: { colors: DEFAULT_COLORS },
  });
}

export function ensureDevScope(supabase, projectId, userId) {
  return ensure(supabase, {
    table: 'project_dev_scopes',
    columns: DEV_SCOPE_COLUMNS,
    projectId,
    userId,
    defaults: {},
  });
}
