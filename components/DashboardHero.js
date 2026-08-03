'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { SERVICES } from '@/lib/constants/services';
import { startSelfServeProject } from '@/lib/actions/startProject';
import { IconArrowRight, IconChevronDown, IconSparkles } from './icons';

/**
 * The composer is the primary way in. It is not decoration: what you
 * type becomes the project's name, which is also why self-serve projects
 * stopped being called "Untitled branding".
 *
 * Self-serve creates the project and opens the matching studio.
 * Managed accounts brief the studio instead, so the same text is carried
 * into the brief form rather than silently dropped.
 */
export default function DashboardHero({ firstName, selfServe }) {
  const router = useRouter();
  const [value, setValue] = useState('');
  const [service, setService] = useState(SERVICES[0].value);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [error, setError] = useState(null);
  const [pending, startTransition] = useTransition();
  const pickerRef = useRef(null);
  const textareaRef = useRef(null);

  const activeService = SERVICES.find((s) => s.value === service) || SERVICES[0];

  useEffect(() => {
    if (!pickerOpen) return undefined;
    function onPointerDown(e) {
      if (!pickerRef.current?.contains(e.target)) setPickerOpen(false);
    }
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [pickerOpen]);

  // Grow with the text rather than scrolling inside a fixed box.
  function autoSize(el) {
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }

  function submit(e) {
    e?.preventDefault();
    const text = value.trim();
    if (!text || pending) return;
    setError(null);

    if (!selfServe) {
      router.push(
        `/dashboard/client/new?service=${service}&title=${encodeURIComponent(text.slice(0, 120))}`
      );
      return;
    }

    startTransition(async () => {
      const result = await startSelfServeProject(service, text);
      if (result?.error) setError(result.error);
    });
  }

  function onKeyDown(e) {
    // Enter sends, Shift+Enter breaks the line — the convention for a
    // composer rather than a form field.
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  return (
    <section className="hero">
      <div className="hero-orb" aria-hidden="true" />
      <p className="hero-eyebrow">Welcome back{firstName ? `, ${firstName}` : ''}</p>
      <h1 className="hero-title">Bring your ideas to life today</h1>

      <form className={`composer${pending ? ' is-busy' : ''}`} onSubmit={submit}>
        <div className="composer-input">
          <IconSparkles />
          <textarea
            ref={textareaRef}
            rows={1}
            value={value}
            placeholder="Describe what you want to build…"
            onChange={(e) => {
              setValue(e.target.value);
              autoSize(e.target);
            }}
            onKeyDown={onKeyDown}
            disabled={pending}
            aria-label="Describe what you want to build"
          />
        </div>

        <div className="composer-bar">
          <div className="composer-picker" ref={pickerRef}>
            <button
              type="button"
              className="composer-pill"
              onClick={() => setPickerOpen((v) => !v)}
              aria-expanded={pickerOpen}
              aria-haspopup="listbox"
              disabled={pending}
            >
              {activeService.shortLabel}
              <IconChevronDown />
            </button>
            {pickerOpen && (
              <ul className="composer-picker-menu" role="listbox">
                {SERVICES.map((s) => (
                  <li key={s.value}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={s.value === service}
                      className={s.value === service ? 'active' : ''}
                      onClick={() => {
                        setService(s.value);
                        setPickerOpen(false);
                      }}
                    >
                      <span>{s.label}</span>
                      <span className="composer-picker-desc">{s.description}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <button
            type="submit"
            className="composer-send"
            disabled={pending || !value.trim()}
            aria-label={selfServe ? 'Open studio' : 'Continue'}
          >
            <IconArrowRight />
          </button>
        </div>
      </form>

      {error && <p className="composer-error">{error}</p>}
    </section>
  );
}
