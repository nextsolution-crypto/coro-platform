import { Metadata } from 'next';

const SITE_URL = 'https://getcoro.io';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: 'Registre de présence numérique et évacuation | CORO Sentinelle',
  description: 'CORO Sentinelle est un registre numérique de présence conçu pour savoir qui est présent dans un bâtiment et faciliter le décompte des occupants lors d\'une évacuation.',
  keywords: 'registre de présence numérique, registre d\'évacuation, décompte évacuation, registre visiteurs, présence employés, point de rassemblement, QR code bâtiment, mesures d\'urgence, CORO Sentinelle',
  robots: 'index, follow',
  alternates: {
    canonical: `${SITE_URL}/sentinelle`,
  },
  openGraph: {
    type: 'website',
    title: 'CORO Sentinelle | Registre de présence et gestion d\'évacuation',
    description: 'Sachez qui est présent dans votre bâtiment et facilitez le décompte lors d\'une situation d\'urgence.',
    url: `${SITE_URL}/sentinelle`,
    images: [{ url: `${SITE_URL}/images/sentinelle/coro-sentinelle-registre-presence.webp` }],
  },
};

export default function SentinellePage() {
  return (
    <>
      <style>{`
        .cs-page {
          --cs-bg: #07111f;
          --cs-bg-soft: #0c1828;
          --cs-card: #101e30;
          --cs-card-light: #16273b;
          --cs-text: #f7f9fc;
          --cs-muted: #aebdce;
          --cs-border: rgba(255,255,255,.10);
          --cs-accent: #22a7f0;
          --cs-accent-2: #39d2c0;
          --cs-success: #58d68d;
          --cs-warning: #f6c85f;
          --cs-white: #ffffff;
          margin: 0;
          padding: 0;
          background: var(--cs-bg);
          color: var(--cs-text);
          font-family: Arial, Helvetica, sans-serif;
          line-height: 1.65;
          overflow-x: hidden;
        }
        .cs-page *, .cs-page *::before, .cs-page *::after { box-sizing: border-box; }
        .cs-container { width: min(1180px, calc(100% - 40px)); margin: 0 auto; }
        .cs-section { padding: 100px 0; }
        .cs-section--soft { background: var(--cs-bg-soft); }
        .cs-eyebrow {
          display: inline-flex; align-items: center; gap: 8px; margin-bottom: 18px;
          font-size: 13px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase;
          color: var(--cs-accent-2);
        }
        .cs-eyebrow::before { content: ""; width: 28px; height: 2px; background: var(--cs-accent-2); }
        .cs-title { margin: 0 0 22px; font-size: clamp(38px, 5.5vw, 68px); line-height: 1.04; letter-spacing: -.035em; max-width: 980px; }
        .cs-h2 { margin: 0 0 20px; font-size: clamp(30px, 4vw, 48px); line-height: 1.12; letter-spacing: -.025em; }
        .cs-h3 { margin: 0 0 12px; font-size: 22px; line-height: 1.25; }
        .cs-lead { max-width: 760px; margin: 0 0 30px; color: var(--cs-muted); font-size: clamp(18px, 2vw, 21px); }
        .cs-text { color: var(--cs-muted); font-size: 16px; }
        .cs-gradient-text {
          background: linear-gradient(90deg, var(--cs-accent), var(--cs-accent-2));
          -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
        }
        .cs-actions { display: flex; flex-wrap: wrap; gap: 14px; margin-top: 32px; }
        .cs-btn {
          display: inline-flex; justify-content: center; align-items: center;
          min-height: 52px; padding: 0 24px; border-radius: 10px;
          text-decoration: none; font-weight: 700; transition: transform .2s ease, opacity .2s ease;
        }
        .cs-btn:hover { transform: translateY(-2px); }
        .cs-btn--primary { color: #04101c; background: linear-gradient(135deg, var(--cs-accent), var(--cs-accent-2)); }
        .cs-btn--secondary { color: var(--cs-white); border: 1px solid var(--cs-border); background: rgba(255,255,255,.04); }
        .cs-hero {
          position: relative; min-height: 720px; display: flex; align-items: center;
          padding: 110px 0 80px;
          background: radial-gradient(circle at 80% 20%, rgba(34,167,240,.18), transparent 36%),
            radial-gradient(circle at 20% 70%, rgba(57,210,192,.10), transparent 30%), var(--cs-bg);
        }
        .cs-hero-grid { display: grid; grid-template-columns: 1.02fr .98fr; align-items: center; gap: 62px; }
        .cs-hero-image { position: relative; }
        .cs-hero-image::before {
          content: ""; position: absolute; inset: 8% -8% -8% 8%; border-radius: 30px;
          background: linear-gradient(135deg, rgba(34,167,240,.20), rgba(57,210,192,.08)); filter: blur(30px);
        }
        .cs-hero-image img { position: relative; width: 100%; display: block; border-radius: 24px; border: 1px solid var(--cs-border); box-shadow: 0 30px 80px rgba(0,0,0,.38); }
        .cs-proofbar {
          display: grid; grid-template-columns: repeat(3, 1fr); gap: 1px; margin-top: 42px;
          overflow: hidden; border: 1px solid var(--cs-border); border-radius: 14px; background: var(--cs-border);
        }
        .cs-proof { padding: 18px; background: rgba(7,17,31,.92); }
        .cs-proof strong { display: block; margin-bottom: 4px; color: var(--cs-white); font-size: 16px; }
        .cs-proof span { color: var(--cs-muted); font-size: 13px; }
        .cs-intro { text-align: center; }
        .cs-intro .cs-lead { margin-left: auto; margin-right: auto; max-width: 850px; }
        .cs-big-statement {
          max-width: 920px; margin: 45px auto 0; padding: 34px; border: 1px solid var(--cs-border);
          border-radius: 20px;
          background: linear-gradient(135deg, rgba(34,167,240,.12), rgba(57,210,192,.05));
          font-size: clamp(22px, 3vw, 31px); font-weight: 700; line-height: 1.35;
        }
        .cs-grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 22px; margin-top: 50px; }
        .cs-card { padding: 30px; border: 1px solid var(--cs-border); border-radius: 18px; background: var(--cs-card); }
        .cs-card-number {
          display: inline-flex; align-items: center; justify-content: center;
          width: 42px; height: 42px; margin-bottom: 22px; border-radius: 11px; color: #04101c;
          background: linear-gradient(135deg, var(--cs-accent), var(--cs-accent-2));
          font-size: 18px; font-weight: 800;
        }
        .cs-split { display: grid; grid-template-columns: 1fr 1fr; gap: 72px; align-items: center; }
        .cs-split + .cs-split { margin-top: 110px; }
        .cs-split--reverse .cs-content { order: 2; }
        .cs-split--reverse .cs-visual { order: 1; }
        .cs-visual img { display: block; width: 100%; border-radius: 22px; border: 1px solid var(--cs-border); box-shadow: 0 24px 65px rgba(0,0,0,.28); }
        .cs-checklist { display: grid; gap: 14px; margin: 26px 0 0; padding: 0; list-style: none; }
        .cs-checklist li { position: relative; padding-left: 30px; color: var(--cs-muted); }
        .cs-checklist li::before { content: "✓"; position: absolute; left: 0; top: 0; color: var(--cs-accent-2); font-weight: 800; }
        .cs-sequence { display: grid; grid-template-columns: repeat(4, 1fr); gap: 18px; margin-top: 48px; }
        .cs-step { position: relative; padding: 26px; border: 1px solid var(--cs-border); border-radius: 16px; background: var(--cs-card); }
        .cs-step-label { margin-bottom: 10px; color: var(--cs-accent-2); font-size: 12px; font-weight: 800; letter-spacing: .1em; text-transform: uppercase; }
        .cs-persona-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 18px; margin-top: 46px; }
        .cs-persona { padding: 26px; border: 1px solid var(--cs-border); border-radius: 16px; background: rgba(255,255,255,.025); }
        .cs-persona strong { display: block; margin-bottom: 8px; font-size: 18px; }
        .cs-usecases { display: grid; grid-template-columns: repeat(2, 1fr); gap: 22px; margin-top: 46px; }
        .cs-usecase { padding: 30px; border-radius: 18px; border: 1px solid var(--cs-border); background: var(--cs-card); }
        .cs-usecase small { display: block; margin-bottom: 8px; color: var(--cs-accent-2); font-weight: 700; text-transform: uppercase; letter-spacing: .08em; }
        .cs-table-wrap { margin-top: 42px; overflow-x: auto; border: 1px solid var(--cs-border); border-radius: 18px; }
        .cs-table { width: 100%; min-width: 720px; border-collapse: collapse; background: var(--cs-card); }
        .cs-table th, .cs-table td { padding: 20px; border-bottom: 1px solid var(--cs-border); text-align: left; }
        .cs-table th { color: var(--cs-white); background: rgba(255,255,255,.035); }
        .cs-table td { color: var(--cs-muted); }
        .cs-table tr:last-child td { border-bottom: 0; }
        .cs-cta {
          padding: 70px 50px; border: 1px solid rgba(57,210,192,.25); border-radius: 28px; text-align: center;
          background: radial-gradient(circle at 50% 0%, rgba(34,167,240,.22), transparent 55%), var(--cs-card);
        }
        .cs-cta .cs-lead { margin-left: auto; margin-right: auto; }
        .cs-cta .cs-actions { justify-content: center; }
        .cs-faq { max-width: 900px; margin: 45px auto 0; }
        .cs-faq details { border-bottom: 1px solid var(--cs-border); }
        .cs-faq summary { padding: 24px 0; cursor: pointer; color: var(--cs-white); font-size: 18px; font-weight: 700; }
        .cs-faq details p { margin: 0; padding: 0 0 24px; color: var(--cs-muted); }
        .cs-related { display: grid; grid-template-columns: repeat(4, 1fr); gap: 18px; margin-top: 42px; }
        .cs-related a {
          display: flex; flex-direction: column; min-height: 190px; padding: 24px;
          border: 1px solid var(--cs-border); border-radius: 16px;
          color: var(--cs-white); text-decoration: none; background: var(--cs-card);
        }
        .cs-related span { margin-top: auto; padding-top: 20px; color: var(--cs-accent-2); font-weight: 700; }
        @media (max-width: 980px) {
          .cs-section { padding: 78px 0; }
          .cs-hero { min-height: auto; }
          .cs-hero-grid, .cs-split { grid-template-columns: 1fr; gap: 42px; }
          .cs-split--reverse .cs-content, .cs-split--reverse .cs-visual { order: initial; }
          .cs-grid-3, .cs-sequence, .cs-persona-grid, .cs-related { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 640px) {
          .cs-container { width: min(100% - 28px, 1180px); }
          .cs-section { padding: 62px 0; }
          .cs-hero { padding-top: 72px; }
          .cs-actions { flex-direction: column; }
          .cs-btn { width: 100%; }
          .cs-proofbar, .cs-grid-3, .cs-sequence, .cs-persona-grid, .cs-usecases, .cs-related { grid-template-columns: 1fr; }
          .cs-big-statement { padding: 24px; }
          .cs-card, .cs-usecase { padding: 24px; }
          .cs-cta { padding: 45px 22px; }
        }
      `}</style>

      <main className="cs-page">

        {/* HERO */}
        <section className="cs-hero">
          <div className="cs-container cs-hero-grid">
            <div>
              <div className="cs-eyebrow">CORO Sentinelle</div>
              <h1 className="cs-title">
                Sachez qui est présent.{' '}
                <span className="cs-gradient-text">Sachez qui manque.</span>
              </h1>
              <p className="cs-lead">
                CORO Sentinelle est un registre numérique de présence conçu pour les bâtiments et les organisations.
                Employés, visiteurs, entrepreneurs et autres occupants peuvent s&apos;enregistrer simplement à leur arrivée
                afin de fournir aux responsables une information utile lorsque chaque minute compte.
              </p>
              <div className="cs-actions">
                <a href="/contact" className="cs-btn cs-btn--primary">Demander une démonstration</a>
                <a href="#fonctionnement" className="cs-btn cs-btn--secondary">Voir comment ça fonctionne</a>
              </div>
              <div className="cs-proofbar">
                <div className="cs-proof"><strong>Enregistrement simple</strong><span>QR code et code PIN</span></div>
                <div className="cs-proof"><strong>Présence actualisée</strong><span>Vue opérationnelle du bâtiment</span></div>
                <div className="cs-proof"><strong>Utilisable en urgence</strong><span>Décompte et suivi d&apos;évacuation</span></div>
              </div>
            </div>
            <div className="cs-hero-image">
              <img src="/images/sentinelle/coro-sentinelle-registre-presence.webp"
                alt="CORO Sentinelle, registre numérique de présence et gestion d'évacuation"
                width={1600} height={1000} fetchPriority="high" />
            </div>
          </div>
        </section>

        {/* INTRODUCTION */}
        <section className="cs-section cs-section--soft">
          <div className="cs-container cs-intro">
            <div className="cs-eyebrow">Présence et sécurité</div>
            <h2 className="cs-h2">Un registre de présence pensé pour les situations réelles.</h2>
            <p className="cs-lead">
              Dans de nombreux bâtiments, savoir qui est entré ne suffit pas. Lorsqu&apos;une alarme survient,
              la véritable question devient : <strong>qui était présent et qui doit maintenant être localisé?</strong>
            </p>
            <div className="cs-big-statement">
              Le registre quotidien devient une{' '}
              <span className="cs-gradient-text">information opérationnelle en situation d&apos;urgence.</span>
            </div>
          </div>
        </section>

        {/* 3 PRINCIPES */}
        <section className="cs-section">
          <div className="cs-container">
            <div className="cs-eyebrow">Une logique simple</div>
            <h2 className="cs-h2">De l&apos;arrivée à l&apos;évacuation.</h2>
            <p className="cs-lead">Sentinelle relie le contrôle quotidien des présences aux besoins opérationnels d&apos;une organisation lorsqu&apos;une situation d&apos;urgence survient.</p>
            <div className="cs-grid-3">
              <article className="cs-card">
                <div className="cs-card-number">01</div>
                <h3 className="cs-h3">S&apos;enregistrer</h3>
                <p className="cs-text">La personne scanne le QR code de l&apos;établissement, s&apos;identifie depuis son téléphone et confirme sa présence.</p>
              </article>
              <article className="cs-card">
                <div className="cs-card-number">02</div>
                <h3 className="cs-h3">Connaître les présences</h3>
                <p className="cs-text">Les personnes actuellement enregistrées peuvent être consultées dans une interface centralisée par les utilisateurs autorisés.</p>
              </article>
              <article className="cs-card">
                <div className="cs-card-number">03</div>
                <h3 className="cs-h3">Faciliter le décompte</h3>
                <p className="cs-text">Lors d&apos;une évacuation, cette information contribue au recensement des occupants et au suivi des personnes qui n&apos;ont pas encore été confirmées.</p>
              </article>
            </div>
          </div>
        </section>

        {/* FONCTIONNEMENT */}
        <section id="fonctionnement" className="cs-section cs-section--soft">
          <div className="cs-container">
            <div className="cs-split">
              <div className="cs-content">
                <div className="cs-eyebrow">Étape 01</div>
                <h2 className="cs-h2">Un QR code à l&apos;entrée du bâtiment.</h2>
                <p className="cs-text">Une borne ou une signalisation Sentinelle permet à l&apos;utilisateur de démarrer son enregistrement depuis son propre téléphone.</p>
                <ul className="cs-checklist">
                  <li>Aucune application à installer pour l&apos;utilisateur</li>
                  <li>Accès rapide depuis un téléphone intelligent</li>
                  <li>Expérience adaptée aux employés et visiteurs</li>
                  <li>Processus utilisable sur plusieurs points d&apos;accès</li>
                </ul>
              </div>
              <div className="cs-visual">
                <img src="/images/sentinelle/coro-sentinelle-qr-code-entree.webp"
                  alt="Utilisateur scannant le QR code CORO Sentinelle à l'entrée d'un bâtiment"
                  width={1600} height={1000} loading="lazy" />
              </div>
            </div>
            <div className="cs-split cs-split--reverse">
              <div className="cs-content">
                <div className="cs-eyebrow">Étape 02</div>
                <h2 className="cs-h2">Identification rapide par code PIN.</h2>
                <p className="cs-text">Après avoir scanné le code QR, l&apos;utilisateur accède directement à l&apos;interface Sentinelle et peut s&apos;identifier selon la configuration établie par l&apos;organisation.</p>
                <ul className="cs-checklist">
                  <li>Interface mobile simplifiée</li>
                  <li>Identification rapide</li>
                  <li>Processus adapté aux environnements professionnels</li>
                  <li>Réduction des manipulations à l&apos;accueil</li>
                </ul>
              </div>
              <div className="cs-visual">
                <img src="/images/sentinelle/coro-sentinelle-code-pin.webp"
                  alt="Interface mobile CORO Sentinelle permettant la saisie d'un code PIN"
                  width={1600} height={1000} loading="lazy" />
              </div>
            </div>
            <div className="cs-split">
              <div className="cs-content">
                <div className="cs-eyebrow">Étape 03</div>
                <h2 className="cs-h2">Une vision actualisée des personnes présentes.</h2>
                <p className="cs-text">Les responsables autorisés peuvent consulter les informations nécessaires pour connaître les personnes actuellement enregistrées dans l&apos;établissement.</p>
                <ul className="cs-checklist">
                  <li>Employés présents</li>
                  <li>Visiteurs enregistrés</li>
                  <li>Entrepreneurs et fournisseurs</li>
                  <li>Présences consultables depuis une interface centralisée</li>
                </ul>
              </div>
              <div className="cs-visual">
                <img src="/images/sentinelle/coro-sentinelle-registre-temps-reel.webp"
                  alt="Tableau de bord CORO Sentinelle affichant le registre de présence"
                  width={1600} height={1000} loading="lazy" />
              </div>
            </div>
          </div>
        </section>

        {/* URGENCE */}
        <section className="cs-section">
          <div className="cs-container">
            <div className="cs-split">
              <div className="cs-content">
                <div className="cs-eyebrow">Lorsqu&apos;une urgence survient</div>
                <h2 className="cs-h2">Le registre prend une nouvelle valeur.</h2>
                <p className="cs-text">Pendant une évacuation, il ne suffit plus de savoir combien de personnes se trouvaient dans le bâtiment. Les responsables doivent pouvoir déterminer quelles personnes ont été recensées et lesquelles nécessitent encore une vérification.</p>
                <ul className="cs-checklist">
                  <li>Appuyer le décompte des occupants</li>
                  <li>Faciliter le travail des responsables d&apos;évacuation</li>
                  <li>Identifier les personnes non encore confirmées</li>
                  <li>Centraliser l&apos;information disponible</li>
                </ul>
              </div>
              <div className="cs-visual">
                <img src="/images/sentinelle/coro-sentinelle-evacuation.webp"
                  alt="Évacuation d'un bâtiment avec utilisation du registre de présence CORO Sentinelle"
                  width={1600} height={1000} loading="lazy" />
              </div>
            </div>
          </div>
        </section>

        {/* SÉQUENCE D'URGENCE */}
        <section className="cs-section cs-section--soft">
          <div className="cs-container">
            <div className="cs-eyebrow">Du bâtiment au point de rassemblement</div>
            <h2 className="cs-h2">Une continuité de l&apos;information.</h2>
            <div className="cs-sequence">
              <div className="cs-step"><div className="cs-step-label">01 — Avant</div><h3 className="cs-h3">Présence</h3><p className="cs-text">L&apos;organisation dispose d&apos;une liste des personnes enregistrées comme présentes.</p></div>
              <div className="cs-step"><div className="cs-step-label">02 — Alarme</div><h3 className="cs-h3">Évacuation</h3><p className="cs-text">Les occupants quittent le bâtiment conformément aux procédures de l&apos;établissement.</p></div>
              <div className="cs-step"><div className="cs-step-label">03 — Extérieur</div><h3 className="cs-h3">Décompte</h3><p className="cs-text">Les responsables effectuent le recensement au point de rassemblement.</p></div>
              <div className="cs-step"><div className="cs-step-label">04 — Analyse</div><h3 className="cs-h3">Vérification</h3><p className="cs-text">Les informations recueillies permettent de déterminer quelles personnes n&apos;ont pas encore été confirmées.</p></div>
            </div>
          </div>
        </section>

        {/* POINT DE RASSEMBLEMENT */}
        <section className="cs-section">
          <div className="cs-container">
            <div className="cs-split cs-split--reverse">
              <div className="cs-content">
                <div className="cs-eyebrow">Point de rassemblement</div>
                <h2 className="cs-h2">Faciliter le recensement après l&apos;évacuation.</h2>
                <p className="cs-text">Le point de rassemblement constitue l&apos;un des moments les plus importants du processus d&apos;évacuation. CORO Sentinelle permet de soutenir les responsables qui doivent établir une situation aussi claire que possible après la sortie des occupants.</p>
                <p className="cs-text" style={{marginTop: '16px'}}>L&apos;objectif n&apos;est pas simplement d&apos;obtenir un nombre, mais de transformer le registre de présence en information utile à la gestion de l&apos;événement.</p>
              </div>
              <div className="cs-visual">
                <img src="/images/sentinelle/coro-sentinelle-point-rassemblement.webp"
                  alt="Décompte des occupants au point de rassemblement avec CORO Sentinelle"
                  width={1600} height={1000} loading="lazy" />
              </div>
            </div>
          </div>
        </section>

        {/* PERSONNES NON CONFIRMÉES */}
        <section className="cs-section cs-section--soft">
          <div className="cs-container">
            <div className="cs-split">
              <div className="cs-content">
                <div className="cs-eyebrow">Information opérationnelle</div>
                <h2 className="cs-h2">Passer de &laquo;&nbsp;combien?&nbsp;&raquo; à &laquo;&nbsp;qui?&nbsp;&raquo;.</h2>
                <p className="cs-text">Dans une situation d&apos;urgence, connaître le nombre approximatif d&apos;occupants ne répond pas toujours aux besoins de l&apos;équipe responsable.</p>
                <p className="cs-text" style={{marginTop: '16px'}}>Sentinelle contribue à établir une information nominative permettant de comparer les personnes enregistrées comme présentes avec celles qui ont effectivement été recensées.</p>
              </div>
              <div className="cs-visual">
                <img src="/images/sentinelle/coro-sentinelle-personnes-manquantes.webp"
                  alt="Interface CORO Sentinelle permettant d'identifier les personnes non encore recensées"
                  width={1600} height={1000} loading="lazy" />
              </div>
            </div>
          </div>
        </section>

        {/* TYPES D'OCCUPANTS */}
        <section className="cs-section">
          <div className="cs-container">
            <div className="cs-eyebrow">Une seule logique</div>
            <h2 className="cs-h2">Plusieurs types d&apos;occupants.</h2>
            <p className="cs-lead">Un bâtiment ne contient pas uniquement des employés. Sentinelle permet de penser la présence de manière plus globale.</p>
            <div className="cs-persona-grid">
              <div className="cs-persona"><strong>Employés</strong><span className="cs-text">Personnel régulier et utilisateurs du bâtiment.</span></div>
              <div className="cs-persona"><strong>Visiteurs</strong><span className="cs-text">Clients, invités et visiteurs ponctuels.</span></div>
              <div className="cs-persona"><strong>Entrepreneurs</strong><span className="cs-text">Travailleurs externes et fournisseurs.</span></div>
              <div className="cs-persona"><strong>Autres occupants</strong><span className="cs-text">Toute catégorie définie selon les besoins de l&apos;organisation.</span></div>
            </div>
          </div>
        </section>

        {/* CAS D'USAGE */}
        <section className="cs-section cs-section--soft">
          <div className="cs-container">
            <div className="cs-eyebrow">Cas d&apos;utilisation</div>
            <h2 className="cs-h2">Une solution adaptée à différents environnements.</h2>
            <div className="cs-usecases">
              <article className="cs-usecase"><small>Immeubles</small><h3 className="cs-h3">Tours de bureaux</h3><p className="cs-text">Gestion quotidienne des présences et soutien aux procédures d&apos;évacuation du bâtiment.</p></article>
              <article className="cs-usecase"><small>Industrie</small><h3 className="cs-h3">Sites industriels</h3><p className="cs-text">Identification des employés, entrepreneurs et fournisseurs présents sur le site.</p></article>
              <article className="cs-usecase"><small>Institutions</small><h3 className="cs-h3">Organisations multi-usagers</h3><p className="cs-text">Une approche structurée de la présence adaptée aux réalités opérationnelles de l&apos;organisation.</p></article>
              <article className="cs-usecase"><small>Multi-sites</small><h3 className="cs-h3">Portefeuilles immobiliers</h3><p className="cs-text">Déploiement d&apos;une logique commune dans plusieurs bâtiments ou établissements.</p></article>
            </div>
          </div>
        </section>

        {/* MULTI-SITES */}
        <section className="cs-section">
          <div className="cs-container">
            <div className="cs-split">
              <div className="cs-content">
                <div className="cs-eyebrow">Évolutif</div>
                <h2 className="cs-h2">Un bâtiment aujourd&apos;hui. Plusieurs sites demain.</h2>
                <p className="cs-text">La logique Sentinelle peut accompagner les organisations qui disposent de plusieurs établissements et qui souhaitent uniformiser leur approche de gestion des présences.</p>
              </div>
              <div className="cs-visual">
                <img src="/images/sentinelle/coro-sentinelle-multi-sites.webp"
                  alt="Gestion de plusieurs bâtiments et établissements avec CORO Sentinelle"
                  width={1600} height={1000} loading="lazy" />
              </div>
            </div>
          </div>
        </section>

        {/* PAPIER VS SENTINELLE */}
        <section className="cs-section cs-section--soft">
          <div className="cs-container">
            <div className="cs-eyebrow">Moderniser le registre</div>
            <h2 className="cs-h2">Registre papier ou registre numérique?</h2>
            <p className="cs-lead">Le registre papier peut fonctionner dans certains contextes. Sentinelle vise toutefois à réduire plusieurs limites associées aux processus manuels.</p>
            <div className="cs-table-wrap">
              <table className="cs-table">
                <thead>
                  <tr><th>Critère</th><th>Registre papier</th><th>CORO Sentinelle</th></tr>
                </thead>
                <tbody>
                  <tr><td>Consultation</td><td>À l&apos;endroit où se trouve le registre</td><td>Depuis l&apos;interface autorisée</td></tr>
                  <tr><td>Lisibilité</td><td>Variable</td><td>Information structurée</td></tr>
                  <tr><td>Mise à jour</td><td>Manuelle</td><td>Liée aux enregistrements utilisateurs</td></tr>
                  <tr><td>Utilisation en évacuation</td><td>Nécessite de récupérer le registre</td><td>Information disponible numériquement</td></tr>
                  <tr><td>Recherche d&apos;une personne</td><td>Lecture manuelle</td><td>Consultation structurée</td></tr>
                  <tr><td>Multi-sites</td><td>Registres distincts</td><td>Approche centralisable</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ÉCOSYSTÈME CORO */}
        <section className="cs-section">
          <div className="cs-container">
            <div className="cs-intro">
              <div className="cs-eyebrow">Plus qu&apos;un registre</div>
              <h2 className="cs-h2">Sentinelle s&apos;inscrit dans l&apos;écosystème CORO.</h2>
              <p className="cs-lead">CORO est conçu pour aider les organisations et les professionnels à structurer leur préparation, leur documentation et leurs outils liés aux mesures d&apos;urgence et à la continuité des activités.</p>
              <div className="cs-big-statement">
                Sentinelle ajoute une dimension essentielle :{' '}
                <span className="cs-gradient-text">connecter la planification à la réalité du terrain.</span>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="cs-section cs-section--soft">
          <div className="cs-container">
            <div className="cs-cta">
              <div className="cs-eyebrow">Découvrir CORO Sentinelle</div>
              <h2 className="cs-h2">Votre organisation sait-elle réellement qui est présent lorsqu&apos;une urgence survient?</h2>
              <p className="cs-lead">Découvrez comment CORO Sentinelle peut intégrer la gestion des présences à votre organisation et soutenir vos procédures d&apos;évacuation.</p>
              <div className="cs-actions">
                <a href="/contact" className="cs-btn cs-btn--primary">Demander une démonstration</a>
                <a href="/" className="cs-btn cs-btn--secondary">Découvrir la plateforme CORO</a>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="cs-section">
          <div className="cs-container">
            <div className="cs-intro">
              <div className="cs-eyebrow">Questions fréquentes</div>
              <h2 className="cs-h2">CORO Sentinelle en quelques réponses.</h2>
            </div>
            <div className="cs-faq">
              <details><summary>Qu&apos;est-ce qu&apos;un registre numérique de présence?</summary><p>Un registre numérique de présence permet d&apos;enregistrer et de consulter les personnes présentes dans un bâtiment ou un établissement. Il peut notamment concerner les employés, visiteurs, entrepreneurs et fournisseurs.</p></details>
              <details><summary>Comment CORO Sentinelle fonctionne-t-il?</summary><p>L&apos;utilisateur peut accéder à Sentinelle à partir d&apos;un QR code placé à l&apos;entrée du bâtiment. Il s&apos;identifie ensuite au moyen de l&apos;interface prévue par l&apos;organisation afin d&apos;enregistrer sa présence.</p></details>
              <details><summary>CORO Sentinelle peut-il être utilisé pendant une évacuation?</summary><p>Oui. Le registre de présence peut soutenir le processus de recensement en permettant aux responsables de comparer les personnes enregistrées comme présentes avec celles qui ont été confirmées après l&apos;évacuation.</p></details>
              <details><summary>Sentinelle remplace-t-il le plan de mesures d&apos;urgence?</summary><p>Non. Sentinelle est un outil opérationnel complémentaire. Il ne remplace ni le plan de mesures d&apos;urgence ni les procédures d&apos;évacuation de l&apos;organisation.</p></details>
              <details><summary>Peut-on utiliser Sentinelle pour les visiteurs?</summary><p>Oui. Sentinelle peut être utilisé pour différentes catégories d&apos;occupants, notamment les employés, visiteurs, entrepreneurs et fournisseurs.</p></details>
              <details><summary>Pourquoi connaître les personnes présentes lors d&apos;une urgence?</summary><p>Une liste de présence peut soutenir les responsables dans leurs opérations de recensement et contribuer à identifier les personnes dont la situation doit encore être vérifiée après une évacuation.</p></details>
              <details><summary>Sentinelle peut-il être utilisé dans plusieurs bâtiments?</summary><p>L&apos;approche Sentinelle est conçue pour pouvoir s&apos;intégrer à des organisations possédant un ou plusieurs établissements selon leur configuration.</p></details>
              <details><summary>Une application doit-elle être installée sur le téléphone?</summary><p>L&apos;expérience d&apos;enregistrement peut être accessible depuis le téléphone de l&apos;utilisateur à partir du QR code, sans imposer une installation traditionnelle avant son arrivée.</p></details>
            </div>
          </div>
        </section>

        {/* ARTICLES SATELLITES */}
        <section className="cs-section cs-section--soft">
          <div className="cs-container">
            <div className="cs-eyebrow">Ressources</div>
            <h2 className="cs-h2">Approfondir la gestion des présences et de l&apos;évacuation.</h2>
            <div className="cs-related">
              <a href="/blog/decompte-occupants-evacuation"><strong>Comment faire le décompte des occupants lors d&apos;une évacuation?</strong><span>Lire l&apos;article {'→'}</span></a>
              <a href="/blog/registre-presence-situation-urgence"><strong>Pourquoi le registre de présence est essentiel en situation d&apos;urgence</strong><span>Lire l&apos;article {'→'}</span></a>
              <a href="/blog/registre-papier-ou-numerique"><strong>Registre papier ou numérique : lequel choisir?</strong><span>Lire l&apos;article {'→'}</span></a>
              <a href="/blog/visiteurs-evacuation"><strong>Comment gérer les visiteurs lors d&apos;une évacuation?</strong><span>Lire l&apos;article {'→'}</span></a>
              <a href="/blog/point-rassemblement-decompte"><strong>Point de rassemblement : comment organiser le décompte?</strong><span>Lire l&apos;article {'→'}</span></a>
              <a href="/blog/qui-recencer-evacuation"><strong>Employés, visiteurs et entrepreneurs : qui doit être recensé?</strong><span>Lire l&apos;article {'→'}</span></a>
              <a href="/blog/qr-code-registre-presence"><strong>QR code et registre de présence : comment ça fonctionne?</strong><span>Lire l&apos;article {'→'}</span></a>
              <a href="/blog/pmu-registre-presence"><strong>Comment intégrer un registre de présence à un plan de mesures d&apos;urgence?</strong><span>Lire l&apos;article {'→'}</span></a>
            </div>
          </div>
        </section>

      </main>

      {/* DONNÉES STRUCTURÉES */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        name: 'CORO Sentinelle',
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Web',
        description: 'Registre numérique de présence destiné aux bâtiments et organisations permettant de soutenir la gestion des présences et le décompte des occupants lors d\'une évacuation.',
        url: 'https://getcoro.io/sentinelle',
        publisher: { '@type': 'Organization', name: 'CORO', url: 'https://getcoro.io' },
      })}} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: [
          { '@type': 'Question', name: 'Qu\'est-ce qu\'un registre numérique de présence?', acceptedAnswer: { '@type': 'Answer', text: 'Un registre numérique de présence permet d\'enregistrer et de consulter les personnes présentes dans un bâtiment ou un établissement, notamment les employés, visiteurs, entrepreneurs et fournisseurs.' } },
          { '@type': 'Question', name: 'Comment CORO Sentinelle fonctionne-t-il?', acceptedAnswer: { '@type': 'Answer', text: 'L\'utilisateur peut accéder à Sentinelle à partir d\'un QR code placé à l\'entrée du bâtiment puis s\'identifier au moyen de l\'interface prévue par l\'organisation.' } },
          { '@type': 'Question', name: 'CORO Sentinelle peut-il être utilisé pendant une évacuation?', acceptedAnswer: { '@type': 'Answer', text: 'Oui. Le registre de présence peut soutenir le processus de recensement en permettant de comparer les personnes enregistrées comme présentes avec celles qui ont été confirmées après l\'évacuation.' } },
          { '@type': 'Question', name: 'Sentinelle remplace-t-il le plan de mesures d\'urgence?', acceptedAnswer: { '@type': 'Answer', text: 'Non. Sentinelle est un outil opérationnel complémentaire et ne remplace ni le plan de mesures d\'urgence ni les procédures d\'évacuation de l\'organisation.' } },
        ],
      })}} />
    </>
  );
}