import styles from './page.module.css';

export type AccordionItem = { id: string; question: string; answer: string };

/**
 * Accessible disclosure list built on native <details>/<summary>: keyboard (Enter / Space), focus ring and expanded
 * state come from the platform, and the content stays reachable without JavaScript. Long questions wrap.
 * `defaultOpen` lists ids that start open.
 */
export function Accordion({ items, defaultOpen = [], label }: { items: readonly AccordionItem[]; defaultOpen?: readonly string[]; label: string }) {
  return (
    <div className={styles.accordion} role="group" aria-label={label}>
      {items.map((item) => (
        <details key={item.id} open={defaultOpen.includes(item.id)}>
          <summary>{item.question}</summary>
          <div className={styles.accordionBody}><p>{item.answer}</p></div>
        </details>
      ))}
    </div>
  );
}
