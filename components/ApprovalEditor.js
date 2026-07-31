'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { updateApproval, sendApproval, deleteApproval } from '@/lib/actions/approvals';
import ApprovalStatusBadge from './ApprovalStatusBadge';

export default function ApprovalEditor({ approval, projectId, designs }) {
  const router = useRouter();
  const [title, setTitle] = useState(approval.title || '');
  const [description, setDescription] = useState(approval.description || '');
  const [designId, setDesignId] = useState(approval.design_id || '');

  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(approval.updated_at);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState(null);

  const isDraft = approval.status === 'draft';
  const linkedDesign = designs?.find((d) => d.id === approval.design_id);

  async function handleSave() {
    setSaving(true);
    setError(null);
    const result = await updateApproval(approval.id, projectId, { title, description, designId });
    setSaving(false);
    if (result?.error) setError(result.error);
    else setSavedAt(new Date().toISOString());
  }

  function handleSend() {
    if (!confirm('Send this to the client for approval? It can no longer be edited after sending.')) return;
    setError(null);
    startTransition(async () => {
      const result = await sendApproval(approval.id, projectId);
      if (result?.error) setError(result.error);
      else router.refresh();
    });
  }

  function handleDelete() {
    if (!confirm('Delete this draft request? This cannot be undone.')) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteApproval(approval.id, projectId);
      if (result?.error) setError(result.error);
      else router.push(`/dashboard/studio/${projectId}/approvals`);
    });
  }

  return (
    <div className="card">
      <div className="brand-section-head">
        <h3>{isDraft ? title || 'Approval request' : approval.title}</h3>
        <ApprovalStatusBadge status={approval.status} />
      </div>

      {isDraft ? (
        <>
          <div className="field">
            <label>Title</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Homepage design direction" />
          </div>
          <div className="field">
            <label>What needs approval</label>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what you'd like the client to review and sign off on."
            />
          </div>
          {designs?.length > 0 && (
            <div className="field">
              <label>Link a design (optional)</label>
              <select value={designId} onChange={(e) => setDesignId(e.target.value)}>
                <option value="">No design linked</option>
                {designs.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.title}
                  </option>
                ))}
              </select>
            </div>
          )}
        </>
      ) : (
        <>
          <p className="invoice-notes">{approval.description}</p>
          {linkedDesign && (
            <p style={{ marginBottom: 16 }}>
              <Link href={`/design/${projectId}/${linkedDesign.id}`} className="devscope-repo-name" style={{ fontSize: '0.9rem' }}>
                View linked design: {linkedDesign.title}
              </Link>
            </p>
          )}
          {approval.status !== 'pending' && (
            <div className="approval-decision">
              <span className="approval-decision-label">
                {approval.status === 'approved' ? 'Approved' : 'Changes requested'}
                {approval.decided_at ? ` · ${new Date(approval.decided_at).toLocaleString()}` : ''}
              </span>
              {approval.feedback && <p className="approval-feedback">{approval.feedback}</p>}
            </div>
          )}
        </>
      )}

      {error && (
        <div className="form-error" style={{ marginTop: 16 }}>
          {error}
        </div>
      )}

      {isDraft && (
        <div className="brand-footer-actions" style={{ marginTop: 20 }}>
          <button type="button" className="btn btn-primary" style={{ width: 'auto' }} onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save draft'}
          </button>
          <button type="button" className="btn btn-ghost" style={{ width: 'auto' }} onClick={handleSend} disabled={pending}>
            {pending ? 'Sending…' : 'Send for approval'}
          </button>
          <button type="button" className="btn btn-danger" onClick={handleDelete} disabled={pending}>
            Delete
          </button>
          <span className="design-save-status">
            {savedAt ? `Saved ${new Date(savedAt).toLocaleString()}` : 'Not saved yet'}
          </span>
        </div>
      )}
      {approval.status === 'pending' && (
        <p className="field-hint" style={{ marginTop: 20 }}>Waiting on the client to approve or request changes.</p>
      )}
    </div>
  );
}
