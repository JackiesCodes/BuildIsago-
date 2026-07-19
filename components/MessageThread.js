'use client';

import { useActionState, useRef, useEffect } from 'react';
import { sendMessage } from '@/lib/actions/messages';

const initialState = { error: null };

export default function MessageThread({ projectId, messages, currentUserId }) {
  const action = sendMessage.bind(null, projectId);
  const [state, formAction, pending] = useActionState(action, initialState);
  const formRef = useRef(null);
  const threadRef = useRef(null);

  useEffect(() => {
    if (!pending && formRef.current) formRef.current.reset();
  }, [pending]);

  useEffect(() => {
    if (threadRef.current) threadRef.current.scrollTop = threadRef.current.scrollHeight;
  }, [messages]);

  return (
    <div>
      <div className="thread" ref={threadRef}>
        {!messages?.length && (
          <p style={{ color: 'var(--muted-2)', fontSize: '0.88rem' }}>No messages yet.</p>
        )}
        {messages?.map((m) => (
          <div key={m.id} className={`msg ${m.sender_id === currentUserId ? 'mine' : ''}`}>
            <div className="msg-meta">
              {m.sender_name || 'Someone'} · {new Date(m.created_at).toLocaleString()}
            </div>
            <div className="msg-body">{m.body}</div>
          </div>
        ))}
      </div>

      {state?.error && <div className="form-error">{state.error}</div>}

      <form action={formAction} ref={formRef} className="msg-form">
        <textarea name="body" placeholder="Write a message…" rows={1} required />
        <button type="submit" className="btn btn-primary btn-sm" disabled={pending}>
          {pending ? 'Sending…' : 'Send'}
        </button>
      </form>
    </div>
  );
}
