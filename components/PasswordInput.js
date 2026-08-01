'use client';

import { useId, useState } from 'react';
import { IconEye, IconEyeOff } from './icons';

export default function PasswordInput({ id, label, hint, ...inputProps }) {
  const [visible, setVisible] = useState(false);
  const generatedId = useId();
  const inputId = id || generatedId;

  return (
    <div className="field">
      {label && <label htmlFor={inputId}>{label}</label>}
      <div className="password-field">
        <input id={inputId} type={visible ? 'text' : 'password'} {...inputProps} />
        <button
          type="button"
          className="password-toggle"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Hide password' : 'Show password'}
          aria-pressed={visible}
        >
          {visible ? <IconEyeOff /> : <IconEye />}
        </button>
      </div>
      {hint && <p className="field-hint">{hint}</p>}
    </div>
  );
}
