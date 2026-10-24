/**
 * ArcadeDataEditor — the `data` object of an arcade item. The inputs change
 * with the chosen game (see config/arcade.js). Keys the editor doesn't show
 * (e.g. looks_like) are kept as they are.
 */
import React from 'react';
import { ARCADE_FIELDS, isArcadeFieldVisible } from '../../config/arcade';
import styles from './Form.module.css';

const ArcadeDataEditor = ({ gameKey, value, values, onChange, disabled }) => {
  const data = value && typeof value === 'object' ? value : {};
  const specs = ARCADE_FIELDS[gameKey];

  if (!gameKey) return <p className={styles.listEmpty}>Choose the game first.</p>;
  if (!specs) return <p className={styles.listEmpty}>This game has no editable content.</p>;

  const set = (key, v) => onChange({ ...data, [key]: v });

  return (
    <div className={styles.subgrid}>
      {specs
        .filter((spec) => isArcadeFieldVisible(spec, data, values))
        .map((spec) => {
          const id = `arcade-${spec.key}`;
          const v = data[spec.key];
          const wide = ['textarea', 'clues'].includes(spec.type);
          const label = (
            <label htmlFor={id} className={styles.label}>
              {spec.label}
              {spec.required && <span className={styles.required} aria-hidden="true">*</span>}
            </label>
          );

          let control;
          if (spec.type === 'checkbox') {
            return (
              <div key={spec.key} className={styles.field}>
                <label className={styles.switchRow} htmlFor={id}>
                  <input id={id} type="checkbox" className={styles.switchInput} checked={Boolean(v)} onChange={(e) => set(spec.key, e.target.checked)} disabled={disabled} />
                  <span className={styles.switch} aria-hidden="true" />
                  <span className={styles.switchLabel}>{spec.label}</span>
                </label>
              </div>
            );
          }
          if (spec.type === 'clues') {
            const clues = [0, 1, 2, 3].map((i) => (Array.isArray(v) ? v[i] || '' : ''));
            control = (
              <div className={styles.clues}>
                {clues.map((clue, i) => (
                  <input
                    key={i}
                    id={i === 0 ? id : undefined}
                    className={styles.input}
                    value={clue}
                    placeholder={`Clue ${i + 1}${i === 0 ? ' (hardest)' : i === 3 ? ' (easiest)' : ''}`}
                    onChange={(e) => set(spec.key, clues.map((c, j) => (j === i ? e.target.value : c)))}
                    disabled={disabled}
                    aria-label={`Clue ${i + 1}`}
                  />
                ))}
              </div>
            );
          } else if (spec.type === 'select') {
            control = (
              <select id={id} className={styles.input} value={v ?? ''} onChange={(e) => set(spec.key, e.target.value)} disabled={disabled}>
                <option value="">Select…</option>
                {spec.options.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            );
          } else if (spec.type === 'textarea') {
            control = <textarea id={id} className={styles.input} rows={3} value={v ?? ''} onChange={(e) => set(spec.key, e.target.value)} disabled={disabled} />;
          } else {
            control = (
              <input
                id={id}
                className={`${styles.input} ${spec.type === 'gurmukhi' ? styles.gurmukhi : ''}`}
                lang={spec.type === 'gurmukhi' ? 'pa' : undefined}
                type={spec.type === 'number' ? 'number' : 'text'}
                step={spec.step}
                min={spec.min}
                max={spec.max}
                value={v ?? ''}
                placeholder={spec.placeholder}
                onChange={(e) => set(spec.key, e.target.value)}
                disabled={disabled}
              />
            );
          }

          return (
            <div key={spec.key} className={`${styles.field} ${wide ? styles.fieldFull : ''}`}>
              {label}
              {control}
              {spec.hint && <small className={styles.hint}>{spec.hint}</small>}
            </div>
          );
        })}
    </div>
  );
};

export default ArcadeDataEditor;
