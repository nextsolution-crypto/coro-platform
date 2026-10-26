export const knowledgeContent = {
  knowledge: {
    fr: {
      name: 'CORO Knowledge', title: 'La mémoire documentaire de chaque bâtiment.', description: 'Centralisez la documentation technique du bâtiment et les documents de projet approuvés pour retrouver une information sourcée avec CORO Knowledge.',
      lead: 'Une base documentaire rattachée au bâtiment, enrichie par les documents approuvés de ses projets. Les sources restent organisées, versionnées et accessibles selon les droits accordés.',
      steps: ['Déposer', 'Approuver', 'Indexer', 'Retrouver la source'],
      sections: [
        { title: 'Deux usages, un bâtiment', text: 'Les documents de conformité réalisés par votre prestataire restent distincts des plans, tableaux, notices et autres documents techniques du bâtiment. Les deux ensembles contribuent à sa base documentaire selon leur statut.' },
        { title: 'Contribuer selon ses responsabilités', text: 'Les utilisateurs actifs de l’organisation peuvent alimenter la documentation. Côté client, le responsable du bâtiment et les rôles autorisés peuvent ajouter des fichiers ; des droits supplémentaires peuvent être accordés.' },
        { title: 'Conserver les sources et leurs versions', text: 'Chaque document conserve son rattachement et son historique. L’archivage d’un projet ne retire pas à lui seul les sources approuvées de la base du bâtiment. Le retrait d’accès reste appliqué.' },
        { title: 'Voir ce qui est exploitable', text: 'Le stockage d’un fichier ne garantit pas son analyse. L’état d’ingestion permet de distinguer une source indexée, en attente, en erreur ou non prise en charge.' },
      ],
      limitsTitle: 'Des formats et des limites explicites', limits: 'L’extraction couvre les formats pris en charge, notamment les textes, DOCX, XLSX et PDF contenant du texte exploitable. Les images, scans et plans peuvent être conservés ; leur contenu n’est pas automatiquement lisible par l’IA. Un export compatible peut être nécessaire. Les macros et formules Excel ne sont pas exécutées.',
      faq: [{ q: 'Knowledge est-il une bibliothèque par projet?', a: 'La base est rattachée au bâtiment. Les documents approuvés des projets viennent l’enrichir selon leurs droits et leur statut.' }, { q: 'Un document déposé est-il immédiatement utilisé par l’IA?', a: 'Non. Il doit être admissible, accessible et correctement indexé. Les sources non prises en charge ne doivent pas être présentées comme analysées.' }],
      related: 'Interroger ces sources avec CORO AI', relatedHref: '/coro-ai', demo: 'Demander une démonstration', flowTitle: 'Du fichier à la source consultable', faqTitle: 'Questions fréquentes',
    },
    en: {
      name: 'CORO Knowledge', title: 'A documentary memory for every building.', description: 'Bring building technical documentation and approved project documents together to find sourced information with CORO Knowledge.',
      lead: 'A building-based document library enriched by approved project documents. Sources stay organized, versioned and accessible according to granted permissions.', steps: ['Upload', 'Approve', 'Index', 'Find the source'],
      sections: [
        { title: 'Two purposes, one building', text: 'Compliance documents prepared by your provider remain distinct from building plans, spreadsheets, manuals and other technical documentation. Both contribute according to their status.' },
        { title: 'Contribute according to responsibilities', text: 'Active organization users can contribute documentation. On the client side, the building manager and authorized roles can upload files; additional rights can be granted.' },
        { title: 'Keep sources and versions', text: 'Documents retain their association and history. Archiving a project alone does not remove approved sources from the building library. Access revocation still applies.' },
        { title: 'Know what can be processed', text: 'Storing a file does not guarantee analysis. Ingestion status distinguishes indexed sources, pending processing, errors and unsupported content.' },
      ],
      limitsTitle: 'Explicit format support and limits', limits: 'Extraction supports compatible formats including text, DOCX, XLSX and PDFs with extractable text. Images, scans and technical plans can be stored, but their content is not automatically readable by AI. A compatible export may be needed. Excel macros and formulas are not executed.',
      faq: [{ q: 'Is Knowledge a per-project library?', a: 'The library belongs to the building. Approved project documents enrich it according to their permissions and status.' }, { q: 'Does uploading make a document immediately usable by AI?', a: 'No. It must be eligible, accessible and successfully indexed. Unsupported sources must not be presented as analysed.' }],
      related: 'Ask about these sources with CORO AI', relatedHref: '/coro-ai', demo: 'Request a demonstration', flowTitle: 'From file to accessible source', faqTitle: 'Frequently asked questions',
    },
  },
  ai: {
    fr: {
      name: 'CORO AI', title: 'Interroger les sources. Vérifier la réponse.', description: 'Posez des questions sur les sources documentaires autorisées d’un bâtiment et consultez les citations avec CORO AI.',
      lead: 'CORO AI aide à retrouver et à comprendre l’information des sources admissibles indexées dans Knowledge, dans le périmètre autorisé de l’utilisateur.', steps: ['Choisir le bâtiment', 'Poser une question', 'Lire la réponse', 'Vérifier les citations'],
      sections: [
        { title: 'Partir du bon bâtiment', text: 'Le périmètre documentaire dépend du bâtiment sélectionné et des droits du compte. La présence d’un document ailleurs dans CORO ne le rend pas accessible à tous.' },
        { title: 'Retrouver les éléments utiles', text: 'Les réponses s’appuient sur les passages retrouvés dans les sources admissibles. Elles facilitent la consultation de procédures, renseignements et documents techniques pris en charge.' },
        { title: 'Consulter la source', text: 'Les citations permettent de vérifier la provenance des éléments présentés. L’ouverture de la source reste soumise aux autorisations de consultation.' },
        { title: 'Respecter le cycle documentaire', text: 'Les versions, les statuts d’approbation et les retraits d’accès déterminent les sources disponibles. Une nouvelle version doit être traitée avant de pouvoir servir de source.' },
      ],
      limitsTitle: 'Une assistance, une vérification humaine', limits: 'Une réponse assistée peut être incomplète ou erronée. Vérifiez les citations et les documents applicables. CORO AI ne remplace pas une validation professionnelle, ne garantit pas la conformité et ne doit pas être utilisé comme autorité autonome pour une décision d’urgence. Une source absente ou non indexée ne peut pas être tenue pour analysée.',
      faq: [{ q: 'CORO AI peut-il consulter tous les documents?', a: 'Non. Seules les sources admissibles, indexées et accessibles au compte dans le périmètre sélectionné peuvent être utilisées.' }, { q: 'Les réponses remplacent-elles les procédures approuvées?', a: 'Non. Les documents et procédures applicables restent les références à vérifier ; l’assistance ne remplace pas le jugement des personnes responsables.' }],
      related: 'Découvrir les sources dans Knowledge', relatedHref: '/coro-knowledge', demo: 'Demander une démonstration', flowTitle: 'De la question à la vérification', faqTitle: 'Questions fréquentes',
    },
    en: {
      name: 'CORO AI', title: 'Ask the sources. Check the answer.', description: 'Ask questions about authorized building documents and consult citations with CORO AI.',
      lead: 'CORO AI helps find and understand eligible sources indexed in Knowledge, within the user’s authorized scope.', steps: ['Choose the building', 'Ask a question', 'Read the answer', 'Check citations'],
      sections: [
        { title: 'Start with the right building', text: 'Document scope depends on the selected building and account permissions. A document stored elsewhere in CORO is not automatically available to everyone.' },
        { title: 'Find useful information', text: 'Answers draw on passages retrieved from eligible sources to support consultation of supported procedures, information and technical documents.' },
        { title: 'Consult the source', text: 'Citations help verify the origin of information. Opening a source remains subject to access permissions.' },
        { title: 'Respect document status and versions', text: 'Versions, approval status and access revocation determine available sources. A new version must be processed before it can be used as a source.' },
      ],
      limitsTitle: 'Assistance with human verification', limits: 'An AI-assisted answer may be incomplete or incorrect. Check citations and applicable documents. CORO AI does not replace professional review, guarantee compliance or serve as an autonomous authority for emergency decisions. Missing or unindexed sources cannot be treated as analysed.',
      faq: [{ q: 'Can CORO AI read every document?', a: 'No. Only eligible, indexed sources accessible to the account within the selected scope can be used.' }, { q: 'Do answers replace approved procedures?', a: 'No. Applicable documents and procedures remain the references to check; assistance does not replace responsible judgement.' }],
      related: 'Explore the sources in Knowledge', relatedHref: '/coro-knowledge', demo: 'Request a demonstration', flowTitle: 'From question to verification', faqTitle: 'Frequently asked questions',
    },
  },
} as const;
