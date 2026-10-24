/**
 * ListEditor — repeatable rows for list fields: ebook/audiobook chapters,
 * history sections and sources. Columns come from the field's `itemFields`.
 * Rows can be added, removed and moved; the API replaces the whole list.
 */
import React from 'react';
import { FaPlus, FaTrashAlt, FaArrowUp, FaArrowDown } from 'react-icons/fa';
import styles from './Form.module.css';

const MAX_ROWS = 300;

const emptyRow = (itemFields) => Object.fromEntries(itemFields.map((c) => [c.name, c.type === 'checkbox' ? false : '']));

const ListEditor = ({ field, value, onChange, disabled }) => {
  const rows = Array.isArray(value) ? value : [];
  const { itemFields } = field;

  const update = (index, name, v) => onChange(rows.map((row, i) => (i === index ? { ...row, [name]: v } : row)));
  const remove = (index) => onChange(rows.filter((_, i) => i !== index));
  const move = (index, dir) => {
    const target = index + dir;
    if (target < 0 || target >= rows.length) return;
    const next = rows.slice();
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  // Text areas take the full row width; short inputs sit side by side
  const hasTextarea = itemFields.some((c) => c.type === 'textarea');

  return (
    <div className={styles.listEditor}>
      {rows.length === 0 && <p className={styles.listEmpty}>None yet.</p>}

      {rows.map((row, index) => (
        <fieldset key={index} className={styles.listRow} disabled={disabled}>
          <legend className="sr-only">
            {field.label} {index + 1}
          </legend>
          <span className={styles.listIndex} aria-hidden="true">
            {index + 1}
          </span>

          <div className={`${styles.listFields} ${hasTextarea ? styles.listFieldsStacked : ''}`}>
            {itemFields.map((col) => {
              const id = `${field.name}-${index}-${col.name}`;
              if (col.type === 'checkbox') {
                return (
                  <label key={col.name} htmlFor={id} className={styles.listCheck}>
                    <input id={id} type="checkbox" checked={Boolean(row[col.name])} onChange={(e) => update(index, col.name, e.target.checked)} />
                    {col.label}
                  </label>
                );
              }
              const common = {
                id,
                className: styles.input,
                value: row[col.name] ?? '',
                placeholder: col.placeholder || col.label,
                onChange: (e) => update(index, col.name, e.target.value),
                'aria-label': `${field.label} ${index + 1}: ${col.label}`,
              };
              return (
                <div key={col.name} className={`${styles.listCell} ${col.type === 'textarea' ? styles.listCellWide : ''}`}>
                  {col.type === 'textarea' ? (
                    <textarea {...common} rows={4} />
                  ) : (
                    <input {...common} type={col.type === 'number' ? 'number' : col.type === 'url' ? 'url' : 'text'} min={col.min} />
                  )}
                </div>
              );
            })}
          </div>

          <div className={styles.listTools}>
            <button type="button" onClick={() => move(index, -1)} disabled={index === 0} aria-label={`Move ${field.label} ${index + 1} up`}>
              <FaArrowUp />
            </button>
            <button type="button" onClick={() => move(index, 1)} disabled={index === rows.length - 1} aria-label={`Move ${field.label} ${index + 1} down`}>
              <FaArrowDown />
            </button>
            <button type="button" onClick={() => remove(index)} aria-label={`Delete ${field.label} ${index + 1}`}>
              <FaTrashAlt />
            </button>
          </div>
        </fieldset>
      ))}

      <button type="button" className={styles.addRow} onClick={() => onChange([...rows, emptyRow(itemFields)])} disabled={disabled || rows.length >= MAX_ROWS}>
        <FaPlus aria-hidden="true" /> {field.addLabel || 'Add row'}
      </button>
    </div>
  );
};

export default ListEditor;
