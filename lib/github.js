// Server-only. Reads public GitHub repo data via the unauthenticated
// REST API — no token stored anywhere, so this only ever works for
// public repos. Unauthenticated requests are rate-limited to 60/hour
// per source IP; the short revalidate window lets Next.js de-dupe
// repeat views instead of hitting GitHub on every page load.

const REVALIDATE_SECONDS = 120;

// Accepts "owner/repo", a full github.com URL, or a bare repo name plus
// owner — normalizes anything reasonable a user might paste.
export function parseRepoInput(input) {
  const trimmed = input?.trim();
  if (!trimmed) return null;

  const urlMatch = trimmed.match(/github\.com\/([^/\s]+)\/([^/\s#?]+)/i);
  if (urlMatch) {
    return { owner: urlMatch[1], repo: urlMatch[2].replace(/\.git$/, '') };
  }

  const shortMatch = trimmed.match(/^([^/\s]+)\/([^/\s]+)$/);
  if (shortMatch) {
    return { owner: shortMatch[1], repo: shortMatch[2].replace(/\.git$/, '') };
  }

  return null;
}

async function ghFetch(path) {
  const res = await fetch(`https://api.github.com${path}`, {
    headers: { Accept: 'application/vnd.github+json' },
    next: { revalidate: REVALIDATE_SECONDS },
  });
  return res;
}

export async function fetchRepoData(owner, repoName) {
  if (!owner || !repoName) return null;

  try {
    const repoRes = await ghFetch(`/repos/${owner}/${repoName}`);

    if (repoRes.status === 404) return { error: 'Repository not found (or private).' };
    if (repoRes.status === 403) return { error: 'GitHub rate limit hit — try again in a few minutes.' };
    if (!repoRes.ok) return { error: `GitHub returned an error (${repoRes.status}).` };

    const repo = await repoRes.json();

    const [commitsRes, issuesRes, pullsRes] = await Promise.all([
      ghFetch(`/repos/${owner}/${repoName}/commits?per_page=5`),
      ghFetch(`/repos/${owner}/${repoName}/issues?state=open&per_page=8`),
      ghFetch(`/repos/${owner}/${repoName}/pulls?state=open&per_page=5`),
    ]);

    const commits = commitsRes.ok ? await commitsRes.json() : [];
    const rawIssues = issuesRes.ok ? await issuesRes.json() : [];
    const pulls = pullsRes.ok ? await pullsRes.json() : [];

    // The /issues endpoint includes PRs — filter those out for true issues.
    const issues = rawIssues.filter((i) => !i.pull_request);

    return {
      error: null,
      repo: {
        fullName: repo.full_name,
        description: repo.description,
        htmlUrl: repo.html_url,
        stars: repo.stargazers_count,
        openIssues: repo.open_issues_count,
        defaultBranch: repo.default_branch,
        language: repo.language,
      },
      commits: commits.map((c) => ({
        sha: c.sha?.slice(0, 7),
        message: c.commit?.message?.split('\n')[0],
        author: c.commit?.author?.name,
        date: c.commit?.author?.date,
        url: c.html_url,
      })),
      issues: issues.map((i) => ({
        number: i.number,
        title: i.title,
        url: i.html_url,
        author: i.user?.login,
      })),
      pulls: pulls.map((p) => ({
        number: p.number,
        title: p.title,
        url: p.html_url,
        author: p.user?.login,
      })),
    };
  } catch (err) {
    console.error('GitHub fetch failed for', owner, repoName, err);
    return { error: 'Could not reach GitHub. Please try again.' };
  }
}
