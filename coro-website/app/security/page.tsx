import type { Metadata } from 'next';
import { CTASection } from '@/components/conversion/CTASection';
import { Accordion } from '@/components/page/Accordion';
import { EditorialBlock } from '@/components/page/EditorialBlock';
import { EditorialHero } from '@/components/page/EditorialHero';
import { PageSection } from '@/components/page/PageSection';
import { SplitContent } from '@/components/page/SplitContent';
import { V2Shell } from '@/components/site/V2Shell';
import { Button } from '@/components/ui/Button';
import { faqJsonLd } from '@/lib/site/json-ld';
import { localeFromSearchParams, localizedHref } from '@/lib/site/locale';
import { buildPageMetadata } from '@/lib/site/seo';
import styles from './page.module.css';

type P = { searchParams?: Promise<Record<string, string | string[] | undefined>> };

/**
 * /security (MIG-04A) — security and hosting, explained without exaggeration. NOT a compliance-certification page.
 * Authority: docs/website-v2/05-migration/MIG-04-PRE-SECURITY-PRICING-GATE.md (claim matrix §2, human decisions D1-D14). LANGUAGE: TRUE FR / EN.
 * PUBLISHED (verified in code, deployed headers or the public legal texts): primary application infrastructure hosted in Canada (Toronto region,
 * DigitalOcean); HTTPS/TLS; hashed passwords; roles and permissions; logical separation of organisations; rate-limited sign-in attempts and requests;
 * action logging; backup and continuity mechanisms in the general terms already used by the Terms of Use; availability monitoring of the main services.
 * NOT published (MIG-04-PRE): "all data stays in Canada"; Loi 25 compliance or PIPEDA certification; CORO SOC 2 / ISO 27001 (a provider attestation is not
 * CORO's and is not a central claim); end-to-end encryption; 24/7 monitoring; a backup retention period; daily snapshots; a firewall; HTTP security headers;
 * penetration tests; disaster-recovery claims; a provider SLA figure; MFA as a selling point (SECURITY-HARDENING — MFA); a certification badge; a vendor list.
 * Third-party processing (Cloudflare, Brevo, Anthropic, Formspree, Mapbox) is acknowledged in cautious wording; the definitive disclosure belongs to the Privacy
 * legal review (Go-Live item). The hero is a MARKETING ILLUSTRATION (decorative, alt=""): the interface, map and server aisle are illustrative, never proof.
 */
const copy = {
  fr: {
    metaTitle: 'Sécurité et hébergement des données au Canada',
    description: 'Où l’infrastructure principale de CORO est hébergée, comment les accès sont contrôlés, ce qui protège les données et ce qui relève de votre organisation.',
    label: 'Sécurité et hébergement',
    lines: ['La sécurité fait partie', 'de l’architecture.'],
    lead: 'CORO est conçue pour des organisations qui manipulent des documents et des renseignements sensibles. Cette page décrit les mesures en place, ce que CORO contrôle, ce que des fournisseurs soutiennent et ce qui relève de votre organisation.',
    detail: 'Infrastructure principale au Canada · Accès contrôlés · Communications chiffrées',
    demo: 'Demander une démonstration', ask: 'Poser une question de sécurité',
    mailSubject: 'Question de sécurité CORO',
    s1: { n: '01', label: 'Infrastructure principale au Canada', title: 'Ce que cela signifie, et ce que cela ne signifie pas.',
      text: [
        'L’infrastructure applicative principale de CORO est hébergée au Canada, dans la région de Toronto, chez un fournisseur d’infrastructure infonuagique (DigitalOcean). C’est là que fonctionnent l’application, sa base de données et le stockage des fichiers de la plateforme.',
        'Cela ne veut pas dire que tout traitement lié au service se fait au Canada. Certains services de soutien (envoi de courriels et de messages texte, fonctions assistées par IA, formulaires du site, acheminement du trafic Web) font appel à des fournisseurs spécialisés, qui peuvent traiter certaines données à l’extérieur du Canada.',
        'Les caractéristiques de l’infrastructure peuvent évoluer avec la plateforme. Vos équipes TI peuvent nous écrire pour obtenir des précisions sur l’architecture et l’hébergement.',
      ],
      factsLabel: 'En résumé',
      facts: [['Infrastructure applicative principale', 'Région de Toronto (Canada)'], ['Fournisseur d’infrastructure', 'DigitalOcean'], ['Services de soutien', 'Fournisseurs spécialisés, selon leur rôle']] as const },
    s2: { n: '02', label: 'Contrôler qui accède à quoi', title: 'Des accès attribués selon les responsabilités.',
      text: 'La protection des données commence par une gestion rigoureuse des identités et des permissions. CORO structure les accès autour du rôle de chaque utilisateur.',
      rows: [
        ['Accès authentifié', 'Chaque utilisateur accède à la plateforme avec son propre compte.'],
        ['Rôles et permissions', 'Les droits sont attribués selon les responsabilités de chaque utilisateur.'],
        ['Cloisonnement des organisations', 'Les données de chaque organisation sont séparées logiquement de celles des autres organisations, au niveau de l’application.'],
        ['Tentatives de connexion', 'Le nombre de tentatives de connexion répétées est limité.'],
        ['Journal des actions', 'Les actions des utilisateurs sont journalisées afin de faciliter le suivi et l’analyse.'],
      ] as const },
    s3: { n: '03', label: 'Protéger les données', title: 'Des mesures décrites avec précision.',
      text: 'Les mesures ci-dessous sont décrites telles quelles, sans superlatifs ni promesse de résultat.',
      rows: [
        ['Communications chiffrées', 'Les échanges entre les utilisateurs et la plateforme sont protégés par HTTPS/TLS.'],
        ['Mots de passe hachés', 'Les mots de passe sont stockés sous forme hachée et ne sont pas conservés en clair.'],
        ['Limites de débit', 'Les requêtes adressées à la plateforme sont soumises à des limites de débit qui réduisent les usages abusifs.'],
      ] as const },
    s4: { n: '04', label: 'Sauvegarder et rétablir', title: 'Un service conçu pour limiter l’impact d’une défaillance.',
      columns: [
        ['Sauvegarde et récupération', 'CORO met en œuvre des mécanismes de sauvegarde et de continuité adaptés à son infrastructure, destinés à réduire l’impact d’une défaillance technique.'],
        ['Disponibilité', 'La disponibilité des principaux services est surveillée afin de détecter les interruptions. Aucun service ne peut promettre une disponibilité sans interruption.'],
      ] as const,
      note: 'Conservez de votre côté les copies des livrables dont votre organisation a besoin : les conditions d’utilisation précisent les responsabilités de chacun.', termsLink: 'Consulter les conditions d’utilisation' },
    s5: { n: '05', label: 'Une responsabilité partagée', title: 'Qui fait quoi.',
      text: 'La sécurité d’un service en ligne repose sur trois parties. Cette répartition est pédagogique : les engagements contractuels se trouvent dans les conditions d’utilisation.',
      cols: [
        { name: 'Ce que CORO contrôle', items: ['La configuration de la plateforme et de son infrastructure applicative', 'Les contrôles d’accès et la journalisation de l’application', 'Le traitement des questions de sécurité qui lui sont adressées'] },
        { name: 'Ce que soutiennent des fournisseurs', items: ['L’infrastructure d’hébergement et de réseau', 'Des services spécialisés (courriel et messages texte, assistance par IA, formulaires, acheminement du trafic Web)', 'Leurs propres mesures et attestations, qui leur appartiennent et non à CORO'] },
        { name: 'Ce qui relève de votre organisation', items: ['La gestion de vos utilisateurs et des accès que vous attribuez', 'La protection de vos identifiants et de vos appareils', 'Le caractère licite des renseignements que vous saisissez', 'La conservation de vos propres copies de livrables'] },
      ] as const },
    s6: { n: '06', label: 'Confidentialité et transparence', title: 'Une information claire, sans promesse de certification.',
      text: [
        'CORO est conçue pour aider les organisations à gérer l’information de façon responsable. La Politique de confidentialité décrit comment CORO traite les renseignements personnels ; les conditions d’utilisation en précisent le cadre.',
        'CORO tient compte du cadre législatif québécois (Loi 25) et du cadre fédéral (LPRPDE / PIPEDA) lorsqu’il s’applique. Cette page décrit des mesures de sécurité : elle ne constitue ni une déclaration de conformité, ni une certification, ni un engagement de niveau de service. CORO n’affiche pas de certification de sécurité, et les attestations d’un fournisseur d’infrastructure ne sont pas celles de CORO.',
      ], privacy: 'Consulter la politique de confidentialité', terms: 'Consulter les conditions d’utilisation' },
    faq: 'Questions fréquentes', faqLabel: 'FAQ',
    faqItems: [
      { q: 'Où est hébergée la plateforme CORO?', a: 'L’infrastructure applicative principale de CORO est hébergée au Canada, dans la région de Toronto, chez DigitalOcean. Certains services de soutien font appel à des fournisseurs spécialisés qui peuvent traiter certaines données à l’extérieur du Canada.' },
      { q: 'Toutes les données restent-elles au Canada?', a: 'Pas nécessairement. L’infrastructure principale est au Canada, mais des services de soutien (courriel et messages texte, fonctions assistées par IA, formulaires, acheminement du trafic Web) peuvent faire appel à des fournisseurs qui traitent certaines données ailleurs. La Politique de confidentialité décrit le traitement des renseignements personnels.' },
      { q: 'CORO est-elle certifiée ISO 27001 ou SOC 2?', a: 'CORO n’affiche pas de certification de sécurité. Un fournisseur d’infrastructure peut détenir ses propres attestations, qui ne sont pas celles de CORO.' },
      { q: 'CORO est-elle conforme à la Loi 25?', a: 'Cette page ne déclare pas de conformité. CORO tient compte du cadre législatif québécois et du cadre fédéral dans la conception de ses pratiques ; chaque organisation demeure responsable de ses propres obligations à l’égard des renseignements qu’elle saisit.' },
      { q: 'Que doit faire mon organisation de son côté?', a: 'Gérer ses utilisateurs et les accès qu’elle attribue, protéger ses identifiants et ses appareils, saisir des renseignements de façon licite et conserver ses propres copies de livrables. Le détail se trouve dans les conditions d’utilisation.' },
      { q: 'Comment poser une question de sécurité à l’équipe?', a: 'Écrivez à info@getcoro.io ou demandez une démonstration. Vos équipes TI peuvent poser leurs questions sur l’architecture, l’hébergement et les contrôles en place.' },
    ],
    statement: 'La sécurité se juge sur des faits.',
    support: 'Parlez-nous de vos exigences en matière de sécurité et de protection des données. Nous vous présenterons l’environnement CORO.',
  },
  en: {
    metaTitle: 'Security and data hosting in Canada',
    description: 'Where CORO’s primary infrastructure is hosted, how access is controlled, what protects data and what remains your organization’s responsibility.',
    label: 'Security and hosting',
    lines: ['Security is part', 'of the architecture.'],
    lead: 'CORO is designed for organizations that handle sensitive documents and information. This page describes the measures in place, what CORO controls, what providers support and what remains your organization’s responsibility.',
    detail: 'Primary infrastructure in Canada · Controlled access · Encrypted communications',
    demo: 'Request a demo', ask: 'Ask a security question',
    mailSubject: 'CORO security question',
    s1: { n: '01', label: 'Primary infrastructure in Canada', title: 'What this means, and what it does not mean.',
      text: [
        'CORO’s primary application infrastructure is hosted in Canada, in the Toronto region, with a cloud infrastructure provider (DigitalOcean). This is where the application, its database and the platform’s file storage run.',
        'This does not mean that all processing related to the service takes place in Canada. Some supporting services (sending emails and text messages, AI-assisted features, website forms, web traffic delivery) rely on specialized providers, which may process certain data outside Canada.',
        'Infrastructure characteristics may evolve with the platform. Your IT teams can write to us for details about the architecture and hosting.',
      ],
      factsLabel: 'In brief',
      facts: [['Primary application infrastructure', 'Toronto region (Canada)'], ['Infrastructure provider', 'DigitalOcean'], ['Supporting services', 'Specialized providers, depending on their role']] as const },
    s2: { n: '02', label: 'Control who accesses what', title: 'Access assigned according to responsibilities.',
      text: 'Data protection starts with disciplined identity and permission management. CORO structures access around each user’s role.',
      rows: [
        ['Authenticated access', 'Each user accesses the platform with their own account.'],
        ['Roles and permissions', 'Rights are assigned according to each user’s responsibilities.'],
        ['Separation of organizations', 'Each organization’s data is logically separated from other organizations’ data, at the application level.'],
        ['Sign-in attempts', 'Repeated sign-in attempts are limited.'],
        ['Action log', 'User actions are logged to support tracking and analysis.'],
      ] as const },
    s3: { n: '03', label: 'Protect data', title: 'Measures described precisely.',
      text: 'The measures below are described as they are, without superlatives or promises of outcome.',
      rows: [
        ['Encrypted communications', 'Exchanges between users and the platform are protected with HTTPS/TLS.'],
        ['Hashed passwords', 'Passwords are stored in hashed form and are not kept in plain text.'],
        ['Rate limits', 'Requests to the platform are subject to rate limits that reduce abusive use.'],
      ] as const },
    s4: { n: '04', label: 'Back up and recover', title: 'A service designed to limit the impact of a failure.',
      columns: [
        ['Backup and recovery', 'CORO implements backup and continuity mechanisms suited to its infrastructure, intended to reduce the impact of a technical failure.'],
        ['Availability', 'The availability of the main services is monitored to detect interruptions. No service can promise uninterrupted availability.'],
      ] as const,
      note: 'Keep your own copies of the deliverables your organization needs: the terms of use set out each party’s responsibilities.', termsLink: 'Read the terms of use' },
    s5: { n: '05', label: 'Shared responsibility', title: 'Who does what.',
      text: 'The security of an online service rests on three parties. This breakdown is educational: contractual commitments are found in the terms of use.',
      cols: [
        { name: 'What CORO controls', items: ['The configuration of the platform and its application infrastructure', 'The application’s access controls and logging', 'Handling the security questions addressed to it'] },
        { name: 'What providers support', items: ['Hosting and network infrastructure', 'Specialized services (email and text messages, AI assistance, forms, web traffic delivery)', 'Their own measures and attestations, which belong to them and not to CORO'] },
        { name: 'What rests with your organization', items: ['Managing your users and the access you assign', 'Protecting your credentials and your devices', 'The lawfulness of the information you enter', 'Keeping your own copies of deliverables'] },
      ] as const },
    s6: { n: '06', label: 'Privacy and transparency', title: 'Clear information, without a promise of certification.',
      text: [
        'CORO is designed to help organizations manage information responsibly. The Privacy Policy describes how CORO handles personal information; the terms of use set out the framework.',
        'CORO takes into account the Québec legislative framework (Law 25) and the federal framework (PIPEDA) where it applies. This page describes security measures: it is not a statement of compliance, a certification or a service-level commitment. CORO does not display any security certification, and an infrastructure provider’s attestations are not CORO’s.',
      ], privacy: 'Read the privacy policy', terms: 'Read the terms of use' },
    faq: 'Frequently asked questions', faqLabel: 'FAQ',
    faqItems: [
      { q: 'Where is the CORO platform hosted?', a: 'CORO’s primary application infrastructure is hosted in Canada, in the Toronto region, with DigitalOcean. Some supporting services rely on specialized providers that may process certain data outside Canada.' },
      { q: 'Does all data stay in Canada?', a: 'Not necessarily. The primary infrastructure is in Canada, but supporting services (email and text messages, AI-assisted features, forms, web traffic delivery) may rely on providers that process certain data elsewhere. The Privacy Policy describes how personal information is handled.' },
      { q: 'Is CORO ISO 27001 or SOC 2 certified?', a: 'CORO does not display any security certification. An infrastructure provider may hold its own attestations, which are not CORO’s.' },
      { q: 'Is CORO compliant with Law 25?', a: 'This page does not declare compliance. CORO takes into account the Québec and federal frameworks in designing its practices; each organization remains responsible for its own obligations regarding the information it enters.' },
      { q: 'What does my organization have to do on its side?', a: 'Manage its users and the access it assigns, protect its credentials and devices, enter information lawfully and keep its own copies of deliverables. Details are in the terms of use.' },
      { q: 'How do I ask the team a security question?', a: 'Write to info@getcoro.io or request a demo. Your IT teams can ask about the architecture, hosting and the controls in place.' },
    ],
    statement: 'Security is judged on facts.',
    support: 'Tell us about your security and data-protection requirements. We will walk you through the CORO environment.',
  },
};

export async function generateMetadata({ searchParams }: P): Promise<Metadata> {
  const l = localeFromSearchParams((await searchParams) ?? {});
  return buildPageMetadata({ path: '/security', locale: l, title: copy[l].metaTitle, description: copy[l].description });
}

function JsonLd({ value }: { value: object }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(value).replace(/</g, '\\u003c') }} />;
}

export default async function Page({ searchParams }: P) {
  const l = localeFromSearchParams((await searchParams) ?? {});
  const t = copy[l];
  const demo = localizedHref('/#demo', l);
  const mail = `mailto:info@getcoro.io?subject=${encodeURIComponent(t.mailSubject)}`;
  return (
    <V2Shell locale={l} pathname="/security">
      <JsonLd value={faqJsonLd(t.faqItems.map((item) => ({ question: item.q, answer: item.a })))} />

      <EditorialHero id="security-title" label={t.label} title={t.lines} lead={t.lead} detail={t.detail}
        photo={{ src: '/website-v2/security/security-canadian-hosting.webp', side: 'end', position: '100% 50%', mobilePosition: '100% 50%', coverage: 52, mobileRatio: '1 / 1' }}
        actions={<><Button href={demo} surface="dark">{t.demo}</Button><Button href={mail} variant="ghost" surface="dark" external>{t.ask}</Button></>} />

      <PageSection tone="white" labelledBy="security-s1-title">
        <SplitContent ratio="7-5" align="start"
          text={<EditorialBlock id="security-s1-title" label={`${t.s1.n} — ${t.s1.label}`} heading={t.s1.title}>{t.s1.text.map((p) => <p key={p}>{p}</p>)}</EditorialBlock>}
          media={<div className={styles.stack}><p className={styles.kicker}>{t.s1.factsLabel}</p><dl className={styles.facts}>{t.s1.facts.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl></div>} />
      </PageSection>

      <PageSection tone="soft" labelledBy="security-s2-title">
        <div className={styles.stack}>
          <EditorialBlock id="security-s2-title" label={`${t.s2.n} — ${t.s2.label}`} heading={t.s2.title}><p>{t.s2.text}</p></EditorialBlock>
          <ul className={styles.rows}>{t.s2.rows.map(([name, text]) => <li key={name}><h3>{name}</h3><p>{text}</p></li>)}</ul>
        </div>
      </PageSection>

      <PageSection tone="navy" labelledBy="security-s3-title">
        <SplitContent ratio="5-7" align="start"
          text={<EditorialBlock id="security-s3-title" label={`${t.s3.n} — ${t.s3.label}`} heading={t.s3.title}><p>{t.s3.text}</p></EditorialBlock>}
          media={<ul className={`${styles.rows} ${styles.rowsCompact}`}>{t.s3.rows.map(([name, text]) => <li key={name}><h3>{name}</h3><p>{text}</p></li>)}</ul>} />
      </PageSection>

      <PageSection tone="white" labelledBy="security-s4-title">
        <div className={styles.stack}>
          <EditorialBlock id="security-s4-title" label={`${t.s4.n} — ${t.s4.label}`} heading={t.s4.title} />
          <div className={styles.columns}>{t.s4.columns.map(([name, text]) => <section key={name}><h3>{name}</h3><p>{text}</p></section>)}</div>
          <p className={styles.note}>{t.s4.note} <a className={styles.link} href={localizedHref('/terms', l)}>{t.s4.termsLink}<span aria-hidden="true"> →</span></a></p>
        </div>
      </PageSection>

      <PageSection tone="soft" labelledBy="security-s5-title">
        <div className={styles.stack}>
          <EditorialBlock id="security-s5-title" label={`${t.s5.n} — ${t.s5.label}`} heading={t.s5.title}><p>{t.s5.text}</p></EditorialBlock>
          <div className={styles.cols}>{t.s5.cols.map((c) => <section key={c.name}><h3>{c.name}</h3><ul>{c.items.map((item) => <li key={item}>{item}</li>)}</ul></section>)}</div>
        </div>
      </PageSection>

      <PageSection tone="white" labelledBy="security-s6-title">
        <SplitContent ratio="5-7" align="start"
          text={<EditorialBlock id="security-s6-title" label={`${t.s6.n} — ${t.s6.label}`} heading={t.s6.title} />}
          media={<div className={styles.stack}>{t.s6.text.map((p) => <p key={p} className={styles.body}>{p}</p>)}<p className={styles.links}><a className={styles.link} href={localizedHref('/privacy', l)}>{t.s6.privacy}<span aria-hidden="true"> →</span></a><a className={styles.link} href={localizedHref('/terms', l)}>{t.s6.terms}<span aria-hidden="true"> →</span></a></p></div>} />
      </PageSection>

      <PageSection tone="soft" labelledBy="security-faq-title">
        <div className={styles.stack}>
          <EditorialBlock id="security-faq-title" label={t.faqLabel} heading={t.faq} />
          <Accordion label={t.faq} items={t.faqItems.map((item, i) => ({ id: `faq-${i}`, question: item.q, answer: item.a }))} />
        </div>
      </PageSection>

      <CTASection id="security-cta-title" tone="dark" label={t.label} statement={t.statement} support={t.support} primary={{ label: t.demo, href: demo }} secondary={{ label: t.ask, href: mail }} />
    </V2Shell>
  );
}
