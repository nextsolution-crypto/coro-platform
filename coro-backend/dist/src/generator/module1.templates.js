"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateModule1 = generateModule1;
const REFERENCES = {
    Quebec: {
        code: 'Code national de prevention des incendies – Canada 2010, incorpore au Chapitre VIII du Code de securite du Quebec (RLRQ, c. B-1.1, r. 3)',
        article: 'section 2.8',
        description: 'Code de securite du Quebec (RLRQ, c. B-1.1, r. 3)',
        articleFormation: 'article 2.8.2.1 (3) du CNPI 2010 modifie',
        articleExercice: 'article 2.8.3.2 du Code national de prevention des incendies – Canada 2010, incorpore au Chapitre VIII du Code de securite du Quebec',
        articleRevision: 'article 2.8.2.1 (4) du Code national de prevention des incendies – Canada 2010',
        exerciceStandard: 'au moins une fois par annee',
        exerciceBGH: 'au moins deux fois par annee',
    },
    Ontario: {
        code: 'Ontario Fire Code (O. Reg. 213/07) sous la Loi sur la prevention et la protection contre l incendie, 1997 (FPPA)',
        article: 'Division B, Section 2.8',
        description: 'Ontario Fire Code (O. Reg. 213/07)',
        articleFormation: 'Division B, Section 2.8 du Ontario Fire Code (O. Reg. 213/07)',
        articleExercice: 'Division B, Section 2.8 du Ontario Fire Code (O. Reg. 213/07)',
        articleRevision: 'Division B, Section 2.8 du Ontario Fire Code (O. Reg. 213/07)',
        exerciceStandard: 'au moins une fois par annee',
        exerciceBGH: 'aux trois mois (minimum 4 fois par annee)',
    },
    Alberta: {
        code: 'National Fire Code – 2023 Alberta Edition (NFC(AE))',
        article: 'Section 2.8',
        description: 'National Fire Code – 2023 Alberta Edition (NFC(AE)) sous la Safety Codes Act',
        articleFormation: 'article 2.8.2.1 (3) du NFC(AE)',
        articleExercice: 'article 2.8.3.1 du National Fire Code – 2023 Alberta Edition (NFC(AE))',
        articleRevision: 'article 2.8.2.1 (4) du NFC(AE)',
        exerciceStandard: 'au moins une fois par annee (intervalles max 12 mois)',
        exerciceBGH: 'aux deux mois (minimum 6 fois par annee)',
    },
};
function generateModule1(ctx) {
    const ref = REFERENCES[ctx.province] || REFERENCES['Quebec'];
    const exerciceFrequence = ctx.hauteurBatiment
        ? ref.exerciceBGH
        : ref.exerciceStandard;
    return {
        moduleNumber: 1,
        title: 'INTRODUCTION',
        sections: [
            {
                id: '1.1',
                title: 'OBJET ET PORTEE',
                content: `**Objet**

Ce plan de mesures d urgence (${ctx.documentType}) est elabore conformement a la ${ref.article} du ${ref.code}, ainsi qu aux reglements municipaux applicables.

Ses objectifs sont :
- D assurer la securite de toutes les personnes presentes sur le site, incluant les employes, visiteurs, fournisseurs et autres parties prenantes ;
- De proteger les biens materiels de l entreprise ;
- De permettre une reprise rapide et structuree des activites normales a la suite d une urgence.

Le present ${ctx.documentType} definit les procedures d intervention en cas d urgences telles que :
- Incendie ;
- Fuite de gaz ;
- Deversement de matieres dangereuses ;
- Bris de gicleurs ou autre systeme de protection ;
- Panne de courant ou d ascenseur ;
- Tout autre evenement necessitant une reaction coordonnee.

Il est mis a jour au moins une fois par annee, accompagne d un programme de formation continue et d exercices d evacuation planifies afin de maintenir un haut niveau de preparation operationnelle.

**Portee**

Ce plan s applique au site situe au ${ctx.buildingAddress}, exploite par ${ctx.clientName}, et couvre :
- L ensemble des occupants permanents ou temporaires ;
- Les visiteurs et sous-traitants presents sur les lieux ;
- Les equipements de securite incendie en place ;
- Les procedures operationnelles specifiques au batiment.

Il precise :
- Les roles et responsabilites des intervenants internes (coordonnateur d urgence, equipe d intervention, personnel de securite) ;
- Les procedures d evacuation, s il y a lieu, de confinement et de communication en situation d urgence ;
- Les mesures de gestion post-evenement (retour a la normale, bilan, communication).

Le plan est concu pour etre applique en collaboration avec :
- Les services d urgence locaux (incendie, police, services medicaux d urgence) ;
- Les responsables designes sur le site ;
- Les intervenants externes, partenaires ou locataires, afin d assurer une coordination efficace en cas d urgence.`,
            },
            {
                id: '1.2',
                title: 'RESPONSABILITE DU CONTENU',
                content: `**Responsable principal du plan**

La responsabilite de l elaboration, de la mise a jour annuelle, de la diffusion et de l application du present plan de mesures d urgence (${ctx.documentType}) revient au [${ctx.responsableTitre || 'Directeur de la securite'}] de ${ctx.clientName}.

Ce dernier s assure que le plan est :
- Conforme aux lois et reglements en vigueur, incluant la ${ref.article} du ${ref.code} ;
- Adapte aux particularites du site ;
- Valide periodiquement par le biais de formations, d exercices et de revues operationnelles.

Le releve technique a la base du present plan a ete effectue le : **${ctx.dateReleve || '[DATE DU RELEVE]'}**
Les informations contenues dans ce document refletent l etat du batiment a cette date.

**Responsabilites liees au plan de mesures d urgence**

Le [${ctx.responsableTitre || 'Directeur de la securite'}] ou son delegue doit :
- Mettre en oeuvre et actualiser le ${ctx.documentType} au moins une fois par annee, ou a la suite de toute modification significative du batiment ou de son occupation ;
- Conserver une copie physique du plan, facilement accessible a l entree du batiment tel que demande par le code applicable ;
- Designer un coordonnateur d urgence responsable des interventions initiales, de l evacuation et de la communication avec les services d urgence ;${ctx.multiLocataires ? '\n- Diffuser le guide du locataire ou les consignes pertinentes a chaque nouvelle occupation, demenagement ou modification de configuration.' : ''}

**Responsabilite du responsable du PMU**

Le responsable du plan de mesures d urgence est charge de :
- Organiser une seance d information annuelle pour les membres de l equipe d urgence${ctx.multiLocataires ? ' et les locataires' : ''} ;
- Informer et sensibiliser tous les occupants du batiment aux procedures d evacuation, s il y a lieu, de confinement, et a la securite incendie ;
- Coordonner un exercice d evacuation annuel, en produire un rapport d evaluation, et identifier les pistes d amelioration ;
- Maintenir un registre des personnes ayant besoin d assistance a l evacuation a jour et accessible ;
- Effectuer des inspections preventives regulieres dans les aires communes afin d identifier les non-conformites, les risques potentiels ou les comportements a corriger.

**Gestion technique des infrastructures et des equipements de securite**

Le responsable des operations ou de la gestion immobiliere doit :
- Afficher des plans d evacuation a jour a chaque etage, a proximite des ascenseurs ou sorties principales ;
- Veiller a ce que les issues de secours soient degagees, accessibles et dument identifiees en tout temps ;
- S assurer de la fonctionnalite et de l accessibilite des equipements de protection incendie (extincteurs, gicleurs, boyaux, detecteurs, etc.) ;
- Planifier et consigner toutes les inspections, tests et entretiens reglementaires, en conformite avec les normes applicables (notamment CAN/ULC-S536 et code applicable).

**Decharge de responsabilite**

${ctx.companyName} s engage a fournir a ses clients des services et conseils professionnels rigoureux, fondes sur les normes, lois et reglements applicables en matiere de securite incendie et de mesures d urgence, notamment ceux en vigueur dans la province de ${ctx.province}.

Les recommandations emises dans le present plan sont elaborees a partir :
- D un releve technique du batiment effectue a la date mentionnee ;
- Des informations fournies par le client lorsque ceux-ci ne sont pas verifiables par le conseiller ;
- Des meilleures pratiques de l industrie ;
- Des exigences reglementaires connues au moment de la redaction.

Cependant :
- L adoption, l interpretation et la mise en oeuvre des recommandations contenues dans ce document relevent exclusivement de la responsabilite du client.
- En cas de non-application partielle ou totale, ${ctx.companyName} degage toute responsabilite quant aux consequences pouvant en decouler (dommages materiels, blessures, pertes d exploitation, etc.).
- Le present document n a pas force de loi et ne se substitue ni aux reglements municipaux, ni aux exigences particulieres des services d incendie locaux, ni a toute decision de l autorite competente.

**Propriete intellectuelle**

Toute reproduction, adaptation, diffusion ou utilisation partielle ou integrale du plan sans l accord prealable et ecrit de ${ctx.companyName} est strictement interdite. Toute infraction pourra entrainer des sanctions civiles ou penales.`,
            },
            {
                id: '1.3',
                title: 'FORMATION ET FREQUENCE',
                content: `**Objectif**

L objectif des formations est d assurer que chaque membre de l equipe d urgence possede les connaissances, les reflexes et les competences operationnelles necessaires pour intervenir efficacement en situation d urgence, conformement au plan de mesures d urgence en vigueur.

La formation vise a :
- Clarifier les roles et responsabilites individuels ;
- Developper une maitrise des procedures d evacuation et d intervention ;
- Renforcer la gestion securitaire des occupants, notamment les personnes vulnerables ;
- Maintenir une culture de securite proactive au sein du batiment.

**Obligations reglementaires**

Conformement a l ${ref.articleFormation}, le personnel charge de la mise en oeuvre du plan de mesures d urgence doit recevoir une formation adequate et continue, adaptee aux specificites du batiment et aux procedures en place.

**Contenu de la formation**

La formation comprend les sujets suivants :
- Procedures d evacuation propres au batiment et aux divers etages ;
- Utilisation des equipements de protection incendie : extincteurs, stations manuelles d alarme incendie, panneaux d alarme incendie a simple ou double etape ;
- Protocoles de communication et coordination : chaine de commandement, interaction avec les services d urgence ;
- Support aux personnes ayant besoin d assistance a l evacuation ou vulnerables ;
- Consignes generales a transmettre aux occupants en situation d urgence ;
- Risques specifiques lies a l occupation des lieux : locaux techniques, matieres dangereuses, etc.

**Methodes pedagogiques**

La formation est assuree selon une combinaison des approches suivantes :
- Sessions dirigees par un intervenant interne ou un formateur externe accredite ;
- Supports pedagogiques numeriques ou imprimes : manuels, videos explicatives, fiches de procedure ;
- Exercices pratiques : simulation d evacuation, deploiement de l equipe d urgence, manipulation d equipements.

**Frequence des formations**

| Moment | Type de formation | Obligation |
|---|---|---|
| A l entree en fonction | Formation initiale | Obligatoire pour tout nouveau membre de l equipe d urgence |
| Chaque annee | Formation de maintien des competences | Obligatoire pour tous les membres actifs |
| Deux fois par an | Exercices pratiques (evacuation, simulations) | Recommande pour renforcer l application des connaissances |
| En tout temps | Formation specifique | Recommandee si un employe a besoin de plus de support |

**Suivi et tracabilite**

- Une feuille de presence est signee a chaque session de formation ;
- Les donnees sont inscrites dans le Registre de formation du ${ctx.documentType} ;
- Des evaluations ou mises en situation peuvent etre utilisees pour valider les acquis ;
- Le coordonnateur d urgence est responsable de s assurer que la frequence et la qualite des formations respectent les exigences du present plan.`,
            },
            {
                id: '1.4',
                title: 'EXERCICE D EVACUATION',
                content: `Conformement a l ${ref.articleExercice}, un exercice d evacuation doit etre realise ${exerciceFrequence} dans tout batiment assujetti a un plan de mesures d urgence${ctx.hauteurBatiment ? '. Ce batiment etant un batiment a grande hauteur (BGH), la frequence minimale est augmentee conformement au code applicable' : ''}.

**1.4.1 Planification et execution**

- L exercice annuel est planifie a l avance par le coordonnateur d urgence, en collaboration avec l equipe d intervention et les services de securite du batiment.
- Chaque exercice vise a valider les procedures, evaluer les comportements et identifier les ecarts ou lacunes operationnelles.
- Il doit integrer les enseignements des exercices precedents et etre adapte a la realite du batiment (occupation, configuration, horaires, zones a risque, construction en cours etc.).

**1.4.2 Observation et evaluation**

Des observateurs designes (membres de l equipe de gestion) sont mandates pour evaluer :
- La reactivite des occupants ;
- Le respect des itineraires et points de rassemblement ;
- La clarte des messages diffuses ;
- Le temps d evacuation global.

Les observations sont consignees dans un rapport d evacuation structure, a l aide du gabarit standardise disponible a la section Registres et Annexes du present document.

**1.4.3 Objectifs des exercices**

Les exercices poursuivent les objectifs suivants :
- Familiarisation des occupants avec les consignes, les itineraires d evacuation et le point de rassemblement ;
- Identification des personnes necessitant une assistance (mobilite reduite, besoins particuliers) et mise a jour des registres ;
- Validation technique du systeme d alarme incendie et de l ensemble des dispositifs lies a l evacuation ;
- Developpement des reflexes d urgence chez les occupants et les intervenants ;
- Renforcement de la credibilite des procedures, afin de susciter une reponse serieuse et ordonnee en cas d evenement reel.

**1.4.4 Suivi post-exercice**

- Une seance de retour d experience (post-mortem) est organisee avec les parties prenantes (coordonnateur d urgence, observateurs, gestionnaires, securite, etc.) pour analyser les resultats et recommander des actions correctives.
- Le plan de mesures d urgence est mis a jour si necessaire, en fonction :
  - Des constats de l exercice ;
  - Des modifications a la configuration du site ;
  - Des changements dans l occupation des lieux (nouveaux locataires, zones reamenagees, etc.).
- Les rapports d exercice doivent etre conserves dans les registres du batiment pendant une periode minimale de deux ans, ou selon les exigences specifiques du service de securite incendie local.

**Procedure d exercice d evacuation**

PLANIFICATION DE L EXERCICE :
- Choisir un scenario pertinent (ex. incendie, fuite de gaz) ;
- Determiner les objectifs specifiques de l exercice ;
- Informer les services d urgence si leur presence est requise ;
- Aviser les occupants de la tenue d un exercice (sans divulguer tous les details pour maintenir le realisme).

PREPARATION DE L EXERCICE :
- S assurer que le ${ctx.documentType} est a jour et que le trousseau de cles pompier est disponible ;
- Preparer la cle du panneau incendie et les outils necessaires (tournevis, cles Allen) ;
- Informer la centrale d alarme pour eviter une mobilisation non intentionnelle des services d urgence.

DEROULEMENT DE L EXERCICE :
- Declencher l alarme via une station manuelle ou autre dispositif autorise ;
- Demarrer un chronometre des le declenchement ;
- Superviser l evacuation et la securite au point de rassemblement ;
- Arreter le chronometre lorsque tous les occupants sont rassembles ;
- Rearmer le panneau incendie, remettre en fonction les systemes (ascenseurs, ventilation) si necessaire ;
- Autoriser le retour ordonne dans le batiment.

APRES L EXERCICE :
- Confirmer a la centrale que l exercice est termine ;
- S assurer que la centrale a recu l information de l alarme dans un delai de 90 secondes suivant le declenchement ;
- Tenir un debriefing avec l equipe d evacuation et noter les points forts et axes d amelioration ;
- Completer le Rapport d evacuation (voir modele en annexe) ;
- Mettre a jour le ${ctx.documentType} si des modifications sont necessaires.

REGLES DE DOCUMENTATION :
Le Rapport d evacuation doit inclure :
- La date et l heure de l exercice ;
- Les objectifs vises ;
- Le scenario choisi ;
- Les temps d evacuation par zone ;
- Les problemes rencontres et solutions proposees.
Tous les rapports sont conserves minimum 24 mois dans la section Registres et Annexes du ${ctx.documentType}.`,
            },
            {
                id: '1.5',
                title: 'HISTORIQUE DES MISES A JOUR',
                content: `**1.5.1 Journal des modifications**

Ce plan de mesures d urgence (${ctx.documentType}) est un document evolutif qui doit etre revise au moins une fois tous les 12 mois, conformement a l ${ref.articleRevision} du ${ref.description}.

La responsabilite de cette revision incombe au [${ctx.responsableTitre || 'Directeur de la securite'}] ou a une personne designee. Les modifications sont consignees dans le tableau suivant, qui sert d historique officiel des mises a jour du document.

| Date | Description de la modification | Personne responsable |
|---|---|---|
| ${ctx.year}-01-01 | Creation initiale du document | ${ctx.responsableNom || '[NOM]'} |
| | | |
| | | |

**Revisions periodiques et declencheurs particuliers**

Outre la revision annuelle obligatoire, une mise a jour doit etre effectuee sans delai lorsque survient l un des evenements suivants :
- Une modification aux operations du batiment, aux amenagements ou a l occupation ;
- Un changement dans les systemes de securite, les equipements ou les fournisseurs ;
- Un incident (incendie, alarme declenchee, deversement, etc.), qu il soit fonde ou non fonde ;
- Un exercice d evacuation ou un retour d experience des occupants, de l equipe d urgence ou des services municipaux.

Ces mises a jour assurent que le ${ctx.documentType} demeure un outil actuel, operationnel et conforme, au service de la securite de tous les occupants.

**1.5.2 Decharge de responsabilite**

${ctx.companyName} – Clause de non-responsabilite

${ctx.companyName} s engage a fournir a ses clients des services et conseils professionnels rigoureux, fondes sur les normes, lois et reglements applicables en matiere de securite incendie et de mesures d urgence.

Les recommandations emises dans le present plan sont elaborees a partir :
- D un releve technique du batiment effectue a la date mentionnee ;
- Des informations fournies par le client lorsque ceux-ci ne sont pas verifiables par le conseiller ;
- Des meilleures pratiques de l industrie ;
- Des exigences reglementaires connues au moment de la redaction.

Cependant :
- L adoption, l interpretation et la mise en oeuvre des recommandations contenues dans ce document relevent exclusivement de la responsabilite du client.
- En cas de non-application partielle ou totale, ${ctx.companyName} degage toute responsabilite quant aux consequences pouvant en decouler.
- Le present document n a pas force de loi et ne se substitue ni aux reglements municipaux, ni aux exigences particulieres des services d incendie locaux.`,
            },
            {
                id: '1.6',
                title: 'DEFINITIONS ET TERMES',
                isEditable: true,
                content: `Les definitions suivantes visent a assurer une comprehension uniforme des termes employes dans le present plan de mesures d urgence. Elles sont classees par ordre alphabetique pour faciliter la consultation.

**Accompagnateur pour personne necessitant de l aide a l evacuation** : Membre designe charge d assister les personnes ayant des limitations fonctionnelles ou des besoins particuliers lors d une evacuation, en collaboration avec l equipe d evacuation, pour garantir un deplacement securitaire et adapte.

**Brigadier** : Membre de l equipe d urgence positionne a des points strategiques pour orienter les occupants vers le ou les points de rassemblement, assurant la fluidite des deplacements et la securite aux intersections.

**Chercheur** : Membre de l equipe d urgence designe pour verifier qu aucune personne ne demeure dans une zone determinee lors d une evacuation, tout en veillant a sa propre securite.

**Confinement** : Procedure consistant a demeurer a l interieur d une zone securisee du batiment en cas de menace externe (intemperies extremes, danger chimique, etc.), lorsque l evacuation n est pas securitaire.

**Coordonnateur d urgence** : Personne designee responsable de la gestion globale d une situation d urgence, supervisant la mise en oeuvre des procedures, la coordination avec les services d urgence et la mise a jour reguliere du ${ctx.documentType}.

**Elements de detection** : Composants d un systeme d alarme incendie concus pour identifier la presence de fumee, chaleur, flammes ou variation de debit des gicleurs.

**Equipements de premiers soins** : Trousse ou materiel medical destine a traiter immediatement une blessure ou une maladie soudaine, localise et signale pour un acces rapide.

**Equipe d urgence** : Groupe de personnes formees et designees pour appliquer les procedures prevues au ${ctx.documentType} lors d une urgence.

**Equipe de premiere intervention (EPI)** : Formee de 3 personnes minimum. Cette equipe est chargee d evaluer rapidement la situation des la detection d un incident, sans mettre en peril leur securite.

**Evacuation** : Deplacement organise et securitaire des occupants vers un lieu sur, conformement aux itineraires et protocoles definis dans le ${ctx.documentType}.

**Matieres dangereuses** : Substances presentant un danger pour la sante, la securite ou l environnement, classifiees selon le SIMDUT et/ou le TMD, avec indication de leur emplacement et de leur numero UN.

**Permis de travail a chaud** : Document autorisant temporairement des travaux produisant flammes, etincelles ou chaleur, delivre conformement aux normes de securite en vigueur.

**Plan de mesures d urgence (${ctx.documentType})** : Document officiel decrivant les procedures d urgence, les roles et responsabilites, ainsi que les moyens materiels et humains mis en oeuvre pour proteger les personnes et les biens en cas d urgence.

**Point de rassemblement** : Emplacement exterieur predefini ou les occupants se regroupent apres une evacuation, clairement indique et communique.

**Rapport d inspection des equipements de protection incendie** : Document consignant les resultats des verifications reglementaires des systemes incendie, incluant alarmes, gicleurs et autres dispositifs.

**Relais auxiliaires** : Dispositifs integres au systeme d alarme incendie declenchant des actions automatiques (arret de ventilation, rappel des ascenseurs, deverrouillage des portes, activation du desenfumage).

**Responsable de secteur** : Membre de l equipe d urgence assigne a la supervision de l evacuation d une zone precise, rapportant au coordonnateur d urgence.

**Responsable du point de rassemblement** : Membre de l equipe d urgence supervisant la securite et l organisation des occupants au point de rassemblement.

**Responsable mecanique du batiment** : Personne possedant une connaissance technique approfondie des systemes et infrastructures du batiment, fournissant un appui aux services d urgence.

**Signal d alarme incendie** : Signal sonore et/ou visuel declenche pour alerter d un incendie ou autre urgence necessitant l application des procedures d evacuation.

**Surveillant de sortie** : Membre de l equipe d urgence positionne a une sortie pour faciliter et securiser le passage des occupants.

**Systeme de desenfumage** : Installation mecanique ou naturelle permettant l extraction de fumee afin d ameliorer la visibilite et reduire les risques d inhalation toxique.

**Systeme de gicleurs et protection incendie** : Installation fixe d extinction automatique par eau, concue pour proteger tout ou partie du batiment.`,
            },
        ],
    };
}
//# sourceMappingURL=module1.templates.js.map