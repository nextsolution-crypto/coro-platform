import styles from './SiteShell.module.css';

/** « Libellé (CORO Produit) » : le nom du produit s'affiche en petit sous le libellé. */
export function NavLabel({ text }: { text: string }) {
  const match = /^(.*) \(([^)]*CORO[^)]*)\)$/.exec(text);
  if (!match) return <>{text}</>;
  return <span className={styles.navLabel}><span>{match[1]}</span><span className={styles.navProduct}>{match[2]}</span></span>;
}
