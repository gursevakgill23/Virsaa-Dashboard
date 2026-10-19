/**
 * Avatar — shows a profile photo, or the person's initials when there is no
 * photo (or it fails to load). Only http(s) URLs are ever rendered.
 */
import React, { useState } from 'react';
import { safeUrl } from '../../api/client';
import styles from './Avatar.module.css';

/** "Gursevak Singh" → "GS", "guri" → "G" */
const initialsOf = (name) =>
  String(name || '?')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('') || '?';

const Avatar = ({ src, name, size = 40 }) => {
  const [failed, setFailed] = useState(false);
  const url = safeUrl(src);
  const showImage = url && !failed;

  return (
    <span className={styles.avatar} style={{ width: size, height: size, fontSize: size * 0.38 }}>
      {showImage ? (
        <img src={url} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(true)} />
      ) : (
        <span aria-hidden="true">{initialsOf(name)}</span>
      )}
      <span className="sr-only">{name}</span>
    </span>
  );
};

export default Avatar;
