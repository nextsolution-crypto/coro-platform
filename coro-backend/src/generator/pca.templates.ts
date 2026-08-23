import { DocumentContext } from './module1/module1.index';

export function generatePcaModules(ctx: DocumentContext, pcaConfig: any) {

  const cfg = pcaConfig || {};
  const clientName = ctx.clientName || '';
  const year = ctx.year || new Date().getFullYear();

  // ── Helpers ──
  const riskLabel = (val: string) =>
    val === 'ELEVEE' || val === 'ELEVE' ? 'Élevé(e)' :
    val === 'MOYENNE' || val === 'MOYEN' ? 'Moyen(ne)' : 'Faible';

  const riskLabelEN = (val: string) =>
    val === 'ELEVEE' || val === 'ELEVE' ? 'High' :
    val === 'MOYENNE' || val === 'MOYEN' ? 'Medium' : 'Low';

  const scopeLabel = (scope: string) =>
    scope === 'ORGANIZATION' ? 'Organisation entière' :
    scope === 'BUILDING' ? 'Bâtiment spécifique' : 'Plusieurs bâtiments';

  const scopeLabelEN = (scope: string) =>
    scope === 'ORGANIZATION' ? 'Entire organization' :
    scope === 'BUILDING' ? 'Specific building' : 'Multiple buildings';

  // ── MODULE 1 — Introduction et politique ──
  const m1fr = {
    moduleNumber: 1,
    title: 'INTRODUCTION ET POLITIQUE DE CONTINUITÉ',
    language: 'fr',
    sections: [
      {
        id: 'm1_s1',
        title: 'Objectif du plan',
        content: `Le présent Plan de continuité des activités (PCA) a pour objectif de permettre à ${clientName} de maintenir ses activités essentielles et de reprendre ses opérations dans les meilleurs délais suivant un incident perturbateur.\n\nCe plan est conforme aux exigences de la norme ISO 22301:2019 — Systèmes de management de la continuité d'activité, et s'appuie sur le Guide de gestion de la continuité des activités du gouvernement du Québec.`,
      },
      {
        id: 'm1_s2',
        title: 'Portée du plan',
        content: `Portée : ${scopeLabel(cfg.scope || 'ORGANIZATION')}\n\nSecteur d'activité : ${cfg.sector || 'Non précisé'}\nNombre d'employés : ${cfg.employeeCount || 'Non précisé'}\nHeures d'opération : ${cfg.operatingHours || 'Non précisé'}\n\n${cfg.regulatoryReqs?.length > 0 ? `Exigences réglementaires et contractuelles applicables :\n${cfg.regulatoryReqs.map((r: string) => `• ${r}`).join('\n')}` : ''}`,
      },
      {
        id: 'm1_s3',
        title: 'Politique de continuité des activités',
        content: `La direction de ${clientName} s'engage à maintenir un Plan de continuité des activités (PCA) à jour, exercé régulièrement et accessible à tous les intervenants concernés.\n\nCe plan est révisé au minimum annuellement et lors de tout changement significatif dans les activités de l'organisation.\n\nRespect des engagements :\n• Protéger la vie et la sécurité des employés\n• Maintenir les activités essentielles au niveau de service minimum acceptable\n• Préserver la réputation et les actifs de l'organisation\n• Assurer la conformité aux obligations légales et contractuelles`,
      },
      {
        id: 'm1_s4',
        title: 'Références réglementaires',
        content: `Le présent PCA s'appuie sur les références suivantes :\n\n• ISO 22301:2019 — Systèmes de management de la continuité d'activité\n• Guide de gestion de la continuité des activités — Gouvernement du Québec (Investissement Québec)\n• Loi sur la gestion des urgences — Sécurité publique Canada\n${cfg.regulatoryReqs?.includes('ISO 22301') ? '• ISO 22301:2019 — Certification visée\n' : ''}${cfg.regulatoryReqs?.includes('BOMA BEST') ? '• Certification BOMA BEST\n' : ''}${cfg.regulatoryReqs?.includes('AMF') ? '• Exigences de l\'Autorité des marchés financiers (AMF)\n' : ''}`,
      },
      {
        id: 'm1_s5',
        title: 'Historique des versions',
        content: `Version 1.0 — ${year} — Création initiale du Plan de continuité des activités`,
      },
    ],
  };

  const m1en = {
    moduleNumber: 1,
    title: 'INTRODUCTION AND CONTINUITY POLICY',
    language: 'en',
    sections: [
      {
        id: 'm1_s1',
        title: 'Plan objective',
        content: `This Business Continuity Plan (BCP) aims to enable ${clientName} to maintain its essential activities and resume operations as quickly as possible following a disruptive incident.\n\nThis plan complies with ISO 22301:2019 — Business Continuity Management Systems requirements.`,
      },
      {
        id: 'm1_s2',
        title: 'Scope',
        content: `Scope: ${scopeLabelEN(cfg.scope || 'ORGANIZATION')}\n\nBusiness sector: ${cfg.sector || 'Not specified'}\nNumber of employees: ${cfg.employeeCount || 'Not specified'}\nOperating hours: ${cfg.operatingHours || 'Not specified'}`,
      },
      {
        id: 'm1_s3',
        title: 'Business continuity policy',
        content: `The management of ${clientName} commits to maintaining an up-to-date Business Continuity Plan, regularly exercised and accessible to all relevant stakeholders.`,
      },
      {
        id: 'm1_s4',
        title: 'Regulatory references',
        content: `This BCP is based on the following references:\n\n• ISO 22301:2019 — Business Continuity Management Systems\n• Business Continuity Management Guide — Government of Quebec\n• Emergency Management Act — Public Safety Canada`,
      },
      {
        id: 'm1_s5',
        title: 'Version history',
        content: `Version 1.0 — ${year} — Initial creation of the Business Continuity Plan`,
      },
    ],
  };

  // ── MODULE 2 — Contexte organisationnel ──
  const cellMembersText = (cfg.cellMembers || []).length > 0
    ? (cfg.cellMembers || []).map((m: any) =>
        `• ${m.role} : ${m.firstName} ${m.lastName}${m.email ? ` — ${m.email}` : ''}${m.phone ? ` — ${m.phone}` : ''}`
      ).join('\n')
    : '• À compléter';

  const m2fr = {
    moduleNumber: 2,
    title: 'CONTEXTE ORGANISATIONNEL ET GOUVERNANCE',
    language: 'fr',
    sections: [
      {
        id: 'm2_s1',
        title: 'Description de l\'organisation',
        content: `Organisation : ${clientName}\nSecteur d'activité : ${cfg.sector || 'Non précisé'}\nNombre d'employés : ${cfg.employeeCount || 'Non précisé'}\nHeures d'opération : ${cfg.operatingHours || 'Non précisé'}\n\nPortée du plan : ${scopeLabel(cfg.scope || 'ORGANIZATION')}`,
      },
      {
        id: 'm2_s2',
        title: 'Coordonnateur PCA',
        content: `Coordonnateur principal :\n• Nom : ${cfg.coordinatorFirstName || ''} ${cfg.coordinatorLastName || ''}\n• Titre : ${cfg.coordinatorTitle || 'Non précisé'}\n• Courriel : ${cfg.coordinatorEmail || 'Non précisé'}\n• Téléphone : ${cfg.coordinatorPhone || 'Non précisé'}\n\nSubstitut :\n• Nom : ${cfg.substituteFirstName || ''} ${cfg.substituteLastName || ''}\n• Courriel : ${cfg.substituteEmail || 'Non précisé'}\n• Téléphone : ${cfg.substitutePhone || 'Non précisé'}`,
      },
      {
        id: 'm2_s3',
        title: 'Cellule de gestion d\'incident',
        content: `Membres de la cellule de gestion d'incident :\n\n${cellMembersText}\n\nPorte-parole désigné : ${cfg.spokesperson || 'À désigner'}\nResponsable suivi médias sociaux : ${cfg.socialMediaMonitor || 'À désigner'}`,
      },
      {
        id: 'm2_s4',
        title: 'Exigences réglementaires et contractuelles',
        content: cfg.regulatoryReqs?.length > 0
          ? `Les exigences suivantes s'appliquent à cette organisation :\n\n${cfg.regulatoryReqs.map((r: string) => `• ${r}`).join('\n')}`
          : 'Aucune exigence réglementaire ou contractuelle spécifique identifiée.',
      },
    ],
  };

  const m2en = {
    moduleNumber: 2,
    title: 'ORGANIZATIONAL CONTEXT AND GOVERNANCE',
    language: 'en',
    sections: [
      {
        id: 'm2_s1',
        title: 'Organization description',
        content: `Organization: ${clientName}\nBusiness sector: ${cfg.sector || 'Not specified'}\nNumber of employees: ${cfg.employeeCount || 'Not specified'}\nOperating hours: ${cfg.operatingHours || 'Not specified'}`,
      },
      {
        id: 'm2_s2',
        title: 'BCP Coordinator',
        content: `Lead coordinator:\n• Name: ${cfg.coordinatorFirstName || ''} ${cfg.coordinatorLastName || ''}\n• Title: ${cfg.coordinatorTitle || 'Not specified'}\n• Email: ${cfg.coordinatorEmail || 'Not specified'}\n• Phone: ${cfg.coordinatorPhone || 'Not specified'}\n\nAlternate:\n• Name: ${cfg.substituteFirstName || ''} ${cfg.substituteLastName || ''}\n• Email: ${cfg.substituteEmail || 'Not specified'}\n• Phone: ${cfg.substitutePhone || 'Not specified'}`,
      },
      {
        id: 'm2_s3',
        title: 'Incident management team',
        content: `Incident management team members:\n\n${cellMembersText}\n\nDesignated spokesperson: ${cfg.spokesperson || 'To be designated'}`,
      },
      {
        id: 'm2_s4',
        title: 'Regulatory requirements',
        content: cfg.regulatoryReqs?.length > 0
          ? `The following requirements apply to this organization:\n\n${cfg.regulatoryReqs.map((r: string) => `• ${r}`).join('\n')}`
          : 'No specific regulatory or contractual requirements identified.',
      },
    ],
  };

  // ── MODULE 3 — Appréciation du risque ──
  const riskScenarios = cfg.riskScenarios || [];
  const riskTableFR = riskScenarios.length > 0
    ? riskScenarios.map((r: any) => {
        const scenario = {
          sinistre: 'Sinistre bâtiment (incendie, inondation, séisme)',
          meteo: 'Événement météorologique extrême',
          cyber: 'Cyberattaque / panne informatique majeure',
          pandemie: 'Pandémie / absentéisme massif',
          electrique: 'Panne électrique prolongée',
          fournisseur: 'Perte d\'un fournisseur critique',
          personnel: 'Perte d\'un employé clé',
          approvisionnement: 'Interruption chaîne d\'approvisionnement',
          autre: 'Autre scénario',
        }[r.id] || r.id;
        const prob = riskLabel(r.probability);
        const imp = riskLabel(r.impact);
        const niveau =
          (r.probability === 'ELEVEE' && r.impact === 'ELEVE') ? 'CRITIQUE' :
          (r.probability === 'ELEVEE' || r.impact === 'ELEVE') ? 'ÉLEVÉ' :
          (r.probability === 'MOYENNE' && r.impact === 'MOYEN') ? 'MOYEN' : 'FAIBLE';
        return `• ${scenario}\n  Probabilité : ${prob} | Impact : ${imp} | Niveau de risque : ${niveau}`;
      }).join('\n\n')
    : '• Aucun scénario de risque identifié — À compléter dans le configurateur';

  const m3fr = {
    moduleNumber: 3,
    title: 'APPRÉCIATION DU RISQUE (ARA)',
    language: 'fr',
    sections: [
      {
        id: 'm3_s1',
        title: 'Méthodologie d\'appréciation du risque',
        content: `L'appréciation du risque a été réalisée selon la méthodologie recommandée par le Guide de gestion de la continuité des activités du gouvernement du Québec et la norme ISO 22301:2019.\n\nChaque scénario d'interruption a été évalué selon deux critères :\n• Probabilité d'occurrence (Faible / Moyenne / Élevée)\n• Impact potentiel sur les activités (Faible / Moyen / Élevé)\n\nLe niveau de risque résultant (Faible / Moyen / Élevé / Critique) détermine les priorités de planification de la continuité.`,
      },
      {
        id: 'm3_s2',
        title: 'Scénarios d\'interruption identifiés',
        content: riskTableFR,
      },
      {
        id: 'm3_s3',
        title: 'Concentrations de risques inacceptables',
        content: `Les scénarios identifiés comme ÉLEVÉ ou CRITIQUE nécessitent des stratégies de continuité prioritaires.\n\nNote : Il est important, lors des révisions du plan, de toujours considérer l'augmentation du nombre d'événements météorologiques extrêmes causés par les changements climatiques. — ISO 22301:2019/Amd 1:2024`,
      },
    ],
  };

  const m3en = {
    moduleNumber: 3,
    title: 'RISK ASSESSMENT',
    language: 'en',
    sections: [
      {
        id: 'm3_s1',
        title: 'Risk assessment methodology',
        content: `The risk assessment was conducted according to the methodology recommended by the ISO 22301:2019 standard and the Government of Quebec Business Continuity Management Guide.\n\nEach disruption scenario was evaluated against two criteria:\n• Probability of occurrence (Low / Medium / High)\n• Potential impact on operations (Low / Medium / High)`,
      },
      {
        id: 'm3_s2',
        title: 'Identified disruption scenarios',
        content: riskScenarios.length > 0
          ? riskScenarios.map((r: any) => {
              const prob = riskLabelEN(r.probability);
              const imp = riskLabelEN(r.impact);
              return `• ${r.id}\n  Probability: ${prob} | Impact: ${imp}`;
            }).join('\n\n')
          : '• No risk scenarios identified — To be completed in the configurator',
      },
      {
        id: 'm3_s3',
        title: 'Unacceptable risk concentrations',
        content: `Scenarios identified as HIGH or CRITICAL require priority continuity strategies.\n\nNote: Climate change is increasing the frequency of extreme weather events and must be considered during plan reviews. — ISO 22301:2019/Amd 1:2024`,
      },
    ],
  };

  // ── MODULE 4 — BIA ──
  const criticalServices = cfg.criticalServices || [];
  const biaTableFR = criticalServices.length > 0
    ? criticalServices.map((s: any, i: number) => `Service ${i + 1} : ${s.name || 'Non défini'}\n• Niveau de service minimum : ${s.minServiceLevel || 'Non précisé'}\n• RTO (Délai de reprise max.) : ${s.rto || 'Non défini'}\n• RPO (Perte de données max.) : ${s.rpo || 'Non défini'}\n• MAD (Temps d'arrêt max.) : ${s.mad || 'Non défini'}\n• Impact financier / jour : ${s.financialImpact || 'Non précisé'}\n• Impact réputationnel : ${riskLabel(s.reputationalImpact || 'MOYEN')}\n• Impact légal : ${s.legalImpact ? 'Oui' : 'Non'}`).join('\n\n')
    : 'Aucun service critique défini — À compléter dans le configurateur';

  const m4fr = {
    moduleNumber: 4,
    title: 'BILAN D\'IMPACT SUR LES ACTIVITÉS (BIA)',
    language: 'fr',
    sections: [
      {
        id: 'm4_s1',
        title: 'Méthodologie du BIA',
        content: `Le Bilan d'impact sur les activités (BIA) identifie les produits et services essentiels de l'organisation, détermine les activités critiques nécessaires à leur maintien, et établit les objectifs de continuité.\n\nConformément au Guide de gestion de la continuité des activités du gouvernement du Québec, le BIA permet de :\n• Déterminer les produits ou services essentiels et leur niveau de service minimum acceptable\n• Établir la tolérance à l'interruption pour chaque activité\n• Identifier les ressources nécessaires au maintien et au rétablissement`,
      },
      {
        id: 'm4_s2',
        title: 'Services et activités critiques',
        content: biaTableFR,
      },
      {
        id: 'm4_s3',
        title: 'Ressources critiques identifiées',
        content: `Les ressources suivantes ont été identifiées comme critiques pour le maintien des activités essentielles :\n\n• Personnel clé : À documenter par activité\n• Systèmes TI critiques : À documenter\n• Équipements essentiels : À documenter\n• Fournisseurs critiques : À documenter\n• Locaux minimum requis : ${cfg.alternativeSiteAddress || 'À documenter'}`,
      },
    ],
  };

  const m4en = {
    moduleNumber: 4,
    title: 'BUSINESS IMPACT ANALYSIS (BIA)',
    language: 'en',
    sections: [
      {
        id: 'm4_s1',
        title: 'BIA methodology',
        content: `The Business Impact Analysis (BIA) identifies essential products and services, determines critical activities required for their maintenance, and establishes continuity objectives.\n\nKey metrics:\n• RTO (Recovery Time Objective): Maximum acceptable time to resume operations\n• RPO (Recovery Point Objective): Maximum acceptable data loss\n• MAD (Maximum Allowable Downtime): Maximum acceptable total downtime`,
      },
      {
        id: 'm4_s2',
        title: 'Critical services and activities',
        content: criticalServices.length > 0
          ? criticalServices.map((s: any, i: number) => `Service ${i + 1}: ${s.name || 'Not defined'}\n• Minimum service level: ${s.minServiceLevel || 'Not specified'}\n• RTO: ${s.rto || 'Not defined'}\n• RPO: ${s.rpo || 'Not defined'}\n• MAD: ${s.mad || 'Not defined'}\n• Financial impact/day: ${s.financialImpact || 'Not specified'}`).join('\n\n')
          : 'No critical services defined — To be completed in the configurator',
      },
      {
        id: 'm4_s3',
        title: 'Critical resources',
        content: `Critical resources required to maintain essential activities:\n\n• Key personnel: To be documented by activity\n• Critical IT systems: To be documented\n• Essential equipment: To be documented\n• Critical suppliers: To be documented`,
      },
    ],
  };

  // ── MODULE 5 — Stratégies de continuité ──
  const stratsFR: string[] = [];
  if (cfg.teleworkPossible === 'Oui') stratsFR.push('✓ Télétravail possible pour les employés concernés');
  if (cfg.teleworkPossible === 'Partiel') stratsFR.push('◐ Télétravail partiel possible');
  if (cfg.alternativeSite) stratsFR.push(`✓ Site alternatif disponible${cfg.alternativeSiteAddress ? ` : ${cfg.alternativeSiteAddress}` : ''}`);
  if (cfg.sharingAgreement) stratsFR.push('✓ Entente de partage de locaux en place');
  if (cfg.itRedundancy) stratsFR.push('✓ Relève ou redondance des systèmes informatiques');
  if (cfg.offSiteBackup) stratsFR.push(`✓ Sauvegardes hors site${cfg.backupFrequency ? ` (${cfg.backupFrequency})` : ''}`);
  if (cfg.crossTraining) stratsFR.push('✓ Formation croisée des employés en place');
  if (cfg.processDocumented) stratsFR.push('✓ Processus clés documentés');
  if (cfg.tempStaffAccess) stratsFR.push('✓ Accès à du personnel temporaire');
  if (cfg.alternativeSuppliers) stratsFR.push('✓ Fournisseurs alternatifs identifiés');
  if (cfg.safetyStock) stratsFR.push(`✓ Stock de sécurité maintenu${cfg.safetyStockDuration ? ` (${cfg.safetyStockDuration})` : ''}`);
  if (cfg.generator) stratsFR.push('✓ Génératrice disponible');
  if (cfg.ups) stratsFR.push('✓ Alimentation sans coupure (UPS) installée');

  const assurancesFR: string[] = [];
  if (cfg.insuranceBI) assurancesFR.push('✓ Assurance interruption des affaires');
  if (cfg.insuranceProperty) assurancesFR.push('✓ Assurance dommages matériels');
  if (cfg.insuranceCyber) assurancesFR.push('✓ Assurance cyber');

  const m5fr = {
    moduleNumber: 5,
    title: 'STRATÉGIES DE CONTINUITÉ',
    language: 'fr',
    sections: [
      {
        id: 'm5_s1',
        title: 'Stratégies de continuité en place',
        content: stratsFR.length > 0
          ? `Les stratégies suivantes ont été mises en place pour assurer la continuité des activités :\n\n${stratsFR.join('\n')}`
          : 'Aucune stratégie de continuité définie — À compléter dans le configurateur',
      },
      {
        id: 'm5_s2',
        title: 'Stratégies par type de conséquence',
        content: `Perte d'accès au bâtiment :\n${cfg.teleworkPossible ? `• Télétravail : ${cfg.teleworkPossible}` : '• À documenter'}\n${cfg.alternativeSite ? `• Site alternatif : ${cfg.alternativeSiteAddress || 'Défini'}` : '• Site alternatif : Non disponible'}\n\nPerte des systèmes TI :\n${cfg.itRedundancy ? '• Relève informatique : Disponible' : '• Relève informatique : À prévoir'}\n${cfg.offSiteBackup ? `• Sauvegardes hors site : Disponibles (${cfg.backupFrequency || 'fréquence non précisée'})` : '• Sauvegardes hors site : Non disponibles'}\n\nAbsentéisme / perte de personnel :\n${cfg.crossTraining ? '• Formation croisée : En place' : '• Formation croisée : À mettre en place'}\n${cfg.processDocumented ? '• Processus documentés : Oui' : '• Processus documentés : À documenter'}\n\nPanne électrique :\n${cfg.generator ? '• Génératrice : Disponible' : '• Génératrice : Non disponible'}\n${cfg.ups ? '• UPS : Installée' : '• UPS : Non installée'}`,
      },
      {
        id: 'm5_s3',
        title: 'Couverture d\'assurance',
        content: assurancesFR.length > 0
          ? `Couvertures d'assurance en place :\n\n${assurancesFR.join('\n')}${cfg.insuranceLastReview ? `\n\nDernière révision : ${new Date(cfg.insuranceLastReview).toLocaleDateString('fr-CA')}` : ''}`
          : 'Aucune couverture d\'assurance documentée — À vérifier avec le courtier d\'assurance',
      },
    ],
  };

  const m5en = {
    moduleNumber: 5,
    title: 'CONTINUITY STRATEGIES',
    language: 'en',
    sections: [
      {
        id: 'm5_s1',
        title: 'Continuity strategies in place',
        content: stratsFR.length > 0
          ? `The following strategies have been implemented to ensure business continuity:\n\n${stratsFR.join('\n')}`
          : 'No continuity strategies defined — To be completed in the configurator',
      },
      {
        id: 'm5_s2',
        title: 'Strategies by consequence type',
        content: `Loss of building access:\n${cfg.teleworkPossible ? `• Telework: ${cfg.teleworkPossible}` : '• To be documented'}\n\nIT system failure:\n${cfg.itRedundancy ? '• IT redundancy: Available' : '• IT redundancy: To be planned'}\n\nStaffing shortage:\n${cfg.crossTraining ? '• Cross-training: In place' : '• Cross-training: To be implemented'}`,
      },
      {
        id: 'm5_s3',
        title: 'Insurance coverage',
        content: assurancesFR.length > 0
          ? `Insurance coverage in place:\n\n${assurancesFR.join('\n')}`
          : 'No insurance coverage documented — To be verified with insurance broker',
      },
    ],
  };

  // ── MODULE 6 — Communication de crise ──
  const authoritiesFR = (cfg.authoritiesToNotify || []).length > 0
    ? cfg.authoritiesToNotify.map((a: string) => `• ${a}`).join('\n')
    : '• À documenter selon les scénarios applicables';

  const m6fr = {
    moduleNumber: 6,
    title: 'COMMUNICATION DE CRISE',
    language: 'fr',
    sections: [
      {
        id: 'm6_s1',
        title: 'Canaux de communication',
        content: `Communication interne :\n• Canal principal : ${cfg.internalChannel || 'À définir'}\n• Système d'alerte de masse : ${cfg.massAlertSystem ? 'Disponible' : 'Non disponible'}\n\nCommunication externe :\n• Canal principal : ${cfg.externalChannel || 'À définir'}\n• Porte-parole désigné : ${cfg.spokesperson || 'À désigner'}\n• Responsable médias sociaux : ${cfg.socialMediaMonitor || 'À désigner'}`,
      },
      {
        id: 'm6_s2',
        title: 'Clients prioritaires à aviser',
        content: cfg.priorityClients || 'À documenter — Identifier les clients dont la notification prioritaire est requise en cas d\'incident',
      },
      {
        id: 'm6_s3',
        title: 'Autorités à aviser',
        content: `Selon le type d'incident, les autorités suivantes doivent être avisées :\n\n${authoritiesFR}\n\nNote : Les pompiers et services d'urgence sont couverts par le Plan de mesures d'urgence (PMU) lié à ce PCA.`,
      },
      {
        id: 'm6_s4',
        title: 'Ligne de communication approuvée',
        content: cfg.mediaContact || 'À documenter — Définir le message approuvé par la direction pour les communications externes en cas d\'incident',
      },
    ],
  };

  const m6en = {
    moduleNumber: 6,
    title: 'CRISIS COMMUNICATION',
    language: 'en',
    sections: [
      {
        id: 'm6_s1',
        title: 'Communication channels',
        content: `Internal communication:\n• Primary channel: ${cfg.internalChannel || 'To be defined'}\n• Mass alert system: ${cfg.massAlertSystem ? 'Available' : 'Not available'}\n\nExternal communication:\n• Primary channel: ${cfg.externalChannel || 'To be defined'}\n• Designated spokesperson: ${cfg.spokesperson || 'To be designated'}`,
      },
      {
        id: 'm6_s2',
        title: 'Priority clients to notify',
        content: cfg.priorityClients || 'To be documented — Identify clients requiring priority notification in case of incident',
      },
      {
        id: 'm6_s3',
        title: 'Authorities to notify',
        content: `Depending on the type of incident, the following authorities must be notified:\n\n${authoritiesFR}`,
      },
      {
        id: 'm6_s4',
        title: 'Approved communication line',
        content: cfg.mediaContact || 'To be documented — Define management-approved messaging for external communications during an incident',
      },
    ],
  };

  // ── MODULE 7 — Activation et reprise ──
  const m7fr = {
    moduleNumber: 7,
    title: 'ACTIVATION ET PROCÉDURES DE REPRISE',
    language: 'fr',
    sections: [
      {
        id: 'm7_s1',
        title: 'Critères d\'activation du PCA',
        content: cfg.activationCriteria || 'À documenter — Définir les critères précis qui déclenchent l\'activation du PCA, notamment : qui peut décider de l\'activation, dans quelles circonstances, et selon quel processus de notification.',
      },
      {
        id: 'm7_s2',
        title: 'Lieu de coordination et pont téléphonique',
        content: `Lieu de coordination alternatif :\n${cfg.coordinationLocation || 'À définir'}\n\nPont téléphonique d'urgence :\n${cfg.emergencyBridge || 'À définir'}\n\nNote : Se prédéterminer les points de rassemblement, le lieu de coordination et le pont téléphonique facilite la mobilisation lors d'un incident réel.`,
      },
      {
        id: 'm7_s3',
        title: 'Lien avec le PMU/PSI',
        content: cfg.linkedPmuId
          ? `Ce PCA est lié à un Plan de mesures d'urgence (PMU/PSI) existant pour ce bâtiment. Les procédures d'évacuation et d'intervention immédiate sont couvertes par ce plan.\n\nRéférence PMU/PSI : Voir le document lié dans le système CORO.`
          : 'Aucun PMU/PSI lié pour ce bâtiment. Il est recommandé de créer un PMU ou PSI complémentaire qui couvrira les procédures d\'évacuation et d\'intervention immédiate.',
      },
      {
        id: 'm7_s4',
        title: 'Séquence de reprise des activités',
        content: criticalServices.length > 0
          ? `Ordre de priorité de reprise basé sur le BIA :\n\n${criticalServices
              .sort((a: any, b: any) => {
                const rtoOrder: Record<string, number> = { '1h': 1, '4h': 2, '8h': 3, '24h': 4, '48h': 5, '72h': 6, '1sem': 7, 'plus': 8 };
                return (rtoOrder[a.rto] || 9) - (rtoOrder[b.rto] || 9);
              })
              .map((s: any, i: number) => `${i + 1}. ${s.name} (RTO : ${s.rto || 'Non défini'})`)
              .join('\n')}`
          : 'La séquence de reprise sera définie une fois le BIA complété (Section 4).',
      },
    ],
  };

  const m7en = {
    moduleNumber: 7,
    title: 'ACTIVATION AND RECOVERY PROCEDURES',
    language: 'en',
    sections: [
      {
        id: 'm7_s1',
        title: 'BCP activation criteria',
        content: cfg.activationCriteria || 'To be documented — Define the precise criteria that trigger BCP activation, including: who can decide to activate, under what circumstances, and according to what notification process.',
      },
      {
        id: 'm7_s2',
        title: 'Coordination location and conference bridge',
        content: `Alternative coordination location:\n${cfg.coordinationLocation || 'To be defined'}\n\nEmergency conference bridge:\n${cfg.emergencyBridge || 'To be defined'}`,
      },
      {
        id: 'm7_s3',
        title: 'Link with ERP/FSP',
        content: cfg.linkedPmuId
          ? `This BCP is linked to an existing Emergency Response Plan (ERP/FSP) for this building. Evacuation and immediate response procedures are covered by that plan.`
          : 'No ERP/FSP linked for this building. It is recommended to create a complementary ERP or FSP.',
      },
      {
        id: 'm7_s4',
        title: 'Activity recovery sequence',
        content: criticalServices.length > 0
          ? `Recovery priority order based on BIA:\n\n${criticalServices
              .sort((a: any, b: any) => {
                const rtoOrder: Record<string, number> = { '1h': 1, '4h': 2, '8h': 3, '24h': 4, '48h': 5, '72h': 6, '1sem': 7, 'plus': 8 };
                return (rtoOrder[a.rto] || 9) - (rtoOrder[b.rto] || 9);
              })
              .map((s: any, i: number) => `${i + 1}. ${s.name} (RTO: ${s.rto || 'Not defined'})`)
              .join('\n')}`
          : 'Recovery sequence will be defined once the BIA is completed (Section 4).',
      },
    ],
  };

  // ── MODULE 8 — Exercices et registres ──
  const exerciseProgramFR = [
    { type: 'Exercice formatif / discussion', freq: cfg.exerciseFormative || 'Annuel', desc: 'Parcourir le plan avec les intervenants pour identifier les lacunes' },
    { type: 'Exercice sur table', freq: cfg.exerciseTable || 'Annuel', desc: 'Simulation scénario en salle — vérifier les rôles et interrelations' },
    { type: 'Simulation en temps réel', freq: cfg.exerciseSimulation || 'Tous les 3 ans', desc: 'Exercice complet avec déploiement de ressources sur le terrain' },
    { type: 'Tests TI / essais techniques', freq: cfg.exerciseIT || 'Annuel', desc: 'Valider la restauration des systèmes et les délais de reprise' },
  ].map(e => `• ${e.type} : ${e.freq}\n  ${e.desc}`).join('\n\n');

  const m8fr = {
    moduleNumber: 8,
    title: 'EXERCICES, REGISTRES ET MAINTIEN DU PLAN',
    language: 'fr',
    sections: [
      {
        id: 'm8_s1',
        title: 'Programme d\'exercices',
        content: `Conformément aux recommandations du Guide de gestion de la continuité des activités du gouvernement du Québec :\n\n${exerciseProgramFR}\n\n⚠️ La capacité d'une entreprise à maintenir ses activités ne peut être démontrée tant que son plan de continuité des activités n'a pas été exercé.`,
      },
      {
        id: 'm8_s2',
        title: 'Responsable de la mise à jour',
        content: `Responsable du plan : ${cfg.planOwner || 'À désigner'}\nFréquence de révision : ${cfg.reviewFrequency || 'Annuel'}\nProchaine révision prévue : ${cfg.nextReviewDate ? new Date(cfg.nextReviewDate).toLocaleDateString('fr-CA') : 'À planifier'}`,
      },
      {
        id: 'm8_s3',
        title: 'Programme de mise à jour',
        content: `Composantes du programme de continuité et cycles de révision recommandés :\n\n• Bilan d'impact sur les activités (BIA) : Annuel ou lors de changements significatifs\n• Appréciation du risque : Lors de changements significatifs\n• Stratégies de continuité : Annuel ou lors de changements significatifs\n• Rôles et responsabilités : Annuel\n• Coordonnées des membres : Lors de changements\n• Processus d'alerte et mobilisation : Annuel\n• Programme d'exercices : Annuel`,
      },
      {
        id: 'm8_s4',
        title: 'Registre des exercices',
        content: 'Date | Type d\'exercice | Participants | Résultats | Améliorations identifiées\n\n[Registre à compléter lors de chaque exercice réalisé]',
      },
      {
        id: 'm8_s5',
        title: 'Registre des incidents',
        content: 'Date | Description de l\'incident | Activation du PCA (Oui/Non) | Actions entreprises | Leçons apprises\n\n[Registre à compléter lors de chaque incident ou activation du PCA]',
      },
    ],
  };

  const m8en = {
    moduleNumber: 8,
    title: 'EXERCISES, RECORDS AND PLAN MAINTENANCE',
    language: 'en',
    sections: [
      {
        id: 'm8_s1',
        title: 'Exercise program',
        content: `Exercise program:\n\n• Discussion/tabletop exercise: ${cfg.exerciseFormative || 'Annual'}\n• Tabletop exercise: ${cfg.exerciseTable || 'Annual'}\n• Full simulation: ${cfg.exerciseSimulation || 'Every 3 years'}\n• IT/technical tests: ${cfg.exerciseIT || 'Annual'}`,
      },
      {
        id: 'm8_s2',
        title: 'Plan owner and review schedule',
        content: `Plan owner: ${cfg.planOwner || 'To be designated'}\nReview frequency: ${cfg.reviewFrequency || 'Annual'}\nNext scheduled review: ${cfg.nextReviewDate ? new Date(cfg.nextReviewDate).toLocaleDateString('en-CA') : 'To be scheduled'}`,
      },
      {
        id: 'm8_s3',
        title: 'Update program',
        content: `BCP components and recommended review cycles:\n\n• Business Impact Analysis (BIA): Annual or upon significant changes\n• Risk assessment: Upon significant changes\n• Continuity strategies: Annual or upon significant changes\n• Roles and responsibilities: Annual\n• Contact lists: As needed\n• Exercise program: Annual`,
      },
      {
        id: 'm8_s4',
        title: 'Exercise log',
        content: 'Date | Exercise type | Participants | Results | Improvements identified\n\n[Log to be completed after each exercise]',
      },
      {
        id: 'm8_s5',
        title: 'Incident log',
        content: 'Date | Incident description | BCP activated (Yes/No) | Actions taken | Lessons learned\n\n[Log to be completed after each incident or BCP activation]',
      },
    ],
  };

  return {
    fr: [m1fr, m2fr, m3fr, m4fr, m5fr, m6fr, m7fr, m8fr],
    en: [m1en, m2en, m3en, m4en, m5en, m6en, m7en, m8en],
  };
}