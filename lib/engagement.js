// Engagement mode is an account-level choice: a client either runs the
// studios themselves ('self_serve') or has the BuildIsago team work their
// projects ('managed'). Self-serve accounts don't need Approvals,
// Invoices or Retainers cluttering every project.
//
// Two deliberate constraints:
//
//   1. 'managed' is the default, so every account that existed before
//      this shipped behaves exactly as it did.
//   2. A tab is never hidden when it actually has something in it. If the
//      studio invoices a self-serve client, that client must still be
//      able to see the invoice — hiding a bill from the person who owes
//      it would be a billing bug, not a tidier UI.

export const MANAGED_TABS = ['invoices', 'approvals', 'retainers'];

/**
 * True when this viewer is running the tools themselves, so the
 * studio-collaboration surfaces (talking to the studio, the studio's
 * milestones, the brief they work from) are noise rather than content.
 * Studio staff are never self-serve.
 */
export function isSelfServe(profile) {
  return profile?.role !== 'studio' && profile?.engagement_mode === 'self_serve';
}

/**
 * Same safety net as the tabs: a section is hidden only when it is also
 * empty. If the studio has sent a message, shared a file or set
 * milestones, that stays visible whatever mode the account is in —
 * hiding real correspondence would lose it, not tidy it.
 */
export function showManagedSection(selfServe, hasContent) {
  return !selfServe || Boolean(hasContent);
}

const TAB_TABLES = {
  invoices: 'project_invoices',
  approvals: 'project_approvals',
  retainers: 'project_retainers',
};

/**
 * Which project tabs to hide for this viewer.
 * Studio staff always see everything.
 */
export async function hiddenProjectTabs(supabase, { projectId, profile }) {
  if (profile?.role === 'studio') return [];
  if (profile?.engagement_mode !== 'self_serve') return [];

  // Only self-serve accounts pay for these lookups; managed accounts —
  // the default — return above without touching the database.
  const counts = await Promise.all(
    MANAGED_TABS.map(async (tab) => {
      const { count, error } = await supabase
        .from(TAB_TABLES[tab])
        .select('id', { count: 'exact', head: true })
        .eq('project_id', projectId)
        .neq('status', 'draft');
      // On error, keep the tab. Hiding it because a count failed could
      // conceal real financial records.
      return { tab, hasAny: error ? true : (count ?? 0) > 0 };
    })
  );

  return counts.filter((c) => !c.hasAny).map((c) => c.tab);
}
