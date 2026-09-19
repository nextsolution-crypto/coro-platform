'use client';

import { useState, useEffect } from 'react';
import {
  Shield,
  ShieldCheck,
  FileText,
  Users,
  Zap,
  CheckCircle,
  Globe,
  Lock,
  BarChart3,
  Menu,
  X,
  Building2,
  Factory,
  ArrowRight,
  Briefcase,
  ChevronDown,
  Award,
  Play,
} from 'lucide-react';
import DemoForm from './DemoForm';

const REFERRAL_COOKIE_CODE = 'coro_referral_code';
const REFERRAL_COOKIE_FIRST_TOUCH = 'coro_referral_first_touch';
const REFERRAL_COOKIE_MAX_AGE = 60 * 60 * 24 * 90; // 90 jours

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
  tag: 'Plateforme de résilience opérationnelle · Québec & Canada',
  title: 'De la conformité\nà l\'intervention —\nune seule plateforme.',
  subtitle:
    'CORO relie vos plans, vos bâtiments, vos équipes et vos opérations d\'urgence pour transformer la conformité en préparation opérationnelle mesurable — jusqu\'à l\'intervention.',
  cta: 'Demander une démo',
  ctaSecondary: 'Découvrir la plateforme',
  watchDemo: 'Voir la plateforme en action',
  watchDemoDuration: '6 min',
  trusted:
    'Conçue au Québec par des praticiens du terrain · Données hébergées au Canada · Français / English',
},

    stats: [
      {
        value: '5',
        label: 'Dimensions opérationnelles',
      },
      {
        value: '43+',
        label: 'Procédures intégrées',
      },
      {
        value: '15',
        label: 'Types d\'incidents couverts',
      },
      {
        value: '3',
        label: 'Normes : ISO 22301 · CNPI 2020 · CNESST',
      },
    ],

    solutions: {
      tag: 'La plateforme CORO',
      title: 'Une plateforme. Cinq dimensions complémentaires.',
      subtitle:
        'Découvrez les cinq grands univers qui composent CORO.',

      items: [
        {
          number: '01',
          title: 'Production & conformité documentaire',
          headline: 'Créez et gérez vos documents de conformité',
          desc:
            'PMU, PSI et PCA disponibles — procédures intégrées, génération automatisée, édition structurée, contrôle qualité, approbation et export PDF professionnel. PGC, PRA et PUE en Phase 2.',
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
          headline: 'Prolongez l\'expérience CORO jusqu\'à vos clients',
          desc:
            'Offrez à vos clients un espace sécurisé leur permettant de consulter leurs documents, suivre leur statut, visualiser leurs activités à venir et retrouver l\'information liée à leurs mandats.',
          cta: 'Découvrir le portail client',
          image: '/images/solutions/coro-portail-client.webp',
          href: '/portail-client',
        },
        {
          number: '05',
          title: 'Résilience & Intervention',
          headline: 'De la présence réelle à la mobilisation d\'urgence',
          desc:
            'Indice CORO de résilience opérationnelle, organisation d\'urgence en temps réel, module Incident avec procédures automatiques, rapports conformes ISO 22301 / CNPI 2020 / CNESST et boucle REX complète.',
          cta: 'Découvrir la résilience opérationnelle',
          image: '/images/solutions/coro-resilience-operationnelle.webp',
          href: '/resilience-operationnelle',
        },
      ],
    },

    features: {
      tag: 'Fonctionnalités',
      title:
        'Une plateforme complète pour la conformité opérationnelle et documentaire',
      subtitle:
        'CORO centralise la création, la gestion, la révision et le suivi de vos documents de mesures d’urgence, de sécurité incendie et de continuité des activités.',
      items: [
        {
          icon: 'zap',
          title: 'Génération automatique',
          desc:
            'Configurez le bâtiment une fois, CORO génère la structure complète du document automatiquement selon les normes en vigueur.',
        },
        {
          icon: 'shield',
          title: 'Procédures intégrées',
          desc:
            '43 procédures d\'urgence codifiées (P001-P028, P101-P122) + générateur IA pour procédures personnalisées.',
        },
        {
          icon: 'users',
          title: 'Workflow d\'approbation',
          desc:
            'Soumission, révision par un collègue, observations structurées et approbation avec signature numérique.',
        },
        {
          icon: 'filetext',
          title: 'Export PDF professionnel',
          desc:
            'Documents bilingues FR/EN avec sommaire dynamique, séparateurs, filigranes et numérotation continue.',
        },
        {
          icon: 'globe',
          title: 'Bilingue FR/EN',
          desc:
            'Générez vos documents en français, en anglais ou les deux simultanément — pour les clients bilingues.',
        },
        {
          icon: 'lock',
          title: 'Données au Canada',
          desc:
            'Hébergement sur serveurs canadiens (Toronto). Conformité Loi 25, PIPEDA et exigences de souveraineté des données.',
        },
        {
          icon: 'barchart',
          title: 'Gestion des mandats',
          desc:
            'Suivi des heures, délais réglementaires automatiques, capacity planning et rendement d\'équipe.',
        },
        {
          icon: 'checkcircle',
          title: 'Contrôle qualité',
          desc:
            'Score de qualité documentaire, validations automatiques et alertes sur les sections incomplètes.',
        },
      ],
    },

    documents: {
      tag: 'Documents supportés',
      title: 'Documents de conformité supportés',
      subtitle:
        '3 documents disponibles dès maintenant — PGC, PRA et PUE arrivent en Phase 2.',
      items: [
        {
          code: 'PMU',
          name: 'Plan de Mesures d\'Urgence',
          desc:
            'Document maître pour la gestion des situations d\'urgence dans les bâtiments commerciaux et industriels.',
          color: '#2980B9',
        },
        {
          code: 'PSI',
          name: 'Plan de Sécurité Incendie',
          desc:
            'Plan spécifique aux mesures de prévention et d\'intervention en cas d\'incendie.',
          color: '#C0392B',
        },
        {
          code: 'PCA',
          name: 'Plan de Continuité des Activités',
          desc:
            'Assure la continuité des opérations critiques lors d\'interruptions majeures.',
          color: '#27AE60',
        },
        {
          code: 'PGC',
          name: 'Plan de Gestion de Crise',
          desc:
            'Protocoles de gestion et de communication lors de situations de crise.',
          color: '#8E44AD',
          phase: 2,
        },
        {
          code: 'PRA',
          name: 'Plan de Reprise des Activités',
          desc:
            'Procédures de rétablissement après un sinistre ou une interruption majeure.',
          color: '#E67E22',
          phase: 2,
        },
        {
          code: 'PUE',
          name: 'Plan d\'Urgence Environnementale',
          desc:
            'Réponse aux incidents environnementaux et déversements de matières dangereuses.',
          color: '#16A085',
          phase: 2,
        },
      ],
    },

    howItWorks: {
      tag: 'Comment ça fonctionne',
      title: 'De la configuration à la livraison en 4 étapes',
      steps: [
        {
          num: '01',
          title: 'Configurez le bâtiment',
          desc:
            'Renseignez les informations du bâtiment (type, équipements, risques, matières dangereuses). CORO s\'adapte automatiquement.',
        },
        {
          num: '02',
          title: 'Générez le document',
          desc:
            'En un clic, CORO génère la structure complète avec les procédures pertinentes présélectionnées selon votre configuration.',
        },
        {
          num: '03',
          title: 'Éditez et personnalisez',
          desc:
            'Complétez les modules dans l\'éditeur intégré : liste téléphonique, organigramme, plans techniques, photos du site.',
        },
        {
          num: '04',
          title: 'Approuvez et exportez',
          desc:
            'Faites réviser par un collègue via le workflow d\'approbation intégré, puis exportez en PDF professionnel bilingue.',
        },
      ],
    },

    pricing: {
      tag: 'Tarifs',
      title: 'Une solution pour chaque organisation',
      subtitle:
        'Commencez gratuitement. Contactez-nous pour une soumission adaptée à vos besoins.',
      plans: [
        {
          name: 'Essai gratuit',
          price: '0$',
          period: '30 jours',
          desc:
            'Découvrez CORO avec notre équipe, puis testez la plateforme dans votre propre environnement.',
          color: '#27AE60',
          features: [
            '1 utilisateur',
            '3 projets maximum',
            'PMU, PSI et PCA (+ Phase 2 à sa sortie)',
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
            'CORO Sentinelle (registre d\'occupation)',
            'Module Incident + bouton panique',
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
            'Intelligence organisationnelle multi-bâtiments',
            'Indice CORO de résilience',
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
          desc:
            'Tours à bureaux, centres commerciaux, hôtels, établissements de santé, institutions d\'enseignement. PMU, PSI et Guide du locataire bilingue.',
        },
        {
          icon: 'factory',
          title: 'Sites industriels',
          desc:
            'Usines, entrepôts, sites de production avec matières dangereuses. Procédures industrielles spécialisées, REPTOX et conformité TMD.',
        },
      ],
    },

    cta: {
      title: 'Prêt à moderniser votre pratique ?',
      subtitle:
        'Découvrez comment CORO peut transformer votre pratique — de la production documentaire à la gestion d\'incident en temps réel.',
      primary: 'Demander une démo',
      secondary: 'Accéder à la plateforme',
    },

    footer: {
      tagline: 'De la conformité à l\'intervention — une seule plateforme.',
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
  tag: 'Operational resilience platform · Quebec & Canada',
  title: 'From compliance\nto response —\none platform.',
  subtitle:
    'CORO connects your plans, buildings, teams and emergency operations to turn compliance into measurable operational readiness — all the way through response.',
  cta: 'Request a demo',
  ctaSecondary: 'Explore the platform',
  watchDemo: 'See the platform in action',
  watchDemoDuration: '6 min',
  trusted:
    'Built in Quebec by field practitioners · Data hosted in Canada · English / Français',
},

    stats: [
      {
        value: '5',
        label: 'Operational dimensions',
      },
      {
        value: '43+',
        label: 'Built-in procedures',
      },
      {
        value: '15',
        label: 'Incident types covered',
      },
      {
        value: '3',
        label: 'Standards: ISO 22301 · NFPA · CCOHS',
      },
    ],

    solutions: {
      tag: 'The CORO platform',
      title: 'One platform. Five complementary dimensions.',
      subtitle:
        'Discover the five core areas that make up the CORO platform.',

      items: [
        {
          number: '01',
          title: 'Document Production & Compliance',
          headline: 'Create and manage your compliance documents',
          desc:
            'ERP, FSP and BCP available now — built-in procedures, automated generation, structured editing, quality control, approval workflows and professional PDF export. CMP, DRP and EEP coming in Phase 2.',
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
        {
          number: '05',
          title: 'Resilience & Incident Response',
          headline: 'From real-time presence to emergency mobilization',
          desc:
            'CORO operational resilience index, real-time emergency organization, Incident module with automatic procedures, reports compliant with ISO 22301 / NFPA / CCOHS and full post-incident REX cycle.',
          cta: 'Discover operational resilience',
          image:
            '/images/solutions/en/coro-resilience-operationnelle.webp',
          href: '/resilience-operationnelle?lang=en',
        },
      ],
    },

    features: {
      tag: 'Features',
      title:
        'A complete platform for operational and document compliance',
      subtitle:
        'CORO centralizes the creation, management, review and tracking of emergency, fire safety and business continuity documentation.',
      items: [
        {
          icon: 'zap',
          title: 'Automatic generation',
          desc:
            'Configure the building once, CORO automatically generates the complete document structure according to current standards.',
        },
        {
          icon: 'shield',
          title: 'Built-in procedures',
          desc:
            '43 codified emergency procedures (P001-P028, P101-P122) + AI generator for custom procedures.',
        },
        {
          icon: 'users',
          title: 'Approval workflow',
          desc:
            'Submission, peer review, structured observations and approval with digital signature.',
        },
        {
          icon: 'filetext',
          title: 'Professional PDF export',
          desc:
            'Bilingual FR/EN documents with dynamic table of contents, separators, watermarks and continuous pagination.',
        },
        {
          icon: 'globe',
          title: 'Bilingual FR/EN',
          desc:
            'Generate your documents in French, English or both simultaneously — for bilingual clients.',
        },
        {
          icon: 'lock',
          title: 'Data hosted in Canada',
          desc:
            'Hosted on Canadian servers (Toronto). Compliant with Law 25, PIPEDA and data sovereignty requirements.',
        },
        {
          icon: 'barchart',
          title: 'Mandate management',
          desc:
            'Time tracking, automatic regulatory deadlines, capacity planning and team performance.',
        },
        {
          icon: 'checkcircle',
          title: 'Quality control',
          desc:
            'Document quality score, automatic validations and alerts on incomplete sections.',
        },
      ],
    },

    documents: {
      tag: 'Supported documents',
      title: 'Compliance documents',
      subtitle:
        '3 documents available now — CMP, DRP and EEP coming in Phase 2.',
      items: [
        {
          code: 'ERP',
          name: 'Emergency Response Plan',
          desc:
            'Master document for emergency management in commercial and industrial buildings.',
          color: '#2980B9',
        },
        {
          code: 'FSP',
          name: 'Fire Safety Plan',
          desc:
            'Specific plan for fire prevention and intervention measures.',
          color: '#C0392B',
        },
        {
          code: 'BCP',
          name: 'Business Continuity Plan',
          desc:
            'Ensures continuity of critical operations during major interruptions.',
          color: '#27AE60',
        },
        {
          code: 'CMP',
          name: 'Crisis Management Plan',
          desc: 'Crisis management and communication protocols.',
          color: '#8E44AD',
          phase: 2,
        },
        {
          code: 'DRP',
          name: 'Disaster Recovery Plan',
          desc:
            'Recovery procedures after a disaster or major interruption.',
          color: '#E67E22',
          phase: 2,
        },
        {
          code: 'EEP',
          name: 'Environmental Emergency Plan',
          desc:
            'Response to environmental incidents and hazardous materials spills.',
          color: '#16A085',
          phase: 2,
        },
      ],
    },

    howItWorks: {
      tag: 'How it works',
      title: 'From configuration to delivery in 4 steps',
      steps: [
        {
          num: '01',
          title: 'Configure the building',
          desc:
            'Enter building information (type, equipment, hazards, dangerous materials). CORO adapts automatically.',
        },
        {
          num: '02',
          title: 'Generate the document',
          desc:
            'With one click, CORO generates the complete structure with relevant procedures pre-selected based on your configuration.',
        },
        {
          num: '03',
          title: 'Edit and customize',
          desc:
            'Complete the modules in the integrated editor: phone list, org chart, technical plans, site photos.',
        },
        {
          num: '04',
          title: 'Approve and export',
          desc:
            'Have a colleague review via the integrated approval workflow, then export as a professional bilingual PDF.',
        },
      ],
    },

    pricing: {
      tag: 'Pricing',
      title: 'A solution for every organization',
      subtitle:
        'Start for free. Contact us for a quote tailored to your needs.',
      plans: [
        {
          name: 'Free trial',
          price: '$0',
          period: '30 days',
          desc:
            'Discover CORO with our team, then try the platform in your own environment.',
          color: '#27AE60',
          features: [
            '1 user',
            '3 projects maximum',
            'ERP, FSP and BCP (+ Phase 2 at launch)',
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
            'CORO Sentinelle (occupancy registry)',
            'Incident Module + panic button',
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
            'Multi-building organizational intelligence',
            'CORO resilience index',
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
          desc:
            'Office towers, shopping centers, hotels, healthcare facilities, educational institutions. ERP, FSP and bilingual occupant guide.',
        },
        {
          icon: 'factory',
          title: 'Industrial sites',
          desc:
            'Factories, warehouses, production sites with hazardous materials. Specialized industrial procedures, REPTOX and TDG compliance.',
        },
      ],
    },

    cta: {
      title: 'Ready to modernize your practice?',
      subtitle:
        'Discover how CORO can transform your practice — from document production to real-time incident management.',
      primary: 'Request a demo',
      secondary: 'Access the platform',
    },

    footer: {
      tagline: 'From compliance to intervention — one platform.',
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

const getIcon = (
  name: string,
  size = 24,
  color = '#C0392B'
) => {
  const props = {
    size,
    color,
    strokeWidth: 1.8,
  };

  switch (name) {
    case 'zap':
      return <Zap {...props} />;
    case 'shield':
      return <Shield {...props} />;
    case 'users':
      return <Users {...props} />;
    case 'filetext':
      return <FileText {...props} />;
    case 'globe':
      return <Globe {...props} />;
    case 'lock':
      return <Lock {...props} />;
    case 'barchart':
      return <BarChart3 {...props} />;
    case 'checkcircle':
      return <CheckCircle {...props} />;
    case 'building':
      return <Building2 {...props} />;
    case 'factory':
      return <Factory {...props} />;
    default:
      return <Shield {...props} />;
  }
};

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') {
    return null;
  }

  const prefix = `${name}=`;

  const cookie = document.cookie
    .split('; ')
    .find(item => item.startsWith(prefix));

  if (!cookie) {
    return null;
  }

  return decodeURIComponent(cookie.substring(prefix.length));
}

function setReferralCookie(name: string, value: string) {
  if (typeof document === 'undefined') {
    return;
  }

  const isCoroDomain =
    window.location.hostname === 'getcoro.io' ||
    window.location.hostname.endsWith('.getcoro.io');

  const domain = isCoroDomain
    ? '; Domain=.getcoro.io'
    : '';

  const secure =
    window.location.protocol === 'https:'
      ? '; Secure'
      : '';

  document.cookie =
    `${name}=${encodeURIComponent(value)}` +
    `; Path=/` +
    `; Max-Age=${REFERRAL_COOKIE_MAX_AGE}` +
    `; SameSite=Lax` +
    domain +
    secure;
}

export default function WebAppProgress() {
  const [lang, setLang] = useState<'fr' | 'en'>('fr');
  const [showDemoVideo, setShowDemoVideo] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
const [platformMenuOpen, setPlatformMenuOpen] = useState(false);
const [solutionsMenuOpen, setSolutionsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const [activeProductTab, setActiveProductTab] = useState(0);

  const tabsKeys: Array<
    'dashboard' | 'project' | 'editor'
  > = ['dashboard', 'project', 'editor'];

  const t = TRANSLATIONS[lang];

  useEffect(() => {
  const params = new URLSearchParams(
    window.location.search
  );

  if (params.get('lang') === 'en') {
    setLang('en');
  }

  // Programme de recommandation CORO
  // Attribution first-touch conservée pendant 90 jours.
  const referralParam = params
    .get('ref')
    ?.trim()
    .toUpperCase();

  const isValidReferralCode =
    referralParam &&
    /^CR-[A-HJ-NP-Z2-9]{6}$/.test(referralParam);

  if (isValidReferralCode) {
    const existingReferralCode =
      getCookie(REFERRAL_COOKIE_CODE);

    if (!existingReferralCode) {
      setReferralCookie(
        REFERRAL_COOKIE_CODE,
        referralParam
      );

      setReferralCookie(
        REFERRAL_COOKIE_FIRST_TOUCH,
        new Date().toISOString()
      );
    }
  }

  const handleScroll = () => {
    setScrolled(window.scrollY > 20);
  };

  window.addEventListener(
    'scroll',
    handleScroll
  );

  return () =>
    window.removeEventListener(
      'scroll',
      handleScroll
    );
}, []);

  const toggleLanguage = () => {
    const nextLang =
      lang === 'fr' ? 'en' : 'fr';

    setLang(nextLang);

    const url = new URL(
      window.location.href
    );

    if (nextLang === 'en') {
      url.searchParams.set(
        'lang',
        'en'
      );
    } else {
      url.searchParams.delete(
        'lang'
      );
    }

    window.history.replaceState(
      {},
      '',
      `${url.pathname}${url.search}${url.hash}`
    );
  };

  const sentinelleFeatures =
    lang === 'fr'
      ? [
          {
            icon: '📋',
            title: 'Registre en temps réel',
            desc:
              'Suivez qui est présent dans votre bâtiment à tout moment — employés, visiteurs et contracteurs. Le comptage se met à jour automatiquement.',
          },
          {
            icon: '📷',
            title: 'Pointage par QR code et PIN',
            desc:
              'Chaque employé reçoit un code PIN personnel. Il suffit de scanner le QR de la borne avec son téléphone et d’entrer son PIN. Entrée enregistrée en quelques secondes.',
          },
          {
            icon: '🚨',
            title: 'Mode évacuation instantané',
            desc:
              'En cas d’alarme, déclenchez le mode évacuation. Un instantané des occupants présents est créé afin de suivre les personnes évacuées, manquantes ou à vérifier.',
          },
          {
            icon: '📧',
            title: 'Gestion des visiteurs',
            desc:
              'Enregistrez et suivez les visiteurs présents sur le site afin qu’ils soient intégrés au registre d’occupation et aux opérations d’évacuation.',
          },
          {
            icon: '📊',
            title: 'Historique et rapports',
            desc:
              'Conservez une traçabilité des présences et des évacuations et générez les rapports nécessaires à vos suivis opérationnels.',
          },
          {
            icon: '📱',
            title: 'Accessible sur tous les appareils',
            desc:
              'CORO Sentinelle fonctionne sur tablette, téléphone ou ordinateur afin que l’information reste disponible partout dans le bâtiment.',
          },
        ]
      : [
          {
            icon: '📋',
            title: 'Real-time occupancy register',
            desc:
              'Know who is present in your building at any time — employees, visitors and contractors. Occupancy totals update automatically.',
          },
          {
            icon: '📷',
            title: 'QR code and PIN check-in',
            desc:
              'Each employee receives a personal PIN. They scan the kiosk QR code with their phone and enter their PIN to record their presence in seconds.',
          },
          {
            icon: '🚨',
            title: 'Instant evacuation mode',
            desc:
              'When an alarm occurs, activate evacuation mode. A snapshot of everyone currently on site is created to track evacuated, missing and unconfirmed occupants.',
          },
          {
            icon: '📧',
            title: 'Visitor management',
            desc:
              'Register and track visitors currently on site so they are included in the occupancy register and evacuation operations.',
          },
          {
            icon: '📊',
            title: 'History and reports',
            desc:
              'Maintain traceability of occupancy and evacuation activity and generate reports for operational follow-up.',
          },
          {
            icon: '📱',
            title: 'Available on every device',
            desc:
              'CORO Sentinel works on tablets, phones and computers so critical occupancy information remains accessible throughout the building.',
          },
        ];

  const incidentFeatures =
    lang === 'fr'
      ? [
          {
            icon: '🚨',
            title: 'Déclenchement en un clic',
            desc:
              '15 types d’incidents sont reliés aux procédures CORO. Le scénario pertinent est activé immédiatement selon la situation.',
          },
          {
            icon: '📋',
            title: 'Procédure coordonnateur',
            desc:
              'Les actions à réaliser sont structurées selon le type d’incident afin d’accompagner le coordonnateur pendant l’intervention.',
          },
          {
            icon: '📱',
            title: 'Bouton panique intégré',
            desc:
              'Déclenchement immédiat d’une alerte critique avec bâtiment, adresse, type d’incident et consigne à transmettre au 911.',
          },
          {
            icon: '📧',
            title: 'Notifications multi-canaux',
            desc:
              'Courriel et SMS aux contacts désignés, confirmation de l’envoi et journalisation horodatée de la diffusion.',
          },
          {
            icon: '🔄',
            title: 'Incidents multiples et exercices',
            desc:
              'Gérez plusieurs incidents indépendamment et utilisez le mode exercice pour tester votre organisation sans confondre simulation et événement réel.',
          },
          {
            icon: '📊',
            title: 'Rapport et retour d’expérience',
            desc:
              'Documentez la chronologie, les actions réalisées, les ressources mobilisées, les constats et les actions correctives pour améliorer la prochaine réponse.',
          },
        ]
      : [
          {
            icon: '🚨',
            title: 'One-click activation',
            desc:
              '15 incident types are linked to CORO procedures. The appropriate response scenario is activated immediately based on the situation.',
          },
          {
            icon: '📋',
            title: 'Coordinator procedure',
            desc:
              'Response actions are structured according to the incident type to guide the coordinator throughout the intervention.',
          },
          {
            icon: '📱',
            title: 'Integrated panic button',
            desc:
              'Immediate activation of a critical alert with building, address, incident type and information to relay to 911.',
          },
          {
            icon: '📧',
            title: 'Multi-channel notifications',
            desc:
              'Email and SMS to designated contacts, delivery confirmation and timestamped notification logging.',
          },
          {
            icon: '🔄',
            title: 'Multiple incidents and drills',
            desc:
              'Manage multiple incidents independently and use exercise mode to test your organization without confusing a simulation with a real event.',
          },
          {
            icon: '📊',
            title: 'Report and lessons learned',
            desc:
              'Document the timeline, actions performed, resources mobilized, observations and corrective actions to improve the next response.',
          },
        ];

  return (
    <div
      style={{
        fontFamily:
          'var(--font-inter), -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      {/* RESPONSIVE CSS */}
      <style jsx global>{`
        .solutions-grid {
          display: grid;
          grid-template-columns: repeat(
            6,
            minmax(0, 1fr)
          );
          gap: 28px;
        }

        .solution-card {
          grid-column: span 2;
        }

        .solution-card:nth-child(1),
        .solution-card:nth-child(2) {
          grid-column: span 3;
        }

        .solution-card-content {
          padding: 32px;
        }

        .solution-card-title {
          font-size: 24px;
        }

        .incident-showcase {
          display: grid;
          grid-template-columns:
            minmax(0, 1.35fr)
            minmax(260px, 0.65fr);
          gap: 28px;
          align-items: center;
          margin-bottom: 64px;
        }

        .incident-showcase-card {
          border-radius: 16px;
          overflow: hidden;
          border: 1px solid #e9ecef;
          background: #ffffff;
          box-shadow:
            0 20px 55px
            rgba(44, 62, 80, 0.12);
        }

        .incident-showcase-email {
          max-width: 420px;
          width: 100%;
          justify-self: center;
        }

        .incident-showcase img {
          width: 100%;
          height: auto;
          display: block;
        }

        .incident-showcase-copy {
          padding: 22px 24px 24px;
        }

        /* ===== CORO PRODUCT PROOF ===== */

.coro-product-tabs {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 32px;
}

.coro-product-tabs button {
  appearance: none;
  border: 1px solid #dfe4e7;
  background: #ffffff;
  color: #77828a;
  padding: 10px 18px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 750;
  cursor: pointer;
  transition:
    background-color 0.2s ease,
    color 0.2s ease,
    border-color 0.2s ease,
    transform 0.2s ease;
}

.coro-product-tabs button:hover {
  transform: translateY(-1px);
  border-color: #c7cfd4;
  color: #2c3e50;
}

.coro-product-tabs button.active {
  background: #2c3e50;
  border-color: #2c3e50;
  color: #ffffff;
}

.coro-product-proof-grid {
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(280px, 0.6fr);
  align-items: center;
  gap: 48px;
}

.coro-product-browser {
  min-width: 0;
  overflow: hidden;
  border: 1px solid #dfe4e7;
  border-radius: 18px;
  background: #ffffff;
  box-shadow: 0 28px 70px rgba(44, 62, 80, 0.14);
}

.coro-product-browser-bar {
  min-height: 46px;
  padding: 0 16px;
  display: grid;
  grid-template-columns: 80px 1fr 80px;
  align-items: center;
  background: #f3f5f6;
  border-bottom: 1px solid #e3e7ea;
}

.coro-browser-dots {
  display: flex;
  gap: 6px;
}

.coro-browser-dots span {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #cfd5d9;
}

.coro-browser-address {
  justify-self: center;
  width: min(360px, 100%);
  padding: 5px 14px;
  border: 1px solid #e1e5e8;
  border-radius: 7px;
  background: #ffffff;
  color: #9aa3a9;
  font-size: 10px;
  font-weight: 650;
  text-align: center;
}

.coro-product-screen {
  position: relative;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  background: #eef1f3;
}

.coro-product-screen img {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
  object-position: top left;
  animation: coroProductReveal 0.28s ease;
}

@keyframes coroProductReveal {
  from {
    opacity: 0;
    transform: scale(0.992);
  }

  to {
    opacity: 1;
    transform: scale(1);
  }
}

.coro-product-proof-copy {
  position: relative;
}

.coro-product-eyebrow {
  display: block;
  margin-bottom: 13px;
  color: #c0392b;
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 0.12em;
}

.coro-product-proof-copy h3 {
  margin: 0 0 16px;
  color: #2c3e50;
  font-size: clamp(23px, 2.5vw, 31px);
  font-weight: 850;
  line-height: 1.2;
  letter-spacing: -0.6px;
}

.coro-product-proof-copy p {
  margin: 0;
  color: #6c757d;
  font-size: 15px;
  line-height: 1.75;
}

.coro-product-connection {
  display: flex;
  align-items: center;
  gap: 9px;
  margin-top: 25px;
  padding-top: 20px;
  border-top: 1px solid #e8ecef;
  color: #657078;
  font-size: 11px;
  font-weight: 750;
}

.coro-product-connection-dot {
  width: 8px;
  height: 8px;
  flex: 0 0 auto;
  border-radius: 50%;
  background: #48a97a;
  box-shadow: 0 0 0 4px rgba(72, 169, 122, 0.12);
}

@media (max-width: 900px) {
  .coro-product-proof-grid {
    grid-template-columns: 1fr;
    gap: 34px;
  }

  .coro-product-proof-copy {
    max-width: 680px;
  }
}

@media (max-width: 640px) {
  .coro-product-tabs {
    justify-content: flex-start;
    flex-wrap: nowrap;
    overflow-x: auto;
    margin-left: -18px;
    margin-right: -18px;
    padding: 0 18px 8px;
    scrollbar-width: none;
  }

  .coro-product-tabs::-webkit-scrollbar {
    display: none;
  }

  .coro-product-tabs button {
    flex: 0 0 auto;
    white-space: nowrap;
  }

  .coro-product-browser {
    border-radius: 12px;
  }

  .coro-product-browser-bar {
    min-height: 38px;
    grid-template-columns: 54px 1fr 54px;
    padding: 0 10px;
  }

  .coro-browser-dots {
    gap: 4px;
  }

  .coro-browser-dots span {
    width: 7px;
    height: 7px;
  }

  .coro-browser-address {
    padding: 4px 8px;
    font-size: 8px;
  }

  .coro-product-proof-copy h3 {
    font-size: 23px;
  }
}

/* ===== CORO DOCUMENTS V2 ===== */

.coro-documents-header {
  display: grid;
  grid-template-columns: minmax(0, 1.05fr) minmax(300px, 0.7fr);
  gap: 72px;
  align-items: end;
  margin-bottom: 36px;
}

.coro-documents-header h2 {
  max-width: 720px;
  margin: 14px 0 0;
  color: #2c3e50;
  font-size: clamp(30px, 4vw, 46px);
  font-weight: 850;
  line-height: 1.12;
  letter-spacing: -1.1px;
}

.coro-documents-header > p {
  margin: 0 0 4px;
  color: #6c757d;
  font-size: 16px;
  line-height: 1.75;
}

.coro-documents-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(340px, 0.7fr);
  gap: 28px;
  align-items: stretch;
}

.coro-documents-main,
.coro-document-capabilities {
  border: 1px solid #e4e8eb;
  border-radius: 18px;
  background: #ffffff;
}

.coro-documents-main {
  overflow: hidden;
}

.coro-documents-main-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 28px 30px;
  background: #f7f9fa;
  border-bottom: 1px solid #e7ebed;
}

.coro-documents-kicker {
  display: block;
  margin-bottom: 7px;
  color: #c0392b;
  font-size: 9px;
  font-weight: 900;
  letter-spacing: 0.13em;
}

.coro-documents-main-head h3,
.coro-document-capabilities h3 {
  margin: 0;
  color: #2c3e50;
  font-size: 21px;
  font-weight: 820;
}

.coro-documents-count {
  display: grid;
  place-items: center;
  width: 42px;
  height: 42px;
  flex: 0 0 auto;
  border-radius: 50%;
  background: #2c3e50;
  color: #ffffff;
  font-size: 15px;
  font-weight: 850;
}

.coro-document-list {
  display: flex;
  flex-direction: column;
}

.coro-document-row {
  display: grid;
  grid-template-columns: 62px minmax(0, 1fr) 24px;
  gap: 18px;
  align-items: center;
  padding: 24px 30px;
  border-bottom: 1px solid #edf0f2;
  color: inherit;
  text-decoration: none;
  transition:
    background-color 0.2s ease,
    padding-left 0.2s ease;
}

.coro-document-row:last-child {
  border-bottom: 0;
}

.coro-document-row:hover {
  padding-left: 34px;
  background: #fafbfb;
}

.coro-document-code {
  display: inline-flex;
  justify-content: center;
  align-items: center;
  min-height: 34px;
  border: 1px solid;
  border-radius: 7px;
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 0.04em;
}

.coro-document-info {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.coro-document-info strong {
  color: #2c3e50;
  font-size: 15px;
  font-weight: 800;
}

.coro-document-info span {
  color: #7b858c;
  font-size: 14px;
  line-height: 1.5;
}

.coro-document-arrow {
  color: #aab2b7;
  transition:
    color 0.2s ease,
    transform 0.2s ease;
}

.coro-document-row:hover .coro-document-arrow {
  color: #c0392b;
  transform: translateX(3px);
}

.coro-document-capabilities {
  padding: 30px;
  background: #2c3e50;
}

.coro-document-capabilities .coro-documents-kicker {
  color: #ef8b81;
}

.coro-document-capabilities h3 {
  margin-bottom: 28px;
  color: #ffffff;
}

.coro-document-capability-list {
  display: flex;
  flex-direction: column;
}

.coro-document-capability {
  display: grid;
  grid-template-columns: 40px minmax(0, 1fr);
  gap: 14px;
  padding: 18px 0;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.coro-document-capability-icon {
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  border-radius: 9px;
  background: rgba(255, 255, 255, 0.08);
  color: #ffffff;
}

.coro-document-capability strong,
.coro-document-capability span {
  display: block;
}

.coro-document-capability strong {
  margin-bottom: 5px;
  color: #ffffff;
  font-size: 13px;
  font-weight: 800;
}

.coro-document-capability span {
  color: rgba(255, 255, 255, 0.6);
  font-size: 14px;
  line-height: 1.55;
}

.coro-documents-phase2 {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 32px;
  margin-top: 28px;
  padding: 24px 30px 24px 27px;
  border: 1px solid #e6eaed;
  border-left: 3px solid #c0392b;
  border-radius: 14px;
  background: #f8f9fa;
}

.coro-documents-phase2-copy strong {
  display: block;
  color: #2c3e50;
  font-size: 14px;
}

.coro-phase2-documents {
  display: flex;
  justify-content: flex-end;
  gap: 9px;
  flex-wrap: wrap;
}

.coro-phase2-document {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 7px 12px;
  border: 1px solid #DDE2E6;
  border-radius: 7px;
  background: #EEF1F3;
  color: #2C3E50;
  font-size: 11px;
}

.coro-phase2-document b {
  color: #2c3e50;
  font-size: 11px;
}

@media (max-width: 900px) {
  .coro-documents-header,
  .coro-documents-layout {
    grid-template-columns: 1fr;
  }

  .coro-documents-header {
    gap: 22px;
  }

  .coro-documents-phase2 {
    align-items: flex-start;
    flex-direction: column;
  }

  .coro-phase2-documents {
    justify-content: flex-start;
  }
}

@media (max-width: 640px) {
  .coro-documents-header h2 {
    font-size: 31px;
  }

  .coro-documents-main-head,
  .coro-document-capabilities {
    padding: 23px 20px;
  }

  .coro-document-row {
    grid-template-columns: 52px minmax(0, 1fr) 18px;
    gap: 12px;
    padding: 20px;
  }

  .coro-document-row:hover {
    padding-left: 20px;
  }

  .coro-document-info span {
    white-space: normal;
  }

  .coro-documents-phase2 {
    padding: 21px 20px 21px 23px;
  }

  .coro-phase2-documents {
    width: 100%;
  }

  .coro-phase2-document {
    width: 100%;
  }
}

/* ===== CORO AUDIENCES ===== */

.coro-audiences-header {
  max-width: 780px;
  margin: 0 auto 54px;
  text-align: center;
}

.coro-audiences-header h2 {
  margin: 14px 0 18px;
  color: #2c3e50;
  font-size: clamp(30px, 4vw, 46px);
  font-weight: 850;
  line-height: 1.12;
  letter-spacing: -1px;
}

.coro-audiences-header > p {
  max-width: 700px;
  margin: 0 auto;
  color: #6c757d;
  font-size: 16px;
  line-height: 1.75;
}

.coro-audiences-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 24px;
}

.coro-audience-card {
  position: relative;
  display: flex;
  min-width: 0;
  min-height: 590px;
  flex-direction: column;
  padding: 38px;
  overflow: hidden;
  border: 1px solid #e2e7ea;
  border-radius: 20px;
  background: #ffffff;
  box-shadow: 0 12px 36px rgba(44, 62, 80, 0.05);
}

.coro-audience-card-dark {
  border-color: #2c3e50;
  background:
    radial-gradient(
      circle at 100% 0%,
      rgba(192, 57, 43, 0.17),
      transparent 35%
    ),
    #2c3e50;
  box-shadow: 0 18px 50px rgba(44, 62, 80, 0.16);
}

.coro-audience-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 36px;
}

.coro-audience-icon {
  display: grid;
  width: 50px;
  height: 50px;
  place-items: center;
  border-radius: 12px;
  background: #f3f5f6;
  color: #2c3e50;
}

.coro-audience-card-dark .coro-audience-icon {
  background: rgba(255, 255, 255, 0.09);
  color: #ffffff;
}

.coro-audience-number {
  color: #d6dce0;
  font-size: 38px;
  font-weight: 900;
  line-height: 1;
}

.coro-audience-card-dark .coro-audience-number {
  color: rgba(255, 255, 255, 0.12);
}

.coro-audience-eyebrow {
  display: block;
  margin-bottom: 11px;
  color: #c0392b;
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 0.13em;
}

.coro-audience-card-dark .coro-audience-eyebrow {
  color: #ef8b81;
}

.coro-audience-card h3 {
  max-width: 470px;
  margin: 0 0 16px;
  color: #2c3e50;
  font-size: clamp(25px, 3vw, 34px);
  font-weight: 850;
  line-height: 1.16;
  letter-spacing: -0.7px;
}

.coro-audience-card-dark h3 {
  color: #ffffff;
}

.coro-audience-intro {
  max-width: 500px;
  margin: 0 0 30px;
  color: #747f86;
  font-size: 14px;
  line-height: 1.7;
}

.coro-audience-card-dark .coro-audience-intro {
  color: rgba(255, 255, 255, 0.64);
}

.coro-audience-points {
  display: flex;
  flex-direction: column;
  gap: 13px;
}

.coro-audience-point {
  display: grid;
  grid-template-columns: 18px minmax(0, 1fr);
  gap: 10px;
  align-items: start;
  color: #536068;
  font-size: 13px;
  line-height: 1.5;
}

.coro-audience-point svg {
  margin-top: 1px;
  color: #48a97a;
}

.coro-audience-card-dark .coro-audience-point {
  color: rgba(255, 255, 255, 0.77);
}

.coro-audience-bottom {
  margin-top: auto;
  padding-top: 34px;
}

.coro-audience-flow {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-top: 20px;
  border-top: 1px solid #e8ecef;
  color: #8a949a;
  font-size: 8px;
  font-weight: 900;
  letter-spacing: 0.07em;
}

.coro-audience-flow svg {
  flex: 0 0 auto;
  color: #c0392b;
}

.coro-audience-card-dark .coro-audience-flow {
  border-color: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.48);
}

.coro-audience-card-dark .coro-audience-flow svg {
  color: #ef8b81;
}

.coro-audiences-shared {
  display: grid;
  grid-template-columns: auto minmax(40px, 1fr) auto;
  gap: 18px;
  align-items: center;
  margin-top: 28px;
  padding: 0 6px;
}

.coro-audiences-shared > span {
  color: #c0392b;
  font-size: 9px;
  font-weight: 900;
  letter-spacing: 0.12em;
}

.coro-audiences-shared > div {
  height: 1px;
  background: #dfe4e7;
}

.coro-audiences-shared > strong {
  color: #778188;
  font-size: 11px;
  font-weight: 700;
}

@media (max-width: 900px) {
  .coro-audiences-grid {
    grid-template-columns: 1fr;
  }

  .coro-audience-card {
    min-height: 0;
  }
}

@media (max-width: 640px) {
  .coro-audience-card {
    padding: 28px 22px;
    border-radius: 16px;
  }

  .coro-audience-top {
    margin-bottom: 28px;
  }

  .coro-audience-card h3 {
    font-size: 27px;
  }

  .coro-audience-flow {
    gap: 5px;
    overflow-x: auto;
    white-space: nowrap;
  }

  .coro-audiences-shared {
    grid-template-columns: 1fr;
    gap: 9px;
  }

  .coro-audiences-shared > div {
    display: none;
  }
}

/* ===== CORO ENVIRONMENTS ===== */

.coro-environments-header {
  display: grid;
  grid-template-columns: minmax(0, 1.05fr) minmax(300px, 0.7fr);
  gap: 72px;
  align-items: end;
  margin-bottom: 48px;
}

.coro-environments-header h2 {
  max-width: 760px;
  margin: 14px 0 0;
  color: #2c3e50;
  font-size: clamp(30px, 4vw, 46px);
  font-weight: 850;
  line-height: 1.12;
  letter-spacing: -1px;
}

.coro-environments-header > p {
  margin: 0 0 4px;
  color: #6c757d;
  font-size: 16px;
  line-height: 1.75;
}

.coro-environments-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 24px;
}

.coro-environment-card {
  min-width: 0;
  overflow: hidden;
  border: 1px solid #e2e7ea;
  border-radius: 18px;
  background: #ffffff;
  transition:
    transform 0.25s ease,
    box-shadow 0.25s ease;
}

.coro-environment-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 18px 44px rgba(44, 62, 80, 0.09);
}

.coro-environment-image {
  position: relative;
  height: 205px;
  overflow: hidden;
  background: #2c3e50;
}

.coro-environment-image img {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
  transition: transform 0.45s ease;
}

.coro-environment-card:hover .coro-environment-image img {
  transform: scale(1.025);
}

.coro-environment-image-overlay {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(
      180deg,
      rgba(24, 36, 47, 0.04) 20%,
      rgba(24, 36, 47, 0.76) 100%
    );
}

.coro-environment-image-label {
  position: absolute;
  left: 24px;
  bottom: 20px;
  display: flex;
  align-items: center;
  gap: 9px;
  color: #ffffff;
}

.coro-environment-image-label span {
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 0.11em;
}

.coro-environment-content {
  padding: 28px 30px 30px;
}

.coro-environment-content h3 {
  max-width: 480px;
  margin: 0 0 13px;
  color: #2c3e50;
  font-size: 22px;
  font-weight: 830;
  line-height: 1.25;
  letter-spacing: -0.35px;
}

.coro-environment-content > p {
  margin: 0;
  color: #747f86;
  font-size: 13px;
  line-height: 1.7;
}

.coro-environment-signals {
  display: flex;
  gap: 7px;
  flex-wrap: wrap;
  margin-top: 23px;
  padding-top: 20px;
  border-top: 1px solid #edf0f2;
}

.coro-environment-signals span {
  padding: 7px 12px;
  border: 1px solid #DDE2E6;
  border-radius: 7px;
  background: #EEF1F3;
  color: #2C3E50;
  font-size: 11px;
  font-weight: 850;
  letter-spacing: 0.04em;
}

.coro-environments-foundation {
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr);
  gap: 15px;
  align-items: center;
  margin-top: 24px;
  padding: 22px 26px;
  border: 1px solid #e4e8eb;
  border-radius: 13px;
  background: #f8f9fa;
}

.coro-environments-foundation-icon {
  display: grid;
  width: 40px;
  height: 40px;
  place-items: center;
  border-radius: 9px;
  background: #2c3e50;
  color: #ffffff;
}

.coro-environments-foundation span,
.coro-environments-foundation strong {
  display: block;
}

.coro-environments-foundation span {
  margin-bottom: 4px;
  color: #c0392b;
  font-size: 8px;
  font-weight: 900;
  letter-spacing: 0.12em;
}

.coro-environments-foundation strong {
  color: #536068;
  font-size: 14px;
  font-weight: 700;
  line-height: 1.55;
}

@media (max-width: 900px) {
  .coro-environments-header,
  .coro-environments-grid {
    grid-template-columns: 1fr;
  }

  .coro-environments-header {
    gap: 22px;
  }
}

@media (max-width: 640px) {
  .coro-environments-header h2 {
    font-size: 31px;
  }

  .coro-environment-image {
    height: 180px;
  }

  .coro-environment-content {
    padding: 24px 20px;
  }

  .coro-environment-image-label {
    left: 20px;
    bottom: 17px;
  }

  .coro-environments-foundation {
    grid-template-columns: 1fr;
    padding: 20px;
  }
}

/* ===== CORO COMMERCIAL BRIDGE ===== */

.coro-commercial-bridge {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(360px, 0.72fr);
  gap: 70px;
  align-items: center;
}

.coro-commercial-copy h2 {
  margin: 13px 0 14px;
  color: #2c3e50;
  font-size: clamp(28px, 3.5vw, 40px);
  font-weight: 850;
  line-height: 1.14;
  letter-spacing: -0.8px;
}

.coro-commercial-copy p {
  max-width: 650px;
  margin: 0;
  color: #6c757d;
  font-size: 14px;
  line-height: 1.7;
}

.coro-commercial-side {
  padding: 24px;
  border: 1px solid #e1e6e9;
  border-radius: 16px;
  background: #ffffff;
}

.coro-commercial-factors {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  margin-bottom: 18px;
}

.coro-commercial-factor {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 11px 12px;
  border-radius: 8px;
  background: #f7f9fa;
  color: #69757c;
  font-size: 11px;
  font-weight: 750;
}

.coro-commercial-factor svg {
  flex: 0 0 auto;
  color: #2c3e50;
}

.coro-commercial-cta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding: 14px 16px;
  border-radius: 8px;
  background: #c0392b;
  color: #ffffff;
  font-size: 12px;
  font-weight: 800;
  text-decoration: none;
  transition:
    background-color 0.2s ease,
    transform 0.2s ease;
}

.coro-commercial-cta:hover {
  background: #a93226;
  transform: translateY(-1px);
}

.coro-founder-teaser {
  display: flex;
  align-items: center;
  gap: 24px;
  max-width: 1200px;
  margin: 40px auto 0;
  padding: 20px 28px;
  border-radius: 14px;
  background:
    radial-gradient(circle at 90% 0%, rgba(192,57,43,0.25), transparent 45%),
    #1a252f;
  color: #ffffff;
  text-decoration: none;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.coro-founder-teaser:hover {
  transform: translateY(-2px);
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.22);
}

.coro-founder-teaser-badge {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
  padding: 8px 14px;
  border: 1px solid rgba(192, 57, 43, 0.4);
  border-radius: 999px;
  background: rgba(192, 57, 43, 0.15);
  color: #f5c6c0;
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.08em;
}

.coro-founder-teaser-text {
  flex: 1;
  min-width: 0;
  color: rgba(255, 255, 255, 0.78);
  font-size: 14px;
  line-height: 1.5;
}

.coro-founder-teaser-link {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
  color: #ffffff;
  font-size: 14px;
  font-weight: 800;
}

.coro-founder-teaser-link svg {
  transition: transform 0.2s ease;
}

.coro-founder-teaser:hover .coro-founder-teaser-link svg {
  transform: translateX(3px);
}


/* ===== CORO TRUST & SECURITY ===== */

.coro-trust-header {
  display: grid;
  grid-template-columns: minmax(0, 1.05fr) minmax(300px, 0.7fr);
  gap: 72px;
  align-items: end;
  margin-bottom: 48px;
}

.coro-trust-header h2 {
  max-width: 760px;
  margin: 14px 0 0;
  color: #2c3e50;
  font-size: clamp(30px, 4vw, 46px);
  font-weight: 850;
  line-height: 1.12;
  letter-spacing: -1px;
}

.coro-trust-header > p {
  margin: 0 0 4px;
  color: #6c757d;
  font-size: 16px;
  line-height: 1.75;
}

.coro-trust-main-grid {
  display: grid;
  grid-template-columns: minmax(320px, 0.72fr) minmax(0, 1fr);
  gap: 24px;
}

.coro-trust-primary {
  display: flex;
  flex-direction: column;
  min-height: 390px;
  padding: 34px;
  border-radius: 18px;
  background:
    radial-gradient(
      circle at 100% 0%,
      rgba(192, 57, 43, 0.17),
      transparent 38%
    ),
    #2c3e50;
}

.coro-trust-primary-top {
  display: flex;
  align-items: center;
  gap: 13px;
  margin-bottom: 40px;
}

.coro-trust-shield {
  display: grid;
  width: 50px;
  height: 50px;
  place-items: center;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.09);
  color: #ffffff;
}

.coro-trust-primary-top > span {
  color: #ef8b81;
  font-size: 9px;
  font-weight: 900;
  letter-spacing: 0.12em;
}

.coro-trust-primary h3 {
  max-width: 420px;
  margin: 0 0 15px;
  color: #ffffff;
  font-size: 27px;
  font-weight: 850;
  line-height: 1.2;
}

.coro-trust-primary > p {
  margin: 0;
  color: rgba(255, 255, 255, 0.63);
  font-size: 13px;
  line-height: 1.7;
}

.coro-trust-location {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: auto;
  padding-top: 28px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.coro-trust-status-dot {
  width: 9px;
  height: 9px;
  flex: 0 0 auto;
  border-radius: 50%;
  background: #63c892;
  box-shadow: 0 0 0 5px rgba(99, 200, 146, 0.12);
}

.coro-trust-location strong,
.coro-trust-location span {
  display: block;
}

.coro-trust-location strong {
  margin-bottom: 2px;
  color: #ffffff;
  font-size: 11px;
}

.coro-trust-location div > span {
  color: rgba(255, 255, 255, 0.47);
  font-size: 10px;
}

.coro-trust-controls {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.coro-trust-control {
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr);
  gap: 14px;
  align-content: start;
  padding: 25px;
  border: 1px solid #e3e7ea;
  border-radius: 14px;
  background: #ffffff;
  box-shadow:
    0 1px 3px rgba(44, 62, 80, 0.04),
    0 6px 18px rgba(44, 62, 80, 0.06);
}

.coro-trust-control-icon {
  display: grid;
  width: 40px;
  height: 40px;
  place-items: center;
  border-radius: 9px;
  background: #f3f5f6;
  color: #2c3e50;
}

.coro-trust-control strong {
  display: block;
  margin: 2px 0 6px;
  color: #2c3e50;
  font-size: 13px;
  font-weight: 800;
}

.coro-trust-control p {
  margin: 0;
  color: #78838a;
  font-size: 14px;
  line-height: 1.6;
}

.coro-trust-framework {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 40px;
  align-items: center;
  margin-top: 24px;
  padding: 28px 30px;
  border: 1px solid #e3e7ea;
  border-radius: 14px;
  background: #f8f9fa;
}

.coro-trust-framework-copy > span {
  display: block;
  margin-bottom: 7px;
  color: #c0392b;
  font-size: 8px;
  font-weight: 900;
  letter-spacing: 0.12em;
}

.coro-trust-framework-copy strong {
  display: block;
  margin-bottom: 6px;
  color: #2c3e50;
  font-size: 14px;
}

.coro-trust-framework-copy p {
  max-width: 720px;
  margin: 0;
  color: #7a858c;
  font-size: 14px;
  line-height: 1.6;
}

.coro-trust-framework-tags {
  display: flex;
  justify-content: flex-end;
  gap: 7px;
  flex-wrap: wrap;
}

.coro-trust-framework-tags span {
  padding: 7px 12px;
  border: 1px solid #DDE2E6;
  border-radius: 7px;
  background: #EEF1F3;
  color: #2C3E50;
  font-size: 11px;
  font-weight: 850;
}

.coro-trust-provider {
  display: grid;
  grid-template-columns: 170px minmax(0, 1fr);
  gap: 30px;
  align-items: center;
  margin-top: 12px;
  padding: 20px 30px;
  border: 1px solid #e8ecef;
  border-radius: 12px;
  background: #ffffff;
}

.coro-trust-provider-label {
  display: block;
  margin-bottom: 4px;
  color: #9ba4aa;
  font-size: 8px;
  font-weight: 900;
  letter-spacing: 0.11em;
}

.coro-trust-provider strong {
  color: #2c3e50;
  font-size: 14px;
}

.coro-trust-provider p {
  margin: 0;
  color: #858f95;
  font-size: 14px;
  line-height: 1.55;
}

.coro-trust-technical {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 28px;
  margin-top: 12px;
  padding: 20px 26px;
  border-radius: 12px;
  background: #2c3e50;
  color: #ffffff;
}

.coro-trust-technical > div {
  display: grid;
  grid-template-columns: 28px minmax(0, 1fr);
  gap: 11px;
  align-items: center;
}

.coro-trust-technical strong,
.coro-trust-technical span {
  display: block;
}

.coro-trust-technical strong {
  margin-bottom: 3px;
  font-size: 14px;
}

.coro-trust-technical span {
  color: rgba(255, 255, 255, 0.55);
  font-size: 13px;
  line-height: 1.5;
}

.coro-trust-technical > a {
  display: flex;
  align-items: center;
  gap: 7px;
  flex: 0 0 auto;
  color: #ffffff;
  font-size: 10px;
  font-weight: 800;
  text-decoration: none;
}

@media (max-width: 900px) {
  .coro-commercial-bridge,
  .coro-trust-header,
  .coro-trust-main-grid {
    grid-template-columns: 1fr;
  }

  .coro-commercial-bridge,
  .coro-trust-header {
    gap: 28px;
  }

  .coro-trust-primary {
    min-height: 360px;
  }
}

@media (max-width: 640px) {
  .coro-commercial-factors,
  .coro-trust-controls {
    grid-template-columns: 1fr;
  }

  .coro-commercial-side {
    padding: 18px;
  }

  .coro-founder-teaser {
    flex-direction: column;
    align-items: flex-start;
    gap: 14px;
  }

  .coro-trust-header h2 {
    font-size: 31px;
  }

  .coro-trust-primary {
    min-height: 0;
    padding: 27px 22px;
  }

  .coro-trust-location {
    margin-top: 34px;
  }

  .coro-trust-control {
    padding: 21px;
  }

  .coro-trust-framework {
    grid-template-columns: 1fr;
    gap: 20px;
    padding: 23px 20px;
  }

  .coro-trust-framework-tags {
    justify-content: flex-start;
  }

  .coro-trust-provider {
    grid-template-columns: 1fr;
    gap: 10px;
    padding: 20px;
  }

  .coro-trust-technical {
    align-items: flex-start;
    flex-direction: column;
    padding: 22px;
  }
}

/* ===== CORO FINAL DEMO ===== */

.coro-demo-final {
  position: relative;
  overflow: hidden;
  padding: 120px 24px 46px;
  background:
    linear-gradient(
      145deg,
      #1e2f3d 0%,
      #263c4d 48%,
      #1d303e 100%
    );
}

.coro-demo-glow {
  position: absolute;
  border-radius: 50%;
  pointer-events: none;
  filter: blur(2px);
}

.coro-demo-glow-one {
  top: -280px;
  right: -180px;
  width: 650px;
  height: 650px;
  background: radial-gradient(
    circle,
    rgba(192, 57, 43, 0.15) 0%,
    rgba(192, 57, 43, 0) 70%
  );
}

.coro-demo-glow-two {
  bottom: -340px;
  left: -250px;
  width: 700px;
  height: 700px;
  background: radial-gradient(
    circle,
    rgba(72, 169, 122, 0.08) 0%,
    rgba(72, 169, 122, 0) 70%
  );
}

.coro-demo-final-inner {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns:
    minmax(0, 0.92fr)
    minmax(420px, 0.78fr);
  gap: 78px;
  align-items: center;
  max-width: 1200px;
  margin: 0 auto;
}

.coro-demo-eyebrow {
  display: block;
  margin-bottom: 18px;
  color: #ef8b81;
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 0.14em;
}

.coro-demo-final-copy h2 {
  max-width: 620px;
  margin: 0 0 22px;
  color: #ffffff;
  font-size: clamp(36px, 5vw, 58px);
  font-weight: 880;
  line-height: 1.04;
  letter-spacing: -1.6px;
}

.coro-demo-lead {
  max-width: 620px;
  margin: 0;
  color: rgba(255, 255, 255, 0.67);
  font-size: 16px;
  line-height: 1.75;
}

.coro-demo-value {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-top: 40px;
}

.coro-demo-value-item {
  display: grid;
  grid-template-columns: 52px minmax(0, 1fr);
  gap: 14px;
  align-items: center;
  min-height: 120px;
  padding: 28px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.035);
}

.coro-demo-value-icon {
  display: grid;
  width: 52px;
  height: 52px;
  place-items: center;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.07);
  color: #ffffff;
}

.coro-demo-value-item strong,
.coro-demo-value-item span {
  display: block;
}

.coro-demo-value-item strong {
  margin-bottom: 5px;
  color: #ffffff;
  font-size: 16px;
  font-weight: 850;
}

.coro-demo-value-item span {
  color: rgba(255, 255, 255, 0.48);
  font-size: 13px;
  line-height: 1.5;
}

.coro-demo-continuum {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 36px;
  color: rgba(255, 255, 255, 0.7);
  font-size: 16px;
  font-weight: 900;
  letter-spacing: 0.1em;
}

.coro-demo-continuum svg {
  flex: 0 0 auto;
  color: #f07a6f;
}


/* DEMO FORM */

.coro-demo-form-shell {
  padding: 34px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 20px;
  background: #ffffff;
  box-shadow:
    0 30px 80px rgba(0, 0, 0, 0.22),
    0 3px 10px rgba(0, 0, 0, 0.08);
}

.coro-demo-form-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 10px;
}

.coro-demo-form-top > div:first-child > span {
  display: block;
  margin-bottom: 7px;
  color: #c0392b;
  font-size: 8px;
  font-weight: 900;
  letter-spacing: 0.12em;
}

.coro-demo-form-top h3 {
  margin: 0;
  color: #2c3e50;
  font-size: 24px;
  font-weight: 850;
  line-height: 1.2;
  letter-spacing: -0.4px;
}

.coro-demo-form-status {
  display: flex;
  align-items: center;
  gap: 7px;
  flex: 0 0 auto;
  padding: 6px 9px;
  border-radius: 6px;
  background: #f4f6f7;
  color: #748087;
  font-size: 8px;
  font-weight: 900;
  letter-spacing: 0.08em;
}

.coro-demo-form-status > span {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #48a97a;
}

.coro-demo-form-intro {
  margin: 0 0 24px;
  color: #7c878d;
  font-size: 11px;
  line-height: 1.6;
}

.coro-demo-form-note {
  display: grid;
  grid-template-columns: 15px minmax(0, 1fr);
  gap: 7px;
  align-items: start;
  margin-top: 17px;
  padding-top: 15px;
  border-top: 1px solid #edf0f2;
  color: #9aa2a7;
  font-size: 8px;
  line-height: 1.5;
}

.coro-demo-form-note svg {
  margin-top: 1px;
}


/* FINAL SIGNATURE */

.coro-demo-final-statement {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 10px;
  max-width: 1200px;
  margin: 95px auto 0;
  padding-top: 30px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  text-align: center;
}

.coro-demo-final-statement span {
  color: rgba(255, 255, 255, 0.35);
  font-size: 9px;
  font-weight: 900;
  letter-spacing: 0.13em;
}

.coro-demo-final-statement strong {
  color: rgba(255, 255, 255, 0.78);
  font-size: 10px;
  font-weight: 800;
}


/* RESPONSIVE */

@media (max-width: 960px) {
  .coro-demo-final-inner {
    grid-template-columns: 1fr;
    gap: 54px;
  }

  .coro-demo-final-copy {
    max-width: 720px;
  }

  .coro-demo-form-shell {
    max-width: 650px;
    width: 100%;
  }
}

@media (max-width: 640px) {
  .coro-demo-final {
    padding: 90px 20px 36px;
  }

  .coro-demo-final-copy h2 {
    font-size: 38px;
    letter-spacing: -1px;
  }

  .coro-demo-lead {
    font-size: 14px;
  }

  .coro-demo-value {
    grid-template-columns: 1fr;
  }

  .coro-demo-continuum {
    gap: 5px;
    overflow-x: auto;
    padding-bottom: 4px;
    white-space: nowrap;
  }

  .coro-demo-form-shell {
    padding: 25px 20px;
    border-radius: 16px;
  }

  .coro-demo-form-top {
    flex-direction: column;
  }

  .coro-demo-final-statement {
    align-items: center;
    flex-direction: column;
    gap: 5px;
    margin-top: 65px;
  }
}

        /* ===== CORO HOMEPAGE V2 — LOT 1 ===== */

.coro-hero-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.05fr) minmax(420px, 0.95fr);
  gap: 64px;
  align-items: center;
}

.coro-hero-watch-demo:hover span:first-child {
  background-color: rgba(255,255,255,0.22) !important;
}

.coro-hero-copy {
  max-width: 690px;
}

.coro-hero-intelligence {
  width: 100%;
  max-width: 500px;
  justify-self: end;
  border: 1px solid rgba(255, 255, 255, 0.28);
  border-radius: 22px;
  padding: 26px;
  background:
    linear-gradient(
      145deg,
      rgba(19, 32, 45, 0.88),
      rgba(35, 53, 68, 0.78)
    );
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
  box-shadow:
    0 40px 100px rgba(0, 0, 0, 0.45),
    inset 0 1px 0 rgba(255, 255, 255, 0.10);
}

.coro-hero-building-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 20px;
  padding-bottom: 22px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.12);
}

.coro-status {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(39, 174, 96, 0.13);
  border: 1px solid rgba(46, 204, 113, 0.28);
  color: #8fe3b2;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  white-space: nowrap;
}

.coro-status-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #2ecc71;
  box-shadow: 0 0 0 4px rgba(46, 204, 113, 0.1);
}

.coro-index-row {
  display: grid;
  grid-template-columns: 150px 1fr;
  gap: 24px;
  align-items: center;
  padding: 28px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.12);
}

.coro-index-number {
  display: flex;
  align-items: baseline;
  gap: 4px;
}

.coro-index-number strong {
  font-size: 86px;
  line-height: 0.95;
  letter-spacing: -4px;
  color: #ffffff;
}

.coro-index-number span {
  font-size: 18px;
  color: rgba(255, 255, 255, 0.45);
}

.coro-readiness-bar {
  height: 7px;
  overflow: hidden;
  border-radius: 99px;
  background: rgba(255, 255, 255, 0.12);
}

.coro-readiness-bar > span {
  display: block;
  width: 73%;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #c0392b, #e76b5f);
}

.coro-hero-metrics {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  padding-top: 22px;
}

.coro-hero-metric {
  padding: 15px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.055);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.coro-trust-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  max-width: 1200px;
  margin: 0 auto;
}

.coro-trust-item {
  padding: 4px 22px;
  text-align: center;
  border-right: 1px solid #e9ecef;
}

.coro-trust-item:last-child {
  border-right: 0;
}

.coro-problem-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 20px;
  margin-top: 54px;
}

.coro-problem-card {
  position: relative;
  padding: 30px 26px;
  border: 1px solid #e9ecef;
  border-radius: 16px;
  background: #ffffff;
  box-shadow:
    0 1px 3px rgba(44, 62, 80, 0.04),
    0 6px 18px rgba(44, 62, 80, 0.06);
  transition:
    transform 0.25s ease,
    box-shadow 0.25s ease,
    border-color 0.25s ease;
}

.coro-problem-card:hover {
  transform: translateY(-4px);
  border-color: #d9dee3;
  box-shadow:
    0 4px 8px rgba(44, 62, 80, 0.06),
    0 16px 42px rgba(44, 62, 80, 0.12);
}

@media (max-width: 900px) {
  .coro-hero-grid {
    grid-template-columns: 1fr;
    gap: 48px;
  }

  .coro-hero-intelligence {
    max-width: 620px;
    justify-self: start;
  }

  .coro-trust-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .coro-trust-item {
    padding: 18px;
    border-right: 0;
    border-bottom: 1px solid #e9ecef;
  }

  .coro-trust-item:last-child {
    grid-column: 1 / -1;
  }

  .coro-problem-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .coro-hero-grid {
    gap: 36px;
  }

  .coro-hero-intelligence {
    padding: 20px;
    border-radius: 17px;
  }

  .coro-index-row {
    grid-template-columns: 1fr;
    gap: 18px;
  }

  .coro-index-number strong {
    font-size: 54px;
  }

  .coro-hero-metrics {
    grid-template-columns: 1fr;
  }

  .coro-problem-grid {
    grid-template-columns: 1fr;
  }
}

/* ===== CORO NAVIGATION V2 ===== */

.coro-nav-v2 {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  padding: 0 24px;
  border-bottom: 1px solid transparent;
  background: transparent;
  transition:
    background-color 0.25s ease,
    border-color 0.25s ease,
    box-shadow 0.25s ease;
}

.coro-nav-v2.is-scrolled {
  border-bottom-color: #e9ecef;
  background: rgba(255, 255, 255, 0.97);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  box-shadow: 0 4px 20px rgba(44, 62, 80, 0.04);
}

.coro-nav-v2-inner {
  display: flex;
  align-items: center;
  max-width: 1200px;
  height: 72px;
  margin: 0 auto;
}

.coro-nav-logo {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  color: #ffffff;
  font-size: 28px;
  font-weight: 900;
  letter-spacing: -1px;
  text-decoration: none;
}

.coro-nav-logo span:last-child {
  color: #c0392b;
}

.coro-nav-v2.is-scrolled .coro-nav-logo span:first-child {
  color: #2c3e50;
}

.coro-nav-desktop {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-left: 38px;
}

.coro-nav-main-link {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 10px 11px;
  border: 0;
  background: transparent;
  color: rgba(255, 255, 255, 0.86);
  font: inherit;
  font-size: 13px;
  font-weight: 600;
  text-decoration: none;
  white-space: nowrap;
  cursor: pointer;
  transition: color 0.18s ease;
}

.coro-nav-v2.is-scrolled .coro-nav-main-link {
  color: #2c3e50;
}

.coro-nav-main-link:hover,
.coro-nav-v2.is-scrolled .coro-nav-main-link:hover {
  color: #c0392b;
}

.coro-nav-main-link svg {
  transition: transform 0.18s ease;
}

.coro-nav-main-link[aria-expanded='true'] svg {
  transform: rotate(180deg);
}


/* DROPDOWNS */

.coro-nav-dropdown {
  position: relative;
}

.coro-nav-dropdown-panel {
  position: absolute;
  top: calc(100% + 14px);
  left: -16px;
  width: 390px;
  padding: 11px;
  border: 1px solid #e3e7ea;
  border-radius: 14px;
  background: #ffffff;
  box-shadow:
    0 24px 60px rgba(25, 42, 55, 0.16),
    0 4px 12px rgba(25, 42, 55, 0.06);
}

.coro-nav-dropdown-panel::before {
  content: '';
  position: absolute;
  top: -15px;
  left: 0;
  width: 100%;
  height: 15px;
}

.coro-nav-dropdown-heading {
  margin-bottom: 5px;
  padding: 11px 12px 14px;
  border-bottom: 1px solid #edf0f2;
}

.coro-nav-dropdown-heading span,
.coro-nav-dropdown-heading strong {
  display: block;
}

.coro-nav-dropdown-heading span {
  margin-bottom: 4px;
  color: #c0392b;
  font-size: 8px;
  font-weight: 900;
  letter-spacing: 0.12em;
}

.coro-nav-dropdown-heading strong {
  color: #2c3e50;
  font-size: 12px;
}

.coro-nav-dropdown-item {
  display: grid;
  grid-template-columns: 28px minmax(0, 1fr);
  gap: 9px;
  align-items: start;
  padding: 11px 12px;
  border-radius: 9px;
  color: #2c3e50;
  text-decoration: none;
  transition: background-color 0.15s ease;
}

.coro-nav-dropdown-item:hover {
  background: #f5f7f8;
}

.coro-nav-dropdown-item > svg {
  margin-top: 2px;
  color: #c0392b;
}

.coro-nav-dropdown-item strong,
.coro-nav-dropdown-item span {
  display: block;
}

.coro-nav-dropdown-item strong {
  margin-bottom: 3px;
  color: #2c3e50;
  font-size: 11px;
  font-weight: 800;
}

.coro-nav-dropdown-item span {
  color: #8a949a;
  font-size: 9px;
  line-height: 1.45;
}

.coro-nav-dropdown-item-small {
  padding-top: 9px;
  padding-bottom: 9px;
}

.coro-nav-dropdown-item-small strong {
  margin-bottom: 0;
}

.coro-nav-dropdown-separator {
  height: 1px;
  margin: 6px 12px;
  background: #edf0f2;
}

.coro-nav-solutions-panel {
  width: 370px;
}


/* ACTIONS */

.coro-nav-actions {
  display: flex;
  align-items: center;
  gap: 7px;
  margin-left: auto;
}

.coro-nav-language,
.coro-nav-action-link {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 8px;
  border: 1px solid rgba(255, 255, 255, 0.4);
  border-radius: 6px;
  background: transparent;
  color: #ffffff;
  font: inherit;
  font-size: 11px;
  font-weight: 600;
  text-decoration: none;
  white-space: nowrap;
  cursor: pointer;
}

.coro-nav-v2.is-scrolled .coro-nav-language,
.coro-nav-v2.is-scrolled .coro-nav-action-link {
  border-color: #dee2e6;
  color: #2c3e50;
}

.coro-nav-language:hover,
.coro-nav-action-link:hover {
  background: rgba(255, 255, 255, 0.1);
}

.coro-nav-v2.is-scrolled .coro-nav-language:hover,
.coro-nav-v2.is-scrolled .coro-nav-action-link:hover {
  background: #f8f9fa;
}

.coro-nav-demo {
  padding: 9px 14px;
  border-radius: 6px;
  background: #c0392b;
  color: #ffffff;
  font-size: 11px;
  font-weight: 800;
  text-decoration: none;
  white-space: nowrap;
  transition:
    background-color 0.2s ease,
    transform 0.2s ease;
}

.coro-nav-demo:hover {
  background: #a93226;
  transform: translateY(-1px);
}

.coro-nav-mobile-toggle {
  display: none;
  padding: 5px;
  border: 0;
  background: transparent;
  color: #ffffff;
  cursor: pointer;
}

.coro-nav-v2.is-scrolled .coro-nav-mobile-toggle {
  color: #2c3e50;
}


/* MOBILE */

.coro-nav-mobile-menu {
  display: none;
}

@media (max-width: 1080px) {
  .coro-nav-desktop,
  .coro-nav-action-desktop {
    display: none;
  }

  .coro-nav-mobile-toggle {
    display: block;
  }

  .coro-nav-mobile-menu {
    display: block;
    max-height: calc(100vh - 72px);
    overflow-y: auto;
    margin: 0 -24px;
    padding: 10px 24px 26px;
    border-top: 1px solid #e9ecef;
    background: #ffffff;
    box-shadow: 0 18px 35px rgba(44, 62, 80, 0.1);
  }

  .coro-nav-mobile-group {
    padding: 18px 0;
    border-bottom: 1px solid #edf0f2;
  }

  .coro-nav-mobile-group > span {
    display: block;
    margin-bottom: 8px;
    color: #c0392b;
    font-size: 8px;
    font-weight: 900;
    letter-spacing: 0.13em;
  }

  .coro-nav-mobile-group a {
    display: block;
    padding: 8px 0;
    color: #2c3e50;
    font-size: 13px;
    font-weight: 650;
    text-decoration: none;
  }

  .coro-nav-mobile-portals {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
    padding-top: 18px;
  }

  .coro-nav-mobile-portals a {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px;
    border: 1px solid #e1e6e9;
    border-radius: 8px;
    color: #2c3e50;
    font-size: 11px;
    font-weight: 700;
    text-decoration: none;
  }

  .coro-nav-mobile-demo {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: 10px;
    padding: 14px 16px;
    border-radius: 8px;
    background: #c0392b;
    color: #ffffff;
    font-size: 12px;
    font-weight: 800;
    text-decoration: none;
  }
}

@media (max-width: 640px) {
  .coro-nav-v2 {
    padding: 0 20px;
  }

  .coro-nav-v2-inner {
    height: 66px;
  }

  .coro-nav-logo {
    font-size: 25px;
  }

  .coro-nav-language {
    padding: 7px;
  }

  .coro-nav-mobile-menu {
    max-height: calc(100vh - 66px);
    margin: 0 -20px;
    padding-right: 20px;
    padding-left: 20px;
  }

  .coro-nav-mobile-portals {
    grid-template-columns: 1fr;
  }
}

/* ===== CORO HOMEPAGE V2 — LOT 2 ===== */

.coro-feature-split {
  width: 100%;
}

.coro-index-panel,
.coro-sentinel-panel {
  border: 1px solid #e3e8ec;
  border-radius: 22px;
  background: #ffffff;
  padding: 30px;
  box-shadow: 0 28px 70px rgba(44, 62, 80, 0.1);
}

.coro-sentinel-panel {
  box-shadow:
    0 20px 55px rgba(44, 62, 80, 0.1),
    0 4px 14px rgba(44, 62, 80, 0.06);
}

.coro-panel-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
  padding-bottom: 22px;
  border-bottom: 1px solid #edf0f2;
}

.coro-panel-eyebrow {
  margin: 0 0 5px;
  color: #9aa3aa;
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 0.1em;
}

.coro-panel-title {
  margin: 0;
  color: #2c3e50;
  font-size: 23px;
  font-weight: 900;
}

.coro-live-pill {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 7px 10px;
  border-radius: 999px;
  background: #effaf4;
  color: #26834e;
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 0.05em;
}

.coro-live-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #2ecc71;
}

.coro-score-area {
  display: flex;
  align-items: center;
  gap: 28px;
  padding: 30px 0;
}

.coro-score-circle {
  width: 122px;
  height: 122px;
  flex-shrink: 0;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background:
    radial-gradient(circle at center, #fff 61%, transparent 62%),
    conic-gradient(#c0392b 0 78%, #edf0f2 78% 100%);
}

.coro-score-circle strong {
  color: #2c3e50;
  font-size: 53px;
  font-weight: 900;
  letter-spacing: -2.5px;
}

.coro-score-circle span {
  color: #98a0a7;
  font-size: 12px;
}

.coro-score-row {
  display: grid;
  grid-template-columns: 145px 1fr 34px;
  gap: 14px;
  align-items: center;
  margin-bottom: 18px;
}

.coro-score-label {
  display: flex;
  flex-direction: column;
}

.coro-score-label span {
  color: #495057;
  font-size: 12px;
  font-weight: 750;
}

.coro-score-label small {
  margin-top: 2px;
  color: #a0a8ae;
  font-size: 10px;
}

.coro-score-track {
  height: 7px;
  overflow: hidden;
  border-radius: 999px;
  background: #edf0f2;
}

.coro-score-track span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: #c0392b;
}

.coro-score-row > strong {
  color: #2c3e50;
  font-size: 12px;
  text-align: right;
}

.coro-index-alert {
  display: flex;
  gap: 13px;
  margin-top: 28px;
  padding: 16px;
  border: 1px solid #f1dedb;
  border-radius: 12px;
  background: #fff8f7;
}

.coro-index-alert-icon {
  width: 28px;
  height: 28px;
  flex-shrink: 0;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #c0392b;
  color: #fff;
  font-size: 13px;
  font-weight: 900;
}

.coro-index-alert strong {
  color: #8f2d23;
  font-size: 12px;
}

.coro-index-alert p {
  margin: 3px 0 0;
  color: #8a6561;
  font-size: 11px;
  line-height: 1.5;
}

.coro-sentinel-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  padding: 25px 0;
}

.coro-sentinel-stat {
  padding: 17px;
  border: 1px solid #edf0f2;
  border-radius: 12px;
  background: #fafbfb;
}

.coro-sentinel-stat strong {
  display: block;
  margin-bottom: 4px;
  color: #2c3e50;
  font-size: 24px;
  font-weight: 900;
}

.coro-sentinel-stat span {
  color: #8b949b;
  font-size: 10px;
  font-weight: 700;
}

.coro-person-list {
  border-top: 1px solid #edf0f2;
}

.coro-person-row {
  display: flex;
  align-items: center;
  gap: 13px;
  padding: 15px 0;
  border-bottom: 1px solid #edf0f2;
}

.coro-person-avatar {
  width: 38px;
  height: 38px;
  flex-shrink: 0;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #edf1f4;
  color: #52606b;
  font-size: 11px;
  font-weight: 900;
}

.coro-person-row strong {
  display: block;
  color: #2c3e50;
  font-size: 12px;
}

.coro-person-row div > span {
  display: block;
  margin-top: 3px;
  color: #929ba2;
  font-size: 10px;
}

.coro-person-status {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #9ba3a9;
  font-size: 10px;
  font-weight: 750;
}

.coro-person-status > span {
  width: 7px;
  height: 7px;
  margin: 0 !important;
  border-radius: 50%;
  background: #adb5bd;
}

.coro-person-status.active {
  color: #28864f;
}

.coro-person-status.active > span {
  background: #2ecc71;
}

.coro-sentinel-footer {
  display: flex;
  justify-content: space-between;
  gap: 20px;
  padding-top: 18px;
  color: #9aa2a8;
  font-size: 10px;
}

.coro-sentinel-footer strong {
  color: #c0392b;
}

.coro-incident-flow {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  margin-bottom: 45px;
}

.coro-incident-step {
  position: relative;
  padding-right: 34px;
}

.coro-incident-step-number {
  width: 37px;
  height: 37px;
  margin-bottom: 18px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #2c3e50;
  color: #fff;
  font-size: 11px;
  font-weight: 900;
}

.coro-incident-step h3 {
  margin: 0 0 8px;
  color: #2c3e50;
  font-size: 15px;
  font-weight: 850;
}

.coro-incident-step p {
  margin: 0;
  color: #7e888f;
  font-size: 14px;
  line-height: 1.55;
}

.coro-incident-line {
  position: absolute;
  top: 18px;
  left: 46px;
  right: 10px;
  height: 2px;
  background: #c3cbd1;
}

.coro-incident-demo {
  max-width: 860px;
  margin: 0 auto;
  overflow: hidden;
  border: 1px solid #e2e7ea;
  border-radius: 20px;
  background: #fff;
  box-shadow: 0 24px 65px rgba(44, 62, 80, 0.09);
}

.coro-incident-demo-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
  padding: 23px 28px;
  background: #2c3e50;
}

.coro-incident-demo-header p {
  margin: 0 0 4px;
  color: #f07a6f;
  font-size: 9px;
  font-weight: 900;
  letter-spacing: 0.1em;
}

.coro-incident-demo-header h3 {
  margin: 0;
  color: #fff;
  font-size: 18px;
}

.coro-incident-demo-header > span {
  color: #ffafa6;
  font-size: 10px;
  font-weight: 850;
}

.coro-incident-demo-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
}

.coro-incident-demo-grid > div {
  padding: 24px;
  border-right: 1px solid #edf0f2;
}

.coro-incident-demo-grid > div:last-child {
  border-right: 0;
}

.coro-incident-demo-grid small,
.coro-response-data small {
  display: block;
  margin-bottom: 9px;
  color: #9ca4aa;
  font-size: 9px;
  font-weight: 900;
  letter-spacing: 0.07em;
}

.coro-incident-demo-grid strong,
.coro-response-data strong {
  display: block;
  margin-bottom: 5px;
  color: #2c3e50;
  font-size: 17px;
  font-weight: 850;
}

.coro-incident-demo-grid span,
.coro-response-data span {
  color: #8c959c;
  font-size: 10px;
}

.coro-response-card {
  overflow: hidden;
  border: 1px solid rgba(255,255,255,0.15);
  border-radius: 20px;
  background: #fff;
  box-shadow:
    0 40px 100px rgba(0,0,0,0.35),
    0 8px 24px rgba(0,0,0,0.18);
}

.coro-response-card-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 24px;
  padding: 26px 28px;
  border-bottom: 1px solid #edf0f2;
}

.coro-response-card-head small {
  color: #c0392b;
  font-size: 9px;
  font-weight: 900;
  letter-spacing: 0.1em;
}

.coro-response-card-head h3 {
  margin: 6px 0 3px;
  color: #2c3e50;
  font-size: 22px;
}

.coro-response-card-head p {
  margin: 0;
  color: #929ba2;
  font-size: 11px;
}

.coro-qr-placeholder {
  position: relative;
  width: 72px;
  height: 72px;
  flex-shrink: 0;
  border: 6px solid #2c3e50;
}

.coro-qr-placeholder div {
  position: absolute;
  width: 16px;
  height: 16px;
  background: #2c3e50;
}

.coro-qr-placeholder div:nth-child(1) {
  top: 5px;
  left: 5px;
}

.coro-qr-placeholder div:nth-child(2) {
  top: 5px;
  right: 5px;
}

.coro-qr-placeholder div:nth-child(3) {
  bottom: 5px;
  left: 5px;
}

.coro-qr-placeholder span {
  position: absolute;
  right: 5px;
  bottom: 5px;
  color: #2c3e50;
  font-size: 8px;
  font-weight: 900;
}

.coro-response-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
}

.coro-response-data {
  padding: 23px 28px;
  border-right: 1px solid #edf0f2;
  border-bottom: 1px solid #edf0f2;
}

.coro-response-data:nth-child(2n) {
  border-right: 0;
}

.coro-response-alert {
  display: flex;
  gap: 12px;
  padding: 19px 28px;
  background: #f5faf7;
}

.coro-response-alert > span {
  color: #2ecc71;
}

.coro-response-alert strong {
  display: block;
  color: #267647;
  font-size: 11px;
}

.coro-response-alert p {
  margin: 3px 0 0;
  color: #789184;
  font-size: 10px;
  line-height: 1.5;
}

.coro-rex-flow {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 14px;
  padding-top: 6px;
}

.coro-rex-step {
  position: relative;
  padding-right: 18px;
}

.coro-rex-step-number {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  margin-bottom: 14px;
  border-radius: 50%;
  background: #2c3e50;
  color: #fff;
  font-size: 12px;
  font-weight: 900;
}

.coro-rex-step > strong {
  display: block;
  color: #2c3e50;
  font-size: 13.5px;
  font-weight: 800;
  line-height: 1.4;
}

.coro-rex-line {
  position: absolute;
  top: 17px;
  left: 40px;
  right: 6px;
  height: 2px;
  background: #c3cbd1;
}

@media (max-width: 900px) {
  .coro-feature-split {
    grid-template-columns: 1fr !important;
    gap: 55px !important;
  }

  .coro-incident-flow {
    grid-template-columns: 1fr;
    gap: 18px;
  }

  .coro-incident-step {
    padding: 0 0 0 55px;
    min-height: 60px;
  }

  .coro-incident-step-number {
    position: absolute;
    left: 0;
    top: 0;
  }

  .coro-incident-line {
    top: 39px;
    left: 18px;
    right: auto;
    width: 2px;
    height: calc(100% - 20px);
  }

  .coro-incident-demo-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .coro-rex-flow {
    grid-template-columns: repeat(3, 1fr);
    row-gap: 28px;
  }

  .coro-rex-line {
    display: none;
  }
}

@media (max-width: 640px) {
  .coro-index-panel,
  .coro-sentinel-panel {
    padding: 20px;
    border-radius: 17px;
  }

  .coro-score-area {
    align-items: flex-start;
    flex-direction: column;
  }

  .coro-score-row {
    grid-template-columns: 105px 1fr 28px;
    gap: 9px;
  }

  .coro-sentinel-stats {
    grid-template-columns: 1fr;
  }

  .coro-person-status {
    display: none;
  }

  .coro-incident-demo-grid,
  .coro-response-grid {
    grid-template-columns: 1fr;
  }

  .coro-incident-demo-grid > div,
  .coro-response-data {
    border-right: 0;
    border-bottom: 1px solid #edf0f2;
  }

  .coro-rex-flow {
    grid-template-columns: repeat(2, 1fr);
  }

  .coro-response-card-head {
    padding: 22px;
  }

  .coro-response-data,
  .coro-response-alert {
    padding-left: 22px;
    padding-right: 22px;
  }

  .coro-evacuation-visual {
    min-height: 340px !important;
  }
}

/* ===== CORO PLATFORM DIMENSIONS ===== */

.coro-dimensions-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 18px;
}

.coro-dimension-card {
  position: relative;
  display: block;
  grid-column: span 2;
  min-height: 275px;
  padding: 30px;
  overflow: hidden;
  border: 1px solid #e3e8ec;
  border-radius: 18px;
  background: #ffffff;
  color: inherit;
  text-decoration: none;
  cursor: pointer;
  box-shadow:
    0 2px 6px rgba(44, 62, 80, 0.05),
    0 10px 28px rgba(44, 62, 80, 0.07);
  transition:
    transform 0.25s ease,
    box-shadow 0.25s ease,
    border-color 0.25s ease;
}

.coro-dimension-card:hover {
  transform: translateY(-4px);
  border-color: #d3d9dd;
  box-shadow: 0 20px 45px rgba(44, 62, 80, 0.08);
}

.coro-dimension-card.primary,
.coro-dimension-card.resilience {
  grid-column: span 6;
}

.coro-dimension-card.resilience {
  background: #2c3e50;
  border-color: #2c3e50;
}

.coro-dimension-number {
  position: absolute;
  top: 25px;
  right: 27px;
  color: #dfe4e7;
  font-size: 15px;
  font-weight: 900;
  letter-spacing: 0.08em;
}

.coro-dimension-card.resilience .coro-dimension-number {
  color: rgba(255,255,255,0.18);
}

.coro-dimension-icon {
  width: 54px;
  height: 54px;
  margin-bottom: 28px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f9edeb;
  color: #c0392b;
}

.coro-dimension-card.resilience .coro-dimension-icon {
  background: rgba(255,255,255,0.1);
  color: #f07a6f;
}

.coro-dimension-card h3 {
  max-width: 390px;
  margin: 0 0 16px;
  color: #2c3e50;
  font-size: 22px;
  font-weight: 850;
  line-height: 1.3;
}

.coro-dimension-card p {
  max-width: 500px;
  margin: 0;
  color: #7a858d;
  font-size: 15px;
  line-height: 1.75;
}

.coro-dimension-card.primary h3,
.coro-dimension-card.resilience h3 {
  max-width: 640px;
}

.coro-dimension-card.primary p,
.coro-dimension-card.resilience p {
  max-width: 700px;
}

.coro-dimension-card.resilience h3 {
  color: #ffffff;
}

.coro-dimension-card.resilience p {
  color: rgba(255,255,255,0.65);
}

.coro-dimension-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  margin-top: 24px;
}

.coro-dimension-tags span {
  padding: 7px 12px;
  border-radius: 7px;
  background: #EEF1F3;
  color: #2C3E50;
  border: 1px solid #DDE2E6;
  font-size: 11px;
  font-weight: 850;
}

.coro-dimension-card.resilience .coro-dimension-tags span {
  background: rgba(255,255,255,0.08);
  color: rgba(255,255,255,0.74);
  border-color: rgba(255,255,255,0.15);
}

.coro-dimension-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: 22px;
  color: #C0392B;
  font-size: 13px;
  font-weight: 850;
}

.coro-dimension-link svg {
  transition: transform 0.2s ease;
}

.coro-dimension-card:hover .coro-dimension-link svg {
  transform: translateX(3px);
}

.coro-dimension-card.resilience .coro-dimension-link {
  color: #F07A6F;
}

.coro-section-cta {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-top: 28px;
  padding: 13px 22px;
  border-radius: 8px;
  background: #2c3e50;
  color: #ffffff;
  font-size: 14px;
  font-weight: 800;
  text-decoration: none;
  transition: background-color 0.2s ease, transform 0.2s ease;
}

.coro-section-cta:hover {
  background: #1a252f;
  transform: translateY(-2px);
}

.coro-section-cta svg {
  transition: transform 0.2s ease;
}

.coro-section-cta:hover svg {
  transform: translateX(3px);
}

@media (max-width: 900px) {
  .coro-dimensions-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .coro-dimension-card {
    grid-column: span 1;
  }

  .coro-dimension-card.primary,
  .coro-dimension-card.resilience {
    grid-column: span 2;
  }
}

@media (max-width: 640px) {
  .coro-dimensions-grid {
    grid-template-columns: 1fr;
  }

  .coro-dimension-card,
  .coro-dimension-card.primary,
  .coro-dimension-card.resilience {
    grid-column: 1;
    min-height: auto;
  }
}

        @media (max-width: 900px) {
          .solutions-grid {
            grid-template-columns: repeat(
              2,
              minmax(0, 1fr)
            );
          }

          .solution-card,
          .solution-card:nth-child(1),
          .solution-card:nth-child(2) {
            grid-column: span 1;
          }

          .solution-card:last-child {
            grid-column: 1 / -1;
            width: calc(50% - 14px);
            justify-self: center;
          }

          .incident-showcase {
            grid-template-columns: 1fr;
          }

          .incident-showcase-email {
            max-width: 520px;
          }
        }

        @media (max-width: 640px) {
          .solutions-grid {
            grid-template-columns: 1fr;
            gap: 20px;
          }

          .solution-card,
          .solution-card:nth-child(1),
          .solution-card:nth-child(2),
          .solution-card:last-child {
            grid-column: span 1;
            width: 100%;
          }

          .solution-card-content {
            padding: 24px;
          }

          .solution-card-title {
            font-size: 21px;
          }

          .incident-showcase {
            gap: 20px;
            margin-bottom: 48px;
          }

          .incident-showcase-email {
            max-width: 100%;
          }

          .incident-showcase-copy {
            padding: 18px 20px 20px;
          }
        }
      `}</style>

      {/* NAVIGATION V2 */}
<nav
  className={`coro-nav-v2 ${scrolled ? 'is-scrolled' : ''}`}
>
  <div className="coro-nav-v2-inner">
    {/* LOGO */}
    <a
      href={lang === 'fr' ? '/' : '/?lang=en'}
      aria-label={lang === 'fr' ? 'Accueil CORO' : 'CORO home'}
      className="coro-nav-logo"
    >
      <span>CO</span>
      <span>RO</span>
    </a>

    {/* DESKTOP — MAIN NAV */}
    <div className="coro-nav-desktop">
      {/* PLATFORM */}
      <div
        className="coro-nav-dropdown"
        onMouseEnter={() => setPlatformMenuOpen(true)}
        onMouseLeave={() => setPlatformMenuOpen(false)}
      >
        <button
          type="button"
          className="coro-nav-main-link"
          aria-expanded={platformMenuOpen}
          onClick={() => {
            setPlatformMenuOpen(!platformMenuOpen);
            setSolutionsMenuOpen(false);
          }}
        >
          {lang === 'fr' ? 'Plateforme' : 'Platform'}
          <ChevronDown size={14} />
        </button>

        {platformMenuOpen && (
          <div className="coro-nav-dropdown-panel coro-nav-platform-panel">
            <div className="coro-nav-dropdown-heading">
              <span>
                {lang === 'fr' ? 'PLATEFORME CORO' : 'CORO PLATFORM'}
              </span>

              <strong>
                {lang === 'fr'
                  ? "De la conformité à l'intervention."
                  : 'From compliance to response.'}
              </strong>
            </div>

            <a
              href="#continuum"
              className="coro-nav-dropdown-item"
              onClick={() => setPlatformMenuOpen(false)}
            >
              <BarChart3 size={18} />

              <div>
                <strong>
                  {lang === 'fr'
                    ? 'Résilience opérationnelle'
                    : 'Operational resilience'}
                </strong>

                <span>
                  {lang === 'fr'
                    ? "Mesurez et améliorez votre capacité réelle d'intervention."
                    : 'Measure and improve your actual response capability.'}
                </span>
              </div>
            </a>

            <a
              href="#documents"
              className="coro-nav-dropdown-item"
              onClick={() => setPlatformMenuOpen(false)}
            >
              <FileText size={18} />

              <div>
                <strong>
                  {lang === 'fr'
                    ? 'Gestion documentaire'
                    : 'Document management'}
                </strong>

                <span>
                  {lang === 'fr'
                    ? 'Créez, révisez et approuvez vos plans.'
                    : 'Create, review and approve your plans.'}
                </span>
              </div>
            </a>

            <a
              href="#sentinelle"
              className="coro-nav-dropdown-item"
              onClick={() => setPlatformMenuOpen(false)}
            >
              <Users size={18} />

              <div>
                <strong>CORO Sentinelle</strong>

                <span>
                  {lang === 'fr'
                    ? "Présence, évacuation et organisation d'urgence."
                    : 'Presence, evacuation and emergency organization.'}
                </span>
              </div>
            </a>

            <a
              href="#module-incident"
              className="coro-nav-dropdown-item"
              onClick={() => setPlatformMenuOpen(false)}
            >
              <Zap size={18} />

              <div>
                <strong>
                  {lang === 'fr'
                    ? 'Gestion des incidents'
                    : 'Incident management'}
                </strong>

                <span>
                  {lang === 'fr'
                    ? 'Déclenchez, mobilisez, coordonnez et documentez.'
                    : 'Trigger, mobilize, coordinate and document.'}
                </span>
              </div>
            </a>

            <a
              href={lang === 'fr' ? '/sentinelle-population' : '/sentinelle-population?lang=en'}
              className="coro-nav-dropdown-item"
              onClick={() => setPlatformMenuOpen(false)}
            >
              <Globe size={18} />
              <div>
                <strong>Sentinelle Population</strong>
                <span>{lang === 'fr' ? 'Alerte à la population et urgences environnementales.' : 'Public alerting and environmental emergencies.'}</span>
              </div>
            </a>
          </div>
        )}
      </div>

      {/* SOLUTIONS */}
      <div
        className="coro-nav-dropdown"
        onMouseEnter={() => setSolutionsMenuOpen(true)}
        onMouseLeave={() => setSolutionsMenuOpen(false)}
      >
        <button
          type="button"
          className="coro-nav-main-link"
          aria-expanded={solutionsMenuOpen}
          onClick={() => {
            setSolutionsMenuOpen(!solutionsMenuOpen);
            setPlatformMenuOpen(false);
          }}
        >
          {lang === 'fr' ? 'Solutions' : 'Solutions'}
          <ChevronDown size={14} />
        </button>

        {solutionsMenuOpen && (
          <div className="coro-nav-dropdown-panel coro-nav-solutions-panel">
            <a
              href="#solutions"
              className="coro-nav-dropdown-item"
              onClick={() => setSolutionsMenuOpen(false)}
            >
              <Briefcase size={18} />

              <div>
                <strong>
                  {lang === 'fr'
                    ? 'Pour les professionnels'
                    : 'For professionals'}
                </strong>

                <span>
                  {lang === 'fr'
                    ? 'Consultants, conseillers et firmes spécialisées.'
                    : 'Consultants, advisors and specialized firms.'}
                </span>
              </div>
            </a>

            <a
              href="#solutions"
              className="coro-nav-dropdown-item"
              onClick={() => setSolutionsMenuOpen(false)}
            >
              <Building2 size={18} />

              <div>
                <strong>
                  {lang === 'fr'
                    ? 'Pour les organisations'
                    : 'For organizations'}
                </strong>

                <span>
                  {lang === 'fr'
                    ? 'Propriétaires, gestionnaires et organisations multisites.'
                    : 'Owners, managers and multi-site organizations.'}
                </span>
              </div>
            </a>

            <div className="coro-nav-dropdown-separator" />

            <a
              href="#environments"
              className="coro-nav-dropdown-item coro-nav-dropdown-item-small"
              onClick={() => setSolutionsMenuOpen(false)}
            >
              <Building2 size={16} />

              <div>
                <strong>
                  {lang === 'fr'
                    ? 'Bâtiments commerciaux'
                    : 'Commercial buildings'}
                </strong>
              </div>
            </a>

            <a
              href="#environments"
              className="coro-nav-dropdown-item coro-nav-dropdown-item-small"
              onClick={() => setSolutionsMenuOpen(false)}
            >
              <Factory size={16} />

              <div>
                <strong>
                  {lang === 'fr'
                    ? 'Sites industriels'
                    : 'Industrial sites'}
                </strong>
              </div>
            </a>
          </div>
        )}
      </div>

      <a href="#documents" className="coro-nav-main-link">
        {lang === 'fr' ? 'Documents' : 'Documents'}
      </a>

      <a
        href={lang === 'fr' ? '/pricing' : '/pricing?lang=en'}
        className="coro-nav-main-link"
      >
        {lang === 'fr' ? 'Tarification' : 'Pricing'}
      </a>
    </div>

    {/* DESKTOP — ACTIONS */}
    <div className="coro-nav-actions">
      <button
        type="button"
        onClick={toggleLanguage}
        className="coro-nav-language"
        title={
          lang === 'fr'
            ? 'Switch to English'
            : 'Passer en français'
        }
      >
        <Globe size={15} />
        <span>{lang === 'fr' ? 'EN' : 'FR'}</span>
      </button>

      <a
        href="https://client.getcoro.io/login"
        className="coro-nav-action-link coro-nav-action-desktop"
        title={t.nav.clientPortal}
      >
        <Building2 size={15} />
        <span>{t.nav.clientPortal}</span>
      </a>

      <a
        href="https://app.getcoro.io/login"
        className="coro-nav-action-link coro-nav-action-desktop"
        title={t.nav.login}
      >
        <Users size={15} />
        <span>{t.nav.login}</span>
      </a>

      <a
        href="#demo"
        className="coro-nav-demo coro-nav-action-desktop"
      >
        {t.nav.demo}
      </a>

      <button
        type="button"
        onClick={() => setMenuOpen(!menuOpen)}
        className="coro-nav-mobile-toggle"
        aria-label={
          menuOpen
            ? lang === 'fr'
              ? 'Fermer le menu'
              : 'Close menu'
            : lang === 'fr'
              ? 'Ouvrir le menu'
              : 'Open menu'
        }
      >
        {menuOpen ? <X size={24} /> : <Menu size={24} />}
      </button>
    </div>
  </div>

  {/* MOBILE */}
  {menuOpen && (
    <div className="coro-nav-mobile-menu">
      <div className="coro-nav-mobile-group">
        <span>
          {lang === 'fr' ? 'PLATEFORME' : 'PLATFORM'}
        </span>

        <a
  href="#continuum"
  onClick={() => setMenuOpen(false)}
>
  {lang === 'fr'
    ? 'Résilience opérationnelle'
    : 'Operational resilience'}
</a>

        <a
          href="#documents"
          onClick={() => setMenuOpen(false)}
        >
          {lang === 'fr'
            ? 'Gestion documentaire'
            : 'Document management'}
        </a>

        <a
          href="#sentinelle"
          onClick={() => setMenuOpen(false)}
        >
          CORO Sentinelle
        </a>

        <a
          href="#module-incident"
          onClick={() => setMenuOpen(false)}
        >
          {lang === 'fr'
            ? 'Gestion des incidents'
            : 'Incident management'}
        </a>

        <a
          href={lang === 'fr' ? '/sentinelle-population' : '/sentinelle-population?lang=en'}
          onClick={() => setMenuOpen(false)}
        >
          Sentinelle Population
        </a>
      </div>

      <div className="coro-nav-mobile-group">
        <span>SOLUTIONS</span>

        <a
          href="#solutions"
          onClick={() => setMenuOpen(false)}
        >
          {lang === 'fr'
            ? 'Pour les professionnels'
            : 'For professionals'}
        </a>

        <a
          href="#solutions"
          onClick={() => setMenuOpen(false)}
        >
          {lang === 'fr'
            ? 'Pour les organisations'
            : 'For organizations'}
        </a>

        <a
          href="#environments"
          onClick={() => setMenuOpen(false)}
        >
          {lang === 'fr'
            ? 'Environnements'
            : 'Environments'}
        </a>
      </div>

      <div className="coro-nav-mobile-group">
        <span>
          {lang === 'fr' ? 'EN SAVOIR PLUS' : 'LEARN MORE'}
        </span>

        <a
          href="#documents"
          onClick={() => setMenuOpen(false)}
        >
          {lang === 'fr' ? 'Documents' : 'Documents'}
        </a>

        <a
          href={lang === 'fr' ? '/pricing' : '/pricing?lang=en'}
          onClick={() => setMenuOpen(false)}
        >
          {lang === 'fr' ? 'Tarification' : 'Pricing'}
        </a>

        <a
          href="#security"
          onClick={() => setMenuOpen(false)}
        >
          {lang === 'fr'
            ? 'Confiance & sécurité'
            : 'Trust & security'}
        </a>
      </div>

      <div className="coro-nav-mobile-portals">
        <a
          href="https://client.getcoro.io/login"
          onClick={() => setMenuOpen(false)}
        >
          <Building2 size={16} />
          <span>{t.nav.clientPortal}</span>
        </a>

        <a
          href="https://app.getcoro.io/login"
          onClick={() => setMenuOpen(false)}
        >
          <Users size={16} />
          <span>{t.nav.login}</span>
        </a>
      </div>

      <a
        href="#demo"
        className="coro-nav-mobile-demo"
        onClick={() => setMenuOpen(false)}
      >
        <span>{t.nav.demo}</span>
        <ArrowRight size={16} />
      </a>
    </div>
  )}
</nav>

      {/* HERO V2 */}
<section
  style={{
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    padding: '128px 24px 88px',
    position: 'relative',
    overflow: 'hidden',
  }}
>
  <div
    style={{
      position: 'absolute',
      inset: 0,
      backgroundImage: "url('/images/homepage/hero-building.webp')",
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
    }}
  />

  <div
    style={{
      position: 'absolute',
      inset: 0,
      background:
        'linear-gradient(90deg, rgba(16,27,38,0.96) 0%, rgba(22,38,52,0.90) 42%, rgba(24,43,58,0.68) 68%, rgba(20,38,52,0.48) 100%)',
    }}
  />

  <div
    style={{
      position: 'absolute',
      inset: 0,
      background:
        'linear-gradient(to top, rgba(9,18,27,0.48) 0%, transparent 45%)',
    }}
  />

  <div
    style={{
      maxWidth: 1200,
      margin: '0 auto',
      width: '100%',
      position: 'relative',
      zIndex: 1,
    }}
  >
    <div className="coro-hero-grid">
      {/* COPY */}
      <div className="coro-hero-copy">
        <div
          className="animate-fade-in-up"
          style={{
            display: 'inline-block',
            backgroundColor: 'rgba(192,57,43,0.18)',
            border: '1px solid rgba(231,76,60,0.35)',
            borderRadius: 999,
            padding: '7px 15px',
            marginBottom: 24,
          }}
        >
          <span
            style={{
              color: '#F07A6F',
              fontSize: 12,
              fontWeight: 800,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
          >
            {t.hero.tag}
          </span>
        </div>

        <h1
          className="animate-fade-in-up delay-1"
          style={{
            fontSize: 'clamp(42px, 5.5vw, 70px)',
            fontWeight: 900,
            color: '#FFFFFF',
            lineHeight: 1.05,
            letterSpacing: '-2.5px',
            marginBottom: 26,
            whiteSpace: 'pre-line',
          }}
        >
          {t.hero.title}
        </h1>

        <p
          className="animate-fade-in-up delay-2"
          style={{
            fontSize: 18,
            color: 'rgba(255,255,255,0.76)',
            lineHeight: 1.75,
            marginBottom: 36,
            maxWidth: 610,
          }}
        >
          {t.hero.subtitle}
        </p>

        <div
          className="animate-fade-in-up delay-3"
          style={{
            display: 'flex',
            gap: 14,
            flexWrap: 'wrap',
          }}
        >
          <a
            href="#demo"
            className="btn-primary"
            style={{ fontSize: 16 }}
          >
            {t.hero.cta} →
          </a>

          <a
  href="#continuum"
  className="btn-secondary"
  style={{ fontSize: 16 }}
>
  {t.hero.ctaSecondary}
</a>
        </div>

        <button
          type="button"
          onClick={() => setShowDemoVideo(true)}
          className="animate-fade-in-up delay-3 coro-hero-watch-demo"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 10,
            marginTop: 22,
            padding: 0,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          <span
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 34,
              height: 34,
              borderRadius: '50%',
              backgroundColor: 'rgba(255,255,255,0.12)',
              border: '1px solid rgba(255,255,255,0.3)',
              flexShrink: 0,
            }}
          >
            <Play size={13} color="#FFFFFF" fill="#FFFFFF" style={{ marginLeft: 2 }} />
          </span>
          <span
            style={{
              fontSize: 14.5,
              fontWeight: 700,
              color: '#FFFFFF',
              textDecoration: 'underline',
              textUnderlineOffset: 3,
            }}
          >
            {t.hero.watchDemo}
          </span>
          <span
            style={{
              fontSize: 13,
              color: 'rgba(255,255,255,0.5)',
            }}
          >
            · {t.hero.watchDemoDuration}
          </span>
        </button>

        <p
          className="animate-fade-in-up delay-4"
          style={{
            marginTop: 34,
            fontSize: 12.5,
            color: 'rgba(255,255,255,0.54)',
            letterSpacing: '0.01em',
          }}
        >
          {t.hero.trusted}
        </p>
      </div>

      {/* OPERATIONAL INTELLIGENCE */}
      <div className="coro-hero-intelligence animate-fade-in-up delay-3">
        <div className="coro-hero-building-head">
          <div>
            <p
              style={{
                margin: '0 0 5px',
                color: '#FFFFFF',
                fontSize: 16,
                fontWeight: 850,
              }}
            >
              {lang === 'fr' ? 'Tour Prémont' : 'Prémont Tower'}
            </p>

            <p
              style={{
                margin: 0,
                color: 'rgba(255,255,255,0.48)',
                fontSize: 12,
              }}
            >
              1200 boul. Robert-Bourassa · Montréal
            </p>
          </div>

          <span className="coro-status">
            <span className="coro-status-dot" />
            {lang === 'fr' ? 'Situation normale' : 'Normal operations'}
          </span>
        </div>

        <div className="coro-index-row">
          <div>
            <div className="coro-index-number">
              <strong>78</strong>
              <span>/100</span>
            </div>

            <p
              style={{
                margin: '8px 0 0',
                color: 'rgba(255,255,255,0.62)',
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              {lang === 'fr'
                ? 'INDICE CORO'
                : 'CORO INDEX'}
            </p>
          </div>

          <div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: 16,
                marginBottom: 10,
              }}
            >
              <span
                style={{
                  color: 'rgba(255,255,255,0.66)',
                  fontSize: 12,
                }}
              >
                {lang === 'fr'
                  ? "Organisation d'urgence"
                  : 'Emergency organization'}
              </span>

              <strong
                style={{
                  color: '#FFFFFF',
                  fontSize: 12,
                }}
              >
                8 / 11
              </strong>
            </div>

            <div className="coro-readiness-bar">
              <span />
            </div>

            <p
              style={{
                margin: '9px 0 0',
                color: 'rgba(255,255,255,0.42)',
                fontSize: 11,
              }}
            >
              {lang === 'fr'
                ? 'Ressources disponibles maintenant'
                : 'Resources available now'}
            </p>
          </div>
        </div>

        <div className="coro-hero-metrics">
          <div className="coro-hero-metric">
            <p
              style={{
                margin: '0 0 5px',
                color: 'rgba(255,255,255,0.48)',
                fontSize: 10,
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.07em',
              }}
            >
              {lang === 'fr' ? 'Présence' : 'Occupancy'}
            </p>

            <p
              style={{
                margin: 0,
                color: '#FFFFFF',
                fontSize: 36,
                fontWeight: 900,
                letterSpacing: '-1px',
                lineHeight: 1,
              }}
            >
              127
            </p>

            <p
              style={{
                margin: '3px 0 0',
                color: 'rgba(255,255,255,0.46)',
                fontSize: 11,
              }}
            >
              {lang === 'fr' ? 'occupants' : 'occupants'}
            </p>
          </div>

          <div className="coro-hero-metric">
            <p
              style={{
                margin: '0 0 7px',
                color: 'rgba(255,255,255,0.48)',
                fontSize: 10,
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.07em',
              }}
            >
              {lang === 'fr' ? 'Plans' : 'Plans'}
            </p>

            <p
              style={{
                margin: '0 0 4px',
                color: '#9DE2B8',
                fontSize: 12,
                fontWeight: 750,
              }}
            >
              ✓ PMU
            </p>

            <p
              style={{
                margin: 0,
                color: '#9DE2B8',
                fontSize: 12,
                fontWeight: 750,
              }}
            >
              ✓ PSI
            </p>
          </div>

          <div className="coro-hero-metric">
            <p
              style={{
                margin: '0 0 5px',
                color: 'rgba(255,255,255,0.48)',
                fontSize: 10,
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.07em',
              }}
            >
              {lang === 'fr' ? 'Exercices' : 'Drills'}
            </p>

            <p
              style={{
                margin: 0,
                color: '#FFFFFF',
                fontSize: 32,
                fontWeight: 900,
                letterSpacing: '-0.5px',
                lineHeight: 1,
              }}
            >
              3 / 4
            </p>

            <p
              style={{
                margin: '3px 0 0',
                color: 'rgba(255,255,255,0.46)',
                fontSize: 11,
              }}
            >
              {lang === 'fr' ? 'à jour' : 'up to date'}
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>

{/* TRUST STRIP V2 */}
<section
  style={{
    backgroundColor: '#FFFFFF',
    padding: '30px 24px',
    borderBottom: '1px solid #E9ECEF',
  }}
>
  <div className="coro-trust-grid">
    {[
      {
  value: 'Canada',
  label:
    lang === 'fr'
      ? 'Données hébergées au Canada'
      : 'Data hosted in Canada',
},
      {
        value: 'FR / EN',
        label:
          lang === 'fr'
            ? 'Plateforme bilingue'
            : 'Bilingual platform',
      },
      {
        value:
          lang === 'fr'
            ? 'PMU · PSI · PCA'
            : 'ERP · FSP · BCP',
        label:
          lang === 'fr'
            ? 'Documents disponibles'
            : 'Available documents',
      },
      {
        value: '43+',
        label:
          lang === 'fr'
            ? 'Procédures structurées'
            : 'Structured procedures',
      },
      {
        value:
          lang === 'fr'
            ? 'ISO 22301 · CNPI 2020 · CNESST'
            : 'ISO 22301 · NFPA · CCOHS',
        label:
          lang === 'fr'
            ? 'Cadres & références'
            : 'Frameworks & references',
      },
    ].map((item, i) => (
      <div
        key={i}
        className="coro-trust-item"
      >
        <p
          style={{
            margin: '0 0 5px',
            color: '#2C3E50',
            fontSize: 15,
            fontWeight: 850,
          }}
        >
          {item.value}
        </p>

        <p
          style={{
            margin: 0,
            color: '#7A858E',
            fontSize: 11.5,
            fontWeight: 600,
          }}
        >
          {item.label}
        </p>
      </div>
    ))}
  </div>
</section>

{/* PROBLÈME — DOCUMENTÉ ≠ PRÊT */}
<section
  style={{
    backgroundColor: '#F6F8F9',
    padding: '80px 24px 72px',
  }}
>
  <div
    style={{
      maxWidth: 1200,
      margin: '0 auto',
    }}
  >
    <div
      style={{
        textAlign: 'center',
        maxWidth: 820,
        margin: '0 auto',
      }}
    >
      <span className="section-tag">
        {lang === 'fr'
          ? 'De la conformité à la capacité opérationnelle'
          : 'From compliance to operational capability'}
      </span>

      <h2
        style={{
          fontSize: 'clamp(32px, 4.5vw, 50px)',
          fontWeight: 900,
          color: '#2C3E50',
          lineHeight: 1.12,
          letterSpacing: '-1.5px',
          marginBottom: 20,
        }}
      >
        {lang === 'fr'
          ? 'Avoir un plan ne signifie pas être prêt.'
          : 'Having a plan does not mean being ready.'}
      </h2>

      <p
        style={{
          margin: '0 auto',
          maxWidth: 760,
          color: '#6C757D',
          fontSize: 18,
          lineHeight: 1.75,
        }}
      >
        {lang === 'fr'
          ? "Les plans définissent ce qui devrait se produire. CORO les relie à la réalité du bâtiment afin de savoir ce qui peut réellement être fait lorsqu'une situation survient."
          : 'Plans define what should happen. CORO connects them to the reality of the building so you can know what can actually be done when an event occurs.'}
      </p>
    </div>

    <div className="coro-problem-grid">
      {[
        {
          num: '01',
          icon: <FileText size={22} />,
          tag: lang === 'fr' ? 'DOCUMENTS' : 'DOCUMENTS',
          title:
            lang === 'fr'
              ? 'Vos plans sont-ils réellement prêts ?'
              : 'Are your plans actually ready?',
          detail:
            lang === 'fr'
              ? 'Approuvés · à jour · accessibles'
              : 'Approved · current · accessible',
        },
        {
          num: '02',
          icon: <Users size={22} />,
          tag: lang === 'fr' ? 'PERSONNES' : 'PEOPLE',
          title:
            lang === 'fr'
              ? 'Les bonnes personnes sont-elles présentes ?'
              : 'Are the right people actually on site?',
          detail:
            lang === 'fr'
              ? 'Employés · visiteurs · responsables'
              : 'Employees · visitors · responders',
        },
        {
          num: '03',
          icon: <ShieldCheck size={22} />,
          tag: lang === 'fr' ? 'CAPACITÉS' : 'CAPABILITIES',
          title:
            lang === 'fr'
              ? 'Votre organisation peut-elle remplir ses rôles ?'
              : 'Can your organization actually fill its roles?',
          detail:
            lang === 'fr'
              ? 'Qualifications · couverture · exercices'
              : 'Qualifications · coverage · drills',
        },
        {
          num: '04',
          icon: <Zap size={22} />,
          tag: lang === 'fr' ? 'INTERVENTION' : 'RESPONSE',
          title:
            lang === 'fr'
              ? 'Pouvez-vous agir immédiatement ?'
              : 'Can you act immediately?',
          detail:
            lang === 'fr'
              ? 'Procédures · mobilisation · information'
              : 'Procedures · mobilization · information',
        },
      ].map(item => (
        <div
          key={item.num}
          className="coro-problem-card"
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 46,
              height: 46,
              marginBottom: 18,
              borderRadius: 11,
              backgroundColor: '#FDEDEC',
              color: '#C0392B',
            }}
          >
            {item.icon}
          </div>

          <p
            style={{
              margin: '0 0 22px',
              color: '#C0392B',
              fontSize: 12,
              fontWeight: 900,
              letterSpacing: '0.1em',
            }}
          >
            {item.num} · {item.tag}
          </p>

          <h3
            style={{
              margin: '0 0 14px',
              color: '#2C3E50',
              fontSize: 19,
              fontWeight: 800,
              lineHeight: 1.4,
            }}
          >
            {item.title}
          </h3>

          <p
            style={{
              margin: 0,
              color: '#8A949D',
              fontSize: 13,
              lineHeight: 1.6,
            }}
          >
            {item.detail}
          </p>
        </div>
      ))}
    </div>

    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 20,
        justifyContent: 'center',
        marginTop: 52,
      }}
    >
      <div
        style={{
          width: 40,
          height: 1,
          background: '#C0392B',
        }}
      />

      <p
        style={{
          margin: 0,
          color: '#2C3E50',
          fontSize: 20,
          fontWeight: 850,
        }}
      >
        {lang === 'fr'
          ? 'CORO connecte ces quatre réalités.'
          : 'CORO connects these four realities.'}
      </p>

      <div
        style={{
          width: 40,
          height: 1,
          background: '#C0392B',
        }}
      />
    </div>
  </div>
</section>

{/* CONTINUUM CORO */}
<section
  id="continuum"
  style={{
    background:
      'linear-gradient(160deg, #1A2B38 0%, #243C4F 60%, #1C2F3D 100%)',
    padding: '80px 24px',
    borderTop: 'none',
    position: 'relative',
    overflow: 'hidden',
  }}
>
  <div
    style={{
      position: 'absolute',
      top: -200,
      right: -150,
      width: 500,
      height: 500,
      borderRadius: '50%',
      background:
        'radial-gradient(circle, rgba(192,57,43,0.12) 0%, transparent 70%)',
      pointerEvents: 'none',
    }}
  />

  <div
    style={{
      maxWidth: 1200,
      margin: '0 auto',
      position: 'relative',
    }}
  >
    <div
      style={{
        textAlign: 'center',
        maxWidth: 820,
        margin: '0 auto',
      }}
    >
      <span
        style={{
          display: 'inline-block',
          marginBottom: 16,
          color: '#F07A6F',
          fontSize: 12,
          fontWeight: 900,
          letterSpacing: '0.1em',
        }}
      >
        {lang === 'fr'
          ? 'LE CONTINUUM CORO'
          : 'THE CORO CONTINUUM'}
      </span>

      <h2
        style={{
          fontSize: 'clamp(32px, 4.5vw, 48px)',
          fontWeight: 900,
          color: '#FFFFFF',
          lineHeight: 1.15,
          letterSpacing: '-1.3px',
          marginBottom: 18,
        }}
      >
        {lang === 'fr'
          ? "Une même information, du plan au retour d'expérience."
          : 'One continuous flow of information, from planning to lessons learned.'}
      </h2>

      <p
        style={{
          margin: '0 auto',
          maxWidth: 760,
          color: 'rgba(255,255,255,0.65)',
          fontSize: 18,
          lineHeight: 1.75,
        }}
      >
        {lang === 'fr'
          ? "CORO maintient le lien entre préparation, situation réelle, intervention et amélioration continue afin que l'information reste utile tout au long du cycle."
          : 'CORO keeps preparation, real-world conditions, response and continuous improvement connected so information remains useful throughout the entire cycle.'}
      </p>
    </div>

    <div style={{
      marginTop: 54,
      borderRadius: 20,
      overflow: 'hidden',
      boxShadow: '0 30px 80px rgba(0,0,0,0.25)',
    }}>
      <img
        src="/images/homepage/continuum-coro.webp"
        alt="Le continuum CORO de résilience organisationnelle"
        style={{
          width: '100%',
          height: 'auto',
          display: 'block',
        }}
        loading="lazy"
      />
    </div>
  </div>
</section>

{/* INDICE CORO */}
<section
  id="indice-coro"
  style={{
    backgroundColor: '#FFFFFF',
    padding: '80px 24px',
  }}
>
  <div
    style={{
      maxWidth: 1200,
      margin: '0 auto',
      display: 'grid',
      gridTemplateColumns: 'minmax(0, 0.9fr) minmax(480px, 1.1fr)',
      gap: 80,
      alignItems: 'center',
    }}
    className="coro-feature-split"
  >
    {/* COPY */}
    <div>
      <span className="section-tag">
        {lang === 'fr'
          ? '01 · MESURER LA PRÉPARATION'
          : '01 · MEASURE READINESS'}
      </span>

      <h2
        style={{
          fontSize: 'clamp(34px, 4.5vw, 50px)',
          fontWeight: 900,
          color: '#2C3E50',
          lineHeight: 1.1,
          letterSpacing: '-1.5px',
          marginBottom: 22,
        }}
      >
        {lang === 'fr'
          ? 'Votre plan dit que vous êtes prêts. CORO vous indique si vous l’êtes réellement.'
          : 'Your plan says you are ready. CORO shows whether you actually are.'}
      </h2>

      <p
        style={{
          color: '#6C757D',
          fontSize: 17,
          lineHeight: 1.75,
          marginBottom: 32,
        }}
      >
        {lang === 'fr'
          ? "L’Indice CORO transforme les données de préparation en une lecture opérationnelle simple. Couverture des rôles, qualifications, plans approuvés et exercices contribuent à une vision actualisée de la capacité d’intervention."
          : 'The CORO Index transforms preparedness data into a clear operational picture. Role coverage, qualifications, approved plans and drills contribute to an up-to-date view of response capability.'}
      </p>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 17,
        }}
      >
        {[
          lang === 'fr'
            ? 'Détecter les lacunes avant une urgence'
            : 'Identify gaps before an emergency',
          lang === 'fr'
            ? 'Suivre l’évolution de la préparation'
            : 'Track readiness over time',
          lang === 'fr'
            ? 'Prioriser les actions correctives'
            : 'Prioritize corrective actions',
          lang === 'fr'
            ? 'Comparer la capacité réelle aux exigences du plan'
            : 'Compare actual capability with plan requirements',
        ].map(item => (
          <div
            key={item}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 12,
            }}
          >
            <CheckCircle
              size={19}
              color="#C0392B"
              style={{ flexShrink: 0, marginTop: 2 }}
            />

            <span
              style={{
                color: '#495057',
                fontSize: 15,
                lineHeight: 1.55,
              }}
            >
              {item}
            </span>
          </div>
        ))}
      </div>
    </div>

    {/* INDEX UI */}
    <div className="coro-index-panel">
      <div className="coro-panel-top">
        <div>
          <p className="coro-panel-eyebrow">
            {lang === 'fr'
              ? 'RÉSILIENCE OPÉRATIONNELLE'
              : 'OPERATIONAL RESILIENCE'}
          </p>

          <h3 className="coro-panel-title">
            {lang === 'fr'
              ? 'Indice CORO'
              : 'CORO Index'}
          </h3>
        </div>

        <span className="coro-live-pill">
          <span className="coro-live-dot" />
          {lang === 'fr' ? 'ACTUALISÉ' : 'UPDATED'}
        </span>
      </div>

      <div className="coro-score-area">
        <div className="coro-score-circle">
          <div>
            <strong>78</strong>
            <span>/100</span>
          </div>
        </div>

        <div style={{ flex: 1 }}>
          <p
            style={{
              margin: '0 0 7px',
              color: '#2C3E50',
              fontSize: 18,
              fontWeight: 850,
            }}
          >
            {lang === 'fr'
              ? 'Préparation satisfaisante'
              : 'Satisfactory readiness'}
          </p>

          <p
            style={{
              margin: 0,
              color: '#7B858D',
              fontSize: 13,
              lineHeight: 1.55,
            }}
          >
            {lang === 'fr'
              ? '3 éléments nécessitent une attention.'
              : '3 items require attention.'}
          </p>
        </div>
      </div>

      {[
        {
          label:
            lang === 'fr'
              ? 'Couverture des rôles'
              : 'Role coverage',
          weight: '40 %',
          score: 82,
        },
        {
          label:
            lang === 'fr'
              ? 'Qualifications'
              : 'Qualifications',
          weight: '20 %',
          score: 71,
        },
        {
          label:
            lang === 'fr'
              ? 'Plans approuvés'
              : 'Approved plans',
          weight: '25 %',
          score: 100,
        },
        {
          label:
            lang === 'fr'
              ? 'Exercices'
              : 'Drills',
          weight: '15 %',
          score: 63,
        },
      ].map(item => (
        <div
          key={item.label}
          className="coro-score-row"
        >
          <div className="coro-score-label">
            <span>{item.label}</span>
            <small>{item.weight}</small>
          </div>

          <div className="coro-score-track">
            <span style={{ width: `${item.score}%` }} />
          </div>

          <strong>{item.score}</strong>
        </div>
      ))}

      <div className="coro-index-alert">
        <div className="coro-index-alert-icon">!</div>

        <div>
          <strong>
            {lang === 'fr'
              ? 'Attention requise'
              : 'Attention required'}
          </strong>

          <p>
            {lang === 'fr'
              ? "Couverture incomplète de l’équipe d’urgence pour la période actuelle."
              : 'Emergency team coverage is incomplete for the current period.'}
          </p>
        </div>
      </div>
    </div>
  </div>
</section>

{/* SENTINELLE — PRÉSENCE RÉELLE */}
<section
  id="sentinelle"
  style={{
    backgroundColor: '#F6F8F9',
    padding: '80px 24px',
    borderTop: '1px solid #EDF0F2',
  }}
>
  <div
    className="coro-feature-split"
    style={{
      maxWidth: 1200,
      margin: '0 auto',
      display: 'grid',
      gridTemplateColumns: 'minmax(500px, 1.1fr) minmax(0, 0.9fr)',
      gap: 80,
      alignItems: 'center',
    }}
  >
    {/* UI */}
    <div className="coro-sentinel-panel">
      <div className="coro-panel-top">
        <div>
          <p className="coro-panel-eyebrow">
            SENTINELLE
          </p>

          <h3 className="coro-panel-title">
            {lang === 'fr'
              ? 'Présence en temps réel'
              : 'Real-time occupancy'}
          </h3>
        </div>

        <span className="coro-live-pill">
          <span className="coro-live-dot" />
          {lang === 'fr' ? 'EN DIRECT' : 'LIVE'}
        </span>
      </div>

      <div className="coro-sentinel-stats">
        {[
          {
            value: '127',
            label:
              lang === 'fr'
                ? 'Personnes sur site'
                : 'People on site',
          },
          {
            value: '8 / 11',
            label:
              lang === 'fr'
                ? "Équipe d'urgence"
                : 'Emergency team',
          },
          {
            value: '14',
            label:
              lang === 'fr'
                ? 'Visiteurs'
                : 'Visitors',
          },
        ].map(item => (
          <div
            key={item.label}
            className="coro-sentinel-stat"
          >
            <strong>{item.value}</strong>
            <span>{item.label}</span>
          </div>
        ))}
      </div>

      <div className="coro-person-list">
        {[
          {
            initials: 'MG',
            name: 'Martin Gagnon',
            role:
              lang === 'fr'
                ? "Coordonnateur d'urgence"
                : 'Emergency coordinator',
            status:
              lang === 'fr'
                ? 'Sur site'
                : 'On site',
            active: true,
          },
          {
            initials: 'SL',
            name: 'Sophie Leblanc',
            role:
              lang === 'fr'
                ? "Responsable d'étage"
                : 'Floor warden',
            status:
              lang === 'fr'
                ? 'Sur site'
                : 'On site',
            active: true,
          },
          {
            initials: 'JP',
            name: 'Jean-Pierre Roy',
            role:
              lang === 'fr'
                ? 'Secouriste'
                : 'First aider',
            status:
              lang === 'fr'
                ? 'Hors site'
                : 'Off site',
            active: false,
          },
        ].map(person => (
          <div
            key={person.name}
            className="coro-person-row"
          >
            <div className="coro-person-avatar">
              {person.initials}
            </div>

            <div style={{ flex: 1 }}>
              <strong>{person.name}</strong>
              <span>{person.role}</span>
            </div>

            <div
              className={
                person.active
                  ? 'coro-person-status active'
                  : 'coro-person-status'
              }
            >
              <span />
              {person.status}
            </div>
          </div>
        ))}
      </div>

      <div className="coro-sentinel-footer">
        <span>
          {lang === 'fr'
            ? 'Dernière mise à jour : maintenant'
            : 'Last updated: now'}
        </span>

        <strong>
          {lang === 'fr'
            ? 'Voir le registre →'
            : 'View registry →'}
        </strong>
      </div>
    </div>

    {/* COPY */}
    <div>
      <span className="section-tag">
        {lang === 'fr'
          ? '02 · CONNAÎTRE LA SITUATION RÉELLE'
          : '02 · KNOW THE REAL SITUATION'}
      </span>

      <h2
        style={{
          fontSize: 'clamp(34px, 4.5vw, 50px)',
          fontWeight: 900,
          color: '#2C3E50',
          lineHeight: 1.1,
          letterSpacing: '-1.5px',
          marginBottom: 22,
        }}
      >
        {lang === 'fr'
          ? 'Votre plan connaît les rôles. Sentinelle sait qui est réellement là.'
          : 'Your plan knows the roles. Sentinel knows who is actually there.'}
      </h2>

      <p
        style={{
          color: '#6C757D',
          fontSize: 17,
          lineHeight: 1.75,
          marginBottom: 32,
        }}
      >
        {lang === 'fr'
          ? "Employés, visiteurs et entrepreneurs s’enregistrent par code PIN ou QR. CORO relie ensuite leur présence aux responsabilités prévues dans l’organisation d’urgence."
          : 'Employees, visitors and contractors check in using a PIN or QR code. CORO then connects their presence with the responsibilities defined in the emergency organization.'}
      </p>

      {[
        lang === 'fr'
          ? 'Présence réelle par bâtiment'
          : 'Actual occupancy by building',
        lang === 'fr'
          ? "Disponibilité de l’équipe d’urgence"
          : 'Emergency team availability',
        lang === 'fr'
          ? 'Visiteurs et entrepreneurs intégrés'
          : 'Visitors and contractors included',
        lang === 'fr'
          ? 'État opérationnel actualisé automatiquement'
          : 'Operational status updated automatically',
      ].map(item => (
        <div
          key={item}
          style={{
            display: 'flex',
            gap: 12,
            marginBottom: 16,
            alignItems: 'flex-start',
          }}
        >
          <CheckCircle
            size={19}
            color="#C0392B"
            style={{ flexShrink: 0, marginTop: 2 }}
          />
          <span
            style={{
              color: '#495057',
              fontSize: 15,
            }}
          >
            {item}
          </span>
        </div>
      ))}

      <a
        href={lang === 'fr' ? '/sentinelle' : '/sentinelle?lang=en'}
        className="coro-section-cta"
      >
        {lang === 'fr' ? 'Découvrir Sentinelle' : 'Discover Sentinel'}
        <ArrowRight size={16} />
      </a>

      <a
        href={lang === 'fr' ? '/sentinelle-population' : '/sentinelle-population?lang=en'}
        style={{
          display: 'grid',
          gridTemplateColumns: '44px minmax(0, 1fr) 20px',
          gap: 14,
          alignItems: 'center',
          marginTop: 28,
          padding: 18,
          color: '#FFFFFF',
          backgroundColor: '#173F46',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 6,
          textDecoration: 'none',
          boxShadow: '0 14px 32px rgba(23,63,70,0.14)',
        }}
      >
        <span
          style={{
            width: 44,
            height: 44,
            display: 'grid',
            placeItems: 'center',
            backgroundColor: '#C0392B',
            borderRadius: 4,
          }}
        >
          <Globe size={22} aria-hidden="true" />
        </span>

        <span style={{ minWidth: 0 }}>
          <strong style={{ display: 'block', fontSize: 15, marginBottom: 4 }}>
            Sentinelle Population
          </strong>
          <span style={{ display: 'block', color: 'rgba(255,255,255,0.72)', fontSize: 13, lineHeight: 1.45 }}>
            {lang === 'fr'
              ? 'Pour préparer et mettre en œuvre les communications aux populations autour de l’installation.'
              : 'Prepare and implement communications to populations around the facility.'}
          </span>
        </span>

        <ArrowRight size={18} aria-hidden="true" />
      </a>
    </div>
  </div>
</section>

{/* EVACUATION — TEMPS RÉEL */}
<section
  id="evacuation"
  style={{
    backgroundColor: '#FFFFFF',
    padding: '80px 24px',
    borderTop: '1px solid #EDF0F2',
  }}
>
  <div
    className="coro-feature-split"
    style={{
      maxWidth: 1200,
      margin: '0 auto',
      display: 'grid',
      gridTemplateColumns: 'minmax(0, 0.9fr) minmax(500px, 1.1fr)',
      gap: 80,
      alignItems: 'center',
    }}
  >
    {/* CONTEXTE TERRAIN */}
    <div>
      <div
        className="coro-evacuation-visual"
        style={{
          position: 'relative',
          minHeight: 640,
          borderRadius: 22,
          overflow: 'hidden',
          backgroundImage:
            "linear-gradient(180deg, rgba(24,43,58,0.08) 0%, rgba(24,43,58,0.82) 100%), url('/images/homepage/evacuation.webp')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          boxShadow: '0 24px 60px rgba(44,62,80,0.14)',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 22,
            left: 22,
            padding: '8px 12px',
            borderRadius: 999,
            backgroundColor: 'rgba(255,255,255,0.94)',
            color: '#2C3E50',
            fontSize: 10,
            fontWeight: 900,
            letterSpacing: '0.08em',
          }}
        >
          {lang === 'fr'
            ? 'APERÇU · DONNÉES DE DÉMONSTRATION'
            : 'PREVIEW · DEMO DATA'}
        </div>

        <div
          style={{
            position: 'absolute',
            left: 28,
            right: 28,
            bottom: 28,
            color: '#FFFFFF',
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 900,
              letterSpacing: '0.1em',
              color: '#F3A099',
              marginBottom: 8,
            }}
          >
            {lang === 'fr'
              ? 'ÉVACUATION EN COURS'
              : 'EVACUATION IN PROGRESS'}
          </div>

          <div
            style={{
              fontSize: 25,
              fontWeight: 850,
              lineHeight: 1.25,
            }}
          >
            {lang === 'fr'
              ? 'Tour Prémont · Point de rassemblement A'
              : 'Tour Prémont · Assembly point A'}
          </div>
        </div>
      </div>
    </div>

    {/* INTERFACE OPÉRATIONNELLE */}
    <div>
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          color: '#C0392B',
          fontSize: 12,
          fontWeight: 900,
          letterSpacing: '0.09em',
          marginBottom: 18,
        }}
      >
        <span>
          {lang === 'fr'
            ? 'ÉVACUATION · TEMPS RÉEL'
            : 'EVACUATION · REAL TIME'}
        </span>
      </div>

      <h2
        style={{
          margin: 0,
          color: '#2C3E50',
          fontSize: 'clamp(34px, 4vw, 52px)',
          lineHeight: 1.08,
          letterSpacing: '-0.035em',
          fontWeight: 900,
          maxWidth: 650,
        }}
      >
        {lang === 'fr'
          ? 'Savoir qui est sorti. Identifier immédiatement qui manque.'
          : 'Know who made it out. Identify immediately who is missing.'}
      </h2>

      <p
        style={{
          margin: '24px 0 34px',
          color: '#6C757D',
          fontSize: 18,
          lineHeight: 1.7,
          maxWidth: 650,
        }}
      >
        {lang === 'fr'
          ? "Lors d’une évacuation, CORO transforme le registre de présence en portrait opérationnel : personnes présentes au déclenchement, statut d’évacuation, point de rassemblement et personnes à confirmer."
          : 'During an evacuation, CORO turns the occupancy register into an operational picture: people present when the event began, evacuation status, assembly point and people still to be confirmed.'}
      </p>

      {/* SNAPSHOT */}
      <div
        style={{
          border: '1px solid #E1E6E9',
          borderRadius: 18,
          backgroundColor: '#FAFBFB',
          overflow: 'hidden',
          boxShadow: '0 16px 40px rgba(44,62,80,0.08)',
        }}
      >
        <div
          style={{
            padding: '18px 20px',
            borderBottom: '1px solid #E7EBED',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
          }}
        >
          <div>
            <div
              style={{
                color: '#2C3E50',
                fontWeight: 850,
                fontSize: 15,
              }}
            >
              {lang === 'fr'
                ? 'Situation d’évacuation'
                : 'Evacuation status'}
            </div>

            <div
              style={{
                color: '#7B8790',
                fontSize: 12,
                marginTop: 3,
              }}
            >
              {lang === 'fr'
                ? 'Tour Prémont'
                : 'Tour Prémont'}
            </div>
          </div>

          <span
            style={{
              padding: '6px 10px',
              borderRadius: 999,
              backgroundColor: '#FFF0EE',
              color: '#C0392B',
              fontSize: 10,
              fontWeight: 900,
              letterSpacing: '0.07em',
            }}
          >
            {lang === 'fr' ? 'EN COURS' : 'ACTIVE'}
          </span>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            borderBottom: '1px solid #E7EBED',
          }}
        >
          {[
            {
              value: '127',
              fr: 'Présents',
              en: 'Present',
            },
            {
              value: '118',
              fr: 'Évacués',
              en: 'Evacuated',
            },
            {
              value: '6',
              fr: 'À confirmer',
              en: 'To confirm',
            },
            {
              value: '3',
              fr: 'Manquants',
              en: 'Missing',
            },
          ].map((item, index) => (
            <div
              key={item.fr}
              style={{
                padding: '20px 10px',
                textAlign: 'center',
                borderRight:
                  index < 3
                    ? '1px solid #E7EBED'
                    : 'none',
              }}
            >
              <div
                style={{
                  color:
                    index === 3
                      ? '#C0392B'
                      : '#2C3E50',
                  fontSize: 25,
                  fontWeight: 900,
                }}
              >
                {item.value}
              </div>

              <div
                style={{
                  marginTop: 4,
                  color: '#7B8790',
                  fontSize: 10,
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                {lang === 'fr'
                  ? item.fr
                  : item.en}
              </div>
            </div>
          ))}
        </div>

        <div style={{ padding: 20 }}>
          <div
            style={{
              color: '#7B8790',
              fontSize: 10,
              fontWeight: 900,
              letterSpacing: '0.08em',
              marginBottom: 12,
            }}
          >
            {lang === 'fr'
              ? 'POINT DE RASSEMBLEMENT A'
              : 'ASSEMBLY POINT A'}
          </div>

          {[
            {
              name: 'Martin Gagnon',
              fr: 'ÉVACUÉ',
              en: 'EVACUATED',
              status: 'ok',
            },
            {
              name: 'Sophie Leblanc',
              fr: 'ÉVACUÉE',
              en: 'EVACUATED',
              status: 'ok',
            },
            {
              name: 'Jean-Pierre Roy',
              fr: 'À CONFIRMER',
              en: 'TO CONFIRM',
              status: 'warning',
            },
          ].map((person) => (
            <div
              key={person.name}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 14,
                padding: '11px 0',
                borderTop: '1px solid #EDF0F2',
              }}
            >
              <span
                style={{
                  color: '#2C3E50',
                  fontSize: 13,
                  fontWeight: 750,
                }}
              >
                {person.name}
              </span>

              <span
                style={{
                  color:
                    person.status === 'ok'
                      ? '#27885B'
                      : '#C47B16',
                  fontSize: 10,
                  fontWeight: 900,
                  letterSpacing: '0.05em',
                }}
              >
                {lang === 'fr'
                  ? person.fr
                  : person.en}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div
        style={{
          marginTop: 25,
          display: 'inline-block',
          padding: '10px 18px',
          borderRadius: 8,
          backgroundColor: '#2C3E50',
          color: '#FFFFFF',
          fontSize: 11,
          fontWeight: 900,
          letterSpacing: '0.065em',
          lineHeight: 1.6,
        }}
      >
        {lang === 'fr'
          ? 'PRÉSENCE → ÉVACUATION → RASSEMBLEMENT → VÉRIFICATION'
          : 'PRESENCE → EVACUATION → ASSEMBLY → VERIFICATION'}
      </div>
    </div>
  </div>
</section>

{/* OPERATIONAL BRIDGE */}
<section
  style={{
    backgroundColor: '#2C3E50',
    padding: '40px 24px',
  }}
>
  <div
    style={{
      maxWidth: 1100,
      margin: '0 auto',
      textAlign: 'center',
    }}
  >
    <p
      style={{
        margin: '0 0 10px',
        color: '#F07A6F',
        fontSize: 12,
        fontWeight: 900,
        letterSpacing: '0.11em',
      }}
    >
      {lang === 'fr'
        ? 'DE LA PRÉSENCE À L’ACTION'
        : 'FROM PRESENCE TO ACTION'}
    </p>

    <h2
      style={{
        margin: 0,
        color: '#FFFFFF',
        fontSize: 'clamp(25px, 3.2vw, 36px)',
        lineHeight: 1.3,
        fontWeight: 850,
      }}
    >
      {lang === 'fr'
        ? "Lorsqu’un incident survient, CORO sait quels plans appliquer, qui mobiliser et quelles informations rendre disponibles."
        : 'When an incident occurs, CORO knows which plans apply, who can be mobilized and what information must be made available.'}
    </h2>
  </div>
</section>



{/* INCIDENT — DE L'ÉVÉNEMENT À L'ACTION */}
<section
  id="module-incident"
  style={{
    backgroundColor: '#FFFFFF',
    padding: '80px 24px',
  }}
>
  <div
    style={{
      maxWidth: 1200,
      margin: '0 auto',
    }}
  >
    <div
      style={{
        maxWidth: 800,
        marginBottom: 40,
      }}
    >
      <span className="section-tag">
        {lang === 'fr'
          ? '03 · INTERVENIR'
          : '03 · RESPOND'}
      </span>

      <h2
        style={{
          fontSize: 'clamp(34px, 4.5vw, 50px)',
          fontWeight: 900,
          color: '#2C3E50',
          lineHeight: 1.1,
          letterSpacing: '-1.5px',
          marginBottom: 22,
        }}
      >
        {lang === 'fr'
          ? "Un incident ne devrait jamais commencer par chercher l'information."
          : 'An incident should never begin by searching for information.'}
      </h2>

      <p
        style={{
          color: '#6C757D',
          fontSize: 17,
          lineHeight: 1.75,
          margin: 0,
        }}
      >
        {lang === 'fr'
          ? "CORO relie l’événement aux procédures, aux personnes disponibles, aux communications et au suivi de l’intervention dans un même environnement."
          : 'CORO connects the event to procedures, available people, communications and response tracking in one environment.'}
      </p>

      <a
        href={lang === 'fr' ? '/resilience-operationnelle' : '/resilience-operationnelle?lang=en'}
        className="coro-section-cta"
      >
        {lang === 'fr' ? 'Découvrir la résilience opérationnelle' : 'Discover operational resilience'}
        <ArrowRight size={16} />
      </a>
    </div>

    <div className="coro-incident-flow">
      {[
        {
          num: '01',
          title:
            lang === 'fr'
              ? 'Incident'
              : 'Incident',
          text:
            lang === 'fr'
              ? 'Un événement est déclaré ou signalé.'
              : 'An event is declared or reported.',
        },
        {
          num: '02',
          title:
            lang === 'fr'
              ? 'Procédure'
              : 'Procedure',
          text:
            lang === 'fr'
              ? 'La procédure applicable est immédiatement accessible.'
              : 'The applicable procedure becomes immediately available.',
        },
        {
          num: '03',
          title:
            lang === 'fr'
              ? 'Mobilisation'
              : 'Mobilization',
          text:
            lang === 'fr'
              ? 'Les ressources présentes et mobilisables sont identifiées.'
              : 'Available and mobilizable resources are identified.',
        },
        {
          num: '04',
          title:
            lang === 'fr'
              ? 'Communication'
              : 'Communication',
          text:
            lang === 'fr'
              ? 'Les bonnes personnes reçoivent la bonne information.'
              : 'The right people receive the right information.',
        },
        {
          num: '05',
          title:
            lang === 'fr'
              ? 'Suivi'
              : 'Tracking',
          text:
            lang === 'fr'
              ? "Actions, décisions et événements alimentent la chronologie."
              : 'Actions, decisions and events feed the incident timeline.',
        },
      ].map((item, i) => (
        <div
          key={item.num}
          className="coro-incident-step"
        >
          <div className="coro-incident-step-number">
            {item.num}
          </div>

          <h3>{item.title}</h3>
          <p>{item.text}</p>

          {i < 4 && (
            <span className="coro-incident-line" />
          )}
        </div>
      ))}
    </div>

    <div className="coro-incident-demo">
      <div className="coro-incident-demo-header">
        <div>
          <p>
            {lang === 'fr'
              ? 'INCIDENT ACTIF'
              : 'ACTIVE INCIDENT'}
          </p>

          <h3>
            {lang === 'fr'
              ? 'Fuite de gaz — Niveau P1'
              : 'Gas leak — Level P1'}
          </h3>
        </div>

        <span>
          {lang === 'fr'
            ? '14:32 · EN COURS'
            : '14:32 · ACTIVE'}
        </span>
      </div>

      <div className="coro-incident-demo-grid">
        <div>
          <small>
            {lang === 'fr'
              ? 'PROCÉDURE'
              : 'PROCEDURE'}
          </small>
          <strong>
            {lang === 'fr'
              ? 'Fuite de gaz'
              : 'Gas leak'}
          </strong>
          <span>
            {lang === 'fr'
              ? 'Procédure opérationnelle chargée'
              : 'Operational procedure loaded'}
          </span>
        </div>

        <div>
          <small>
            {lang === 'fr'
              ? 'ÉQUIPE'
              : 'TEAM'}
          </small>
          <strong>8 / 11</strong>
          <span>
            {lang === 'fr'
              ? 'ressources présentes'
              : 'resources on site'}
          </span>
        </div>

        <div>
          <small>
            {lang === 'fr'
              ? 'NOTIFICATIONS'
              : 'NOTIFICATIONS'}
          </small>
          <strong>18 / 20</strong>
          <span>
            {lang === 'fr'
              ? 'confirmations reçues'
              : 'confirmations received'}
          </span>
        </div>

        <div>
          <small>
            {lang === 'fr'
              ? 'CHRONOLOGIE'
              : 'TIMELINE'}
          </small>
          <strong>7</strong>
          <span>
            {lang === 'fr'
              ? 'événements consignés'
              : 'events logged'}
          </span>
        </div>
      </div>
    </div>
  </div>
</section>

{/* INTERVENTION SECOURS */}
<section
  style={{
    backgroundImage:
      "linear-gradient(135deg, rgba(24,43,58,0.97) 0%, rgba(36,62,82,0.91) 100%), url('/images/homepage/first-responders.webp')",
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    padding: '80px 24px',
    overflow: 'hidden',
  }}
>
  <div
    className="coro-feature-split"
    style={{
      maxWidth: 1200,
      margin: '0 auto',
      display: 'grid',
      gridTemplateColumns: 'minmax(0, 0.95fr) minmax(500px, 1.05fr)',
      gap: 80,
      alignItems: 'center',
    }}
  >
    <div>
      <span
        style={{
          display: 'inline-block',
          marginBottom: 20,
          color: '#F07A6F',
          fontSize: 12,
          fontWeight: 900,
          letterSpacing: '0.1em',
        }}
      >
        {lang === 'fr'
          ? 'INFORMATION D’INTERVENTION'
          : 'RESPONSE INFORMATION'}
      </span>

      <h2
        style={{
          margin: '0 0 22px',
          color: '#FFFFFF',
          fontSize: 'clamp(34px, 4.5vw, 50px)',
          fontWeight: 900,
          lineHeight: 1.1,
          letterSpacing: '-1.5px',
        }}
      >
        {lang === 'fr'
          ? "Lorsque les services d’urgence arrivent, l’information critique doit déjà être prête."
          : 'When emergency services arrive, critical information should already be ready.'}
      </h2>

      <p
        style={{
          margin: '0 0 32px',
          color: 'rgba(255,255,255,0.67)',
          fontSize: 17,
          lineHeight: 1.75,
        }}
      >
        {lang === 'fr'
          ? "CORO est conçu pour extraire les données pertinentes du bâtiment et les rendre accessibles rapidement aux intervenants autorisés, sans avoir à chercher dans plusieurs documents."
          : 'CORO is designed to extract relevant building data and make it rapidly accessible to authorized responders without searching through multiple documents.'}
      </p>

      {[
        lang === 'fr'
          ? 'Accès sécurisé à l’information du bâtiment'
          : 'Secure access to building information',
        lang === 'fr'
          ? 'Risques et matières dangereuses'
          : 'Hazards and hazardous materials',
        lang === 'fr'
          ? 'Systèmes de protection incendie'
          : 'Fire protection systems',
        lang === 'fr'
          ? 'Plans et informations critiques'
          : 'Plans and critical information',
        lang === 'fr'
          ? 'Situation d’occupation disponible'
          : 'Occupancy status available',
      ].map(item => (
        <div
          key={item}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 11,
            marginBottom: 14,
            color: 'rgba(255,255,255,0.82)',
            fontSize: 14,
          }}
        >
          <CheckCircle
            size={17}
            color="#65D69A"
          />
          {item}
        </div>
      ))}
    </div>

    {/* RESPONSE CARD */}
    <div className="coro-response-card">
      <img
        src="/alert/fiche_intervention.webp"
        alt={
          lang === 'fr'
            ? "Aperçu réel de la fiche d'intervention générée par CORO lors d'un incident"
            : "Real preview of the response sheet generated by CORO during an incident"
        }
        style={{ width: '100%', display: 'block' }}
      />
    </div>
  </div>
</section>

{/* EXERCICES + REX */}
<section
  style={{
    backgroundColor: '#FFFFFF',
    padding: '80px 24px',
  }}
>
  <div
    style={{
      maxWidth: 1200,
      margin: '0 auto',
    }}
  >
    <div
      style={{
        textAlign: 'center',
        maxWidth: 800,
        margin: '0 auto 58px',
      }}
    >
      <span className="section-tag">
        {lang === 'fr'
          ? '04 · AMÉLIORER'
          : '04 · IMPROVE'}
      </span>

      <h2
        style={{
          fontSize: 'clamp(34px, 4.5vw, 50px)',
          fontWeight: 900,
          color: '#2C3E50',
          lineHeight: 1.1,
          letterSpacing: '-1.5px',
          marginBottom: 20,
        }}
      >
        {lang === 'fr'
          ? "Chaque exercice et chaque incident doivent rendre le prochain meilleur."
          : 'Every drill and every incident should make the next response better.'}
      </h2>

      <p
        style={{
          color: '#6C757D',
          fontSize: 17,
          lineHeight: 1.75,
          margin: 0,
        }}
      >
        {lang === 'fr'
          ? "CORO ferme la boucle entre préparation, intervention et amélioration continue."
          : 'CORO closes the loop between preparedness, response and continuous improvement.'}
      </p>
    </div>

    <div
      style={{
        position: 'relative',
        height: 350,
        marginBottom: 46,
        borderRadius: 18,
        overflow: 'hidden',
        backgroundImage:
          "linear-gradient(90deg, rgba(24,43,58,0.76), rgba(24,43,58,0.18)), url('/images/homepage/drill-exercise.webp')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        boxShadow: '0 18px 45px rgba(44,62,80,0.10)',
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: 32,
          bottom: 28,
          maxWidth: 500,
        }}
      >
        <span
          style={{
            display: 'block',
            marginBottom: 7,
            color: '#F07A6F',
            fontSize: 11,
            fontWeight: 900,
            letterSpacing: '0.1em',
          }}
        >
          {lang === 'fr'
            ? 'EXERCICES · VALIDATION TERRAIN'
            : 'DRILLS · FIELD VALIDATION'}
        </span>

        <strong
          style={{
            display: 'block',
            color: '#FFFFFF',
            fontSize: 22,
            lineHeight: 1.35,
          }}
        >
          {lang === 'fr'
            ? 'Tester la préparation avant qu’elle soit réellement nécessaire.'
            : 'Test preparedness before it is actually needed.'}
        </strong>
      </div>
    </div>

    <div className="coro-rex-flow">
      {[
        {
          num: '01',
          title:
            lang === 'fr'
              ? 'Exercice ou incident'
              : 'Drill or incident',
        },
        {
          num: '02',
          title:
            lang === 'fr'
              ? 'Chronologie'
              : 'Timeline',
        },
        {
          num: '03',
          title:
            lang === 'fr'
              ? 'Rapport'
              : 'Report',
        },
        {
          num: '04',
          title: 'REX',
        },
        {
          num: '05',
          title:
            lang === 'fr'
              ? 'Actions correctives'
              : 'Corrective actions',
        },
        {
          num: '06',
          title:
            lang === 'fr'
              ? 'Plans actualisés'
              : 'Updated plans',
        },
      ].map((item, i, arr) => (
        <div
          key={item.num}
          className="coro-rex-step"
        >
          <div className="coro-rex-step-number">
            {item.num}
          </div>

          <strong>{item.title}</strong>

          {i < arr.length - 1 && (
            <span className="coro-rex-line" />
          )}
        </div>
      ))}
    </div>

    <div
      style={{
        marginTop: 42,
        padding: '40px 34px',
        borderRadius: 16,
        backgroundColor: '#2C3E50',
        border: '1px solid rgba(255,255,255,0.1)',
        textAlign: 'center',
      }}
    >
      <p
        style={{
          margin: 0,
          color: '#FFFFFF',
          fontSize: 18,
          fontWeight: 800,
          lineHeight: 1.55,
        }}
      >
        {lang === 'fr'
          ? 'Le document n’est plus la fin du processus. Il devient une composante vivante du cycle de résilience.'
          : 'The document is no longer the end of the process. It becomes a living part of the resilience cycle.'}
      </p>
    </div>
  </div>
</section>



      {/* PLATFORM — 5 CONNECTED DIMENSIONS */}
<section
  id="plateforme"
  style={{
    backgroundColor: '#F6F8F9',
    padding: '80px 24px',
    borderTop: '1px solid #EDF0F2',
  }}
>
  <div
    style={{
      maxWidth: 1200,
      margin: '0 auto',
    }}
  >
    <div
      style={{
        maxWidth: 820,
        marginBottom: 40,
      }}
    >
      <span className="section-tag">
        {lang === 'fr'
          ? 'LA PLATEFORME CORO'
          : 'THE CORO PLATFORM'}
      </span>

      <h2
        style={{
          margin: '0 0 22px',
          color: '#2C3E50',
          fontSize: 'clamp(34px, 4.5vw, 50px)',
          fontWeight: 900,
          lineHeight: 1.1,
          letterSpacing: '-1.5px',
        }}
      >
        {lang === 'fr'
          ? 'Une seule plateforme pour relier ce qui fonctionne encore trop souvent en silos.'
          : 'One platform connecting what too often operates in silos.'}
      </h2>

      <p
        style={{
          margin: 0,
          color: '#6C757D',
          fontSize: 17,
          lineHeight: 1.75,
        }}
      >
        {lang === 'fr'
          ? "Documentation, mandats, performance, clients et résilience opérationnelle partagent le même environnement et les mêmes données."
          : 'Documentation, projects, performance, clients and operational resilience share the same environment and the same data.'}
      </p>
    </div>

    <div className="coro-dimensions-grid">

      {/* 01 */}
      <a
        href={lang === 'fr' ? '/gestion-documentaire' : '/gestion-documentaire?lang=en'}
        className="coro-dimension-card primary"
      >
        <div className="coro-dimension-number">01</div>

        <div className="coro-dimension-icon">
          <FileText size={28} />
        </div>

        <h3>
          {lang === 'fr'
            ? 'Production & conformité documentaire'
            : 'Document production & compliance'}
        </h3>

        <p>
          {lang === 'fr'
            ? 'Créez, structurez, révisez, approuvez et maintenez vos plans dans un environnement contrôlé.'
            : 'Create, structure, review, approve and maintain your plans in a controlled environment.'}
        </p>

        <div className="coro-dimension-tags">
          <span>PMU</span>
          <span>PSI</span>
          <span>PCA</span>
          <span>43+ procédures</span>
        </div>

        <span className="coro-dimension-link">
          {lang === 'fr' ? 'En savoir plus' : 'Learn more'}
          <ArrowRight size={14} />
        </span>
      </a>

      {/* 02 */}
      <a
        href={lang === 'fr' ? '/gestion-de-projets' : '/gestion-de-projets?lang=en'}
        className="coro-dimension-card"
      >
        <div className="coro-dimension-number">02</div>

        <div className="coro-dimension-icon">
          <Briefcase size={28} />
        </div>

        <h3>
          {lang === 'fr'
            ? 'Gestion de projets & mandats'
            : 'Project & engagement management'}
        </h3>

        <p>
          {lang === 'fr'
            ? 'Centralisez bâtiments, projets, activités, responsabilités, échéances et suivi des heures.'
            : 'Centralize buildings, projects, activities, responsibilities, deadlines and time tracking.'}
        </p>

        <span className="coro-dimension-link">
          {lang === 'fr' ? 'En savoir plus' : 'Learn more'}
          <ArrowRight size={14} />
        </span>
      </a>

      {/* 03 */}
      <a
        href={lang === 'fr' ? '/performance-objectifs' : '/performance-objectifs?lang=en'}
        className="coro-dimension-card"
      >
        <div className="coro-dimension-number">03</div>

        <div className="coro-dimension-icon">
          <BarChart3 size={28} />
        </div>

        <h3>
          {lang === 'fr'
            ? 'Performance & objectifs'
            : 'Performance & objectives'}
        </h3>

        <p>
          {lang === 'fr'
            ? 'Transformez les opérations en indicateurs exploitables pour mieux piloter capacité, budgets et objectifs.'
            : 'Turn operations into actionable indicators to better manage capacity, budgets and objectives.'}
        </p>

        <div className="coro-dimension-tags">
          <span>
            {lang === 'fr' ? 'Heures' : 'Hours'}
          </span>
          <span>
            {lang === 'fr' ? 'Budgets' : 'Budgets'}
          </span>
          <span>Capacity</span>
        </div>

        <span className="coro-dimension-link">
          {lang === 'fr' ? 'En savoir plus' : 'Learn more'}
          <ArrowRight size={14} />
        </span>
      </a>

      {/* 04 */}
      <a
        href={lang === 'fr' ? '/portail-client' : '/portail-client?lang=en'}
        className="coro-dimension-card"
      >
        <div className="coro-dimension-number">04</div>

        <div className="coro-dimension-icon">
          <Users size={28} />
        </div>

        <h3>
          {lang === 'fr'
            ? 'Portail client'
            : 'Client portal'}
        </h3>

        <p>
          {lang === 'fr'
            ? 'Donnez à chaque client un accès structuré à ses bâtiments, documents, activités et informations opérationnelles.'
            : 'Give each client structured access to their buildings, documents, activities and operational information.'}
        </p>

        <div className="coro-dimension-tags">
          <span>
            {lang === 'fr' ? 'Bâtiments' : 'Buildings'}
          </span>
          <span>
            {lang === 'fr' ? 'Documents' : 'Documents'}
          </span>
          <span>
            {lang === 'fr' ? 'Activités' : 'Activities'}
          </span>
        </div>

        <span className="coro-dimension-link">
          {lang === 'fr' ? 'En savoir plus' : 'Learn more'}
          <ArrowRight size={14} />
        </span>
      </a>

      {/* 05 */}
      <a
        href={lang === 'fr' ? '/resilience-operationnelle' : '/resilience-operationnelle?lang=en'}
        className="coro-dimension-card resilience"
      >
        <div className="coro-dimension-number">05</div>

        <div className="coro-dimension-icon">
          <ShieldCheck size={28} />
        </div>

        <h3>
          {lang === 'fr'
            ? 'Résilience & Intervention'
            : 'Resilience & Response'}
        </h3>

        <p>
          {lang === 'fr'
            ? "Reliez présence réelle, organisation d’urgence, préparation, incidents, exercices et retour d’expérience."
            : 'Connect real-time occupancy, emergency organization, preparedness, incidents, drills and lessons learned.'}
        </p>

        <div className="coro-dimension-tags">
          <span>Sentinelle</span>
          <span>Indice CORO</span>
          <span>Incident</span>
          <span>REX</span>
        </div>

        <span className="coro-dimension-link">
          {lang === 'fr' ? 'En savoir plus' : 'Learn more'}
          <ArrowRight size={14} />
        </span>
      </a>

    </div>
  </div>
</section>

{/* PRODUCT PROOF */}
<section
  style={{
    backgroundColor: '#FFFFFF',
    padding: '80px 24px',
  }}
>
  <div
    style={{
      maxWidth: 1200,
      margin: '0 auto',
    }}
  >
    <div
      style={{
        maxWidth: 820,
        margin: '0 auto 52px',
        textAlign: 'center',
      }}
    >
      <span className="section-tag">
        {lang === 'fr'
          ? 'UN ENVIRONNEMENT CONNECTÉ'
          : 'ONE CONNECTED ENVIRONMENT'}
      </span>

      <h2
        style={{
          margin: '0 0 20px',
          color: '#2C3E50',
          fontSize: 'clamp(34px, 4.5vw, 50px)',
          fontWeight: 900,
          lineHeight: 1.1,
          letterSpacing: '-1.5px',
        }}
      >
        {lang === 'fr'
          ? 'Une même donnée. Plusieurs usages. Aucun double travail.'
          : 'One source of data. Multiple uses. No duplicate work.'}
      </h2>

      <p
        style={{
          maxWidth: 730,
          margin: '0 auto',
          color: '#6C757D',
          fontSize: 17,
          lineHeight: 1.75,
        }}
      >
        {lang === 'fr'
          ? "Configurez un bâtiment une fois. CORO réutilise l’information là où elle devient utile : documents, portail client, Sentinelle, indice de résilience et intervention."
          : 'Configure a building once. CORO reuses that information wherever it becomes useful: documents, client portal, Sentinel, resilience index and response.'}
      </p>
    </div>

    {/* Ici : conserver votre système actuel de screenshots,
        mais remplacer les onglets par les 5 vues ci-dessous. */}

    {(() => {
  const productViews = [
  {
    label: lang === 'fr' ? 'Tableau de bord' : 'Dashboard',
    image: '/images/homepage/platform-dashboard.webp',
    eyebrow:
      lang === 'fr'
        ? 'VISION GLOBALE'
        : 'GLOBAL OVERVIEW',
    title:
      lang === 'fr'
        ? 'Pilotez vos opérations depuis un même environnement.'
        : 'Manage your operations from one environment.',
    description:
      lang === 'fr'
        ? "Projets, bâtiments, activités et indicateurs donnent aux équipes une vue structurée de ce qui nécessite leur attention."
        : 'Projects, buildings, activities and indicators give teams a structured view of what requires their attention.',
  },
  {
    label: lang === 'fr' ? 'Documents' : 'Documents',
    image: '/images/homepage/platform-documents.webp',
    eyebrow:
      lang === 'fr'
        ? 'DONNÉES STRUCTURÉES'
        : 'STRUCTURED DATA',
    title:
      lang === 'fr'
        ? 'Le document devient une source de données opérationnelles.'
        : 'The document becomes a source of operational data.',
    description:
      lang === 'fr'
        ? "Les informations structurées dans CORO peuvent être réutilisées là où elles deviennent utiles, de la préparation documentaire jusqu'à l'intervention."
        : 'Information structured in CORO can be reused wherever it becomes useful, from document preparation through emergency response.',
  },
  {
    label: 'Sentinelle',
    image: '/images/homepage/platform-sentinelle.webp',
    eyebrow:
      lang === 'fr'
        ? 'SITUATION RÉELLE'
        : 'REAL-TIME SITUATION',
    title:
      lang === 'fr'
        ? "Reliez le plan à ce qui se passe réellement dans le bâtiment."
        : 'Connect the plan to what is actually happening in the building.',
    description:
      lang === 'fr'
        ? "Présence, rôles d'urgence et disponibilité opérationnelle permettent de savoir quelles ressources peuvent réellement être mobilisées."
        : 'Occupancy, emergency roles and operational availability help identify which resources can actually be mobilized.',
  },
  {
    label: 'Incident',
    image: '/images/homepage/platform-incident.webp',
    eyebrow:
      lang === 'fr'
        ? 'PASSAGE À L’ACTION'
        : 'FROM PLAN TO ACTION',
    title:
      lang === 'fr'
        ? "Le contexte est déjà là lorsque l'incident commence."
        : 'The context is already there when an incident begins.',
    description:
      lang === 'fr'
        ? "Bâtiment, procédures, personnes présentes et organisation d'urgence peuvent être réunis dans un même environnement d'intervention."
        : 'Building information, procedures, people on site and the emergency organization can be brought together in one response environment.',
  },
  {
    label:
      lang === 'fr'
        ? 'Portail client'
        : 'Client portal',
    image: '/images/homepage/platform-client-portal.webp',
    eyebrow:
      lang === 'fr'
        ? 'UNE VUE PARTAGÉE'
        : 'A SHARED VIEW',
    title:
      lang === 'fr'
        ? 'Donnez au client accès à ce qui compte pour son organisation.'
        : 'Give clients access to what matters for their organization.',
    description:
      lang === 'fr'
        ? "Bâtiments, documents, activités et résilience sont regroupés dans un espace structuré accessible au client."
        : 'Buildings, documents, activities and resilience information are brought together in a structured client environment.',
  },
];

  const activeProduct = productViews[activeProductTab];

  return (
    <>
      <div className="coro-product-tabs">
        {productViews.map((view, index) => (
          <button
            key={view.label}
            type="button"
            className={activeProductTab === index ? 'active' : ''}
            onClick={() => setActiveProductTab(index)}
          >
            {view.label}
          </button>
        ))}
      </div>

      <div className="coro-product-proof-grid">
        <div className="coro-product-browser">
          <div className="coro-product-browser-bar">
            <div className="coro-browser-dots">
              <span />
              <span />
              <span />
            </div>

            <div className="coro-browser-address">
              app.getcoro.io
            </div>
          </div>

          <div className="coro-product-screen">
            <img
              key={activeProduct.image}
              src={activeProduct.image}
              alt={activeProduct.label}
            />
          </div>
        </div>

        <div className="coro-product-proof-copy">
          <span className="coro-product-eyebrow">
            {activeProduct.eyebrow}
          </span>

          <h3>{activeProduct.title}</h3>

          <p>{activeProduct.description}</p>

          <div className="coro-product-connection">
            <span className="coro-product-connection-dot" />

            <span>
              {lang === 'fr'
                ? 'Connecté aux mêmes données CORO'
                : 'Connected to the same CORO data'}
            </span>
          </div>
        </div>
      </div>
    </>
  );
})()}
  </div>
</section>

            {/* DOCUMENTS — OPERATIONAL FOUNDATION */}
      <section
        id="documents"
        style={{
          backgroundColor: '#FFFFFF',
          padding: '72px 24px',
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: '0 auto',
          }}
        >
          <div className="coro-documents-header">
            <div>
              <span className="section-tag">
                {lang === 'fr'
                  ? 'PRODUCTION & CONFORMITÉ DOCUMENTAIRE'
                  : 'DOCUMENT PRODUCTION & COMPLIANCE'}
              </span>

              <h2>
                {lang === 'fr'
                  ? 'Des plans conçus pour être utilisés, pas seulement archivés.'
                  : 'Plans designed to be used, not just archived.'}
              </h2>
            </div>

            <p>
              {lang === 'fr'
                ? "CORO structure l'information dès sa création afin qu'elle puisse servir au-delà du document — dans le portail client, l'Indice CORO, Sentinelle et les opérations d'urgence."
                : 'CORO structures information from the moment it is created so it can be used beyond the document — in the client portal, CORO Index, Sentinel and emergency operations.'}
            </p>
          </div>

          <div className="coro-documents-layout">
            {/* DOCUMENTS DISPONIBLES */}
            <div className="coro-documents-main">
              <div className="coro-documents-main-head">
                <div>
                  <span className="coro-documents-kicker">
                    {lang === 'fr'
                      ? 'DISPONIBLES'
                      : 'AVAILABLE'}
                  </span>

                  <h3>
                    {lang === 'fr'
                      ? 'Plans opérationnels'
                      : 'Operational plans'}
                  </h3>
                </div>

                <span className="coro-documents-count">
                  3
                </span>
              </div>

              <div className="coro-document-list">
                {t.documents.items
                  .filter((doc: any) => !doc.phase)
                  .map((doc: any) => (
                    <a
                      key={doc.code}
                      href={`/documents/${
                        doc.code === 'PMU'
                          ? 'plan-mesures-urgence-pmu'
                          : doc.code === 'PSI'
                            ? 'plan-securite-incendie-psi'
                            : 'plan-continuite-activites-pca'
                      }${lang === 'en' ? '?lang=en' : ''}`}
                      className="coro-document-row"
                    >
                      <span
                        className="coro-document-code"
                        style={{
                          borderColor: doc.color,
                          color: doc.color,
                        }}
                      >
                        {doc.code}
                      </span>

                      <div className="coro-document-info">
                        <strong>{doc.name}</strong>
                        <span>{doc.desc}</span>
                      </div>

                      <ArrowRight
                        size={18}
                        className="coro-document-arrow"
                      />
                    </a>
                  ))}
              </div>
            </div>

            {/* CAPACITÉS DOCUMENTAIRES */}
            <div className="coro-document-capabilities">
              <span className="coro-documents-kicker">
                {lang === 'fr'
                  ? 'UNE DONNÉE QUI RESTE UTILE'
                  : 'DATA THAT REMAINS USEFUL'}
              </span>

              <h3>
                {lang === 'fr'
                  ? 'Du configurateur jusqu’au terrain.'
                  : 'From configuration to the field.'}
              </h3>

              <div className="coro-document-capability-list">
                {[
                  {
                    icon: <FileText size={19} />,
                    title:
                      lang === 'fr'
                        ? 'Génération structurée'
                        : 'Structured generation',
                    desc:
                      lang === 'fr'
                        ? 'Les données du bâtiment alimentent automatiquement la structure du document.'
                        : 'Building data automatically feeds the document structure.',
                  },
                  {
                    icon: <ShieldCheck size={19} />,
                    title:
                      lang === 'fr'
                        ? '43+ procédures structurées'
                        : '43+ structured procedures',
                    desc:
                      lang === 'fr'
                        ? "Une bibliothèque opérationnelle adaptée aux situations d'urgence et aux besoins du bâtiment."
                        : 'An operational library adapted to emergency situations and building requirements.',
                  },
                  {
                    icon: <CheckCircle size={19} />,
                    title:
                      lang === 'fr'
                        ? "Workflow d'approbation"
                        : 'Approval workflow',
                    desc:
                      lang === 'fr'
                        ? 'Révision, validation et approbation restent intégrées au cycle documentaire.'
                        : 'Review, validation and approval remain integrated into the document lifecycle.',
                  },
                  {
                    icon: <Globe size={19} />,
                    title:
                      lang === 'fr'
                        ? 'Export professionnel FR / EN'
                        : 'Professional FR / EN export',
                    desc:
                      lang === 'fr'
                        ? 'Des livrables professionnels générés à partir des mêmes données structurées.'
                        : 'Professional deliverables generated from the same structured data.',
                  },
                ].map(item => (
                  <div
                    key={item.title}
                    className="coro-document-capability"
                  >
                    <div className="coro-document-capability-icon">
                      {item.icon}
                    </div>

                    <div>
                      <strong>{item.title}</strong>
                      <span>{item.desc}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* PHASE 2 */}
          <div className="coro-documents-phase2">
            <div className="coro-documents-phase2-copy">
              <span className="coro-documents-kicker">
                {lang === 'fr'
                  ? 'PHASE 2'
                  : 'PHASE 2'}
              </span>

              <strong>
                {lang === 'fr'
                  ? 'La bibliothèque CORO continue de s’étendre.'
                  : 'The CORO library continues to expand.'}
              </strong>
            </div>

            <div className="coro-phase2-documents">
              {t.documents.items
                .filter((doc: any) => doc.phase === 2)
                .map((doc: any) => (
                  <span
                    key={doc.code}
                    className="coro-phase2-document"
                  >
                    <b>{doc.code}</b>
                    {doc.name}
                  </span>
                ))}
            </div>
          </div>
        </div>
      </section>

            {/* AUDIENCES — PROFESSIONALS / ORGANIZATIONS */}
      <section
        id="solutions"
        style={{
          backgroundColor: '#F8F9FA',
          padding: '72px 24px',
          borderTop: '1px solid #E9ECEF',
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: '0 auto',
          }}
        >
          <div className="coro-audiences-header">
            <span className="section-tag">
              {lang === 'fr'
                ? 'UNE PLATEFORME · DEUX PERSPECTIVES'
                : 'ONE PLATFORM · TWO PERSPECTIVES'}
            </span>

            <h2>
              {lang === 'fr'
                ? 'CORO s’adapte à la façon dont vous gérez la résilience.'
                : 'CORO adapts to how you manage resilience.'}
            </h2>

            <p>
              {lang === 'fr'
                ? "Que vous accompagniez plusieurs clients ou pilotiez directement la résilience de votre organisation, CORO relie la préparation documentaire aux opérations réelles."
                : 'Whether you support multiple clients or directly manage your organization’s resilience, CORO connects document preparation with real-world operations.'}
            </p>
          </div>

          <div className="coro-audiences-grid">
            {/* PROFESSIONALS */}
            <div className="coro-audience-card">
              <div className="coro-audience-top">
                <div className="coro-audience-icon">
                  <Briefcase size={25} />
                </div>

                <span className="coro-audience-number">
                  01
                </span>
              </div>

              <span className="coro-audience-eyebrow">
                {lang === 'fr'
                  ? 'POUR LES PROFESSIONNELS'
                  : 'FOR PROFESSIONALS'}
              </span>

              <h3>
                {lang === 'fr'
                  ? 'Gérez vos mandats sans multiplier les outils.'
                  : 'Manage your engagements without multiplying tools.'}
              </h3>

              <p className="coro-audience-intro">
                {lang === 'fr'
                  ? "Pour les consultants, conseillers et firmes spécialisées qui accompagnent plusieurs organisations."
                  : 'For consultants, advisors and specialized firms supporting multiple organizations.'}
              </p>

              <div className="coro-audience-points">
                {[
                  lang === 'fr'
                    ? 'Centralisez vos clients, bâtiments et mandats'
                    : 'Centralize clients, buildings and engagements',
                  lang === 'fr'
                    ? 'Produisez et révisez vos plans dans un même environnement'
                    : 'Produce and review plans in one environment',
                  lang === 'fr'
                    ? "Suivez l'avancement, les validations et les échéances"
                    : 'Track progress, approvals and deadlines',
                  lang === 'fr'
                    ? 'Donnez à chaque client son propre portail'
                    : 'Give each client their own portal',
                  lang === 'fr'
                    ? 'Conservez une vision multisite et multi-client'
                    : 'Maintain a multi-site, multi-client view',
                ].map(item => (
                  <div
                    key={item}
                    className="coro-audience-point"
                  >
                    <CheckCircle size={16} />
                    <span>{item}</span>
                  </div>
                ))}
              </div>

              <div className="coro-audience-bottom">
                <div className="coro-audience-flow">
                  <span>
                    {lang === 'fr' ? 'CLIENT' : 'CLIENT'}
                  </span>
                  <ArrowRight size={13} />
                  <span>
                    {lang === 'fr' ? 'MANDAT' : 'ENGAGEMENT'}
                  </span>
                  <ArrowRight size={13} />
                  <span>
                    {lang === 'fr' ? 'LIVRABLE' : 'DELIVERABLE'}
                  </span>
                  <ArrowRight size={13} />
                  <span>
                    {lang === 'fr' ? 'SUIVI' : 'FOLLOW-UP'}
                  </span>
                </div>
              </div>
            </div>

            {/* ORGANIZATIONS */}
            <div className="coro-audience-card coro-audience-card-dark">
              <div className="coro-audience-top">
                <div className="coro-audience-icon">
                  <Building2 size={25} />
                </div>

                <span className="coro-audience-number">
                  02
                </span>
              </div>

              <span className="coro-audience-eyebrow">
                {lang === 'fr'
                  ? 'POUR LES ORGANISATIONS'
                  : 'FOR ORGANIZATIONS'}
              </span>

              <h3>
                {lang === 'fr'
                  ? 'Transformez vos plans en capacité opérationnelle.'
                  : 'Turn your plans into operational capability.'}
              </h3>

              <p className="coro-audience-intro">
                {lang === 'fr'
                  ? "Pour les propriétaires, gestionnaires et organisations qui veulent savoir non seulement ce qui est prévu, mais ce qui est réellement prêt."
                  : 'For owners, managers and organizations that need to know not only what is planned, but what is actually ready.'}
              </p>

              <div className="coro-audience-points">
                {[
                  lang === 'fr'
                    ? 'Centralisez vos bâtiments et vos plans'
                    : 'Centralize buildings and plans',
                  lang === 'fr'
                    ? "Suivez votre niveau réel de préparation"
                    : 'Track your actual level of readiness',
                  lang === 'fr'
                    ? 'Sachez qui est présent et mobilisable'
                    : 'Know who is on site and mobilizable',
                  lang === 'fr'
                    ? 'Structurez la réponse lorsqu’un incident survient'
                    : 'Structure the response when an incident occurs',
                  lang === 'fr'
                    ? 'Transformez exercices et incidents en amélioration continue'
                    : 'Turn exercises and incidents into continuous improvement',
                ].map(item => (
                  <div
                    key={item}
                    className="coro-audience-point"
                  >
                    <CheckCircle size={16} />
                    <span>{item}</span>
                  </div>
                ))}
              </div>

              <div className="coro-audience-bottom">
                <div className="coro-audience-flow">
                  <span>
                    {lang === 'fr' ? 'PLAN' : 'PLAN'}
                  </span>
                  <ArrowRight size={13} />
                  <span>
                    {lang === 'fr' ? 'PRÉPARATION' : 'READINESS'}
                  </span>
                  <ArrowRight size={13} />
                  <span>
                    {lang === 'fr' ? 'ACTION' : 'ACTION'}
                  </span>
                  <ArrowRight size={13} />
                  <span>
                    {lang === 'fr' ? 'AMÉLIORATION' : 'IMPROVEMENT'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="coro-audiences-shared">
            <span>
              {lang === 'fr'
                ? 'MÊME PLATEFORME'
                : 'SAME PLATFORM'}
            </span>

            <div />

            <strong>
              {lang === 'fr'
                ? 'Une information structurée qui accompagne tout le cycle.'
                : 'Structured information that follows the entire cycle.'}
            </strong>
          </div>
        </div>
      </section>

            {/* ENVIRONMENTS */}
      <section
        id="environments"
        style={{
          backgroundColor: '#FFFFFF',
          padding: '72px 24px',
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: '0 auto',
          }}
        >
          <div className="coro-environments-header">
            <div>
              <span className="section-tag">
                {lang === 'fr'
                  ? 'ENVIRONNEMENTS'
                  : 'ENVIRONMENTS'}
              </span>

              <h2>
                {lang === 'fr'
                  ? 'Conçu pour les environnements où la préparation doit fonctionner dans la réalité.'
                  : 'Built for environments where preparedness has to work in the real world.'}
              </h2>
            </div>

            <p>
              {lang === 'fr'
                ? "CORO relie les exigences propres au bâtiment, les personnes qui l'occupent et les capacités disponibles afin que l'information reste exploitable lorsque la situation change."
                : 'CORO connects building-specific requirements, the people occupying it and available capabilities so information remains actionable as conditions change.'}
            </p>
          </div>

          <div className="coro-environments-grid">
            {/* COMMERCIAL */}
            <div className="coro-environment-card">
              <div className="coro-environment-image">
                <img
                  src="/images/homepage/sector-commercial.webp"
                  alt={
                    lang === 'fr'
                      ? 'Bâtiment commercial'
                      : 'Commercial building'
                  }
                  loading="lazy"
                />

                <div className="coro-environment-image-overlay" />

                <div className="coro-environment-image-label">
                  <Building2 size={18} />

                  <span>
                    {lang === 'fr'
                      ? 'BÂTIMENTS COMMERCIAUX'
                      : 'COMMERCIAL BUILDINGS'}
                  </span>
                </div>
              </div>

              <div className="coro-environment-content">
                <h3>
                  {lang === 'fr'
                    ? 'Une réalité qui change tout au long de la journée.'
                    : 'A reality that changes throughout the day.'}
                </h3>

                <p>
                  {lang === 'fr'
                    ? "Locataires, employés, visiteurs, fournisseurs et équipes d'urgence créent un environnement dynamique que les plans statiques ne peuvent pas représenter seuls."
                    : 'Tenants, employees, visitors, contractors and emergency teams create a dynamic environment that static plans cannot represent on their own.'}
                </p>

                <div className="coro-environment-signals">
                  <span>
                    {lang === 'fr'
                      ? 'Occupation'
                      : 'Occupancy'}
                  </span>
                  <span>
                    {lang === 'fr'
                      ? 'Évacuation'
                      : 'Evacuation'}
                  </span>
                  <span>
                    {lang === 'fr'
                      ? "Organisation d'urgence"
                      : 'Emergency organization'}
                  </span>
                  <span>
                    {lang === 'fr'
                      ? 'Multisite'
                      : 'Multi-site'}
                  </span>
                </div>
              </div>
            </div>

            {/* INDUSTRIAL */}
            <div className="coro-environment-card">
              <div className="coro-environment-image">
                <img
                  src="/images/homepage/sector-industrial.webp"
                  alt={
                    lang === 'fr'
                      ? 'Site industriel'
                      : 'Industrial site'
                  }
                  loading="lazy"
                />

                <div className="coro-environment-image-overlay" />

                <div className="coro-environment-image-label">
                  <Factory size={18} />

                  <span>
                    {lang === 'fr'
                      ? 'SITES INDUSTRIELS'
                      : 'INDUSTRIAL SITES'}
                  </span>
                </div>
              </div>

              <div className="coro-environment-content">
                <h3>
                  {lang === 'fr'
                    ? 'Plus de risques. Plus de dépendances. Même besoin de clarté.'
                    : 'More hazards. More dependencies. The same need for clarity.'}
                </h3>

                <p>
                  {lang === 'fr'
                    ? "CORO structure les informations critiques liées aux risques, aux matières dangereuses, aux ressources et aux procédures afin de soutenir la préparation et l'intervention."
                    : 'CORO structures critical information related to hazards, dangerous goods, resources and procedures to support preparedness and response.'}
                </p>

                <div className="coro-environment-signals">
                  <span>
                    {lang === 'fr'
                      ? 'Risques'
                      : 'Hazards'}
                  </span>
                  <span>REPTOX</span>
                  <span>TMD</span>
                  <span>
                    {lang === 'fr'
                      ? 'Intervention'
                      : 'Response'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="coro-environments-foundation">
            <div className="coro-environments-foundation-icon">
              <Shield size={19} />
            </div>

            <div>
              <span>
                {lang === 'fr'
                  ? 'UN PRINCIPE COMMUN'
                  : 'ONE COMMON PRINCIPLE'}
              </span>

              <strong>
                {lang === 'fr'
                  ? "La conformité décrit ce qui doit être prévu. CORO aide à relier cette préparation à ce qui est réellement disponible sur le terrain."
                  : 'Compliance defines what must be planned. CORO helps connect that preparedness to what is actually available in the field.'}
              </strong>
            </div>
          </div>
        </div>
      </section>

            {/* COMMERCIAL BRIDGE */}
      <section
        id="pricing"
        style={{
          backgroundColor: '#F8F9FA',
          padding: '80px 24px',
          borderTop: '1px solid #E9ECEF',
          borderBottom: '1px solid #E9ECEF',
        }}
      >
        <div
          className="coro-commercial-bridge"
          style={{
            maxWidth: 1200,
            margin: '0 auto',
          }}
        >
          <div className="coro-commercial-copy">
            <span className="section-tag">
              {lang === 'fr'
                ? 'UNE APPROCHE ADAPTÉE'
                : 'A TAILORED APPROACH'}
            </span>

            <h2>
              {lang === 'fr'
                ? 'Une plateforme adaptée à votre réalité.'
                : 'A platform adapted to your reality.'}
            </h2>

            <p>
              {lang === 'fr'
                ? "La configuration de CORO dépend de votre environnement, du nombre de sites, des utilisateurs, des modules requis et du niveau d’accompagnement souhaité."
                : 'Your CORO configuration depends on your environment, number of sites, users, required modules and desired level of support.'}
            </p>
          </div>

          <div className="coro-commercial-side">
            <div className="coro-commercial-factors">
              {[
                {
                  icon: <Building2 size={17} />,
                  label:
                    lang === 'fr'
                      ? 'Sites'
                      : 'Sites',
                },
                {
                  icon: <Users size={17} />,
                  label:
                    lang === 'fr'
                      ? 'Utilisateurs'
                      : 'Users',
                },
                {
                  icon: <Zap size={17} />,
                  label:
                    lang === 'fr'
                      ? 'Modules'
                      : 'Modules',
                },
                {
                  icon: <Briefcase size={17} />,
                  label:
                    lang === 'fr'
                      ? 'Accompagnement'
                      : 'Support',
                },
              ].map(item => (
                <div
                  key={item.label}
                  className="coro-commercial-factor"
                >
                  {item.icon}
                  <span>{item.label}</span>
                </div>
              ))}
            </div>

            <a
              href="#demo"
              className="coro-commercial-cta"
            >
              <span>
                {lang === 'fr'
                  ? 'Discuter de votre environnement'
                  : 'Discuss your environment'}
              </span>

              <ArrowRight size={17} />
            </a>
          </div>
        </div>

        <a
          href={lang === 'fr' ? '/pricing#fondateur' : '/pricing?lang=en#fondateur'}
          className="coro-founder-teaser"
        >
          <span className="coro-founder-teaser-badge">
            <Award size={16} />
            {lang === 'fr' ? 'PROGRAMME FONDATEUR' : 'FOUNDING PARTNER PROGRAM'}
          </span>

          <span className="coro-founder-teaser-text">
            {lang === 'fr'
              ? 'Les premières organisations à rejoindre CORO façonnent la plateforme avec nous — et en gardent les avantages.'
              : 'The first organizations to join CORO help shape the platform with us — and keep the benefits.'}
          </span>

          <span className="coro-founder-teaser-link">
            {lang === 'fr' ? 'En savoir plus' : 'Learn more'}
            <ArrowRight size={15} />
          </span>
        </a>
      </section>

      {/* TRUST & SECURITY */}
      <section
        id="security"
        style={{
          backgroundColor: '#FFFFFF',
          padding: '72px 24px',
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: '0 auto',
          }}
        >
          <div className="coro-trust-header">
            <div>
              <span className="section-tag">
                {lang === 'fr'
                  ? 'CONFIANCE & SÉCURITÉ'
                  : 'TRUST & SECURITY'}
              </span>

              <h2>
                {lang === 'fr'
                  ? 'Vos opérations critiques méritent un environnement conçu avec rigueur.'
                  : 'Your critical operations deserve an environment designed with care.'}
              </h2>
            </div>

            <p>
              {lang === 'fr'
                ? "CORO intègre des mesures de protection, de contrôle et de traçabilité adaptées à une plateforme qui centralise des informations opérationnelles importantes."
                : 'CORO incorporates protection, access control and traceability measures suited to a platform that centralizes important operational information.'}
            </p>
          </div>

          <div className="coro-trust-main-grid">
            <div className="coro-trust-primary">
              <div className="coro-trust-primary-top">
                <div className="coro-trust-shield">
                  <ShieldCheck size={28} />
                </div>

                <span>
                  {lang === 'fr'
                    ? 'INFRASTRUCTURE CANADIENNE'
                    : 'CANADIAN INFRASTRUCTURE'}
                </span>
              </div>

              <h3>
                {lang === 'fr'
                  ? 'Données principales hébergées au Canada.'
                  : 'Primary data hosted in Canada.'}
              </h3>

              <p>
                {lang === 'fr'
                  ? "L’infrastructure principale de CORO est hébergée au Canada. Cette architecture soutient notre approche en matière de protection des renseignements et de gouvernance des données."
                  : 'CORO’s primary infrastructure is hosted in Canada. This architecture supports our approach to information protection and data governance.'}
              </p>

              <div className="coro-trust-location">
                <span className="coro-trust-status-dot" />

                <div>
                  <strong>
                    {lang === 'fr'
                      ? 'Infrastructure principale'
                      : 'Primary infrastructure'}
                  </strong>

                  <span>
                    Toronto · Ontario · Canada
                  </span>
                </div>
              </div>
            </div>

            <div className="coro-trust-controls">
              {[
                {
                  icon: <Lock size={20} />,
                  title:
                    lang === 'fr'
                      ? 'Communications protégées'
                      : 'Protected communications',
                  desc:
                    lang === 'fr'
                      ? 'Les communications avec la plateforme utilisent des connexions HTTPS/TLS.'
                      : 'Communications with the platform use HTTPS/TLS connections.',
                },
                {
                  icon: <Users size={20} />,
                  title:
                    lang === 'fr'
                      ? 'Contrôle des accès'
                      : 'Access control',
                  desc:
                    lang === 'fr'
                      ? "Les droits d’accès sont structurés selon les rôles et l’environnement de l’organisation."
                      : 'Access rights are structured according to roles and the organization environment.',
                },
                {
                  icon: <BarChart3 size={20} />,
                  title:
                    lang === 'fr'
                      ? 'Traçabilité'
                      : 'Traceability',
                  desc:
                    lang === 'fr'
                      ? "Les activités importantes peuvent être journalisées afin de soutenir le suivi et la gouvernance."
                      : 'Important activities can be logged to support oversight and governance.',
                },
                {
                  icon: <Shield size={20} />,
                  title:
                    lang === 'fr'
                      ? 'Protection de l’environnement'
                      : 'Environment protection',
                  desc:
                    lang === 'fr'
                      ? "L’architecture applique des mécanismes de protection réseau et applicatifs adaptés à l’environnement CORO."
                      : 'The architecture applies network and application protection mechanisms suited to the CORO environment.',
                },
              ].map(item => (
                <div
                  key={item.title}
                  className="coro-trust-control"
                >
                  <div className="coro-trust-control-icon">
                    {item.icon}
                  </div>

                  <div>
                    <strong>{item.title}</strong>
                    <p>{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="coro-trust-framework">
            <div className="coro-trust-framework-copy">
              <span>
                {lang === 'fr'
                  ? 'PROTECTION DES RENSEIGNEMENTS'
                  : 'INFORMATION PROTECTION'}
              </span>

              <strong>
                {lang === 'fr'
                  ? 'Une architecture pensée pour soutenir vos obligations de gouvernance.'
                  : 'An architecture designed to support your governance obligations.'}
              </strong>

              <p>
                {lang === 'fr'
                  ? "CORO est conçu en tenant compte des exigences applicables en matière de protection des renseignements personnels au Québec et au Canada."
                  : 'CORO is designed with applicable privacy requirements in Quebec and Canada in mind.'}
              </p>
            </div>

            <div className="coro-trust-framework-tags">
              <span>
                {lang === 'fr'
                  ? 'Loi 25'
                  : 'Québec Law 25'}
              </span>

              <span>
                {lang === 'fr'
                  ? 'LPRPDE'
                  : 'PIPEDA'}
              </span>

              <span>
                {lang === 'fr'
                  ? 'Hébergement Canada'
                  : 'Canadian hosting'}
              </span>
            </div>
          </div>

          <div className="coro-trust-provider">
            <div>
              <span className="coro-trust-provider-label">
                {lang === 'fr'
                  ? 'INFRASTRUCTURE'
                  : 'INFRASTRUCTURE'}
              </span>

              <strong>DigitalOcean</strong>
            </div>

            <p>
              {lang === 'fr'
                ? "CORO utilise des services d’infrastructure DigitalOcean. Les certifications et engagements de service applicables à cette infrastructure sont ceux du fournisseur."
                : 'CORO uses DigitalOcean infrastructure services. Certifications and service commitments applicable to that infrastructure are those of the provider.'}
            </p>
          </div>

          <div className="coro-trust-technical">
            <div>
              <FileText size={20} />

              <div>
                <strong>
                  {lang === 'fr'
                    ? 'Votre équipe TI souhaite aller plus loin ?'
                    : 'Does your IT team need more detail?'}
                </strong>

                <span>
                  {lang === 'fr'
                    ? "La documentation technique et les informations de sécurité peuvent être présentées dans le cadre de l’évaluation de CORO."
                    : 'Technical documentation and security information can be presented as part of the CORO evaluation process.'}
                </span>
              </div>
            </div>

            <a href="#demo">
              {lang === 'fr'
                ? 'Nous contacter'
                : 'Contact us'}

              <ArrowRight size={15} />
            </a>
          </div>
        </div>
      </section>

            {/* DEMO — FINAL CONVERSION */}
      <section
        id="demo"
        className="coro-demo-final"
      >
        <div className="coro-demo-glow coro-demo-glow-one" />
        <div className="coro-demo-glow coro-demo-glow-two" />

        <div className="coro-demo-final-inner">
          {/* LEFT — POSITIONING */}
          <div className="coro-demo-final-copy">
            <span className="coro-demo-eyebrow">
              {lang === 'fr'
                ? 'VOIR CORO EN ACTION'
                : 'SEE CORO IN ACTION'}
            </span>

            <h2>
              {lang === 'fr'
                ? 'Voyez comment CORO s’intègre à votre réalité.'
                : 'See how CORO fits your operational reality.'}
            </h2>

            <p className="coro-demo-lead">
              {lang === 'fr'
                ? "Présentez-nous votre environnement, vos responsabilités et vos enjeux. Nous vous montrerons comment CORO peut relier vos plans, vos bâtiments, vos équipes et vos opérations d’urgence."
                : 'Tell us about your environment, responsibilities and challenges. We’ll show you how CORO can connect your plans, buildings, teams and emergency operations.'}
            </p>

            <div className="coro-demo-value">
              {[
                {
                  icon: <FileText size={28} />,
                  title:
                    lang === 'fr'
                      ? 'Vos documents'
                      : 'Your documents',
                  desc:
                    lang === 'fr'
                      ? 'Plans, procédures et données structurées.'
                      : 'Plans, procedures and structured data.',
                },
                {
                  icon: <Building2 size={28} />,
                  title:
                    lang === 'fr'
                      ? 'Votre environnement'
                      : 'Your environment',
                  desc:
                    lang === 'fr'
                      ? 'Bâtiments, sites, risques et ressources.'
                      : 'Buildings, sites, hazards and resources.',
                },
                {
                  icon: <Users size={28} />,
                  title:
                    lang === 'fr'
                      ? 'Vos équipes'
                      : 'Your teams',
                  desc:
                    lang === 'fr'
                      ? 'Responsabilités, présence et mobilisation.'
                      : 'Responsibilities, presence and mobilization.',
                },
                {
                  icon: <Zap size={28} />,
                  title:
                    lang === 'fr'
                      ? 'Vos opérations'
                      : 'Your operations',
                  desc:
                    lang === 'fr'
                      ? 'Préparation, incidents, exercices et amélioration.'
                      : 'Readiness, incidents, exercises and improvement.',
                },
              ].map(item => (
                <div
                  key={item.title}
                  className="coro-demo-value-item"
                >
                  <div className="coro-demo-value-icon">
                    {item.icon}
                  </div>

                  <div>
                    <strong>{item.title}</strong>
                    <span>{item.desc}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="coro-demo-continuum">
              <span>
                {lang === 'fr' ? 'DONNÉES' : 'DATA'}
              </span>

              <ArrowRight size={13} />

              <span>
                {lang === 'fr' ? 'DÉCISIONS' : 'DECISIONS'}
              </span>

              <ArrowRight size={13} />

              <span>
                {lang === 'fr' ? 'ACTIONS' : 'ACTIONS'}
              </span>

              <ArrowRight size={13} />

              <span>
                {lang === 'fr' ? 'AMÉLIORATION' : 'IMPROVEMENT'}
              </span>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                marginTop: 24,
                color: 'rgba(255,255,255,0.5)',
                fontSize: 15,
              }}
            >
              <CheckCircle
                size={20}
                color="#65D69A"
              />

              {lang === 'fr'
                ? 'Nous répondons habituellement dans les 24 heures.'
                : 'We typically respond within 24 hours.'}
            </div>
          </div>

          {/* RIGHT — DEMO FORM */}
          <div className="coro-demo-form-shell">
            <div className="coro-demo-form-top">
              <div>
                <span>
                  {lang === 'fr'
                    ? 'DÉMONSTRATION PERSONNALISÉE'
                    : 'PERSONALIZED DEMO'}
                </span>

                <h3>
                  {lang === 'fr'
                    ? 'Parlons de votre environnement.'
                    : 'Let’s talk about your environment.'}
                </h3>
              </div>

              <div className="coro-demo-form-status">
                <span />
                CORO
              </div>
            </div>

            <p className="coro-demo-form-intro">
              {lang === 'fr'
                ? "Quelques informations suffisent pour préparer une démonstration adaptée à votre réalité."
                : 'A few details are enough to prepare a demonstration tailored to your reality.'}
            </p>

            <DemoForm lang={lang} />
          </div>
        </div>

        <div className="coro-demo-final-statement">
          <span>
            {lang === 'fr'
              ? 'DE LA CONFORMITÉ À L’INTERVENTION'
              : 'FROM COMPLIANCE TO RESPONSE'}
          </span>

          <strong>
            {lang === 'fr'
              ? 'Une seule plateforme.'
              : 'One platform.'}
          </strong>
        </div>
      </section>

      {/* MODAL — DÉMO VIDÉO */}
      {showDemoVideo && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={lang === 'fr' ? 'Vidéo de démonstration CORO' : 'CORO demo video'}
          onClick={() => setShowDemoVideo(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 2000,
            backgroundColor: 'rgba(9,18,27,0.92)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: 1040,
              position: 'relative',
            }}
          >
            <button
              type="button"
              onClick={() => setShowDemoVideo(false)}
              aria-label={lang === 'fr' ? 'Fermer' : 'Close'}
              style={{
                position: 'absolute',
                top: -44,
                right: 0,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                background: 'none',
                border: 'none',
                color: 'rgba(255,255,255,0.75)',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <X size={20} />
              {lang === 'fr' ? 'Fermer' : 'Close'}
            </button>

            <div
              style={{
                borderRadius: 12,
                overflow: 'hidden',
                boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
                lineHeight: 0,
              }}
            >
              <video
                controls
                autoPlay
                playsInline
                poster="/videos/Video_home_page_CORO_poster.jpg"
                style={{ width: '100%', display: 'block', backgroundColor: '#000000' }}
              >
                <source src="/videos/Video_home_page_CORO.mp4" type="video/mp4" />
              </video>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
