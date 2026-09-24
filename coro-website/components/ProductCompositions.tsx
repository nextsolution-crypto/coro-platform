import Image from "next/image";
import { ArrowDown, ArrowRight } from "lucide-react";
import { Container } from "./ui/Container";
import { Section } from "./ui/Section";
import type { Locale } from "@/lib/site/locale";
import type { ProductCopy } from "./ProductPage";
import styles from "./product-compositions.module.css";

type Props = { locale: Locale; copy: ProductCopy };
const localized = (locale: Locale, fr: string, en: string) =>
  locale === "fr" ? fr : en;
function Shot({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  return (
    <figure className={`${styles.shot} ${className ?? ""}`}>
      <div className={styles.chrome} aria-hidden="true">
        <i />
        <i />
        <i />
      </div>
      <Image
        src={src}
        alt={alt}
        width={1600}
        height={1000}
        sizes="(min-width: 900px) 70vw, 100vw"
      />
      <figcaption>{alt}</figcaption>
    </figure>
  );
}

function Documents({ locale, copy: t }: Props) {
  const src =
    locale === "fr"
      ? "/images/solutions/coro-gestion-documentaire.webp"
      : "/images/solutions/en/coro-document-management.webp";
  return (
    <>
      <Section className={styles.docOrigin}>
        <Container className={styles.asymmetric}>
          <div>
            <p className={styles.kicker}>
              {localized(locale, "La fondation", "The foundation")}
            </p>
            <h2>
              {localized(
                locale,
                "Tout commence par la connaissance du bâtiment.",
                "It starts with knowledge of the building.",
              )}
            </h2>
          </div>
          <div>
            <p>{t.intro}</p>
            <blockquote>{t.flowTitle}</blockquote>
          </div>
        </Container>
      </Section>
      <Section tone="soft" className={styles.docCycle}>
        <Container>
          <ol>
            {t.flow.map((x, i) => (
              <li key={x}>
                <span>0{i + 1}</span>
                <strong>{x}</strong>
                {i < t.flow.length - 1 && <ArrowDown aria-hidden="true" />}
              </li>
            ))}
          </ol>
        </Container>
      </Section>
      <Section>
        <Container className={styles.docProof}>
          <Shot
            src={src}
            alt={localized(
              locale,
              "Interface CORO Documents pour la gestion documentaire",
              "CORO Documents document management interface",
            )}
          />
          <div>
            <p className={styles.kicker}>
              {localized(
                locale,
                "Du cycle à la preuve",
                "From lifecycle to evidence",
              )}
            </p>
            <h2>{t.capTitle}</h2>
            {t.capabilities.map((x) => (
              <article key={x.title}>
                <h3>{x.title}</h3>
                <p>{x.text}</p>
              </article>
            ))}
          </div>
        </Container>
      </Section>
      <Section className={styles.docFamilies}>
        <Container>
          <p className={styles.statement}>
            {localized(
              locale,
              "Une donnée saisie une fois. Plusieurs usages.",
              "Enter data once. Use it many ways.",
            )}
          </p>
          <div className={styles.familyRow}>
            {["PMU", "PSI", "PCA", "PGC", "PRA", "PUE"].map((x, i) => (
              <span className={i > 2 ? styles.toValidate : ""} key={x}>
                {x}
                {i > 2 && (
                  <small>
                    {localized(
                      locale,
                      " statut à valider",
                      " status to validate",
                    )}
                  </small>
                )}
              </span>
            ))}
          </div>
          <div className={styles.boundary}>
            <h2>{t.boundaryTitle}</h2>
            <p>{t.boundary}</p>
          </div>
        </Container>
      </Section>
    </>
  );
}

function Projects({ locale, copy: t }: Props) {
  const src =
    locale === "fr"
      ? "/images/solutions/coro-gestion-projets.webp"
      : "/images/solutions/en/coro-project-management.webp";
  const steps =
    locale === "fr"
      ? [
          "Mandat",
          "Activités",
          "Équipe",
          "Planning",
          "Booking",
          "Tâches",
          "Heures",
          "Livrables",
        ]
      : [
          "Mandate",
          "Activities",
          "Team",
          "Planning",
          "Booking",
          "Tasks",
          "Hours",
          "Deliverables",
        ];
  return (
    <>
      <Section className={styles.projectStart}>
        <Container>
          <p className={styles.kicker}>
            {localized(locale, "Le point de départ", "The starting point")}
          </p>
          <h2>
            {localized(
              locale,
              "Client + Bâtiment + Besoin",
              "Client + Building + Need",
            )}
          </h2>
          <p>{t.intro}</p>
        </Container>
      </Section>
      <Section tone="soft" className={styles.projectJourney}>
        <Container>
          <ol>
            {steps.map((x, i) => (
              <li key={x}>
                <span>0{i + 1}</span>
                <div>
                  <h3>{x}</h3>
                  {i === 3 && <p>{t.capabilities[1].text}</p>}
                  {i === 4 && <p>{t.capabilities[2].text}</p>}
                </div>
                {i === 2 && (
                  <Shot
                    className={styles.inlineProjectShot}
                    src={src}
                    alt={localized(
                      locale,
                      "Interface CORO Projects insérée dans le parcours du mandat",
                      "CORO Projects interface within the mandate journey",
                    )}
                  />
                )}
              </li>
            ))}
          </ol>
        </Container>
      </Section>
      <Section className={styles.projectPair}>
        <Container>
          <header>
            <p className={styles.kicker}>
              {localized(
                locale,
                "Deux capacités reliées",
                "Two connected capabilities",
              )}
            </p>
            <h2>
              {localized(
                locale,
                "Planning et Booking appartiennent au mandat.",
                "Planning and Booking belong to the mandate.",
              )}
            </h2>
          </header>
          <div>
            <article>
              <span>Planning</span>
              <p>{t.capabilities[1].text}</p>
            </article>
            <ArrowRight aria-hidden="true" />
            <article>
              <span>Booking</span>
              <p>{t.capabilities[2].text}</p>
            </article>
          </div>
          <aside>
            <h3>{t.boundaryTitle}</h3>
            <p>{t.boundary}</p>
          </aside>
        </Container>
      </Section>
      <Section tone="dark" className={styles.projectStatement}>
        <Container>
          <p>
            {localized(
              locale,
              "Du besoin au travail réalisé.",
              "From need to completed work.",
            )}
          </p>
        </Container>
      </Section>
    </>
  );
}

function Performance({ locale, copy: t }: Props) {
  const src =
    locale === "fr"
      ? "/images/solutions/coro-performance-objectifs.webp"
      : "/images/solutions/en/coro-performance-objectives.webp";
  const signal =
    locale === "fr"
      ? ["ACTIVITÉ", "MESURE", "ÉCART", "LECTURE", "DÉCISION"]
      : ["ACTIVITY", "MEASURE", "VARIANCE", "INSIGHT", "DECISION"];
  return (
    <>
      <Section className={styles.performanceQuestions}>
        <Container>
          {t.capabilities.map((x, i) => (
            <article key={x.title}>
              <span>0{i + 1}</span>
              <h2>{x.title}</h2>
              <p>{x.text}</p>
            </article>
          ))}
        </Container>
      </Section>
      <Section tone="dark" className={styles.analyticWindow}>
        <Container>
          <header>
            <p className={styles.kicker}>
              {localized(locale, "Fenêtre analytique", "Analytical window")}
            </p>
            <h2>{t.capTitle}</h2>
          </header>
          <Shot
            src={src}
            alt={localized(
              locale,
              "Fenêtre analytique CORO Performance",
              "CORO Performance analytical window",
            )}
          />
        </Container>
      </Section>
      <Section className={styles.signal}>
        <Container>
          <ol>
            {signal.map((x, i) => (
              <li key={x}>
                <strong>{x}</strong>
                {i < signal.length - 1 && <ArrowDown aria-hidden="true" />}
              </li>
            ))}
          </ol>
        </Container>
      </Section>
      <Section className={styles.performanceDivide}>
        <Container>
          <header>
            <h2>
              {localized(
                locale,
                "Performance ≠ Indice CORO",
                "Performance ≠ CORO Index",
              )}
            </h2>
          </header>
          <div>
            <article>
              <p className={styles.kicker}>Performance</p>
              <h3>
                {localized(
                  locale,
                  "Activité · Charge · Budgets · Objectifs",
                  "Activity · Workload · Budgets · Goals",
                )}
              </h3>
            </article>
            <article>
              <p className={styles.kicker}>
                {localized(locale, "Résilience", "Resilience")}
              </p>
              <h3>
                {localized(
                  locale,
                  "Préparation · Capacité face aux événements",
                  "Preparedness · Capacity for events",
                )}
              </h3>
            </article>
          </div>
          <p>{t.boundary}</p>
        </Container>
      </Section>
      <Section className={styles.performanceStatement}>
        <Container>
          <p>
            {localized(
              locale,
              "Mesurer pour décider. Décider pour progresser.",
              "Measure to decide. Decide to progress.",
            )}
          </p>
        </Container>
      </Section>
    </>
  );
}

function Client({ locale, copy: t }: Props) {
  const chapters = [
    {
      title: localized(locale, "Vue portefeuille", "Portfolio view"),
      src: "/images/solutions/portail-client/coro-portail-client-tableau-de-bord.webp",
      alt: localized(
        locale,
        "Tableau de bord du portail client CORO",
        "CORO client portal dashboard",
      ),
    },
    {
      title: localized(
        locale,
        "Comprendre les bâtiments",
        "Understand buildings",
      ),
      src: "/images/solutions/portail-client/coro-portail-client-batiments.webp",
      alt: localized(
        locale,
        "Portefeuille de bâtiments dans CORO Client",
        "Building portfolio in CORO Client",
      ),
    },
    {
      title: localized(
        locale,
        "Situer le portefeuille",
        "Locate the portfolio",
      ),
      src: "/images/solutions/portail-client/coro-portail-client-carte.webp",
      alt: localized(
        locale,
        "Vue cartographique des bâtiments CORO",
        "CORO building map view",
      ),
    },
    {
      title: localized(locale, "Suivre l’activité", "Track activity"),
      src: "/images/solutions/portail-client/coro-portail-client-activites.webp",
      alt: localized(
        locale,
        "Activités visibles dans CORO Client",
        "Activities shown in CORO Client",
      ),
    },
    {
      title: localized(
        locale,
        "Gérer le cycle documentaire",
        "Manage the document lifecycle",
      ),
      src: "/images/solutions/portail-client/coro-portail-client-cycle-documentaire.webp",
      alt: localized(
        locale,
        "Cycle documentaire, approbation et historique CORO",
        "CORO document lifecycle, approval and history",
      ),
    },
    {
      title: localized(
        locale,
        "Relier conseiller et client",
        "Connect advisor and client",
      ),
      src: "/images/solutions/portail-client/coro-portail-client-espace-conseiller.webp",
      alt: localized(
        locale,
        "Espace conseiller relié au portail client CORO",
        "CORO advisor workspace connected to the client portal",
      ),
    },
  ];
  return (
    <>
      <Section className={styles.clientOpening}>
        <Container>
          <p className={styles.kicker}>
            {localized(locale, "Visite guidée", "Guided tour")}
          </p>
          <h2>
            {localized(
              locale,
              "Votre organisation. Vos bâtiments. Votre information.",
              "Your organization. Your buildings. Your information.",
            )}
          </h2>
          <p>{t.intro}</p>
          <div className={styles.clientThread}>
            {t.flow.map((x, i) => (
              <span key={x}>
                {x}
                {i < t.flow.length - 1 && <ArrowRight aria-hidden="true" />}
              </span>
            ))}
          </div>
        </Container>
      </Section>
      <Section tone="soft" className={styles.clientTour}>
        <Container>
          {chapters.map((x, i) => (
            <article className={styles[`chapter${i + 1}`]} key={x.src}>
              <header>
                <span>0{i + 1}</span>
                <h2>{x.title}</h2>
              </header>
              <Shot src={x.src} alt={x.alt} />
              {i === 0 && <p>{t.capabilities[0].text}</p>}
              {i === 3 && <p>{t.capabilities[2].text}</p>}
              {i === 4 && <p>{t.capabilities[1].text}</p>}
              {i === 5 && <p>{t.capabilities[3].text}</p>}
            </article>
          ))}
        </Container>
      </Section>
      <Section className={styles.clientBoundary}>
        <Container>
          <h2>{t.boundaryTitle}</h2>
          <p>{t.boundary}</p>
        </Container>
      </Section>
    </>
  );
}

export function ProductComposition({
  variant,
  ...props
}: Props & { variant: "documents" | "projects" | "performance" | "client" }) {
  if (variant === "documents") return <Documents {...props} />;
  if (variant === "projects") return <Projects {...props} />;
  if (variant === "performance") return <Performance {...props} />;
  return <Client {...props} />;
}
