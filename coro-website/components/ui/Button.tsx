import Link from 'next/link'; import type { ReactNode } from 'react'; import styles from './primitives.module.css';
type Props = { href: string; children: ReactNode; variant?: 'primary' | 'secondary' | 'ghost'; className?: string; external?: boolean; surface?: 'light' | 'dark'; disabled?: boolean };
export function Button({ href, children, variant = 'primary', className = '', external = false, surface = 'light', disabled = false }: Props) {
  const classes = `${styles.button} ${styles[variant]} ${surface === 'dark' ? styles.onDark : ''} ${disabled ? styles.disabled : ''} ${className}`;
  // A disabled link is not navigable and not focusable; it stays announced as an unavailable link.
  if (disabled) return <span className={classes} role="link" aria-disabled="true">{children}</span>;
  return external ? <a className={classes} href={href} rel="noreferrer">{children}</a> : <Link className={classes} href={href}>{children}</Link>;
}
