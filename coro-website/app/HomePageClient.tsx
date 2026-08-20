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
      login: 'Espace professionnel',
      clientPortal: 'Portail client',
      demo: 'Demander une démo',
    },
    hero: {
      tag: 'Plateforme SaaS de conformité — Québec & Canada',
      title: 'La conformité,\npensée par des\nexperts du terrain.',
      subtitle: 'CORO est une plateforme SaaS canadienne de conformité opérationnelle qui génère, structure et gère vos plans de mesures d\'urgence (PMU), plans de sécurité incendie (PSI) et plans de continuité des activités (PCA) — avec la rigueur qu\'exige le terrain.',
      cta: 'Demander une démo',
      ctaSecondary: 'Voir la plateforme',
      trusted: 'Conçue pour les professionnels de la sécurité au Québec et au Canada',
    },
    stats: [
      { value: '6', label: 'Types de documents' },
      { value: '43+', label: 'Procédures intégrées' },
      { value: '2', label: 'Langues (FR/EN)' },
      { value: '3', label: 'Cadres provinciaux couverts' },
    ],
    solutions: {
  tag: 'La plateforme CORO',
  title: 'Une plateforme. Quatre dimensions complémentaires.',
  subtitle:
    'Découvrez les quatre grands univers qui composent CORO.',

  items: [
    {
      number: '01',
      title: 'Production & conformité documentaire',
      headline: 'Créez et gérez vos documents de conformité',
      desc:
        'PMU, PSI, PCA, PGC, PRA et PUE, procédures intégrées, génération automatisée, édition structurée, contrôle qualité, approbation et export PDF professionnel.',
      cta: 'Découvrir la gestion documentaire',
      image: '/images/solutions/coro-gestion-documentaire.webp',
      href: '/gestion-documentaire',
    },
    {
      number: '02',
      title: 'Gestion de projets & mandats',
      headline: 'Pilotez vos mandats du démarrage à la livraison',
      desc:
        'Centralisez les projets, bâtiments, activités, échéances, responsabilités, heures prévues et réalisées et suivez l’avancement de chaque mandat depuis un environnement unique.',
      cta: 'Découvrir la gestion de projets',
      image: '/images/solutions/coro-gestion-projets.webp',
      href: '/gestion-de-projets',
    },
    {
      number: '03',
      title: 'Performance & objectifs',
      headline: 'Transformez vos opérations en données exploitables',
      desc:
        'Suivez les heures, les budgets, le rendement des mandats, la capacité de production et les objectifs afin d’identifier rapidement les écarts et de mieux planifier vos ressources.',
      cta: 'Découvrir le pilotage de la performance',
      image: '/images/solutions/coro-performance-objectifs.webp',
      href: '/performance-objectifs',
    },
    {
      number: '04',
      title: 'Portail client',
      headline: 'Prolongez l’expérience CORO jusqu’à vos clients',
      desc:
        'Offrez à vos clients un espace sécurisé leur permettant de consulter leurs documents, suivre leur statut, visualiser leurs activités à venir et retrouver l’information liée à leurs mandats.',
      cta: 'Découvrir le portail client',
      image: '/images/solutions/coro-portail-client.webp',
      href: '/portail-client',
    },
  ],
},
    features: {
      tag: 'Fonctionnalités',
      title: 'Une plateforme complète pour la conformité opérationnelle et documentaire',
      subtitle: 'CORO centralise la création, la gestion, la révision et le suivi de vos documents de mesures d’urgence, de sécurité incendie et de continuité des activités.',
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
      title: 'Six types de documents de conformité',
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
  desc: 'Découvrez CORO avec notre équipe, puis testez la plateforme dans votre propre environnement.',
  color: '#27AE60',
  features: [
    '1 utilisateur',
    '3 projets maximum',
    'Tous les types de documents',
    'Export PDF avec filigrane',
    'Support par email',
    'Accès activé à la suite d’une démonstration',
  ],
  cta: 'Demander une démo',
  highlight: false,
},
        {
          name: 'Standard',
          price: 'Obtenir une estimation',
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
          price: 'Parlez à notre équipe',
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
      subtitle: 'Découvrez comment CORO peut transformer votre façon de produire et gérer vos documents de conformité.',
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
        clientPortal: 'Portail client',
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
      login: 'Professional login',
      clientPortal: 'Client portal',
      demo: 'Request a demo',
    },
    hero: {
      tag: 'Compliance SaaS Platform — Quebec & Canada',
      title: 'Compliance,\ndesigned by\nfield experts.',
      subtitle: 'CORO is a Canadian SaaS platform for operational compliance that generates, structures and manages Emergency Response Plans, Fire Safety Plans and Business Continuity Plans — with the rigor field professionals expect.',
      cta: 'Request a demo',
      ctaSecondary: 'View the platform',
      trusted: 'Built for safety professionals across Quebec and Canada',
    },
    stats: [
      { value: '6', label: 'Document types' },
      { value: '43+', label: 'Built-in procedures' },
      { value: '2', label: 'Languages (FR/EN)' },
      { value: '3', label: 'Provincial frameworks covered' },
    ],
    solutions: {
  tag: 'The CORO platform',
  title: 'One platform. Four complementary dimensions.',
  subtitle:
    'Discover the four core areas that make up the CORO platform.',

  items: [
    {
      number: '01',
      title: 'Document Production & Compliance',
      headline: 'Create and manage your compliance documents',
      desc:
        'ERP, FSP, BCP, CMP, DRP and EEP, built-in procedures, automated generation, structured editing, quality control, approval workflows and professional PDF export.',
      cta: 'Discover document management',
      image: '/images/solutions/en/coro-document-management.webp',
      href: '/gestion-documentaire?lang=en',
    },
    {
      number: '02',
      title: 'Project & Mandate Management',
      headline: 'Manage your mandates from kickoff to delivery',
      desc:
        'Centralize projects, buildings, activities, deadlines, responsibilities, planned and actual hours, and track the progress of each mandate from a single environment.',
      cta: 'Discover project management',
      image: '/images/solutions/en/coro-project-management.webp',
      href: '/gestion-de-projets?lang=en',
    },
    {
      number: '03',
      title: 'Performance & Objectives',
      headline: 'Turn your operations into actionable data',
      desc:
        'Track hours, budgets, mandate performance, production capacity and objectives to quickly identify gaps and better plan your resources.',
      cta: 'Discover performance management',
      image: '/images/solutions/en/coro-performance-objectives.webp',
      href: '/performance-objectifs?lang=en',
    },
    {
      number: '04',
      title: 'Client Portal',
      headline: 'Extend the CORO experience to your clients',
      desc:
        'Provide your clients with a secure space to access their documents, track their status, view upcoming activities and retrieve information related to their mandates.',
      cta: 'Discover the client portal',
      image: '/images/solutions/en/coro-client-portal.webp',
      href: '/portail-client?lang=en',
    },
  ],
},
    features: {
      tag: 'Features',
      title: 'A complete platform for operational and document compliance',
      subtitle: 'CORO centralizes the creation, management, review and tracking of emergency, fire safety and business continuity documentation.',
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
      title: 'Six types of compliance documents',
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
  desc: 'Discover CORO with our team, then try the platform in your own environment.',
  color: '#27AE60',
  features: [
    '1 user',
    '3 projects maximum',
    'All document types',
    'Watermarked PDF export',
    'Email support',
    'Access activated following a demo',
  ],
  cta: 'Request a demo',
  highlight: false,
},
        {
          name: 'Standard',
          price: 'Get an estimate',
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
          price: 'Talk to our team',
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
      subtitle: 'Discover how CORO can transform the way you create and manage your compliance documents.',
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
        clientPortal: 'Client portal',
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
  const tabs_keys: Array<'dashboard' | 'project' | 'editor'> = ['dashboard', 'project', 'editor'];

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveTab(prev => {
        const idx = tabs_keys.indexOf(prev);
        return tabs_keys[(idx + 1) % tabs_keys.length];
      });
    }, 4000);
    return () => clearInterval(interval);
  }, []);
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            
            {/* Lang switcher — icône globe sur mobile, texte sur desktop */}
            <button
              onClick={toggleLanguage}
              title={lang === 'fr' ? 'Switch to English' : 'Passer en français'}
              style={{
                padding: '8px', borderRadius: 6, fontSize: 13, fontWeight: 600,
                border: `1px solid ${scrolled ? '#DEE2E6' : 'rgba(255,255,255,0.4)'}`,
                backgroundColor: 'transparent',
                color: scrolled ? '#2C3E50' : '#FFFFFF', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 4,
              }}>
              <Globe size={16} />
              <span className="hidden md:inline">{lang === 'fr' ? 'EN' : 'FR'}</span>
            </button>

            {/* Portail client */}
<a
  href="https://client.getcoro.io/login"
  title={t.nav.clientPortal}
  style={{
    padding: '8px',
    borderRadius: 6,
    fontSize: 14,
    fontWeight: 500,
    border: `1px solid ${scrolled ? '#DEE2E6' : 'rgba(255,255,255,0.4)'}`,
    color: scrolled ? '#2C3E50' : '#FFFFFF',
    textDecoration: 'none',
    transition: 'all 0.2s',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  }}
  onMouseEnter={e => {
    e.currentTarget.style.backgroundColor = scrolled
      ? '#F8F9FA'
      : 'rgba(255,255,255,0.1)';
  }}
  onMouseLeave={e => {
    e.currentTarget.style.backgroundColor = 'transparent';
  }}
>
  <Building2 size={16} />
  <span className="hidden md:inline">{t.nav.clientPortal}</span>
</a>

            {/* Connexion — icône sur mobile, texte sur desktop */}
            <a href="https://app.getcoro.io/login"
              title={t.nav.login}
              style={{
                padding: '8px', borderRadius: 6, fontSize: 14, fontWeight: 500,
                border: `1px solid ${scrolled ? '#DEE2E6' : 'rgba(255,255,255,0.4)'}`,
                color: scrolled ? '#2C3E50' : '#FFFFFF', textDecoration: 'none',
                transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: 6,
              }}
              onMouseEnter={e => { e.currentTarget.style.backgroundColor = scrolled ? '#F8F9FA' : 'rgba(255,255,255,0.1)'; }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}>
              <Users size={16} />
              <span className="hidden md:inline">{t.nav.login}</span>
            </a>

            {/* Demander une démo — caché sur mobile */}
            <a href="#demo"
              className="hidden md:inline-block"
              style={{
                padding: '8px 18px', borderRadius: 6, fontSize: 14, fontWeight: 600,
                backgroundColor: '#C0392B', color: '#FFFFFF', textDecoration: 'none',
                transition: 'background-color 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#A93226'; }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#C0392B'; }}>
              {t.nav.demo}
            </a>

            {/* Hamburger — visible sur mobile seulement */}
            <button onClick={() => setMenuOpen(!menuOpen)}
              className="md:hidden"
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
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

            {/* ── SOLUTIONS / 4 PILIERS CORO ── */}
      <section
        id="solutions"
        style={{
          backgroundColor: '#F8F9FA',
          padding: '100px 24px',
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: '0 auto',
          }}
        >
          {/* En-tête */}
          <div
            style={{
              textAlign: 'center',
              marginBottom: 64,
            }}
          >
            <span className="section-tag">
              {t.solutions.tag}
            </span>

            <h2
              style={{
                fontSize: 'clamp(28px, 4vw, 42px)',
                fontWeight: 800,
                color: '#2C3E50',
                lineHeight: 1.2,
                marginBottom: 16,
              }}
            >
              {t.solutions.title}
            </h2>

            <p
              style={{
                fontSize: 18,
                color: '#6C757D',
                maxWidth: 680,
                margin: '0 auto',
                lineHeight: 1.7,
              }}
            >
              {t.solutions.subtitle}
            </p>
          </div>

          {/* Grille des 4 grandes cartes */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns:
                'repeat(auto-fit, minmax(min(480px, 100%), 1fr))',
              gap: 28,
            }}
          >
            {t.solutions.items.map((solution, i) => {
              const href =
                lang === 'en'
                  ? `${solution.href}?lang=en`
                  : solution.href;

              return (
                <a
                  key={solution.number}
                  href={href}
                  style={{
                    position: 'relative',
                    display: 'flex',
                    flexDirection: 'column',
                    minWidth: 0,
                    overflow: 'hidden',
                    backgroundColor: '#FFFFFF',
                    borderRadius: 18,
                    border: '1px solid #E9ECEF',
                    textDecoration: 'none',
                    boxShadow: '0 4px 18px rgba(0,0,0,0.04)',
                    transition:
                      'transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform =
                      'translateY(-5px)';
                    e.currentTarget.style.boxShadow =
                      '0 18px 40px rgba(0,0,0,0.10)';
                    e.currentTarget.style.borderColor =
                      '#D5D8DC';

                    const image =
                      e.currentTarget.querySelector(
                        'img'
                      );

                    if (image) {
                      image.style.transform =
                        'scale(1.025)';
                    }
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform =
                      'translateY(0)';
                    e.currentTarget.style.boxShadow =
                      '0 4px 18px rgba(0,0,0,0.04)';
                    e.currentTarget.style.borderColor =
                      '#E9ECEF';

                    const image =
                      e.currentTarget.querySelector(
                        'img'
                      );

                    if (image) {
                      image.style.transform =
                        'scale(1)';
                    }
                  }}
                >
                  {/* Visuel */}
                  <div
                    style={{
                      position: 'relative',
                      width: '100%',
                      aspectRatio: '16 / 9',
                      overflow: 'hidden',
                      backgroundColor: '#2C3E50',
                      borderBottom: '1px solid #E9ECEF',
                    }}
                  >
                    <img
                      src={solution.image}
                      alt={solution.title}
                      loading="lazy"
                      style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      objectPosition: 'center',
                      display: 'block',
                      transition: 'transform 0.35s ease',
                    }}
                    />
                  </div>

                  {/* Contenu */}
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      flex: 1,
                      padding:
                        'clamp(22px, 4vw, 32px)',
                    }}
                  >
                    <p
                      style={{
                        margin: '0 0 8px',
                        fontSize: 12,
                        fontWeight: 800,
                        color: '#C0392B',
                        textTransform: 'uppercase',
                        letterSpacing: '0.08em',
                      }}
                    >
                      {solution.title}
                    </p>

                    <h3
                      style={{
                        margin: '0 0 12px',
                        fontSize:
                          'clamp(20px, 2.5vw, 24px)',
                        lineHeight: 1.3,
                        fontWeight: 800,
                        color: '#2C3E50',
                      }}
                    >
                      {solution.headline}
                    </h3>

                    <p
                      style={{
                        margin: '0 0 24px',
                        fontSize: 15,
                        lineHeight: 1.7,
                        color: '#6C757D',
                        flex: 1,
                      }}
                    >
                      {solution.desc}
                    </p>

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent:
                          'space-between',
                        gap: 12,
                        paddingTop: 18,
                        borderTop:
                          '1px solid #F1F3F5',
                      }}
                    >
                      <span
                        style={{
                          fontSize: 14,
                          fontWeight: 700,
                          color: '#C0392B',
                        }}
                      >
                        {solution.cta}
                      </span>

                      <ArrowRight
                        size={18}
                        color="#C0392B"
                        style={{
                          flexShrink: 0,
                        }}
                      />
                    </div>
                  </div>
                </a>
              );
            })}
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

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
            {t.documents.items.map((doc, i) => (
              <a href={`/documents/${
                doc.code === 'PMU' ? 'plan-mesures-urgence-pmu' :
                doc.code === 'PSI' ? 'plan-securite-incendie-psi' :
                doc.code === 'PCA' ? 'plan-continuite-activites-pca' :
                doc.code === 'PGC' ? 'plan-gestion-crise-pgc' :
                doc.code === 'PRA' ? 'plan-reprise-activites-pra' :
                doc.code === 'ERP' ? 'plan-mesures-urgence-pmu' :
                doc.code === 'FSP' ? 'plan-securite-incendie-psi' :
                doc.code === 'BCP' ? 'plan-continuite-activites-pca' :
                doc.code === 'CMP' ? 'plan-gestion-crise-pgc' :
                doc.code === 'DRP' ? 'plan-reprise-activites-pra' :
                'plan-urgence-environnementale-pue'
              }`} key={i} style={{
                borderRadius: 12,
                border: '1px solid #E9ECEF',
                borderLeft: `4px solid ${doc.color}`,
                backgroundColor: '#FFFFFF',
                padding: '28px 28px 28px 24px',
                transition: 'box-shadow 0.2s, transform 0.2s',
                display: 'flex', flexDirection: 'column', gap: 12,
                textDecoration: 'none', cursor: 'pointer',
              }}
                onMouseEnter={e => {
                  e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.08)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.boxShadow = 'none';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{
                    fontSize: 13, fontWeight: 900, color: '#FFFFFF',
                    backgroundColor: doc.color,
                    padding: '4px 10px', borderRadius: 6,
                    letterSpacing: '0.05em',
                  }}>
                    {doc.code}
                  </span>
                </div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: '#2C3E50', margin: 0 }}>
                  {doc.name}
                </h3>
                <p style={{ fontSize: 14, color: '#6C757D', lineHeight: 1.6, margin: 0 }}>
                  {doc.desc}
                </p>
                <p style={{ fontSize: 13, fontWeight: 600, color: doc.color, margin: 0 }}>
                  {lang === 'fr' ? 'En savoir plus →' : 'Learn more →'}
                </p>
              </a>
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

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 32 }}>
            {t.sectors.items.map((sector, i) => (
              <div key={i} style={{
                borderRadius: 16, overflow: 'hidden',
                border: '1px solid #E9ECEF',
                display: 'flex', flexDirection: 'column',
              }}>
                {/* Photo */}
                <div style={{
                  height: 240, overflow: 'hidden', position: 'relative',
                  maxWidth: '100%',
                }}>
                  <img
                    src={i === 0 ? '/sector-commercial.jpg' : '/sector-industrial.jpg'}
                    alt={sector.title}
                    style={{
                      width: '100%', height: '100%', objectFit: 'cover',
                      transition: 'transform 0.4s ease',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.05)')}
                    onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
                  />
                  <div style={{
                    position: 'absolute', inset: 0,
                    background: 'linear-gradient(to top, rgba(44,62,80,0.6) 0%, transparent 60%)',
                  }} />
                  <div style={{
                    position: 'absolute', bottom: 16, left: 16,
                    width: 48, height: 48, borderRadius: 12,
                    backgroundColor: 'rgba(255,255,255,0.15)',
                    backdropFilter: 'blur(8px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {getIcon(sector.icon, 24, '#FFFFFF')}
                  </div>
                </div>
                {/* Contenu */}
                <div style={{ padding: 32, backgroundColor: '#FFFFFF', flex: 1 }}>
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
      <section id="how-it-works" style={{ padding: '100px 24px', position: 'relative', overflow: 'hidden' }}>
        {/* Photo de fond */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'url(/how-it-works-bg.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }} />
        {/* Overlay foncé */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundColor: 'rgba(26, 37, 47, 0.88)',
        }} />
        <div style={{ maxWidth: 1200, margin: '0 auto', position: 'relative', zIndex: 1 }}>
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
                  <h3 style={{ fontSize: 40, fontWeight: 800, color: '#2C3E50', marginBottom: 8 }}>
                    {plan.name}
                  </h3>
                  <p style={{ fontSize: 14, color: '#6C757D', marginBottom: 24 }}>{plan.desc}</p>
                  <div style={{ marginBottom: 32 }}>
                    <span style={{ 
                      fontSize: plan.price === 'Sur soumission' || plan.price === 'Custom pricing' ? 34 : 42, 
                      fontWeight: 900, 
                      color: plan.color 
                    }}>{plan.price}</span>
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
      <section id="demo" style={{ padding: '100px 24px', position: 'relative', overflow: 'hidden' }}>
        {/* Photo de fond */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'url(/demo-bg.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }} />
        {/* Overlay clair */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundColor: 'rgba(248, 249, 250, 0.93)',
        }} />
        <div style={{ maxWidth: 700, margin: '0 auto', position: 'relative', zIndex: 1 }}>
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
    </div>
  );
}