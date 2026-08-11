'use client';

import { useState, useEffect } from 'react';
import { Shield, FileText, Users, Zap, CheckCircle, Globe, Lock, BarChart3, Menu, X, ChevronRight, Building2, Factory, ArrowRight } from 'lucide-react';
import DemoForm from './DemoForm';

const TRANSLATIONS = {
  fr: {
    nav: {
      features: 'Fonctionnalités',
      documents: 'Documents',
      howItWorks: 'Comment ça fonctionne',
      pricing: 'Tarifs',
      login: 'Connexion',
      demo: 'Demander une démo',
    },
    hero: {
      tag: 'Plateforme SaaS — Québec & Canada',
      title: 'La conformité,\npensée par des\nexperts du terrain.',
      subtitle: 'CORO génère, structure et gère vos plans de mesures d\'urgence, plans de sécurité incendie et plans de continuité — avec la rigueur réglementaire qu\'exige le terrain.',
      cta: 'Demander une démo',
      ctaSecondary: 'Voir la plateforme',
      trusted: 'Conçue pour les professionnels de la sécurité au Québec et au Canada',
    },
    stats: [
      { value: '6', label: 'Types de documents' },
      { value: '43+', label: 'Procédures intégrées' },
      { value: '2', label: 'Langues (FR/EN)' },
      { value: 'QC', label: 'Cadre réglementaire intégré' },
    ],
    features: {
      tag: 'Fonctionnalités',
      title: 'Tout ce dont vous avez besoin pour la conformité documentaire',
      subtitle: 'CORO est conçu comme un outil professionnel — pas un service. Vous gardez le contrôle total de vos documents.',
      items: [
        {
          icon: 'zap',
          title: 'Génération automatique',
          desc: 'Configurez le bâtiment une fois, CORO génère la structure complète du document automatiquement selon les normes en vigueur.',
        },
        {
          icon: 'shield',
          title: 'Procédures intégrées',
          desc: '43 procédures d\'urgence codifiées (P001-P028, P101-P122) + générateur IA pour procédures personnalisées.',
        },
        {
          icon: 'users',
          title: 'Workflow d\'approbation',
          desc: 'Soumission, révision par un collègue, observations structurées et approbation avec signature numérique.',
        },
        {
          icon: 'filetext',
          title: 'Export PDF professionnel',
          desc: 'Documents bilingues FR/EN avec sommaire dynamique, séparateurs, filigranes et numérotation continue.',
        },
        {
          icon: 'globe',
          title: 'Bilingue FR/EN',
          desc: 'Générez vos documents en français, en anglais ou les deux simultanément — pour les clients bilingues.',
        },
        {
          icon: 'lock',
          title: 'Données au Canada',
          desc: 'Hébergement sur serveurs canadiens (Toronto). Conformité Loi 25, PIPEDA et exigences de souveraineté des données.',
        },
        {
          icon: 'barchart',
          title: 'Gestion des mandats',
          desc: 'Suivi des heures, délais réglementaires automatiques, capacity planning et rendement d\'équipe.',
        },
        {
          icon: 'checkcircle',
          title: 'Contrôle qualité',
          desc: 'Score de qualité documentaire, validations automatiques et alertes sur les sections incomplètes.',
        },
      ],
    },
    documents: {
      tag: 'Documents supportés',
      title: 'Six types de documents réglementaires',
      subtitle: 'CORO prend en charge plusieurs des principaux documents de conformité utilisés au Québec, en Ontario et en Alberta.',
      items: [
        { code: 'PMU', name: 'Plan de Mesures d\'Urgence', desc: 'Document maître pour la gestion des situations d\'urgence dans les bâtiments commerciaux et industriels.', color: '#2980B9' },
        { code: 'PSI', name: 'Plan de Sécurité Incendie', desc: 'Plan spécifique aux mesures de prévention et d\'intervention en cas d\'incendie.', color: '#C0392B' },
        { code: 'PCA', name: 'Plan de Continuité des Activités', desc: 'Assure la continuité des opérations critiques lors d\'interruptions majeures.', color: '#27AE60' },
        { code: 'PGC', name: 'Plan de Gestion de Crise', desc: 'Protocoles de gestion et de communication lors de situations de crise.', color: '#8E44AD' },
        { code: 'PRA', name: 'Plan de Reprise des Activités', desc: 'Procédures de rétablissement après un sinistre ou une interruption majeure.', color: '#E67E22' },
        { code: 'PUE', name: 'Plan d\'Urgence Environnementale', desc: 'Réponse aux incidents environnementaux et déversements de matières dangereuses.', color: '#16A085' },
      ],
    },
    howItWorks: {
      tag: 'Comment ça fonctionne',
      title: 'De la configuration à la livraison en 4 étapes',
      steps: [
        { num: '01', title: 'Configurez le bâtiment', desc: 'Renseignez les informations du bâtiment (type, équipements, risques, matières dangereuses). CORO s\'adapte automatiquement.' },
        { num: '02', title: 'Générez le document', desc: 'En un clic, CORO génère la structure complète avec les procédures pertinentes présélectionnées selon votre configuration.' },
        { num: '03', title: 'Éditez et personnalisez', desc: 'Complétez les modules dans l\'éditeur intégré : liste téléphonique, organigramme, plans techniques, photos du site.' },
        { num: '04', title: 'Approuvez et exportez', desc: 'Faites réviser par un collègue via le workflow d\'approbation intégré, puis exportez en PDF professionnel bilingue.' },
      ],
    },
    pricing: {
      tag: 'Tarifs',
      title: 'Une solution pour chaque organisation',
      subtitle: 'Commencez gratuitement. Contactez-nous pour une soumission adaptée à vos besoins.',
      plans: [
        {
          name: 'Essai gratuit',
          price: '0$',
          period: '30 jours',
          desc: 'Pour découvrir CORO sans engagement.',
          color: '#27AE60',
          features: [
            '1 utilisateur',
            '3 projets maximum',
            'Tous les types de documents',
            'Export PDF avec filigrane',
            'Support par email',
          ],
          cta: 'Commencer gratuitement',
          highlight: false,
        },
        {
          name: 'Standard',
          price: 'Sur soumission',
          period: '',
          desc: 'Pour les firmes conseil en croissance.',
          color: '#C0392B',
          features: [
            'Jusqu\'à 5 utilisateurs',
            'Projets illimités',
            'Export PDF bilingue FR/EN',
            'Procédures IA personnalisées',
            'Matières dangereuses REPTOX',
            'Workflow d\'approbation',
            'Gestion des mandats complète',
            'Support prioritaire',
          ],
          cta: 'Demander une soumission',
          highlight: true,
        },
        {
          name: 'Entreprise',
          price: 'Sur devis',
          period: '',
          desc: 'Pour les grandes organisations.',
          color: '#2C3E50',
          features: [
            'Utilisateurs illimités',
            'Toutes les fonctionnalités Standard',
            'Capacity planning avancé',
            'Portail client dédié',
            'MFA et sécurité renforcée',
            'SLA de disponibilité',
            'Formation personnalisée',
            'Gestionnaire de compte dédié',
          ],
          cta: 'Nous contacter',
          highlight: false,
        },
      ],
    },
    sectors: {
      tag: 'Secteurs',
      title: 'Conçu pour deux réalités',
      items: [
        {
          icon: 'building',
          title: 'Bâtiments commerciaux',
          desc: 'Tours à bureaux, centres commerciaux, hôtels, établissements de santé, institutions d\'enseignement. PMU, PSI et Guide du locataire bilingue.',
        },
        {
          icon: 'factory',
          title: 'Sites industriels',
          desc: 'Usines, entrepôts, sites de production avec matières dangereuses. Procédures industrielles spécialisées, REPTOX et conformité TMD.',
        },
      ],
    },
    cta: {
      title: 'Prêt à moderniser votre pratique ?',
      subtitle: 'Rejoignez les professionnels de la sécurité qui font confiance à CORO pour leurs documents de conformité.',
      primary: 'Demander une démo',
      secondary: 'Accéder à la plateforme',
    },
    footer: {
      tagline: 'La conformité, pensée par des experts du terrain.',
      product: 'Produit',
      legal: 'Légal',
      contact: 'Contact',
      links: {
        features: 'Fonctionnalités',
        pricing: 'Tarifs',
        login: 'Connexion',
        privacy: 'Politique de confidentialité',
        terms: 'Conditions d\'utilisation',
      },
      rights: '© 2026 CORO. Tous droits réservés.',
      hosting: 'Hébergé au Canada 🇨🇦',
    },
  },
  en: {
    nav: {
      features: 'Features',
      documents: 'Documents',
      howItWorks: 'How it works',
      pricing: 'Pricing',
      login: 'Login',
      demo: 'Request a demo',
    },
    hero: {
      tag: 'SaaS Platform — Quebec & Canada',
      title: 'Compliance,\ndesigned by\nfield experts.',
      subtitle: 'CORO generates, structures and manages your emergency response plans, fire safety plans and continuity plans — with the regulatory rigor that fieldwork demands.',
      cta: 'Request a demo',
      ctaSecondary: 'View the platform',
      trusted: 'Built for safety professionals across Quebec and Canada',
    },
    stats: [
      { value: '6', label: 'Document types' },
      { value: '43+', label: 'Built-in procedures' },
      { value: '2', label: 'Languages (FR/EN)' },
      { value: 'QC', label: 'Integrated regulatory framework' },
    ],
    features: {
      tag: 'Features',
      title: 'Everything you need for document compliance',
      subtitle: 'CORO is designed as a professional tool — not a service. You keep full control of your documents.',
      items: [
        {
          icon: 'zap',
          title: 'Automatic generation',
          desc: 'Configure the building once, CORO automatically generates the complete document structure according to current standards.',
        },
        {
          icon: 'shield',
          title: 'Built-in procedures',
          desc: '43 codified emergency procedures (P001-P028, P101-P122) + AI generator for custom procedures.',
        },
        {
          icon: 'users',
          title: 'Approval workflow',
          desc: 'Submission, peer review, structured observations and approval with digital signature.',
        },
        {
          icon: 'filetext',
          title: 'Professional PDF export',
          desc: 'Bilingual FR/EN documents with dynamic table of contents, separators, watermarks and continuous pagination.',
        },
        {
          icon: 'globe',
          title: 'Bilingual FR/EN',
          desc: 'Generate your documents in French, English or both simultaneously — for bilingual clients.',
        },
        {
          icon: 'lock',
          title: 'Data hosted in Canada',
          desc: 'Hosted on Canadian servers (Toronto). Compliant with Law 25, PIPEDA and data sovereignty requirements.',
        },
        {
          icon: 'barchart',
          title: 'Mandate management',
          desc: 'Time tracking, automatic regulatory deadlines, capacity planning and team performance.',
        },
        {
          icon: 'checkcircle',
          title: 'Quality control',
          desc: 'Document quality score, automatic validations and alerts on incomplete sections.',
        },
      ],
    },
    documents: {
      tag: 'Supported documents',
      title: 'Six types of regulatory documents',
      subtitle: 'CORO supports several of the main compliance documents used in Quebec, Ontario and Alberta.',
      items: [
        { code: 'ERP', name: 'Emergency Response Plan', desc: 'Master document for emergency management in commercial and industrial buildings.', color: '#2980B9' },
        { code: 'FSP', name: 'Fire Safety Plan', desc: 'Specific plan for fire prevention and intervention measures.', color: '#C0392B' },
        { code: 'BCP', name: 'Business Continuity Plan', desc: 'Ensures continuity of critical operations during major interruptions.', color: '#27AE60' },
        { code: 'CMP', name: 'Crisis Management Plan', desc: 'Crisis management and communication protocols.', color: '#8E44AD' },
        { code: 'DRP', name: 'Disaster Recovery Plan', desc: 'Recovery procedures after a disaster or major interruption.', color: '#E67E22' },
        { code: 'EEP', name: 'Environmental Emergency Plan', desc: 'Response to environmental incidents and hazardous materials spills.', color: '#16A085' },
      ],
    },
    howItWorks: {
      tag: 'How it works',
      title: 'From configuration to delivery in 4 steps',
      steps: [
        { num: '01', title: 'Configure the building', desc: 'Enter building information (type, equipment, hazards, dangerous materials). CORO adapts automatically.' },
        { num: '02', title: 'Generate the document', desc: 'With one click, CORO generates the complete structure with relevant procedures pre-selected based on your configuration.' },
        { num: '03', title: 'Edit and customize', desc: 'Complete the modules in the integrated editor: phone list, org chart, technical plans, site photos.' },
        { num: '04', title: 'Approve and export', desc: 'Have a colleague review via the integrated approval workflow, then export as a professional bilingual PDF.' },
      ],
    },
    pricing: {
      tag: 'Pricing',
      title: 'A solution for every organization',
      subtitle: 'Start for free. Contact us for a quote tailored to your needs.',
      plans: [
        {
          name: 'Free trial',
          price: '$0',
          period: '30 days',
          desc: 'Discover CORO with no commitment.',
          color: '#27AE60',
          features: [
            '1 user',
            'Up to 3 projects',
            'All document types',
            'PDF export with watermark',
            'Email support',
          ],
          cta: 'Start for free',
          highlight: false,
        },
        {
          name: 'Standard',
          price: 'Custom pricing',
          period: '',
          desc: 'For growing consulting firms.',
          color: '#C0392B',
          features: [
            'Up to 5 users',
            'Unlimited projects',
            'Bilingual FR/EN PDF export',
            'Custom AI procedures',
            'REPTOX hazardous materials',
            'Approval workflow',
            'Full mandate management',
            'Priority support',
          ],
          cta: 'Request a quote',
          highlight: true,
        },
        {
          name: 'Enterprise',
          price: 'Custom',
          period: '',
          desc: 'For large organizations.',
          color: '#2C3E50',
          features: [
            'Unlimited users',
            'All Standard features',
            'Advanced capacity planning',
            'Dedicated client portal',
            'MFA & enhanced security',
            'Availability SLA',
            'Custom training',
            'Dedicated account manager',
          ],
          cta: 'Contact us',
          highlight: false,
        },
      ],
    },
    sectors: {
      tag: 'Sectors',
      title: 'Built for two realities',
      items: [
        {
          icon: 'building',
          title: 'Commercial buildings',
          desc: 'Office towers, shopping centers, hotels, healthcare facilities, educational institutions. ERP, FSP and bilingual occupant guide.',
        },
        {
          icon: 'factory',
          title: 'Industrial sites',
          desc: 'Factories, warehouses, production sites with hazardous materials. Specialized industrial procedures, REPTOX and TDG compliance.',
        },
      ],
    },
    cta: {
      title: 'Ready to modernize your practice?',
      subtitle: 'Join safety professionals who trust CORO for their compliance documents.',
      primary: 'Request a demo',
      secondary: 'Access the platform',
    },
    footer: {
      tagline: 'Compliance, designed by field experts.',
      product: 'Product',
      legal: 'Legal',
      contact: 'Contact',
      links: {
        features: 'Features',
        pricing: 'Pricing',
        login: 'Login',
        privacy: 'Privacy Policy',
        terms: 'Terms of Use',
      },
      rights: '© 2026 CORO. All rights reserved.',
      hosting: 'Hosted in Canada 🇨🇦',
    },
  },
};

const getIcon = (name: string, size = 24, color = '#C0392B') => {
  const props = { size, color, strokeWidth: 1.8 };
  switch (name) {
    case 'zap': return <Zap {...props} />;
    case 'shield': return <Shield {...props} />;
    case 'users': return <Users {...props} />;
    case 'filetext': return <FileText {...props} />;
    case 'globe': return <Globe {...props} />;
    case 'lock': return <Lock {...props} />;
    case 'barchart': return <BarChart3 {...props} />;
    case 'checkcircle': return <CheckCircle {...props} />;
    case 'building': return <Building2 {...props} />;
    case 'factory': return <Factory {...props} />;
    default: return <Shield {...props} />;
  }
};

export default function HomePage() {
  const [lang, setLang] = useState<'fr' | 'en'>('fr');
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'project' | 'editor'>('dashboard');
  const t = TRANSLATIONS[lang];

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('lang') === 'en') {
      setLang('en');
    }

    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const toggleLanguage = () => {
    const nextLang = lang === 'fr' ? 'en' : 'fr';
    setLang(nextLang);

    const url = new URL(window.location.href);
    if (nextLang === 'en') {
      url.searchParams.set('lang', 'en');
    } else {
      url.searchParams.delete('lang');
    }

    window.history.replaceState(
      {},
      '',
      `${url.pathname}${url.search}${url.hash}`
    );
  };

  return (
    <div style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>

      {/* ── NAVIGATION ── */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000,
        backgroundColor: scrolled ? 'rgba(255,255,255,0.97)' : 'transparent',
        backdropFilter: scrolled ? 'blur(10px)' : 'none',
        borderBottom: scrolled ? '1px solid #E9ECEF' : 'none',
        transition: 'all 0.3s ease',
        padding: '0 24px',
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 72 }}>
          
          {/* Logo */}
          <a
            href={lang === 'fr' ? '/' : '/?lang=en'}
            aria-label={lang === 'fr' ? 'Accueil CORO' : 'CORO home'}
            style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}
          >
            <span style={{ fontSize: 28, fontWeight: 900, color: scrolled ? '#2C3E50' : '#FFFFFF', letterSpacing: '-1px' }}>
              CO<span style={{ color: '#C0392B' }}>RO</span>
            </span>
          </a>

          {/* Desktop Menu */}
          <div style={{ alignItems: 'center', gap: 32 }} className="hidden md:flex">
            {[
              { key: 'features', href: '#features' },
              { key: 'documents', href: '#documents' },
              { key: 'howItWorks', href: '#how-it-works' },
              { key: 'pricing', href: '#pricing' },
            ].map(item => (
              <a key={item.key} href={item.href}
                style={{ color: scrolled ? '#2C3E50' : '#FFFFFF', fontSize: 15, fontWeight: 500, textDecoration: 'none' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#C0392B')}
                onMouseLeave={e => (e.currentTarget.style.color = scrolled ? '#2C3E50' : '#FFFFFF')}>
                {t.nav[item.key as keyof typeof t.nav]}
              </a>
            ))}
          </div>

          {/* Right actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* Lang switcher */}
            <button
              onClick={toggleLanguage}
              style={{
                padding: '6px 12px', borderRadius: 6, fontSize: 13, fontWeight: 600,
                border: `1px solid ${scrolled ? '#DEE2E6' : 'rgba(255,255,255,0.4)'}`,
                backgroundColor: 'transparent',
                color: scrolled ? '#2C3E50' : '#FFFFFF', cursor: 'pointer',
              }}>
              {lang === 'fr' ? 'EN' : 'FR'}
            </button>

            <a href="https://app.getcoro.io/login"
              style={{
                padding: '8px 18px', borderRadius: 6, fontSize: 14, fontWeight: 500,
                border: `1px solid ${scrolled ? '#DEE2E6' : 'rgba(255,255,255,0.4)'}`,
                color: scrolled ? '#2C3E50' : '#FFFFFF', textDecoration: 'none',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.backgroundColor = scrolled ? '#F8F9FA' : 'rgba(255,255,255,0.1)'; }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}>
              {t.nav.login}
            </a>

            <a href="#demo"
              style={{
                padding: '8px 18px', borderRadius: 6, fontSize: 14, fontWeight: 600,
                backgroundColor: '#C0392B', color: '#FFFFFF', textDecoration: 'none',
                transition: 'background-color 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#A93226'; }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#C0392B'; }}>
              {t.nav.demo}
            </a>

            {/* Mobile menu */}
            <button onClick={() => setMenuOpen(!menuOpen)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
              className="md:hidden block">
              {menuOpen
                ? <X size={24} color={scrolled ? '#2C3E50' : '#FFFFFF'} />
                : <Menu size={24} color={scrolled ? '#2C3E50' : '#FFFFFF'} />}
            </button>
          </div>
        </div>

        {/* Mobile menu dropdown */}
        {menuOpen && (
          <div style={{
            backgroundColor: '#FFFFFF', borderTop: '1px solid #E9ECEF',
            padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 16,
          }}>
            {[
              { label: t.nav.features, href: '#features' },
              { label: t.nav.documents, href: '#documents' },
              { label: t.nav.howItWorks, href: '#how-it-works' },
              { label: t.nav.pricing, href: '#pricing' },
            ].map(item => (
              <a key={item.href} href={item.href}
                onClick={() => setMenuOpen(false)}
                style={{ color: '#2C3E50', fontSize: 16, fontWeight: 500, textDecoration: 'none' }}>
                {item.label}
              </a>
            ))}
          </div>
        )}
      </nav>

      {/* ── HERO ── */}
      <section style={{
        minHeight: '100vh',
        display: 'flex', alignItems: 'center',
        padding: '120px 24px 80px',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Image de fond */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'url(/hero-building.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }} />
        {/* Overlay dégradé foncé pour lisibilité du texte */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(135deg, rgba(26,37,47,0.92) 0%, rgba(44,62,80,0.85) 60%, rgba(192,57,43,0.75) 100%)',
        }} />

        <div style={{ maxWidth: 1200, margin: '0 auto', width: '100%', position: 'relative', zIndex: 1 }}>
          <div style={{ maxWidth: 720 }}>
            <div className="animate-fade-in-up" style={{
              display: 'inline-block', backgroundColor: 'rgba(192,57,43,0.2)',
              border: '1px solid rgba(192,57,43,0.4)', borderRadius: 20,
              padding: '6px 16px', marginBottom: 24,
            }}>
              <span style={{ color: '#E74C3C', fontSize: 13, fontWeight: 600, letterSpacing: '0.05em' }}>
                {t.hero.tag}
              </span>
            </div>

            <h1 className="animate-fade-in-up delay-1" style={{
              fontSize: 'clamp(40px, 6vw, 72px)',
              fontWeight: 900, color: '#FFFFFF',
              lineHeight: 1.1, letterSpacing: '-2px',
              marginBottom: 24, whiteSpace: 'pre-line',
            }}>
              {t.hero.title}
            </h1>

            <p className="animate-fade-in-up delay-2" style={{
              fontSize: 18, color: 'rgba(255,255,255,0.75)',
              lineHeight: 1.7, marginBottom: 40, maxWidth: 560,
            }}>
              {t.hero.subtitle}
            </p>

            <div className="animate-fade-in-up delay-3" style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <a href="#demo" className="btn-primary" style={{ fontSize: 16 }}>
                {t.hero.cta} →
              </a>
              <a href="https://app.getcoro.io" className="btn-secondary" style={{ fontSize: 16 }}>
                {t.hero.ctaSecondary}
              </a>
            </div>

            <p className="animate-fade-in-up delay-4" style={{
              marginTop: 48, fontSize: 13, color: 'rgba(255,255,255,0.5)',
            }}>
              {t.hero.trusted}
            </p>
          </div>
        </div>
      </section>

      {/* ── STATS ── */}
      <section style={{ backgroundColor: '#FFFFFF', padding: '60px 24px', borderBottom: '1px solid #E9ECEF' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 32, textAlign: 'center' }}>
            {t.stats.map((stat, i) => (
              <div key={i}>
                <p style={{ fontSize: 48, fontWeight: 900, color: '#C0392B', lineHeight: 1 }}>{stat.value}</p>
                <p style={{ fontSize: 15, color: '#6C757D', marginTop: 8 }}>{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── APERÇU PLATEFORME ── */}
      <section style={{ backgroundColor: '#F8F9FA', padding: '100px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <span className="section-tag">
              {lang === 'fr' ? 'Aperçu de la plateforme' : 'Platform preview'}
            </span>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 800, color: '#2C3E50', lineHeight: 1.2, marginBottom: 16 }}>
              {lang === 'fr' ? 'Une interface pensée pour les professionnels' : 'An interface built for professionals'}
            </h2>
            <p style={{ fontSize: 18, color: '#6C757D', maxWidth: 600, margin: '0 auto' }}>
              {lang === 'fr'
                ? 'Puissant, structuré et facile à prendre en main — même sans formation technique.'
                : 'Powerful, structured and easy to use — even without technical training.'}
            </p>
          </div>

          {/* Tabs */}
          {(() => {
            const tabs = [
              { key: 'dashboard', label: lang === 'fr' ? '📊 Tableau de bord' : '📊 Dashboard', img: '/screenshot-dashboard.jpg' },
              { key: 'project', label: lang === 'fr' ? '📁 Fiche projet' : '📁 Project view', img: '/screenshot-project.jpg' },
              { key: 'editor', label: lang === 'fr' ? '✏️ Éditeur' : '✏️ Editor', img: '/screenshot-editor.jpg' },
            ];
            const active = tabs.find(t => t.key === activeTab)!;
            return (<>
              <div>
                {/* Tab buttons */}
                <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 32, flexWrap: 'wrap' }}>
                  {tabs.map(tab => (
                    <button key={tab.key}
                      onClick={() => setActiveTab(tab.key as any)}
                      style={{
                        padding: '10px 24px', borderRadius: 8, fontSize: 14, fontWeight: 600,
                        cursor: 'pointer', transition: 'all 0.2s',
                        backgroundColor: activeTab === tab.key ? '#C0392B' : '#FFFFFF',
                        color: activeTab === tab.key ? '#FFFFFF' : '#6C757D',
                        border: activeTab === tab.key ? '2px solid #C0392B' : '2px solid #DEE2E6',
                      }}>
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Browser mockup */}
                <div style={{
                  borderRadius: 12, overflow: 'hidden',
                  boxShadow: '0 24px 64px rgba(0,0,0,0.15)',
                  border: '1px solid #E9ECEF',
                  maxWidth: 1000, margin: '0 auto',
                }}>
                  {/* Browser bar */}
                  <div style={{
                    backgroundColor: '#F0F0F0', padding: '12px 16px',
                    display: 'flex', alignItems: 'center', gap: 8,
                    borderBottom: '1px solid #E0E0E0',
                  }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <div style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: '#FF5F57' }} />
                      <div style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: '#FFBD2E' }} />
                      <div style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: '#28CA41' }} />
                    </div>
                    <div style={{
                      flex: 1, backgroundColor: '#FFFFFF', borderRadius: 6,
                      padding: '4px 12px', fontSize: 12, color: '#999',
                      border: '1px solid #E0E0E0', textAlign: 'center',
                    }}>
                      app.getcoro.io
                    </div>
                  </div>
                  {/* Screenshot */}
                  <img
                    src={active.img}
                    alt={active.label}
                    style={{ width: '100%', display: 'block' }}
                  />
                </div>
              </div>
            </>);
          })()}
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" style={{ backgroundColor: '#FFFFFF', padding: '100px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <span className="section-tag">{t.features.tag}</span>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 800, color: '#2C3E50', lineHeight: 1.2, marginBottom: 16 }}>
              {t.features.title}
            </h2>
            <p style={{ fontSize: 18, color: '#6C757D', maxWidth: 600, margin: '0 auto' }}>
              {t.features.subtitle}
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24 }}>
            {t.features.items.map((feature, i) => (
              <div key={i} className="card">
                <div style={{
                  width: 52, height: 52, borderRadius: 12,
                  backgroundColor: '#FDEDEC', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: 20,
                }}>
                  {getIcon(feature.icon)}
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: '#2C3E50', marginBottom: 10 }}>
                  {feature.title}
                </h3>
                <p style={{ fontSize: 15, color: '#6C757D', lineHeight: 1.6 }}>
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── DOCUMENTS ── */}
      <section id="documents" style={{ backgroundColor: '#FFFFFF', padding: '100px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <span className="section-tag">{t.documents.tag}</span>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 800, color: '#2C3E50', lineHeight: 1.2, marginBottom: 16 }}>
              {t.documents.title}
            </h2>
            <p style={{ fontSize: 18, color: '#6C757D', maxWidth: 600, margin: '0 auto' }}>
              {t.documents.subtitle}
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
            {t.documents.items.map((doc, i) => (
              <div key={i} style={{
                borderRadius: 12, overflow: 'hidden',
                border: '1px solid #E9ECEF',
                transition: 'box-shadow 0.2s, transform 0.2s',
              }}
                onMouseEnter={e => {
                  e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.1)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.boxShadow = 'none';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}>
                <div style={{ backgroundColor: doc.color, padding: '20px 24px' }}>
                  <span style={{ fontSize: 28, fontWeight: 900, color: '#FFFFFF', letterSpacing: '-1px' }}>
                    {doc.code}
                  </span>
                </div>
                <div style={{ padding: '24px' }}>
                  <h3 style={{ fontSize: 17, fontWeight: 700, color: '#2C3E50', marginBottom: 10 }}>
                    {doc.name}
                  </h3>
                  <p style={{ fontSize: 14, color: '#6C757D', lineHeight: 1.6 }}>
                    {doc.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTORS ── */}
      <section style={{ backgroundColor: '#F8F9FA', padding: '100px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <span className="section-tag">{t.sectors.tag}</span>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 800, color: '#2C3E50', lineHeight: 1.2 }}>
              {t.sectors.title}
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 32 }}>
            {t.sectors.items.map((sector, i) => (
              <div key={i} style={{
                backgroundColor: '#FFFFFF', borderRadius: 16, padding: 48,
                border: '1px solid #E9ECEF',
                display: 'flex', flexDirection: 'column', gap: 20,
              }}>
                <div style={{
                  width: 64, height: 64, borderRadius: 16,
                  backgroundColor: '#FDEDEC', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {getIcon(sector.icon, 28)}
                </div>
                <div>
                  <h3 style={{ fontSize: 22, fontWeight: 800, color: '#2C3E50', marginBottom: 12 }}>
                    {sector.title}
                  </h3>
                  <p style={{ fontSize: 16, color: '#6C757D', lineHeight: 1.7 }}>
                    {sector.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how-it-works" style={{ backgroundColor: '#2C3E50', padding: '100px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <span style={{
              display: 'inline-block', backgroundColor: 'rgba(192,57,43,0.2)',
              border: '1px solid rgba(192,57,43,0.4)', borderRadius: 20,
              padding: '6px 16px', marginBottom: 16,
              color: '#E74C3C', fontSize: 13, fontWeight: 600, letterSpacing: '0.05em',
            }}>
              {t.howItWorks.tag}
            </span>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 800, color: '#FFFFFF', lineHeight: 1.2 }}>
              {t.howItWorks.title}
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 32 }}>
            {t.howItWorks.steps.map((step, i) => (
              <div key={i} style={{ position: 'relative' }}>
                <div style={{
                  fontSize: 56, fontWeight: 900, color: 'rgba(255,255,255,0.08)',
                  lineHeight: 1, marginBottom: 16,
                }}>
                  {step.num}
                </div>
                <h3 style={{ fontSize: 20, fontWeight: 700, color: '#FFFFFF', marginBottom: 12 }}>
                  {step.title}
                </h3>
                <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.65)', lineHeight: 1.7 }}>
                  {step.desc}
                </p>
                {i < t.howItWorks.steps.length - 1 && (
                  <div style={{
                    position: 'absolute', top: 28, right: -16,
                    display: 'none',
                  }}>
                    <ArrowRight size={20} color="rgba(255,255,255,0.2)" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="pricing" style={{ backgroundColor: '#FFFFFF', padding: '100px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <span className="section-tag">{t.pricing.tag}</span>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 800, color: '#2C3E50', lineHeight: 1.2, marginBottom: 16 }}>
              {t.pricing.title}
            </h2>
            <p style={{ fontSize: 18, color: '#6C757D' }}>
              {t.pricing.subtitle}
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24, alignItems: 'start' }}>
            {t.pricing.plans.map((plan, i) => (
              <div key={i} style={{
                borderRadius: 16, overflow: 'hidden',
                border: plan.highlight ? `2px solid ${plan.color}` : '1px solid #E9ECEF',
                boxShadow: plan.highlight ? '0 16px 48px rgba(192,57,43,0.15)' : 'none',
                transform: plan.highlight ? 'scale(1.02)' : 'scale(1)',
                position: 'relative',
              }}>
                {plan.highlight && (
                  <div style={{
                    backgroundColor: plan.color, padding: '8px 16px', textAlign: 'center',
                  }}>
                    <span style={{ color: '#FFFFFF', fontSize: 13, fontWeight: 700 }}>
                      {lang === 'fr' ? '⭐ Le plus populaire' : '⭐ Most popular'}
                    </span>
                  </div>
                )}
                <div style={{ padding: 40 }}>
                  <h3 style={{ fontSize: 22, fontWeight: 800, color: '#2C3E50', marginBottom: 8 }}>
                    {plan.name}
                  </h3>
                  <p style={{ fontSize: 14, color: '#6C757D', marginBottom: 24 }}>{plan.desc}</p>
                  <div style={{ marginBottom: 32 }}>
                    <span style={{ fontSize: 42, fontWeight: 900, color: plan.color }}>{plan.price}</span>
                    {plan.period && <span style={{ fontSize: 16, color: '#6C757D', marginLeft: 4 }}>{plan.period}</span>}
                  </div>
                  <ul style={{ listStyle: 'none', marginBottom: 32, display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {plan.features.map((feature, fi) => (
                      <li key={fi} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                        <CheckCircle size={18} color={plan.color} style={{ flexShrink: 0, marginTop: 1 }} />
                        <span style={{ fontSize: 15, color: '#495057' }}>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <a href="#demo"
                    style={{
                      display: 'block', textAlign: 'center', padding: '14px 24px',
                      borderRadius: 8, fontSize: 15, fontWeight: 700, textDecoration: 'none',
                      backgroundColor: plan.highlight ? plan.color : 'transparent',
                      color: plan.highlight ? '#FFFFFF' : plan.color,
                      border: `2px solid ${plan.color}`,
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.backgroundColor = plan.color;
                      e.currentTarget.style.color = '#FFFFFF';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.backgroundColor = plan.highlight ? plan.color : 'transparent';
                      e.currentTarget.style.color = plan.highlight ? '#FFFFFF' : plan.color;
                    }}>
                    {plan.cta}
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SÉCURITÉ ── */}
      <section id="security" style={{ backgroundColor: '#FFFFFF', padding: '100px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <span className="section-tag">
              {lang === 'fr' ? 'Sécurité & Conformité' : 'Security & Compliance'}
            </span>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 800, color: '#2C3E50', lineHeight: 1.2, marginBottom: 16 }}>
              {lang === 'fr' ? 'La sécurité, notre priorité' : 'Security, our priority'}
            </h2>
            <p style={{ fontSize: 18, color: '#6C757D', maxWidth: 640, margin: '0 auto' }}>
              {lang === 'fr'
                ? 'CORO a été conçu pour répondre aux exigences de conformité et de sécurité des grandes organisations.'
                : 'CORO was built to meet the security and compliance requirements of large organizations.'}
            </p>
          </div>

          {/* Grille sécurité */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24, marginBottom: 64 }}>
            {[
              {
                icon: '🇨🇦',
                title: lang === 'fr' ? 'Données hébergées au Canada' : 'Data hosted in Canada',
                desc: lang === 'fr'
                  ? 'Tous vos documents et données sont hébergés exclusivement sur des serveurs situés à Toronto, Ontario. Aucun transfert de données hors du Canada.'
                  : 'All your documents and data are hosted exclusively on servers located in Toronto, Ontario. No data transfer outside Canada.',
              },
              {
                icon: '🔒',
                title: lang === 'fr' ? 'Chiffrement des communications' : 'Encrypted communications',
                desc: lang === 'fr'
                  ? 'Toutes les communications sont chiffrées via HTTPS/TLS. Les mots de passe sont hachés avec bcrypt. Aucune donnée sensible en clair.'
                  : 'All communications are encrypted via HTTPS/TLS. Passwords are hashed with bcrypt. No sensitive data in plain text.',
              },
              {
                icon: '👥',
                title: lang === 'fr' ? 'Contrôle d\'accès granulaire' : 'Granular access control',
                desc: lang === 'fr'
                  ? 'Trois niveaux de rôles (Super Admin, Admin, Conseiller). Chaque organisation est isolée — aucune visibilité croisée entre clients.'
                  : 'Three role levels (Super Admin, Admin, Advisor). Each organization is isolated — no cross-visibility between clients.',
              },
              {
                icon: '💾',
                title: lang === 'fr' ? 'Sauvegardes automatiques' : 'Automated backups',
                desc: lang === 'fr'
                  ? 'Sauvegardes de la base de données toutes les 6 heures. Rétention de 30 jours. Snapshots quotidiens du serveur via DigitalOcean.'
                  : 'Database backups every 6 hours. 30-day retention. Daily server snapshots via DigitalOcean.',
              },
              {
                icon: '🛡️',
                title: lang === 'fr' ? 'Protection anti-intrusion' : 'Intrusion protection',
                desc: lang === 'fr'
                  ? 'Pare-feu réseau strict avec accès limité aux services essentiels. Protection anti-force brute sur l\'authentification. Headers de sécurité HTTP renforcés.'
                  : 'Strict network firewall with access limited to essential services. Brute-force protection on authentication. Enhanced HTTP security headers.',
              },
              {
                icon: '📊',
                title: lang === 'fr' ? 'Surveillance continue' : 'Continuous monitoring',
                desc: lang === 'fr'
                  ? 'Monitoring de disponibilité 24h/24, 7j/7 avec alertes en temps réel. Journal d\'audit complet de toutes les actions utilisateurs.'
                  : '24/7 uptime monitoring with real-time alerts. Complete audit trail of all user actions.',
              },
            ].map((item, i) => (
              <div key={i} style={{
                backgroundColor: '#F8F9FA', borderRadius: 12, padding: 32,
                border: '1px solid #E9ECEF',
              }}>
                <div style={{ fontSize: 36, marginBottom: 16 }}>{item.icon}</div>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: '#2C3E50', marginBottom: 12 }}>
                  {item.title}
                </h3>
                <p style={{ fontSize: 15, color: '#6C757D', lineHeight: 1.6 }}>
                  {item.desc}
                </p>
              </div>
            ))}
          </div>

          {/* Conformité réglementaire */}
          <div style={{
            backgroundColor: '#2C3E50', borderRadius: 16, padding: 48,
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 32, textAlign: 'center',
          }}>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
                {lang === 'fr' ? 'Conformité' : 'Compliance'}
              </p>
              <p style={{ fontSize: 20, fontWeight: 800, color: '#FFFFFF' }}>Loi 25</p>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>
                {lang === 'fr' ? 'Protection données QC' : 'QC data protection'}
              </p>
            </div>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
                {lang === 'fr' ? 'Conformité' : 'Compliance'}
              </p>
              <p style={{ fontSize: 20, fontWeight: 800, color: '#FFFFFF' }}>PIPEDA</p>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>
                {lang === 'fr' ? 'Loi fédérale canadienne' : 'Canadian federal law'}
              </p>
            </div>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
                {lang === 'fr' ? 'Infrastructure' : 'Infrastructure'}
              </p>
              <p style={{ fontSize: 20, fontWeight: 800, color: '#FFFFFF' }}>DigitalOcean</p>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>
                {lang === 'fr' ? 'SOC 2 Type II certifié' : 'SOC 2 Type II certified'}
              </p>
            </div>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
                {lang === 'fr' ? 'Disponibilité' : 'Availability'}
              </p>
              <p style={{ fontSize: 20, fontWeight: 800, color: '#FFFFFF' }}>99.9%</p>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>
                {lang === 'fr' ? 'SLA DigitalOcean' : 'DigitalOcean SLA'}
              </p>
            </div>
          </div>

          {/* Note transparence */}
          <p style={{ textAlign: 'center', fontSize: 14, color: '#ADB5BD', marginTop: 24 }}>
            {lang === 'fr'
              ? '🔍 Votre équipe TI souhaite analyser notre environnement en détail ? Contactez-nous pour un accès à notre documentation technique complète.'
              : '🔍 Your IT team wants to analyze our environment in detail? Contact us for access to our complete technical documentation.'}
          </p>
        </div>
      </section>

      {/* ── FORMULAIRE DÉMO ── */}
      <section id="demo" style={{ backgroundColor: '#F8F9FA', padding: '100px 24px' }}>
        <div style={{ maxWidth: 700, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <span className="section-tag">
              {lang === 'fr' ? 'Demander une démo' : 'Request a demo'}
            </span>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 800, color: '#2C3E50', lineHeight: 1.2, marginBottom: 16 }}>
              {lang === 'fr' ? 'Voyez CORO en action' : 'See CORO in action'}
            </h2>
            <p style={{ fontSize: 18, color: '#6C757D' }}>
              {lang === 'fr'
                ? 'Remplissez le formulaire et nous vous contacterons dans les 24 heures.'
                : 'Fill out the form and we\'ll contact you within 24 hours.'}
            </p>
          </div>

          <DemoForm lang={lang} />
        </div>
      </section>

      {/* ── CTA FINAL ── */}
      <section style={{
        background: 'linear-gradient(135deg, #C0392B 0%, #922B21 100%)',
        padding: '100px 24px', textAlign: 'center',
      }}>
        <div style={{ maxWidth: 700, margin: '0 auto' }}>
          <h2 style={{ fontSize: 'clamp(28px, 4vw, 48px)', fontWeight: 900, color: '#FFFFFF', marginBottom: 20, lineHeight: 1.2 }}>
            {t.cta.title}
          </h2>
          <p style={{ fontSize: 18, color: 'rgba(255,255,255,0.8)', marginBottom: 40, lineHeight: 1.6 }}>
            {t.cta.subtitle}
          </p>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href="#demo" className="btn-primary"
              style={{ backgroundColor: '#FFFFFF', color: '#C0392B', fontSize: 16 }}>
              {t.cta.primary} →
            </a>
            <a href="https://app.getcoro.io" className="btn-secondary" style={{ fontSize: 16 }}>
              {t.cta.secondary}
            </a>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
<footer
  style={{
    backgroundColor: '#1A252F',
    padding: '56px 24px 32px',
  }}
>
  <div
    style={{
      maxWidth: 1200,
      margin: '0 auto',
    }}
  >

    {/* ───────────────────────────── */}
    {/* LOGO / IDENTITÉ */}
    {/* ───────────────────────────── */}
    <div
      style={{
        marginBottom: 52,
      }}
    >
      <a
        href={lang === 'fr' ? '/' : '/?lang=en'}
        aria-label={lang === 'fr' ? 'Accueil CORO' : 'CORO home'}
        style={{ textDecoration: 'none', display: 'inline-block' }}
      >
        <span
          style={{
            fontSize: 28,
            fontWeight: 900,
            color: '#FFFFFF',
            letterSpacing: '-1px',
          }}
        >
          CO<span style={{ color: '#C0392B' }}>RO</span>
        </span>
      </a>

      <p
        style={{
          color: 'rgba(255,255,255,0.5)',
          fontSize: 14,
          marginTop: 12,
          lineHeight: 1.7,
          maxWidth: 280,
        }}
      >
        {t.footer.tagline}
      </p>
    </div>


    {/* ───────────────────────────── */}
    {/* COLONNES PRINCIPALES */}
    {/* ───────────────────────────── */}
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: 48,
        marginBottom: 72,
        alignItems: 'start',
      }}
    >

      {/* CANADA */}
      <div>
        <h4
          style={{
            color: '#FFFFFF',
            fontSize: 13,
            fontWeight: 700,
            margin: 0,
            marginBottom: 20,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
          }}
        >
          🇨🇦 Canada
        </h4>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 7,
          }}
        >
          <p
            style={{
              color: 'rgba(255,255,255,0.5)',
              fontSize: 13,
              lineHeight: 1.75,
              margin: 0,
            }}
          >
            2879 Boul. Pierre-Bernard
            <br />
            Montréal (QC), H1L 4R2
            <br />
            Canada
          </p>

          <a
            href="mailto:info@getcoro.io"
            style={{
              color: 'rgba(255,255,255,0.5)',
              fontSize: 13,
              textDecoration: 'none',
              marginTop: 12,
            }}
            onMouseEnter={e =>
              (e.currentTarget.style.color = '#FFFFFF')
            }
            onMouseLeave={e =>
              (e.currentTarget.style.color =
                'rgba(255,255,255,0.5)')
            }
          >
            info@getcoro.io
          </a>

          <a
            href="tel:+15147917871"
            style={{
              color: 'rgba(255,255,255,0.5)',
              fontSize: 13,
              textDecoration: 'none',
            }}
            onMouseEnter={e =>
              (e.currentTarget.style.color = '#FFFFFF')
            }
            onMouseLeave={e =>
              (e.currentTarget.style.color =
                'rgba(255,255,255,0.5)')
            }
          >
            +1 (514) 791-7871
          </a>
        </div>
      </div>


      {/* PRODUIT */}
      <div>
        <h4
          style={{
            color: '#FFFFFF',
            fontSize: 13,
            fontWeight: 700,
            margin: 0,
            marginBottom: 20,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
          }}
        >
          {t.footer.product}
        </h4>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          {[
            {
              label: t.footer.links.features,
              href: '#features',
            },
            {
              label: t.footer.links.pricing,
              href: '#pricing',
            },
            {
              label: t.footer.links.login,
              href: 'https://app.getcoro.io/login',
            },
          ].map(link => (
            <a
              key={link.href}
              href={link.href}
              style={{
                color: 'rgba(255,255,255,0.5)',
                fontSize: 14,
                textDecoration: 'none',
              }}
              onMouseEnter={e =>
                (e.currentTarget.style.color = '#FFFFFF')
              }
              onMouseLeave={e =>
                (e.currentTarget.style.color =
                  'rgba(255,255,255,0.5)')
              }
            >
              {link.label}
            </a>
          ))}
        </div>
      </div>


      {/* COMPAGNIE */}
<div>
  <h4
    style={{
      color: '#FFFFFF',
      fontSize: 13,
      fontWeight: 700,
      margin: 0,
      marginBottom: 20,
      textTransform: 'uppercase',
      letterSpacing: '0.1em',
    }}
  >
    {lang === 'fr' ? 'Compagnie' : 'Company'}
  </h4>

  <div
    style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
    }}
  >
    {[
  {
    id: 'about',
    label: lang === 'fr' ? 'À propos' : 'About us',
    href: lang === 'fr' ? '/about' : '/about?lang=en',
  },
  {
    id: 'security',
    label: lang === 'fr' ? 'Sécurité' : 'Security',
    href: lang === 'fr' ? '/security' : '/security?lang=en',
  },
  {
    id: 'blog',
    label: lang === 'fr' ? 'Blogue' : 'Blog',
    href: '/blog',
    soon: true,
  },
  {
    id: 'partners',
    label: lang === 'fr' ? 'Partenaires' : 'Partners',
    href: '/partners',
    soon: true,
  },
  {
    id: 'contact',
    label: lang === 'fr' ? 'Nous contacter' : 'Contact us',
    href: '#demo',
  },
].map(link => (
      <div
        key={link.id}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <a
          href={link.href}
          style={{
            color: 'rgba(255,255,255,0.5)',
            fontSize: 14,
            textDecoration: 'none',
          }}
          onMouseEnter={e =>
            (e.currentTarget.style.color = '#FFFFFF')
          }
          onMouseLeave={e =>
            (e.currentTarget.style.color =
              'rgba(255,255,255,0.5)')
          }
        >
          {link.label}
        </a>

        {link.soon && (
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: '#F39C12',
              backgroundColor: 'rgba(243,156,18,0.15)',
              border: '1px solid rgba(243,156,18,0.3)',
              padding: '1px 6px',
              borderRadius: 4,
            }}
          >
            {lang === 'fr' ? 'Bientôt' : 'Soon'}
          </span>
        )}
      </div>
    ))}
  </div>
</div>


      {/* LÉGAL */}
      <div>
        <h4
          style={{
            color: '#FFFFFF',
            fontSize: 13,
            fontWeight: 700,
            margin: 0,
            marginBottom: 20,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
          }}
        >
          {t.footer.legal}
        </h4>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          {[
  {
    id: 'privacy',
    label: t.footer.links.privacy,
    href: lang === 'fr' ? '/privacy' : '/privacy?lang=en',
  },
  {
    id: 'terms',
    label: t.footer.links.terms,
    href: lang === 'fr' ? '/terms' : '/terms?lang=en',
  },
].map(link => (
            <a
              key={link.id}
              href={link.href}
              style={{
                color: 'rgba(255,255,255,0.5)',
                fontSize: 14,
                textDecoration: 'none',
              }}
              onMouseEnter={e =>
                (e.currentTarget.style.color = '#FFFFFF')
              }
              onMouseLeave={e =>
                (e.currentTarget.style.color =
                  'rgba(255,255,255,0.5)')
              }
            >
              {link.label}
            </a>
          ))}
        </div>
      </div>

    </div>


    {/* ───────────────────────────── */}
    {/* BAS DU FOOTER */}
    {/* ───────────────────────────── */}
    <div
      style={{
        borderTop:
          '1px solid rgba(255,255,255,0.08)',
        paddingTop: 28,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 20,
        }}
      >

        {/* GAUCHE */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 20,
            flexWrap: 'wrap',
          }}
        >
          <p
            style={{
              color: 'rgba(255,255,255,0.3)',
              fontSize: 13,
              margin: 0,
            }}
          >
            {t.footer.rights}
          </p>

          <span
            style={{
              color: 'rgba(255,255,255,0.15)',
            }}
          >
            |
          </span>

          <a href={lang === 'fr' ? '/privacy' : '/privacy?lang=en'}
            style={{
              color: 'rgba(255,255,255,0.3)',
              fontSize: 13,
              textDecoration: 'none',
            }}
            onMouseEnter={e =>
              (e.currentTarget.style.color = '#FFFFFF')
            }
            onMouseLeave={e =>
              (e.currentTarget.style.color =
                'rgba(255,255,255,0.3)')
            }
          >
            {t.footer.links.privacy}
          </a>

          <span
            style={{
              color: 'rgba(255,255,255,0.15)',
            }}
          >
            |
          </span>

          <a href={lang === 'fr' ? '/terms' : '/terms?lang=en'}
            style={{
              color: 'rgba(255,255,255,0.3)',
              fontSize: 13,
              textDecoration: 'none',
            }}
            onMouseEnter={e =>
              (e.currentTarget.style.color = '#FFFFFF')
            }
            onMouseLeave={e =>
              (e.currentTarget.style.color =
                'rgba(255,255,255,0.3)')
            }
          >
            {t.footer.links.terms}
          </a>
        </div>


        {/* DROITE */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
          }}
        >
          <p
            style={{
              color: 'rgba(255,255,255,0.3)',
              fontSize: 13,
              margin: 0,
            }}
          >
            {t.footer.hosting}
          </p>

          <button
            onClick={toggleLanguage}
            style={{
              padding: '7px 14px',
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 600,
              border:
                '1px solid rgba(255,255,255,0.15)',
              backgroundColor: 'transparent',
              color: 'rgba(255,255,255,0.5)',
              cursor: 'pointer',
            }}
            onMouseEnter={e =>
              (e.currentTarget.style.color = '#FFFFFF')
            }
            onMouseLeave={e =>
              (e.currentTarget.style.color =
                'rgba(255,255,255,0.5)')
            }
          >
            {lang === 'fr'
              ? '🌐 English'
              : '🌐 Français'}
          </button>
        </div>

      </div>
    </div>

  </div>
</footer>
    </div>
  );
}