import { ArrowRight } from "lucide-react";
import { ProductComposition } from "./ProductCompositions";
import { SiteFooter } from "./site/SiteFooter";
import { SiteHeader } from "./site/SiteHeader";
import { Button } from "./ui/Button";
import { Container } from "./ui/Container";
import { Section } from "./ui/Section";
import { localizedHref, type Locale } from "@/lib/site/locale";
import styles from "./product.module.css";

export type ProductCopy = {
  name: string;
  eyebrow: string;
  title: string;
  intro: string;
  flow: readonly string[];
  flowTitle: string;
  capTitle: string;
  capabilities: readonly { title: string; text: string }[];
  boundaryTitle: string;
  boundary: string;
  connections: readonly { name: string; text: string; href?: string }[];
  faq: readonly { q: string; a: string }[];
  cta: string;
};
type Variant = "documents" | "projects" | "performance" | "client";

export function ProductPage({
  locale,
  path,
  variant,
  copy: t,
}: {
  locale: Locale;
  path: string;
  variant: Variant;
  copy: ProductCopy;
}) {
  return (
    <div className={`${styles.shell} ${styles[variant]}`}>
      <SiteHeader locale={locale} pathname={path} />
      <main id="main-content">
        <section className={styles.hero}>
          <Container>
            <p className={styles.eyebrow}>{t.eyebrow}</p>
            <h1>{t.title}</h1>
            <p className={styles.lead}>{t.intro}</p>
            <Button href={localizedHref("/#demo", locale)}>{t.cta}</Button>
          </Container>
        </section>
        <ProductComposition locale={locale} variant={variant} copy={t} />
        <Section tone="dark" className={styles.ecosystem}>
          <Container>
            <div className={styles.intro}>
              <p className={styles.eyebrow}>
                {locale === "fr"
                  ? "Cette partie de la plateforme"
                  : "This part of the platform"}
              </p>
              <h2>
                {locale === "fr"
                  ? "Un socle produit relié"
                  : "A connected product foundation"}
              </h2>
            </div>
            <div className={styles.links}>
              {t.connections.map((x) => (
                <article key={x.name}>
                  <h3>{x.name}</h3>
                  <p>{x.text}</p>
                  {x.href && (
                    <a href={localizedHref(x.href, locale)}>
                      {locale === "fr" ? "Explorer" : "Explore"}{" "}
                      <ArrowRight aria-hidden="true" />
                    </a>
                  )}
                </article>
              ))}
            </div>
          </Container>
        </Section>
        <Section className={styles.faqSection}>
          <Container>
            <div className={styles.intro}>
              <p className={styles.eyebrow}>FAQ</p>
              <h2>
                {locale === "fr"
                  ? "Questions fréquentes"
                  : "Frequently asked questions"}
              </h2>
            </div>
            <div className={styles.faq}>
              {t.faq.map((x) => (
                <article key={x.q}>
                  <h3>{x.q}</h3>
                  <p>{x.a}</p>
                </article>
              ))}
            </div>
          </Container>
        </Section>
      </main>
      <SiteFooter locale={locale} pathname={path} />
    </div>
  );
}
