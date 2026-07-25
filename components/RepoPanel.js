import { IconExternalLink, IconGitBranch } from './icons';

export default function RepoPanel({ data }) {
  if (!data) return null;

  if (data.error) {
    return <div className="form-error" style={{ marginTop: 16 }}>{data.error}</div>;
  }

  const { repo, commits, issues, pulls } = data;

  return (
    <div className="devscope-repo-panel">
      <div className="devscope-repo-head">
        <div>
          <a href={repo.htmlUrl} target="_blank" rel="noreferrer" className="devscope-repo-name">
            <IconGitBranch /> {repo.fullName}
          </a>
          {repo.description && <p className="devscope-repo-desc">{repo.description}</p>}
        </div>
        <a href={repo.htmlUrl} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm">
          <IconExternalLink /> View on GitHub
        </a>
      </div>

      <div className="devscope-repo-stats">
        <span>{repo.stars} stars</span>
        <span>{repo.openIssues} open issues</span>
        {repo.language && <span>{repo.language}</span>}
        <span>default: {repo.defaultBranch}</span>
      </div>

      <div className="devscope-repo-columns">
        <div>
          <h5>Recent commits</h5>
          {!commits?.length && <p className="devscope-repo-empty">No commits found.</p>}
          <ul className="devscope-repo-list">
            {commits?.map((c) => (
              <li key={c.sha}>
                <a href={c.url} target="_blank" rel="noreferrer">
                  {c.message}
                </a>
                <span className="devscope-repo-meta">
                  {c.author} · {c.sha}
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h5>Open issues</h5>
          {!issues?.length && <p className="devscope-repo-empty">No open issues.</p>}
          <ul className="devscope-repo-list">
            {issues?.map((i) => (
              <li key={i.number}>
                <a href={i.url} target="_blank" rel="noreferrer">
                  #{i.number} {i.title}
                </a>
                <span className="devscope-repo-meta">{i.author}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h5>Open pull requests</h5>
          {!pulls?.length && <p className="devscope-repo-empty">No open PRs.</p>}
          <ul className="devscope-repo-list">
            {pulls?.map((p) => (
              <li key={p.number}>
                <a href={p.url} target="_blank" rel="noreferrer">
                  #{p.number} {p.title}
                </a>
                <span className="devscope-repo-meta">{p.author}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
