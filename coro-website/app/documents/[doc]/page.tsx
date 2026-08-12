import { Metadata } from 'next';

export const dynamic = 'force-dynamic';

const DOCUMENTS: Record<string, {
  code: string;
  color: string;
  fr: {
    title: string;
    seoTitle: string;
    seoDesc: string;
    hero: string;
    intro: string;
    sections: { title: string; content: string }[];
    sources: { label: string; url: string }[];
    faq: { q: string; a: string }[];
    cta: string;
  };
  en: {
    title: string;
    seoTitle: string;
    seoDesc: string;
    hero: string;
    intro: string;
    sections: { title: string; content: string }[];
    sources: { label: string; url: string }[];
    faq: { q: string; a: string }[];
    cta: string;
  };
}> = {
  'plan-mesures-urgence-pmu': {
    code: 'PMU',
    color: '#2980B9',
    fr: {
      title: 'Plan de Mesures d\'Urgence (PMU)',
      seoTitle: 'Plan de Mesures d\'Urgence (PMU) — Guide complet | CORO',
      seoDesc: 'Tout sur le Plan de Mesures d\'Urgence au Québec : cadre légal, contenu requis, fréquence de mise à jour et comment CORO simplifie sa production.',
      hero: 'Plan de Mesures d\'Urgence (PMU)',
      intro: 'Le Plan de Mesures d\'Urgence est le document de référence pour la gestion des situations d\'urgence dans les organisations québécoises et canadiennes. Il définit les rôles, les procédures et les ressources nécessaires pour faire face à toute situation d\'urgence, qu\'elle soit naturelle ou technologique.',
      sections: [
        {
          title: 'Qu\'est-ce qu\'un Plan de Mesures d\'Urgence ?',
          content: 'Le PMU décrit les responsabilités assignées ainsi que les mesures et les procédures à entreprendre en cas d\'urgence. En plus des procédures incendie, il couvre d\'autres types d\'urgence : déversement de matières dangereuses, explosion, alerte à la bombe, situation nécessitant des opérations de sauvetage, et autres risques naturels ou technologiques propres à l\'organisation. Il doit être élaboré en fonction des risques spécifiques de l\'entreprise et de son environnement.',
        },
        {
          title: 'Cadre légal applicable au Québec',
          content: 'Au Québec, les obligations en matière de mesures d\'urgence découlent de plusieurs lois et règlements complémentaires. Le Règlement sur la santé et la sécurité du travail (RSST), Section IV — Mesures de sécurité en cas d\'urgence (art. 34 à 36), prescrit les obligations de l\'employeur : plan d\'évacuation, exercices annuels, extincteurs portatifs. La Loi sur la santé et la sécurité du travail (LSST) impose également des obligations à l\'employeur (art. 51.1, 51.5, 51.6, 51.8). La Loi sur la sécurité civile et la Loi sur la sécurité incendie complètent ce cadre réglementaire. La norme de référence pour la planification d\'urgence est la norme CSA Z731-14.',
        },
        {
          title: 'PMU vs PSI : quelle différence ?',
          content: 'Le PSI (Plan de Sécurité Incendie) est un document spécifique aux situations d\'incendie, encadré par le Code national de prévention des incendies (CNPI). Le PMU est plus large : il agit comme plan maître et peut contenir le PSI. La première étape est toujours une analyse de risque qui détermine quels documents sont requis. Tout type d\'organisation doit avoir un PSI ; si un PMU est requis, il agit comme document maître.',
        },
        {
          title: 'Contenu d\'un PMU complet',
          content: 'Un PMU complet comprend : la description du bâtiment et de ses systèmes de sécurité, l\'organigramme des rôles d\'urgence (personnel de surveillance, équipe de première intervention), les listes téléphoniques d\'urgence, les procédures pour chaque type d\'urgence identifié lors de l\'analyse de risque, les plans d\'évacuation, les ressources disponibles sur le site, les mesures pour les occupants nécessitant une assistance, et le programme d\'exercices annuels.',
        },
        {
          title: 'Fréquence de mise à jour',
          content: 'Le PMU est un outil dynamique qui doit être maintenu à jour en fonction des changements organisationnels et environnementaux. Il doit être révisé dès qu\'un changement significatif survient : modification des opérations, nouveaux risques, changement de personnel clé, travaux majeurs ou modification des systèmes de sécurité. Des exercices sur une base régulière permettent d\'ajuster les ressources et les procédures. Consultez votre autorité compétente pour connaître les exigences spécifiques à votre secteur.',
        },
        {
          title: 'Comment CORO simplifie la production du PMU',
          content: 'CORO génère automatiquement la structure complète de votre PMU à partir des informations du bâtiment. Les procédures d\'urgence standardisées sont présélectionnées selon la configuration du site. L\'éditeur intégré permet de compléter chaque module — listes téléphoniques, organigramme, plans techniques, matières dangereuses — et d\'exporter un document PDF professionnel bilingue FR/EN en quelques clics.',
        },
      ],
      sources: [
        { label: 'Règlement sur la santé et la sécurité du travail (RSST) — Section IV', url: 'https://www.legisquebec.gouv.qc.ca/fr/document/rc/S-2.1,%20r.%2013/' },
        { label: 'Loi sur la santé et la sécurité du travail (LSST)', url: 'https://www.legisquebec.gouv.qc.ca/fr/document/lc/S-2.1' },
        { label: 'Loi sur la sécurité civile — Gouvernement du Québec', url: 'https://www.legisquebec.gouv.qc.ca/fr/document/lc/S-2.3' },
        { label: 'APSAM — Mesures d\'urgence', url: 'https://www.apsam.com/gestion-de-la-prevention/gestion-des-interventions-durgence/mesures-durgence' },
        { label: 'Norme CSA Z731-14 — Planification d\'urgence', url: 'https://www.csagroup.org/fr/store/product/2430252/' },
      ],
      faq: [
        { q: 'Toutes les organisations ont-elles besoin d\'un PMU ?', a: 'Pas nécessairement. La première étape est une analyse de risque qui détermine les documents requis. Toute organisation doit avoir un PSI. Le PMU s\'ajoute lorsque les risques de l\'organisation le justifient.' },
        { q: 'Quelle est la différence entre un PMU et un PSI ?', a: 'Le PSI est spécifique aux situations d\'incendie. Le PMU est plus large et couvre tous les types d\'urgence. Lorsqu\'un PMU est requis, il agit comme plan maître et contient le PSI.' },
        { q: 'Combien de temps faut-il pour produire un PMU ?', a: 'Avec CORO, un PMU complet peut être produit en quelques heures pour un bâtiment standard, contre plusieurs jours avec les méthodes traditionnelles.' },
        { q: 'Peut-on utiliser CORO pour plusieurs bâtiments ?', a: 'Oui. CORO est conçu pour les firmes conseil et les gestionnaires de portefeuilles immobiliers. Gérez tous vos mandats depuis une seule plateforme.' },
      ],
      cta: 'Générer votre PMU avec CORO',
    },
    en: {
      title: 'Emergency Response Plan (ERP)',
      seoTitle: 'Emergency Response Plan (ERP) — Complete Guide | CORO',
      seoDesc: 'Everything about Emergency Response Plans in Quebec and Canada: legal framework, required content, update frequency and how CORO simplifies production.',
      hero: 'Emergency Response Plan (ERP)',
      intro: 'The Emergency Response Plan is the reference document for emergency management in Quebec and Canadian organizations, defining roles, procedures and resources for all types of emergencies.',
      sections: [
        { title: 'What is an Emergency Response Plan?', content: 'An ERP describes assigned responsibilities and measures to be taken in emergency situations. Beyond fire procedures, it covers hazardous materials spills, explosions, bomb threats, rescue situations, and other natural or technological risks specific to the organization.' },
        { title: 'Legal framework in Quebec', content: 'In Quebec, emergency preparedness obligations come from multiple complementary laws: the Regulation respecting Occupational Health and Safety (ROHS), Section IV — Safety Measures in Case of Emergency, the Act respecting Occupational Health and Safety (AOHSS), the Civil Protection Act, and the Fire Safety Act. The reference standard for emergency planning is CSA Z731-14.' },
        { title: 'ERP vs FSP: what\'s the difference?', content: 'The Fire Safety Plan (FSP) is specific to fire situations, governed by the National Fire Code (NFC). The ERP is broader and acts as a master plan. Every organization must have a FSP; when an ERP is required, it acts as the master document.' },
        { title: 'Contents of a complete ERP', content: 'A complete ERP includes: building description and safety systems, emergency role organizational chart, emergency contact lists, procedures for each emergency type identified during risk assessment, evacuation plans, on-site resources, measures for occupants requiring assistance, and annual exercise programs.' },
        { title: 'Update frequency', content: 'An ERP is a dynamic tool that must be kept current. It must be revised whenever a significant change occurs: operational changes, new risks, key personnel changes, major work, or safety system modifications.' },
        { title: 'How CORO simplifies ERP production', content: 'CORO automatically generates the complete ERP structure from building information. Standardized emergency procedures are pre-selected based on site configuration. The integrated editor allows completion of each module with professional bilingual FR/EN PDF export.' },
      ],
      sources: [
        { label: 'Regulation respecting Occupational Health and Safety (ROHS)', url: 'https://www.legisquebec.gouv.qc.ca/en/document/cr/S-2.1,%20r.%2013/' },
        { label: 'Civil Protection Act — Quebec', url: 'https://www.legisquebec.gouv.qc.ca/en/document/cs/S-2.3' },
        { label: 'APSAM — Emergency Measures', url: 'https://www.apsam.com/gestion-de-la-prevention/gestion-des-interventions-durgence/mesures-durgence' },
        { label: 'CSA Z731-14 — Emergency Planning Standard', url: 'https://www.csagroup.org/store/product/2430252/' },
      ],
      faq: [
        { q: 'Do all organizations need an ERP?', a: 'Not necessarily. A risk analysis determines which documents are required. Every organization must have a FSP; an ERP is added when the organization\'s risks justify it.' },
        { q: 'What is the difference between an ERP and a FSP?', a: 'The FSP is specific to fire situations. The ERP is broader and covers all emergency types. When an ERP is required, it acts as the master document containing the FSP.' },
        { q: 'How long does it take to produce an ERP?', a: 'With CORO, a complete ERP can be produced in a few hours for a standard building.' },
        { q: 'Can CORO be used for multiple buildings?', a: 'Yes. CORO is designed for consulting firms and real estate portfolio managers.' },
      ],
      cta: 'Generate your ERP with CORO',
    },
  },
  'plan-securite-incendie-psi': {
    code: 'PSI',
    color: '#C0392B',
    fr: {
      title: 'Plan de Sécurité Incendie (PSI)',
      seoTitle: 'Plan de Sécurité Incendie (PSI) — Guide complet | CORO',
      seoDesc: 'Tout sur le Plan de Sécurité Incendie au Québec : bâtiments visés, contenu requis, obligations légales selon le CNPI 2020 et comment CORO accélère sa production.',
      hero: 'Plan de Sécurité Incendie (PSI)',
      intro: 'Le Plan de Sécurité Incendie est un document réglementaire qui définit les mesures de prévention et d\'intervention en cas d\'incendie. Au Québec, il est encadré par le Code national de prévention des incendies — Canada 2020 (CNPI), entré en vigueur le 17 avril 2025 via le Code de sécurité du Québec, Chapitre VIII — Bâtiment.',
      sections: [
        {
          title: 'Qu\'est-ce qu\'un Plan de Sécurité Incendie ?',
          content: 'Le PSI est un document détaillé traitant de tous les aspects de la sécurité incendie relativement à un bâtiment ou à un établissement donné. Il précise les mesures de prévention, les procédures d\'évacuation, les rôles du personnel désigné, les équipements de protection incendie disponibles et les protocoles d\'intervention. Le PSI est le document de base de tout bâtiment — toute organisation doit en avoir un.',
        },
        {
          title: 'Bâtiments visés par le PSI au Québec',
          content: 'Selon le Code national de prévention des incendies (CNPI) et le Code de sécurité du Québec, le PSI est obligatoire pour : les établissements de réunion, de soins, de traitement ou de détention ; les résidences privées pour aînés (RPA) et les ressources intermédiaires (RI) ; les services de garde (selon les exigences du ministère de la Famille, sous forme de PSI-MU) ; les bâtiments d\'habitation (selon les guides du gouvernement du Québec). Les résidences privées pour aînés et les établissements de soins sont soumis à des exigences plus contraignantes.',
        },
        {
          title: 'Contenu d\'un PSI complet',
          content: 'Un PSI complet comprend les éléments requis par le CNPI : la désignation et la préparation du personnel de surveillance pour les opérations de sécurité, l\'inspection et l\'entretien des installations prévues pour assurer la sécurité des occupants, les procédures d\'évacuation incluant les personnes nécessitant une assistance, l\'avis au service d\'incendie, les instructions aux occupants lors du déclenchement de l\'alarme, et le programme d\'exercices d\'évacuation (obligatoire selon l\'art. 2.8.3 du CNPI). Un plan d\'évacuation affiché par aire de plancher est également obligatoire (art. 2.8.2.7 du CNPI).',
        },
        {
          title: 'Cadre légal — CNPI 2020 au Québec',
          content: 'Le Code de sécurité du Québec, Chapitre VIII — Bâtiment, intègre désormais le Code national de prévention des incendies — Canada 2020 (CNPI 2020), avec les modifications spécifiques au Québec. Ces modifications sont entrées en vigueur le 17 avril 2025. Le CNPI est publié par la Commission canadienne des codes du bâtiment et de prévention des incendies du Conseil national de recherches du Canada (CNRC). Le service de sécurité incendie local peut exiger d\'obtenir un exemplaire du PSI pour vérifier sa conformité.',
        },
        {
          title: 'Fréquence de mise à jour',
          content: 'Le propriétaire ou l\'exploitant d\'un bâtiment doit mettre à jour son PSI annuellement, notamment la liste des membres de l\'équipe d\'urgence. Une mise à jour est également requise dès qu\'un changement affecte le bâtiment : travaux de rénovation, modification des systèmes d\'alarme ou de gicleurs, changement d\'occupation ou de personnel désigné. La formation du personnel de surveillance est obligatoire lors de l\'implantation ou de la mise à jour du PSI selon la norme CNPI (art. 2.8.1.2).',
        },
        {
          title: 'Comment CORO simplifie la production du PSI',
          content: 'CORO intègre toutes les procédures incendie standardisées selon le CNPI et les adapte automatiquement à votre type de bâtiment et d\'occupation. Les listes du personnel désigné, les plans d\'évacuation par aire de plancher et les équipements sont gérés directement dans la plateforme. L\'export PDF professionnel inclut toutes les sections requises par la réglementation, avec mise à jour annuelle simplifiée.',
        },
      ],
      sources: [
        { label: 'Code national de prévention des incendies — Canada 2020 (CNPI) — CNRC', url: 'https://nrc.canada.ca/fr/certifications-evaluations-normes/codes-canada/publications-codes-canada/code-national-prevention-incendies-canada-2020' },
        { label: 'RBQ — Exigences du Code national de prévention des incendies', url: 'https://www.rbq.gouv.qc.ca/domaines-dintervention/batiment/interpretation-directives-techniques-et-administratives/chapitre-batiment-du-code-de-securite/exigences-du-code-national-de-prevention-des-incendies/' },
        { label: 'RBQ — CNPI 2020 modifié Québec : principaux changements (en vigueur 17 avril 2025)', url: 'https://www.rbq.gouv.qc.ca/domaines-dintervention/batiment/la-formation/code-national-de-securite-incendie-2020-modifie-quebec/' },
        { label: 'Guide PSI-MU pour habitations — Gouvernement du Québec', url: 'https://cdn-contenu.quebec.ca/cdn-contenu/adm/min/securite-publique/publications-adm/publications-secteurs/securite-incendie/services-securite-incendie/materiel-prevention/Guide_PSIMU_Habitations_VF.pdf' },
        { label: 'Service de sécurité incendie de Montréal — Règlement sur la prévention des incendies', url: 'https://sim.montreal.ca/reglement-sur-la-prevention-des-incendies' },
      ],
      faq: [
        { q: 'Quelle est la différence entre un PSI et un PMU ?', a: 'Le PSI est spécifique aux situations d\'incendie. Le PMU est plus large et couvre tous les types d\'urgence. Toute organisation doit avoir un PSI ; lorsqu\'un PMU est requis, il agit comme plan maître et contient le PSI.' },
        { q: 'Mon bâtiment a-t-il besoin d\'un PSI ?', a: 'Selon le CNPI, tous les établissements de réunion, de soins, de traitement ou de détention doivent avoir un PSI. Les résidences pour aînés, les services de garde et les bâtiments d\'habitation sont également visés. Consultez votre service de sécurité incendie local pour les exigences spécifiques à votre territoire.' },
        { q: 'À quelle fréquence doit-on mettre à jour le PSI ?', a: 'Le PSI doit être mis à jour annuellement, notamment la liste des membres de l\'équipe d\'urgence. Une mise à jour est également requise lors de tout changement significatif au bâtiment.' },
        { q: 'Le PSI doit-il être soumis aux autorités ?', a: 'Le service de sécurité incendie local peut exiger un exemplaire du PSI pour vérifier sa conformité. Renseignez-vous auprès de votre municipalité pour connaître les exigences spécifiques à votre territoire.' },
      ],
      cta: 'Générer votre PSI avec CORO',
    },
    en: {
      title: 'Fire Safety Plan (FSP)',
      seoTitle: 'Fire Safety Plan (FSP) — Complete Guide | CORO',
      seoDesc: 'Everything about Fire Safety Plans in Quebec: buildings affected, required content, legal obligations under NFC 2020 and how CORO accelerates production.',
      hero: 'Fire Safety Plan (FSP)',
      intro: 'The Fire Safety Plan is a regulatory document defining fire prevention and intervention measures. In Quebec, it is governed by the National Fire Code — Canada 2020 (NFC), in force since April 17, 2025 via the Quebec Safety Code, Chapter VIII — Building.',
      sections: [
        { title: 'What is a Fire Safety Plan?', content: 'An FSP is a detailed document covering all aspects of fire safety for a specific building or establishment. It specifies prevention measures, evacuation procedures, designated personnel roles, available fire protection equipment, and intervention protocols. The FSP is the base document every organization must have.' },
        { title: 'Buildings requiring an FSP in Quebec', content: 'Under the NFC and Quebec Safety Code, an FSP is mandatory for: assembly, care, treatment or detention occupancies; private seniors\' residences and intermediate resources; childcare services; and residential buildings. Seniors\' residences and care establishments are subject to more stringent requirements.' },
        { title: 'Contents of a complete FSP', content: 'A complete FSP includes: designation and training of fire safety supervisory staff, inspection and maintenance of safety equipment, evacuation procedures including persons needing assistance, notification to fire department, occupant instructions upon alarm activation, and evacuation drill programs (mandatory under NFC art. 2.8.3).' },
        { title: 'Legal framework — NFC 2020 in Quebec', content: 'Quebec\'s Safety Code, Chapter VIII — Building, now incorporates the National Fire Code — Canada 2020, with Quebec-specific modifications in force since April 17, 2025, published by the National Research Council of Canada (NRC).' },
        { title: 'Update frequency', content: 'The FSP must be updated annually, particularly the emergency team member list. Updates are also required whenever building changes occur.' },
        { title: 'How CORO simplifies FSP production', content: 'CORO integrates all NFC-standardized fire procedures, automatically adapted to your building type and occupancy. Designated personnel lists, floor-by-floor evacuation plans and equipment are managed directly in the platform.' },
      ],
      sources: [
        { label: 'National Fire Code — Canada 2020 (NFC) — NRC', url: 'https://nrc.canada.ca/en/certifications-evaluations-standards/codes-canada/codes-canada-publications/national-fire-code-canada-2020' },
        { label: 'RBQ — National Fire Code requirements', url: 'https://www.rbq.gouv.qc.ca/domaines-dintervention/batiment/interpretation-directives-techniques-et-administratives/chapitre-batiment-du-code-de-securite/exigences-du-code-national-de-prevention-des-incendies/' },
        { label: 'RBQ — NFC 2020 Quebec modifications (in force April 17, 2025)', url: 'https://www.rbq.gouv.qc.ca/domaines-dintervention/batiment/la-formation/code-national-de-securite-incendie-2020-modifie-quebec/' },
      ],
      faq: [
        { q: 'What is the difference between an FSP and an ERP?', a: 'The FSP is specific to fire situations. The ERP is broader. Every organization must have an FSP; when an ERP is required, it acts as the master document.' },
        { q: 'Does my building need an FSP?', a: 'Under the NFC, all assembly, care, treatment or detention occupancies must have an FSP. Contact your local fire department for territory-specific requirements.' },
        { q: 'How often must the FSP be updated?', a: 'The FSP must be updated annually, particularly the emergency team list, and whenever significant building changes occur.' },
        { q: 'Does the FSP need to be submitted to authorities?', a: 'The local fire department may require a copy of the FSP to verify compliance. Check with your municipality for specific requirements.' },
      ],
      cta: 'Generate your FSP with CORO',
    },
  },
  'plan-continuite-activites-pca': {
    code: 'PCA',
    color: '#27AE60',
    fr: {
      title: 'Plan de Continuité des Activités (PCA)',
      seoTitle: 'Plan de Continuité des Activités (PCA) — Guide complet | CORO',
      seoDesc: 'Tout sur le Plan de Continuité des Activités : définition, contenu, secteurs concernés et comment CORO simplifie sa production pour les organisations canadiennes.',
      hero: 'Plan de Continuité des Activités (PCA)',
      intro: 'Le Plan de Continuité des Activités garantit qu\'une organisation peut maintenir ses opérations critiques lors d\'une interruption majeure : sinistre, panne informatique, pandémie, perte d\'accès aux locaux ou défaillance d\'un fournisseur clé.',
      sections: [
        { title: 'Qu\'est-ce qu\'un Plan de Continuité des Activités ?', content: 'Le PCA est un document stratégique qui identifie les activités critiques d\'une organisation, évalue les risques d\'interruption et définit les mesures pour maintenir ou reprendre rapidement ces activités en cas de sinistre. Il va au-delà de la simple réponse aux urgences pour garantir la survie opérationnelle de l\'organisation. La norme internationale de référence est l\'ISO 22301 — Sécurité et résilience — Systèmes de management de la continuité des activités.' },
        { title: 'Secteurs pour lesquels un PCA est fortement recommandé ou exigé', content: 'Bien que le PCA ne soit pas universellement obligatoire par une loi unique au Canada, il est exigé ou fortement recommandé dans plusieurs secteurs : les institutions financières (selon les lignes directrices du Bureau du surintendant des institutions financières — BSIF) ; les organisations de soins de santé ; les services gouvernementaux et fournisseurs de services essentiels ; et les organisations certifiées ISO 22301. Il est également exigé par certains donneurs d\'ordres dans leurs critères de qualification de fournisseurs.' },
        { title: 'Contenu d\'un PCA complet', content: 'Un PCA comprend : l\'analyse d\'impact sur les activités (Business Impact Analysis — BIA), l\'identification des activités critiques et des délais maximaux d\'interruption tolérables (RTO — Recovery Time Objective, et RPO — Recovery Point Objective), les stratégies de continuité, les procédures de mise en œuvre, les plans de communication de crise, et les programmes de tests et exercices.' },
        { title: 'PCA et normes internationales', content: 'La norme ISO 22301:2019 — Sécurité et résilience — Systèmes de management de la continuité des activités est la référence internationale. Elle définit les exigences pour planifier, établir, mettre en œuvre, exploiter, surveiller, réviser, maintenir et améliorer continuellement un système de management de la continuité des activités.' },
        { title: 'Fréquence de test et de révision', content: 'Le PCA doit être testé au moins une fois par année et révisé après chaque test, après tout changement organisationnel significatif ou après l\'activation réelle du plan. La norme ISO 22301 exige que les exercices soient documentés et que leurs résultats soient intégrés aux améliorations continues du plan.' },
        { title: 'Comment CORO supporte la production du PCA', content: 'CORO structure la rédaction de votre PCA avec des modèles adaptés à votre secteur d\'activité. La plateforme intègre les modules de gestion des ressources critiques, les listes de contacts et les procédures d\'activation, le tout exportable en PDF professionnel.' },
      ],
      sources: [
        { label: 'ISO 22301:2019 — Sécurité et résilience — Management de la continuité des activités', url: 'https://www.iso.org/fr/standard/75106.html' },
        { label: 'BSIF — Lignes directrices sur la continuité des activités', url: 'https://www.osfi-bsif.gc.ca/fr/directives-lignes-directrices/lignes-directrices/continuité-activités' },
        { label: 'Gouvernement du Canada — Plan de continuité des opérations', url: 'https://www.canada.ca/fr/gouvernement/systeme/gouvernement-numerique/politiques-normes-lignes-directrices-orientation-gouvernement-numerique/orientation-gouvernement-canada-gestion-continuite-operationnelle.html' },
      ],
      faq: [
        { q: 'Le PCA est-il obligatoire ?', a: 'Il n\'existe pas de loi unique rendant le PCA obligatoire pour toutes les organisations canadiennes. Cependant, certains secteurs l\'exigent explicitement (BSIF pour les institutions financières, soins de santé, services essentiels) et il est exigé par la norme ISO 22301 pour les organisations certifiées.' },
        { q: 'Quelle est la différence entre un PCA et un PRA ?', a: 'Le PCA vise à maintenir les activités pendant une interruption. Le PRA (Plan de Reprise des Activités) se concentre sur le retour à la normale après l\'interruption. Les deux sont complémentaires et fonctionnent en séquence.' },
        { q: 'Qu\'est-ce que le RTO et le RPO ?', a: 'Le RTO (Recovery Time Objective) est le délai maximal acceptable pour reprendre une activité. Le RPO (Recovery Point Objective) est la quantité maximale de données qu\'on peut se permettre de perdre, exprimée en temps.' },
        { q: 'Combien de temps faut-il pour développer un PCA ?', a: 'Avec CORO, un premier PCA opérationnel peut être produit rapidement. La complexité dépend de la taille de l\'organisation et du nombre d\'activités critiques à couvrir.' },
      ],
      cta: 'Structurer votre PCA avec CORO',
    },
    en: {
      title: 'Business Continuity Plan (BCP)',
      seoTitle: 'Business Continuity Plan (BCP) — Complete Guide | CORO',
      seoDesc: 'Everything about Business Continuity Plans: definition, content, applicable sectors and how CORO simplifies production for Canadian organizations.',
      hero: 'Business Continuity Plan (BCP)',
      intro: 'The Business Continuity Plan ensures an organization can maintain critical operations during a major disruption: disaster, IT outage, pandemic, loss of premises or key supplier failure.',
      sections: [
        { title: 'What is a Business Continuity Plan?', content: 'A BCP is a strategic document identifying critical activities, assessing disruption risks and defining measures to maintain or quickly resume operations. The international reference standard is ISO 22301 — Security and resilience — Business continuity management systems.' },
        { title: 'Sectors requiring a BCP', content: 'While no single law universally mandates BCPs in Canada, they are required or strongly recommended in: financial institutions (per OSFI guidelines); healthcare organizations; government services and essential service providers; and ISO 22301-certified organizations.' },
        { title: 'Contents of a complete BCP', content: 'A BCP includes: Business Impact Analysis (BIA), critical activities identification with RTO and RPO targets, continuity strategies, implementation procedures, crisis communication plans, and testing programs.' },
        { title: 'BCP and international standards', content: 'ISO 22301:2019 — Security and resilience — Business continuity management systems is the international reference, defining requirements to plan, establish, implement, operate, monitor, review, maintain and continually improve a BCMS.' },
        { title: 'Testing and revision frequency', content: 'The BCP must be tested at least annually and revised after each test, significant organizational change or real activation.' },
        { title: 'How CORO supports BCP production', content: 'CORO structures your BCP with sector-adapted templates, integrating critical resource management modules and activation procedures, all exportable as professional PDF.' },
      ],
      sources: [
        { label: 'ISO 22301:2019 — Business continuity management systems', url: 'https://www.iso.org/standard/75106.html' },
        { label: 'OSFI — Business Continuity Management Guideline', url: 'https://www.osfi-bsif.gc.ca/en/guidance/guidance-library/business-continuity-management-guideline' },
        { label: 'Government of Canada — Business Continuity Planning', url: 'https://www.canada.ca/en/government/system/digital-government/policies-standards/government-canada-guidance-business-continuity-management.html' },
      ],
      faq: [
        { q: 'Is a BCP mandatory?', a: 'No single law universally mandates BCPs for all Canadian organizations. However, certain sectors explicitly require it (OSFI for financial institutions, healthcare, essential services) and ISO 22301 requires it for certified organizations.' },
        { q: 'What is the difference between a BCP and a DRP?', a: 'The BCP aims to maintain activities during disruption. The DRP focuses on returning to normal after disruption. Both are complementary and operate in sequence.' },
        { q: 'What are RTO and RPO?', a: 'RTO (Recovery Time Objective) is the maximum acceptable time to resume an activity. RPO (Recovery Point Objective) is the maximum data loss acceptable, expressed in time.' },
        { q: 'How long does it take to develop a BCP?', a: 'With CORO, an initial operational BCP can be produced quickly, depending on organizational size and number of critical activities.' },
      ],
      cta: 'Structure your BCP with CORO',
    },
  },
  'plan-gestion-crise-pgc': {
    code: 'PGC',
    color: '#8E44AD',
    fr: {
      title: 'Plan de Gestion de Crise (PGC)',
      seoTitle: 'Plan de Gestion de Crise (PGC) — Guide complet | CORO',
      seoDesc: 'Tout sur le Plan de Gestion de Crise : définition, structure, rôles de la cellule de crise et comment CORO aide les organisations à se préparer.',
      hero: 'Plan de Gestion de Crise (PGC)',
      intro: 'Le Plan de Gestion de Crise définit les protocoles de décision, de communication et d\'intervention lors de situations affectant gravement l\'organisation : crise médiatique, cyberattaque, incident majeur sur les lieux de travail, ou toute situation à fort impact réputationnel ou opérationnel.',
      sections: [
        { title: 'Qu\'est-ce qu\'un Plan de Gestion de Crise ?', content: 'Le PGC est un cadre décisionnel qui permet à une organisation de réagir rapidement et de façon coordonnée lors d\'une crise. Il définit qui décide quoi, comment communiquer en interne et en externe, et comment minimiser l\'impact sur les opérations et la réputation. La norme ISO 22361:2022 — Gestion de crise fournit des lignes directrices sur les principes et le cadre de la gestion de crise.' },
        { title: 'Différence entre urgence et crise', content: 'Une urgence affecte principalement la sécurité physique des personnes (incendie, accident) et nécessite un PMU ou un PSI. Une crise affecte la réputation, la viabilité ou la confiance envers l\'organisation. Les deux peuvent survenir simultanément et nécessitent des plans distincts mais complémentaires.' },
        { title: 'Contenu d\'un PGC complet', content: 'Un PGC comprend : la cellule de crise et ses membres, les déclencheurs d\'activation du plan, les protocoles de communication interne et externe, la gestion des médias et des réseaux sociaux, les procédures d\'escalade décisionnelle, et les scénarios préétablis pour les types de crises les plus probables selon l\'analyse de risque de l\'organisation.' },
        { title: 'La communication de crise', content: 'La communication est au cœur de la gestion de crise. Le PGC définit les porte-paroles autorisés, les messages clés pour chaque scénario, les canaux de communication prioritaires et les protocoles de validation des communications avant diffusion. Une mauvaise communication de crise peut aggraver significativement l\'impact d\'un incident.' },
        { title: 'Fréquence de révision et d\'exercices', content: 'Le PGC doit être révisé annuellement et après chaque activation réelle. Des exercices de simulation (tabletop exercises) sont recommandés tous les 12 à 18 mois pour tester la réactivité de la cellule de crise et identifier les lacunes du plan. Ces exercices doivent être documentés.' },
        { title: 'Comment CORO supporte la production du PGC', content: 'CORO structure votre PGC avec des modèles de scénarios, des fiches rôles pour la cellule de crise et des procédures de communication. La plateforme centralise tous vos documents de conformité et de gestion des risques.' },
      ],
      sources: [
        { label: 'ISO 22361:2022 — Sécurité et résilience — Gestion de crise — Lignes directrices', url: 'https://www.iso.org/fr/standard/77720.html' },
        { label: 'ISO 22301:2019 — Systèmes de management de la continuité des activités', url: 'https://www.iso.org/fr/standard/75106.html' },
        { label: 'Gouvernement du Canada — Guide de gestion des urgences', url: 'https://www.securitepublique.gc.ca/cnt/rsrcs/pblctns/mrgnc-mngmnt-frmwrk/index-fr.aspx' },
      ],
      faq: [
        { q: 'Toutes les organisations ont-elles besoin d\'un PGC ?', a: 'Toute organisation exposée à des risques réputationnels, médiatiques, cybernétiques ou opérationnels majeurs devrait avoir un PGC. La taille n\'est pas le critère principal — c\'est l\'exposition au risque.' },
        { q: 'Qui fait partie de la cellule de crise ?', a: 'Typiquement : le PDG ou directeur général, le responsable des communications, le conseiller juridique, le directeur des ressources humaines et les responsables opérationnels concernés selon le type de crise. CORO vous aide à définir et documenter ces rôles.' },
        { q: 'Le PGC est-il relié au PCA ?', a: 'Oui. Le PGC gère la dimension décisionnelle et communicationnelle, tandis que le PCA assure la continuité opérationnelle. Les deux fonctionnent en parallèle lors d\'une crise majeure.' },
        { q: 'Comment tester un PGC ?', a: 'Par des exercices tabletop : simulation d\'un scénario de crise avec la cellule de crise pour tester les réflexes, les outils et les communications. Ces exercices doivent être documentés et leurs enseignements intégrés au plan.' },
      ],
      cta: 'Structurer votre PGC avec CORO',
    },
    en: {
      title: 'Crisis Management Plan (CMP)',
      seoTitle: 'Crisis Management Plan (CMP) — Complete Guide | CORO',
      seoDesc: 'Everything about Crisis Management Plans: definition, structure, crisis team roles and how CORO helps organizations prepare.',
      hero: 'Crisis Management Plan (CMP)',
      intro: 'The Crisis Management Plan defines decision-making, communication and intervention protocols during situations seriously affecting the organization: media crisis, cyberattack, major workplace incident, or any situation with significant reputational or operational impact.',
      sections: [
        { title: 'What is a Crisis Management Plan?', content: 'A CMP is a decision-making framework enabling rapid, coordinated organizational response during a crisis. ISO 22361:2022 — Security and resilience — Crisis management provides guidelines on crisis management principles and framework.' },
        { title: 'Difference between emergency and crisis', content: 'An emergency primarily affects physical safety (fire, accident) requiring an ERP or FSP. A crisis affects reputation, viability or organizational trust. Both can occur simultaneously and require distinct but complementary plans.' },
        { title: 'Contents of a complete CMP', content: 'A CMP includes: crisis team and members, plan activation triggers, internal and external communication protocols, media management procedures, escalation processes, and pre-established scenarios for most likely crisis types.' },
        { title: 'Crisis communication', content: 'Communication is central to crisis management. The CMP defines authorized spokespersons, key messages for each scenario, priority communication channels, and pre-publication validation protocols.' },
        { title: 'Revision and exercise frequency', content: 'The CMP must be revised annually and after each real activation. Tabletop simulation exercises are recommended every 12-18 months.' },
        { title: 'How CORO supports CMP production', content: 'CORO structures your CMP with scenario templates, crisis team role sheets and communication procedures, centralizing all compliance and risk management documents.' },
      ],
      sources: [
        { label: 'ISO 22361:2022 — Security and resilience — Crisis management', url: 'https://www.iso.org/standard/77720.html' },
        { label: 'ISO 22301:2019 — Business continuity management systems', url: 'https://www.iso.org/standard/75106.html' },
        { label: 'Government of Canada — Emergency Management Framework', url: 'https://www.publicsafety.gc.ca/cnt/rsrcs/pblctns/mrgnc-mngmnt-frmwrk/index-en.aspx' },
      ],
      faq: [
        { q: 'Do all organizations need a CMP?', a: 'Any organization exposed to significant reputational, media, cyber or operational risks should have a CMP. Exposure to risk, not size, is the key criterion.' },
        { q: 'Who is part of the crisis team?', a: 'Typically: CEO, communications director, legal counsel, HR director and relevant operational managers depending on crisis type.' },
        { q: 'Is the CMP linked to the BCP?', a: 'Yes. The CMP handles decisional and communication dimensions while the BCP ensures operational continuity. Both operate in parallel during a major crisis.' },
        { q: 'How do you test a CMP?', a: 'Through tabletop exercises: simulating a crisis scenario with the crisis team to test reflexes, tools and communications. Results must be documented and integrated into plan improvements.' },
      ],
      cta: 'Structure your CMP with CORO',
    },
  },
  'plan-reprise-activites-pra': {
    code: 'PRA',
    color: '#E67E22',
    fr: {
      title: 'Plan de Reprise des Activités (PRA)',
      seoTitle: 'Plan de Reprise des Activités (PRA) — Guide complet | CORO',
      seoDesc: 'Tout sur le Plan de Reprise des Activités : définition, différence avec le PCA, RTO, RPO et comment CORO simplifie sa production.',
      hero: 'Plan de Reprise des Activités (PRA)',
      intro: 'Le Plan de Reprise des Activités définit les procédures permettant à une organisation de restaurer ses activités normales après un sinistre ou une interruption majeure. Il complète le PCA en se concentrant sur le retour à la normale.',
      sections: [
        { title: 'Qu\'est-ce qu\'un Plan de Reprise des Activités ?', content: 'Le PRA (aussi appelé DRP — Disaster Recovery Plan en anglais) définit les étapes séquentielles pour restaurer les systèmes, les données, les infrastructures et les opérations après une interruption. Il précise les priorités de reprise, les objectifs de délai de reprise (RTO — Recovery Time Objective) et les objectifs de point de reprise (RPO — Recovery Point Objective). La norme de référence est la série ISO 22301 et pour les aspects informatiques, la norme ISO/IEC 27031.' },
        { title: 'PRA vs PCA : quelle différence ?', content: 'Le PCA se concentre sur le maintien des activités pendant l\'interruption. Le PRA se concentre sur le retour à la normale après l\'interruption. Dans la pratique, les deux plans fonctionnent en séquence : le PCA prend le relais lors de l\'interruption, le PRA guide le retour à la normale. Ils doivent être développés ensemble pour assurer une couverture complète.' },
        { title: 'Contenu d\'un PRA complet', content: 'Un PRA comprend : l\'inventaire des systèmes et ressources critiques, les objectifs de reprise (RTO/RPO) par activité, les procédures de restauration par ordre de priorité, les responsabilités de chaque équipe, les ressources alternatives (sites de secours, équipements de remplacement, services infonuagiques), et les procédures de validation avant reprise normale.' },
        { title: 'PRA informatique et PRA opérationnel', content: 'Le PRA informatique (IT DRP) se concentre sur la restauration des systèmes technologiques. Il est encadré par la norme ISO/IEC 27031 — Technologies de l\'information — Lignes directrices pour la préparation des technologies de l\'information et de la communication à la continuité des activités. Le PRA opérationnel couvre la reprise des processus métiers. Un PRA complet intègre les deux dimensions.' },
        { title: 'Fréquence de test', content: 'Le PRA doit être testé au moins une fois par année. Les tests peuvent être partiels (restauration d\'un système spécifique) ou complets (simulation d\'une reprise totale). Chaque test doit être documenté et ses enseignements intégrés au plan. La norme ISO 22301 exige cette documentation.' },
        { title: 'Comment CORO supporte la production du PRA', content: 'CORO structure la rédaction de votre PRA avec des modèles de procédures de reprise, des matrices de priorités et des fiches de responsabilités. L\'export PDF professionnel facilite la communication du plan à toutes les parties prenantes.' },
      ],
      sources: [
        { label: 'ISO 22301:2019 — Systèmes de management de la continuité des activités', url: 'https://www.iso.org/fr/standard/75106.html' },
        { label: 'ISO/IEC 27031:2011 — Technologies de l\'information — Continuité des activités', url: 'https://www.iso.org/fr/standard/44374.html' },
        { label: 'Gouvernement du Canada — Plan de continuité des opérations', url: 'https://www.canada.ca/fr/gouvernement/systeme/gouvernement-numerique/politiques-normes-lignes-directrices-orientation-gouvernement-numerique/orientation-gouvernement-canada-gestion-continuite-operationnelle.html' },
      ],
      faq: [
        { q: 'Quelle est la différence entre RTO et RPO ?', a: 'Le RTO (Recovery Time Objective) est le délai maximal acceptable pour reprendre une activité après une interruption. Le RPO (Recovery Point Objective) est la quantité maximale de données qu\'on peut se permettre de perdre, exprimée en durée (ex : 4 heures = on accepte de perdre au maximum 4 heures de données).' },
        { q: 'Le PRA s\'applique-t-il uniquement à l\'informatique ?', a: 'Non. Le PRA couvre toutes les ressources critiques : systèmes informatiques, équipements, fournisseurs, locaux et personnel. CORO vous aide à couvrir toutes ces dimensions.' },
        { q: 'Doit-on avoir un site de secours ?', a: 'Pas nécessairement. Les stratégies de reprise peuvent inclure le télétravail, des ententes avec des fournisseurs alternatifs ou l\'utilisation de services infonuagiques. Le PRA définit la stratégie adaptée à votre organisation.' },
        { q: 'Le PRA doit-il être testé ?', a: 'Absolument. Un plan non testé est un plan non fiable. CORO intègre un module de suivi des exercices pour documenter et archiver chaque test.' },
      ],
      cta: 'Structurer votre PRA avec CORO',
    },
    en: {
      title: 'Disaster Recovery Plan (DRP)',
      seoTitle: 'Disaster Recovery Plan (DRP) — Complete Guide | CORO',
      seoDesc: 'Everything about Disaster Recovery Plans: definition, difference with BCP, RTO, RPO and how CORO simplifies production.',
      hero: 'Disaster Recovery Plan (DRP)',
      intro: 'The Disaster Recovery Plan defines procedures for restoring normal operations after a disaster or major disruption, complementing the BCP by focusing on return to normal.',
      sections: [
        { title: 'What is a Disaster Recovery Plan?', content: 'A DRP defines sequential steps to restore systems, data, infrastructure and operations. It specifies recovery priorities, RTO (Recovery Time Objective) and RPO (Recovery Point Objective). Reference standards include ISO 22301 and ISO/IEC 27031 for IT aspects.' },
        { title: 'DRP vs BCP: what\'s the difference?', content: 'The BCP focuses on maintaining activities during disruption. The DRP focuses on returning to normal after disruption. Both operate in sequence and must be developed together.' },
        { title: 'Contents of a complete DRP', content: 'A DRP includes: critical systems and resources inventory, RTO/RPO objectives by activity, prioritized restoration procedures, team responsibilities, alternative resources, and pre-resumption validation procedures.' },
        { title: 'IT DRP and operational DRP', content: 'The IT DRP focuses on technological systems restoration, governed by ISO/IEC 27031. The operational DRP covers business process resumption. A complete DRP integrates both dimensions.' },
        { title: 'Testing frequency', content: 'The DRP must be tested at least annually, with partial or complete tests documented per ISO 22301 requirements.' },
        { title: 'How CORO supports DRP production', content: 'CORO structures your DRP with recovery procedure templates, priority matrices and responsibility sheets.' },
      ],
      sources: [
        { label: 'ISO 22301:2019 — Business continuity management systems', url: 'https://www.iso.org/standard/75106.html' },
        { label: 'ISO/IEC 27031:2011 — ICT readiness for business continuity', url: 'https://www.iso.org/standard/44374.html' },
        { label: 'Government of Canada — Business Continuity Planning', url: 'https://www.canada.ca/en/government/system/digital-government/policies-standards/government-canada-guidance-business-continuity-management.html' },
      ],
      faq: [
        { q: 'What is the difference between RTO and RPO?', a: 'RTO (Recovery Time Objective) is the maximum acceptable time to resume an activity. RPO (Recovery Point Objective) is the maximum data loss acceptable, expressed in time.' },
        { q: 'Does DRP apply only to IT?', a: 'No. DRP covers all critical resources: IT systems, equipment, suppliers, premises and personnel.' },
        { q: 'Do you need a backup site?', a: 'Not necessarily. Recovery strategies can include remote work, alternative supplier agreements or cloud services.' },
        { q: 'Does the DRP need to be tested?', a: 'Absolutely. An untested plan is unreliable. CORO integrates an exercise tracking module for documentation.' },
      ],
      cta: 'Structure your DRP with CORO',
    },
  },
  'plan-urgence-environnementale-pue': {
    code: 'PUE',
    color: '#16A085',
    fr: {
      title: 'Plan d\'Urgence Environnementale (PUE)',
      seoTitle: 'Plan d\'Urgence Environnementale (PUE) — Guide complet | CORO',
      seoDesc: 'Tout sur le Plan d\'Urgence Environnementale au Canada : Règlement sur les urgences environnementales (2019), 249 substances réglementées, obligations et comment CORO simplifie sa production.',
      hero: 'Plan d\'Urgence Environnementale (PUE)',
      intro: 'Le Plan d\'Urgence Environnementale définit les mesures de prévention et d\'intervention en cas d\'incident environnemental impliquant des substances dangereuses. Au Canada, il est encadré par le Règlement sur les urgences environnementales (2019) (DORS/2019-51), pris en vertu de la Loi canadienne sur la protection de l\'environnement (1999) (LCPE), entré en vigueur le 24 août 2019.',
      sections: [
        { title: 'Cadre réglementaire : le Règlement sur les urgences environnementales (2019)', content: 'Le Règlement sur les urgences environnementales (2019) (DORS/2019-51) règlemente 249 substances dangereuses pour lesquelles il y a des exigences en matière de déclaration et de planification d\'urgence environnementale pour les installations à risque élevé. Il s\'applique à toute personne qui est propriétaire d\'une substance figurant à l\'annexe 1 du Règlement ou qui a autorité sur elle, et qui atteint ou dépasse les concentrations et quantités seuils mentionnées. Six catégories de danger sont visées : toxicité en milieu aquatique, combustible, danger d\'explosion, danger de feu en nappe, danger en cas d\'inhalation, et oxydant pouvant exploser.' },
        { title: 'Êtes-vous assujetti au Règlement ?', content: 'Le Règlement s\'applique si votre installation possède ou a autorité sur une substance figurant à l\'annexe 1 du Règlement UE (2019), à des concentrations et quantités égales ou supérieures aux seuils définis. Les obligations varient selon que vous êtes en situation de déclaration uniquement ou en situation de planification complète (plan d\'urgence environnementale requis). Pour vérifier si votre installation est assujettie, consultez la liste des 249 substances réglementées et leurs quantités seuils sur le site d\'Environnement et Changement climatique Canada.' },
        { title: 'Contenu d\'un PUE complet', content: 'Un PUE comprend : l\'inventaire des substances dangereuses présentes sur le site (fiches de données de sécurité — FDS), l\'identification des risques et des scénarios d\'accidents potentiels, les mesures de prévention et de confinement, les procédures de notification aux autorités (avis immédiat à Environnement et Changement climatique Canada en cas de rejet ou de rejet probable), les responsabilités en cas d\'intervention, les équipements de réponse disponibles, et les mesures de décontamination et de remédiation.' },
        { title: 'Obligations de notification', content: 'En vertu de la LCPE (1999), le gouvernement fédéral doit être avisé immédiatement du rejet ou du rejet probable d\'une substance réglementée. Le Règlement sur les avis de rejet ou d\'urgence environnementale encadre les procédures de notification. Les coordonnées pour signaler une urgence environnementale : ec.ue-e2.ec@canada.ca — Division des urgences environnementales, Environnement et Changement climatique Canada.' },
        { title: 'Matières dangereuses et fiches REPTOX', content: 'Au Québec, les informations toxicologiques sur les substances dangereuses sont disponibles via le répertoire REPTOX, géré par l\'Institut de recherche Robert-Sauvé en santé et en sécurité du travail (IRSST). Ces fiches fournissent les informations essentielles pour la gestion sécuritaire des substances. La réglementation sur le Système d\'information sur les matières dangereuses utilisées au travail (SIMDUT) s\'applique également.' },
        { title: 'Comment CORO supporte la production du PUE', content: 'CORO intègre un module de gestion des matières dangereuses qui permet de documenter l\'inventaire des substances, les fiches de données de sécurité et les procédures d\'intervention par scénario. La plateforme génère les sections réglementaires du PUE et permet l\'export d\'un document structuré conforme aux exigences réglementaires.' },
      ],
      sources: [
        { label: 'Règlement sur les urgences environnementales (2019) — DORS/2019-51', url: 'https://pollution-dechets.canada.ca/registre-protection-environnementale/reglements/visualiser?id=139' },
        { label: 'Environnement et Changement climatique Canada — Programme des urgences environnementales', url: 'https://www.canada.ca/fr/environnement-changement-climatique/services/programme-urgences-environnementales/reglementation.html' },
        { label: 'Loi canadienne sur la protection de l\'environnement (1999) (LCPE)', url: 'https://laws-lois.justice.gc.ca/fra/lois/C-15.31/' },
        { label: 'IRSST — Répertoire REPTOX', url: 'https://reptox.cnesst.gouv.qc.ca/' },
        { label: 'Signaler une urgence environnementale — Canada.ca', url: 'https://www.canada.ca/fr/environnement-changement-climatique/services/programme-urgences-environnementales/signaler-urgence.html' },
      ],
      faq: [
        { q: 'Mon installation est-elle assujettie au Règlement ?', a: 'Si votre installation possède ou a autorité sur une substance figurant à l\'annexe 1 du Règlement UE (2019) en quantité égale ou supérieure aux seuils définis, vous êtes assujetti. Consultez la liste des 249 substances sur le site d\'Environnement et Changement climatique Canada pour vérifier votre situation.' },
        { q: 'Que dois-je faire en cas de rejet accidentel ?', a: 'En vertu de la LCPE, vous devez aviser immédiatement le gouvernement fédéral de tout rejet ou rejet probable d\'une substance réglementée. Contactez la Division des urgences environnementales d\'Environnement et Changement climatique Canada : ec.ue-e2.ec@canada.ca.' },
        { q: 'Qu\'est-ce qu\'une fiche de données de sécurité (FDS) ?', a: 'La FDS (anciennement MSDS) est un document standardisé décrivant les propriétés d\'une substance chimique, ses risques et les mesures de sécurité à prendre. Le SIMDUT exige des FDS pour toutes les matières dangereuses utilisées au travail.' },
        { q: 'Le PUE est-il relié au PMU ?', a: 'Oui. Le PUE est souvent intégré au PMU comme procédure spécifique pour les incidents environnementaux. Dans les sites industriels, il peut constituer un document distinct en raison des exigences réglementaires fédérales spécifiques.' },
      ],
      cta: 'Générer votre PUE avec CORO',
    },
    en: {
      title: 'Environmental Emergency Plan (EEP)',
      seoTitle: 'Environmental Emergency Plan (EEP) — Complete Guide | CORO',
      seoDesc: 'Everything about Environmental Emergency Plans in Canada: Environmental Emergency Regulations (2019), 249 regulated substances, obligations and how CORO simplifies production.',
      hero: 'Environmental Emergency Plan (EEP)',
      intro: 'The Environmental Emergency Plan defines prevention and intervention measures for environmental incidents involving hazardous substances. In Canada, it is governed by the Environmental Emergency Regulations (2019) (SOR/2019-51), under the Canadian Environmental Protection Act, 1999 (CEPA), in force since August 24, 2019.',
      sections: [
        { title: 'Regulatory framework: Environmental Emergency Regulations (2019)', content: 'The Environmental Emergency Regulations (2019) (SOR/2019-51) regulate 249 hazardous substances with reporting and environmental emergency planning requirements for high-risk facilities. It applies to persons who own or have charge of substances listed in Schedule 1 meeting or exceeding concentration and quantity thresholds. Six hazard categories are covered: aquatic toxicity, flammable, explosion hazard, pool fire hazard, inhalation hazard, and oxidizer that may explode.' },
        { title: 'Are you subject to the Regulations?', content: 'The Regulations apply if your facility owns or has charge of a substance listed in Schedule 1 of the EE Regulations (2019) at concentrations and quantities at or above defined thresholds. Obligations vary between reporting-only situations and full planning requirements. Verify your status with Environment and Climate Change Canada\'s list of 249 regulated substances.' },
        { title: 'Contents of a complete EEP', content: 'An EEP includes: hazardous substances inventory (Safety Data Sheets — SDS), risk identification and accident scenarios, prevention and containment measures, notification procedures to authorities, intervention responsibilities, response equipment, and decontamination and remediation measures.' },
        { title: 'Notification obligations', content: 'Under CEPA 1999, the federal government must be notified immediately of any release or likely release of a regulated substance. Contact: Environmental Emergencies Division, Environment and Climate Change Canada: ec.ue-e2.ec@canada.ca.' },
        { title: 'Hazardous materials and WHMIS', content: 'The Workplace Hazardous Materials Information System (WHMIS) regulations require Safety Data Sheets for all hazardous materials used at work. In Quebec, REPTOX, managed by IRSST, provides toxicological information on hazardous substances.' },
        { title: 'How CORO supports EEP production', content: 'CORO integrates a hazardous materials management module for documenting substance inventories, Safety Data Sheets and intervention procedures by scenario, generating structured regulatory EEP sections.' },
      ],
      sources: [
        { label: 'Environmental Emergency Regulations (2019) — SOR/2019-51', url: 'https://pollution-waste.canada.ca/environmental-protection-registry/regulations/view?Id=139' },
        { label: 'Environment and Climate Change Canada — Environmental Emergencies Program', url: 'https://www.canada.ca/en/environment-climate-change/services/environmental-emergencies-program/regulations.html' },
        { label: 'Canadian Environmental Protection Act, 1999 (CEPA)', url: 'https://laws-lois.justice.gc.ca/eng/acts/C-15.31/' },
        { label: 'Report an environmental emergency — Canada.ca', url: 'https://www.canada.ca/en/environment-climate-change/services/environmental-emergencies-program/report-emergency.html' },
      ],
      faq: [
        { q: 'Is my facility subject to the Regulations?', a: 'If your facility owns or has charge of a substance in Schedule 1 of the EE Regulations (2019) at or above defined thresholds, you are subject. Check the list of 249 substances on Environment and Climate Change Canada\'s website.' },
        { q: 'What must I do in case of accidental release?', a: 'Under CEPA, you must immediately notify the federal government of any release or likely release of a regulated substance. Contact Environment and Climate Change Canada\'s Environmental Emergencies Division: ec.ue-e2.ec@canada.ca.' },
        { q: 'What is a Safety Data Sheet (SDS)?', a: 'An SDS is a standardized document describing a chemical substance\'s properties, risks and safety measures. WHMIS regulations require SDS for all hazardous materials used in the workplace.' },
        { q: 'Is the EEP linked to the ERP?', a: 'Yes. The EEP is often integrated into the ERP as a specific procedure for environmental incidents. At industrial sites, it may be a separate document due to specific federal regulatory requirements.' },
      ],
      cta: 'Generate your EEP with CORO',
    },
  },
};

export async function generateMetadata({ params, searchParams }: { params: { doc: string }; searchParams: { lang?: string } }): Promise<Metadata> {
  const doc = DOCUMENTS[params.doc];
  if (!doc) return { title: 'Document introuvable' };
  const lang = searchParams?.lang === 'en' ? 'en' : 'fr';
  const data = doc[lang];
  return {
    title: data.seoTitle,
    description: data.seoDesc,
    alternates: { canonical: `https://getcoro.io/documents/${params.doc}` },
    openGraph: {
      title: data.seoTitle,
      description: data.seoDesc,
      url: `https://getcoro.io/documents/${params.doc}`,
      siteName: 'CORO',
      locale: lang === 'fr' ? 'fr_CA' : 'en_CA',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: data.seoTitle,
      description: data.seoDesc,
    },
  };
}

export default function DocumentPage({ params, searchParams }: { params: { doc: string }; searchParams: { lang?: string } }) {
  console.log('DOC PARAM:', params.doc, 'KEYS:', Object.keys(DOCUMENTS));
  const doc = DOCUMENTS[params.doc];
  if (!doc) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8F9FA' }}>
      <p style={{ color: '#ADB5BD' }}>Document introuvable.</p>
    </div>
  );

  const lang = searchParams?.lang === 'en' ? 'en' : 'fr';
  const data = doc[lang];

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: data.title,
    description: data.seoDesc,
    url: `https://getcoro.io/documents/${params.doc}`,
    publisher: { '@type': 'Organization', name: 'CORO', url: 'https://getcoro.io' },
    inLanguage: lang === 'fr' ? 'fr-CA' : 'en-CA',
  };

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Accueil', item: 'https://getcoro.io' },
      { '@type': 'ListItem', position: 2, name: lang === 'fr' ? 'Documents' : 'Documents', item: 'https://getcoro.io/documents' },
      { '@type': 'ListItem', position: 3, name: data.title, item: `https://getcoro.io/documents/${params.doc}` },
    ],
  };

  const faqLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: data.faq.map(f => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };

  return (
    <div style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', backgroundColor: '#F8F9FA', minHeight: '100vh' }}>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />

      {/* Nav */}
      <nav style={{ backgroundColor: '#2C3E50', padding: '0 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64 }}>
          <a href={lang === 'en' ? '/?lang=en' : '/'} style={{ textDecoration: 'none' }}>
            <span style={{ fontSize: 24, fontWeight: 900, color: '#FFFFFF', letterSpacing: '-1px' }}>
              CO<span style={{ color: '#C0392B' }}>RO</span>
            </span>
          </a>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <a href={lang === 'en' ? '/?lang=en' : '/'} style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, textDecoration: 'none' }}>
              {lang === 'fr' ? '← Accueil' : '← Home'}
            </a>
            <a href={lang === 'fr' ? `/documents/${params.doc}?lang=en` : `/documents/${params.doc}`}
              style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, textDecoration: 'none', border: '1px solid rgba(255,255,255,0.2)', padding: '4px 10px', borderRadius: 4 }}>
              {lang === 'fr' ? 'EN' : 'FR'}
            </a>
          </div>
        </div>
      </nav>

      {/* Breadcrumb visible */}
      <div style={{ backgroundColor: '#FFFFFF', borderBottom: '1px solid #E9ECEF', padding: '12px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <p style={{ fontSize: 13, color: '#ADB5BD' }}>
            <a href="/" style={{ color: '#ADB5BD', textDecoration: 'none' }}>getcoro.io</a>
            {' '}/{' '}
            <span style={{ color: '#6C757D' }}>{data.title}</span>
          </p>
        </div>
      </div>

      {/* Hero */}
      <div style={{ background: `linear-gradient(135deg, #2C3E50 0%, ${doc.color}CC 100%)`, padding: '80px 24px' }}>
        <div style={{ maxWidth: 800, margin: '0 auto', textAlign: 'center' }}>
          <span style={{ display: 'inline-block', fontSize: 13, fontWeight: 800, color: '#FFFFFF', backgroundColor: doc.color, padding: '4px 14px', borderRadius: 4, letterSpacing: '0.1em', marginBottom: 20 }}>
            {doc.code}
          </span>
          <h1 style={{ fontSize: 'clamp(28px, 5vw, 52px)', fontWeight: 900, color: '#FFFFFF', lineHeight: 1.1, marginBottom: 24 }}>
            {data.hero}
          </h1>
          <p style={{ fontSize: 18, color: 'rgba(255,255,255,0.8)', lineHeight: 1.7, maxWidth: 640, margin: '0 auto 32px' }}>
            {data.intro}
          </p>
          <a href={lang === 'fr' ? '/#demo' : '/?lang=en#demo'}
            style={{ display: 'inline-block', backgroundColor: '#C0392B', color: '#FFFFFF', padding: '14px 32px', borderRadius: 8, textDecoration: 'none', fontWeight: 700, fontSize: 16 }}>
            {data.cta} →
          </a>
        </div>
      </div>

      {/* Sections */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '64px 24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(500px, 100%), 1fr))', gap: 32 }}>
          {data.sections.map((section, i) => (
            <div key={i} style={{ backgroundColor: '#FFFFFF', borderRadius: 12, padding: 32, border: '1px solid #E9ECEF' }}>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: '#2C3E50', marginBottom: 16, paddingBottom: 12, borderBottom: `2px solid ${doc.color}` }}>
                {section.title}
              </h2>
              <p style={{ fontSize: 15, color: '#495057', lineHeight: 1.8 }}>
                {section.content}
              </p>
            </div>
          ))}
        </div>

        {/* Sources */}
        <div style={{ marginTop: 48, backgroundColor: '#FFFFFF', borderRadius: 12, padding: 32, border: '1px solid #E9ECEF' }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#2C3E50', marginBottom: 16 }}>
            {lang === 'fr' ? '📚 Sources et références officielles' : '📚 Official sources and references'}
          </h3>
          <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {data.sources.map((source, i) => (
              <li key={i}>
                <a href={source.url} target="_blank" rel="noopener noreferrer"
                  style={{ fontSize: 14, color: doc.color, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>→</span> {source.label}
                </a>
              </li>
            ))}
          </ul>
          <p style={{ fontSize: 12, color: '#ADB5BD', marginTop: 16 }}>
            {lang === 'fr'
              ? '⚠️ Ce contenu est fourni à titre informatif. Les exigences réglementaires varient selon le type de bâtiment, le secteur d\'activité et la municipalité. Consultez les autorités compétentes pour votre situation spécifique.'
              : '⚠️ This content is provided for informational purposes. Regulatory requirements vary by building type, sector and municipality. Consult competent authorities for your specific situation.'}
          </p>
        </div>

        {/* FAQ */}
        <div style={{ marginTop: 64 }}>
          <h2 style={{ fontSize: 28, fontWeight: 800, color: '#2C3E50', marginBottom: 32, textAlign: 'center' }}>
            {lang === 'fr' ? 'Questions fréquentes' : 'Frequently asked questions'}
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 800, margin: '0 auto' }}>
            {data.faq.map((item, i) => (
              <div key={i} style={{ backgroundColor: '#FFFFFF', borderRadius: 12, padding: 28, border: '1px solid #E9ECEF' }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: '#2C3E50', marginBottom: 10 }}>
                  {item.q}
                </h3>
                <p style={{ fontSize: 15, color: '#6C757D', lineHeight: 1.7 }}>
                  {item.a}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA final */}
        <div style={{ marginTop: 64, backgroundColor: '#2C3E50', borderRadius: 16, padding: '48px 40px', textAlign: 'center' }}>
          <h2 style={{ fontSize: 28, fontWeight: 800, color: '#FFFFFF', marginBottom: 16 }}>
            {lang === 'fr' ? `Prêt à produire votre ${doc.code} ?` : `Ready to produce your ${doc.code}?`}
          </h2>
          <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.7)', marginBottom: 32, maxWidth: 500, margin: '0 auto 32px' }}>
            {lang === 'fr'
              ? 'CORO génère, structure et gère vos documents de conformité depuis une seule plateforme.'
              : 'CORO generates, structures and manages your compliance documents from a single platform.'}
          </p>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href={lang === 'fr' ? '/#demo' : '/?lang=en#demo'}
              style={{ display: 'inline-block', backgroundColor: '#C0392B', color: '#FFFFFF', padding: '14px 32px', borderRadius: 8, textDecoration: 'none', fontWeight: 700, fontSize: 15 }}>
              {lang === 'fr' ? 'Demander une démo →' : 'Request a demo →'}
            </a>
            <a href={`/blog${lang === 'en' ? '?lang=en' : ''}`}
              style={{ display: 'inline-block', backgroundColor: 'transparent', color: '#FFFFFF', padding: '14px 32px', borderRadius: 8, textDecoration: 'none', fontWeight: 600, fontSize: 15, border: '2px solid rgba(255,255,255,0.3)' }}>
              {lang === 'fr' ? 'Lire nos guides →' : 'Read our guides →'}
            </a>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ backgroundColor: '#2C3E50', padding: '32px 24px', textAlign: 'center' }}>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>
          © 2026 CORO — <a href="https://getcoro.io" style={{ color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }}>getcoro.io</a>
        </p>
      </div>
    </div>
  );
}