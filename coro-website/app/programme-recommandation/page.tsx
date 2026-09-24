import type { Metadata } from "next";
import { CheckCircle2 } from "lucide-react";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { localeFromSearchParams, localizedHref } from "@/lib/site/locale";
import { buildPageMetadata } from "@/lib/site/seo";
import styles from "../institutional.module.css";
type P = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};
const c = {
  fr: {
    title: "Programme de recommandation CORO — Recevez 250 $ de crédit",
    description:
      "Recommandez CORO à une organisation et recevez un crédit CORO de 250 $ lorsqu’elle devient un client admissible.",
    h1: "Recommandez CORO. Recevez 250 $ de crédit.",
    intro:
      "Partagez votre lien personnel. Lorsqu’une organisation devient un client admissible, votre organisation peut recevoir un crédit CORO de 250 $.",
    reward: "de crédit CORO par recommandation admissible",
    steps: [
      "Depuis Administration → Recommandations, partagez votre lien personnel ou votre code.",
      "L’organisation utilise votre lien pour découvrir CORO ou demander une démonstration.",
      "Après conversion et validation de l’admissibilité, un crédit de 250 $ est approuvé.",
    ],
    account:
      "Votre espace CORO centralise le lien, le code, le statut, les crédits approuvés et appliqués, ainsi que l’historique.",
    conditions: [
      "Nouveau prospect qui n’est ni client ni engagé dans une démarche commerciale active.",
      "Une seule organisation référente par organisation recommandée.",
      "Aucune auto-recommandation ou contournement de la tarification.",
      "Admissibilité et conversion validées par CORO.",
      "Crédit sans valeur monétaire, applicable uniquement aux services CORO admissibles.",
      "CORO peut modifier, suspendre ou mettre fin au programme.",
    ],
    login: "Accéder à mon espace CORO",
    demo: "Demander une démonstration",
    terms:
      "Le crédit de 250 $ est soumis aux conditions du programme et à la validation de CORO.",
  },
  en: {
    title: "CORO Referral Program — Receive $250 in CORO credit",
    description:
      "Refer CORO to an organization and receive $250 in CORO credit when it becomes an eligible customer.",
    h1: "Refer CORO. Receive $250 in credit.",
    intro:
      "Share your personal link. When an organization becomes an eligible customer, your organization may receive $250 in CORO credit.",
    reward: "in CORO credit per eligible referral",
    steps: [
      "From Administration → Referrals, share your personal link or code.",
      "The organization uses your link to discover CORO or request a demonstration.",
      "After conversion and eligibility validation, a $250 credit is approved.",
    ],
    account:
      "Your CORO account centralizes your link, code, status, approved and applied credits, and referral history.",
    conditions: [
      "A new prospect that is neither a customer nor in an active sales process.",
      "Only one referring organization per referred organization.",
      "No self-referral or circumvention of pricing.",
      "Eligibility and conversion validated by CORO.",
      "No cash value; applies only to eligible CORO services.",
      "CORO may modify, suspend or end the program.",
    ],
    login: "Access my CORO account",
    demo: "Request a demonstration",
    terms:
      "The $250 credit is subject to program conditions and CORO validation.",
  },
} as const;
export async function generateMetadata({ searchParams }: P): Promise<Metadata> {
  const l = localeFromSearchParams((await searchParams) ?? {});
  const t = c[l];
  return buildPageMetadata({
    path: "/programme-recommandation",
    locale: l,
    title: t.title,
    description: t.description,
  });
}
export default async function Page({ searchParams }: P) {
  const l = localeFromSearchParams((await searchParams) ?? {}),
    t = c[l],
    amount = l === "fr" ? "250\u00a0$" : "$250",
    labels =
      l === "fr"
        ? ["Partagez", "Découverte de CORO", "Validation et crédit"]
        : ["Share", "Discover CORO", "Validation and credit"];
  return (
    <div className={styles.pageShell}>
      <SiteHeader locale={l} pathname="/programme-recommandation" />
      <main id="main-content">
        <section className={`${styles.hero} ${styles.referralHero}`}>
          <Container>
            <p className={styles.eyebrow}>
              {l === "fr" ? "Programme de recommandation" : "Referral program"}
            </p>
            <h1>
              <span>{l === "fr" ? "Recommandez CORO." : "Refer CORO."}</span>{" "}
              <span>
                {l === "fr" ? "Recevez " : "Receive "}
                <span className={styles.nowrap}>{amount}</span>
                {l === "fr" ? " de crédit." : " in credit."}
              </span>
            </h1>
            <p className={styles.heroText}>{t.intro}</p>
            <div className={styles.actions}>
              <Button href="https://app.getcoro.io/login">{t.login}</Button>
              <Button
                href={localizedHref("/#demo", l)}
                variant="ghost"
                className={styles.lightButton}
              >
                {t.demo}
              </Button>
            </div>
          </Container>
        </section>
        <Section tone="soft" className={styles.rewardSection}>
          <Container>
            <div className={styles.reward}>
              <span className={styles.amount}>{amount}</span>
              <div>
                <p className={styles.rewardLabel}>
                  {l === "fr" ? "Crédit de recommandation" : "Referral credit"}
                </p>
                <h2>{t.reward}</h2>
              </div>
            </div>
          </Container>
        </Section>
        <Section className={styles.journeySection}>
          <Container>
            <div className={styles.intro}>
              <p className={styles.eyebrow}>
                {l === "fr" ? "Le parcours" : "The journey"}
              </p>
              <h2>
                {l === "fr"
                  ? "Recommander → Attribution → Crédit"
                  : "Refer → Attribution → Credit"}
              </h2>
            </div>
            <ol className={styles.journey}>
              {t.steps.map((x, i) => (
                <li key={x}>
                  <span className={styles.stepNumber}>0{i + 1}</span>
                  <div>
                    <h3>{labels[i]}</h3>
                    <p>{x}</p>
                  </div>
                </li>
              ))}
            </ol>
          </Container>
        </Section>
        <Section tone="soft">
          <Container className={styles.conditionsLayout}>
            <div>
              <p className={styles.eyebrow}>
                {l === "fr"
                  ? "Suivi et admissibilité"
                  : "Tracking and eligibility"}
              </p>
              <h2>
                {l === "fr"
                  ? "Suivez tout dans CORO"
                  : "Track everything in CORO"}
              </h2>
              <p>{t.account}</p>
            </div>
            <ol className={styles.conditions}>
              {t.conditions.map((x, i) => (
                <li key={x}>
                  <span>0{i + 1}</span>
                  <CheckCircle2 aria-hidden="true" size={21} />
                  <p>{x}</p>
                </li>
              ))}
            </ol>
          </Container>
        </Section>
        <p className={styles.legalNote}>{t.terms}</p>
      </main>
      <SiteFooter locale={l} pathname="/programme-recommandation" />
    </div>
  );
}
