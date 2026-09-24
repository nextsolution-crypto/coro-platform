import Link from 'next/link'; import type { ReactNode } from 'react'; import styles from './primitives.module.css';
type Props = { href: string; children: ReactNode; variant?: 'primary' | 'secondary' | 'ghost'; className?: string; external?: boolean };
export function Button({ href, children, variant = 'primary', className = '', external = false }: Props) {
  const classes = `${styles.button} ${styles[variant]} ${className}`;
  return external ? <a className={classes} href={href} rel="noreferrer">{children}</a> : <Link className={classes} href={href}>{children}</Link>;
}
