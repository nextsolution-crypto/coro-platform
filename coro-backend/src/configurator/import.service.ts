import { Injectable } from '@nestjs/common';
import * as mammoth from 'mammoth';

@Injectable()
export class ImportService {

  async extractTextFromDocx(base64: string): Promise<string> {
    const cleaned = base64.includes(',') ? base64.split(',')[1] : base64;
    const buffer = Buffer.from(cleaned, 'base64');
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  private extractRelevantSections(text: string): string {
    const sections: string[] = [];

    // Fonction pour trouver la Nième occurrence
    const findNthOccurrence = (str: string, pattern: RegExp, nth: number): number => {
      let count = 0;
      let pos = 0;
      const globalPattern = new RegExp(pattern.source, 'gi');
      let match;
      while ((match = globalPattern.exec(str)) !== null) {
        count++;
        if (count === nth) return match.index;
        pos = match.index + 1;
      }
      return -1;
    };

    // Section 7 - cherche la 2ème occurrence (première = table des matières)
    const section7Patterns = [
      /DESCRIPTION DU SITE/i,
      /DESCRIPTION\s+G[ÉE]N[ÉE]RALE/i,
      /7\.1\s+DESCRIPTION/i,
    ];

    const section8Patterns = [
      /REGISTRES\s*[&ET]+\s*ANNEXES/i,
      /8\.1\s+REGISTRE/i,
      /8\s+REGISTRES/i,
    ];

    const section1Patterns = [
      /1\.\s*INTRODUCTION/i,
      /1\.1\s+OBJET/i,
    ];

    let section1Start = -1;
    let section7Start = -1;
    let section8Start = -1;

    // Section 1 - 2ème occurrence
    for (const p of section1Patterns) {
      const idx = findNthOccurrence(text, p, 2);
      if (idx !== -1) { section1Start = idx; break; }
      // Fallback sur 1ère occurrence si pas de 2ème
      const idx1 = text.search(p);
      if (idx1 !== -1) { section1Start = idx1; break; }
    }

    // Section 7 - 2ème occurrence
    for (const p of section7Patterns) {
      const idx = findNthOccurrence(text, p, 2);
      if (idx !== -1) { section7Start = idx; break; }
    }

    // Section 8 - 2ème occurrence
    for (const p of section8Patterns) {
      const idx = findNthOccurrence(text, p, 2);
      if (idx !== -1 && idx > section7Start) { section8Start = idx; break; }
    }

    console.log('Section 1 position (2e occ):', section1Start);
    console.log('Section 7 position (2e occ):', section7Start);
    console.log('Section 8 position (2e occ):', section8Start);

    // Section 1
    if (section1Start !== -1) {
      const end = section7Start !== -1 ? Math.min(section1Start + 8000, section7Start) : section1Start + 8000;
      sections.push(text.substring(section1Start, end));
    }

    // Section 7
    if (section7Start !== -1) {
      const end = section8Start !== -1 ? section8Start : section7Start + 20000;
      sections.push(text.substring(section7Start, end));
    }

    const result = sections.join('\n\n--- SECTION SUIVANTE ---\n\n');
    console.log('Sections extraites - longueur:', result.length);

    if (result.length < 500) {
      console.log('Fallback - envoi texte complet tronqué');
      return text.substring(0, 40000);
    }

    return result;
  }

  async analyzeWithClaude(text: string): Promise<Record<string, any>> {
    const prompt = `Tu es un expert en mesures d'urgence. Analyse ce document PMU/PSI et extrait les informations pour pré-remplir un configurateur de bâtiment.

Retourne UNIQUEMENT un objet JSON valide sans aucun texte avant ou après, avec EXACTEMENT les clés suivantes si l'information est trouvée dans le document. N'inclus que les champs pour lesquels tu as trouvé une information claire. Omets les champs inconnus.

{
  "province": "Quebec|Ontario|Alberta",
  "ville": "string",
  "responsableNom": "string",
  "responsableTitre": "string",
  "buildingType": "Tour a bureaux|Immeuble residentiel|Industriel|Commercial|Institutionnel|Hotel|Centre commercial|Autre",
  "usagePrincipal": "A1 - Etablissements de reunion - Spectacle|A2 - Etablissements de reunion - Education, culte, divertissement, restauration|A3 - Etablissements de reunion de type arena|A4 - Etablissements de reunion en plein air|B1 - Etablissements de soins ou de detention avec soins|B2 - Etablissements de soins ou de detention sans soins|B3 - Etablissements de detention|C - Habitations|D - Etablissements d affaires|E - Etablissements commerciaux|F1 - Etablissements industriels a risques eleves|F2 - Etablissements industriels a risques moyens|F3 - Etablissements industriels a risques faibles",
  "usageSecondaire": "Aucun|A1 - Etablissements de reunion - Spectacle|A2 - Etablissements de reunion - Education, culte, divertissement, restauration|A3 - Etablissements de reunion de type arena|A4 - Etablissements de reunion en plein air|B1 - Etablissements de detention|B2 - Etablissements de traitement|B3 - Etablissements de soins|C - Etablissements d habitation|D - Etablissements d affaires|E - Etablissements commerciaux|F1 - Etablissement industriel a risques tres eleves|F2 - Etablissement industriel a risques moyens|F3 - Etablissement industriel a risques faibles",
  "floors": number,
  "basements": number,
  "superficie": number,
  "anneeConstruction": "string",
  "derniereRenovation": "string",
  "typeConstructionEtages": "Combustible|Incombustible|Mixte",
  "typeConstructionToit": "Combustible|Incombustible|Mixte",
  "hauteurBatiment": true|false,
  "multiLocataires": true|false,
  "nbLocataires": number,
  "lieuSommeil": true|false,
  "securite24h": true|false,
  "agentSecurite": true|false,
  "posteSurveillance": true|false,
  "controleAcces": true|false,
  "cameras": true|false,
  "personnelHandicap": true|false,
  "posteCommandement": "string",
  "pointRassemblement": "string",
  "pointRassemblement2": "string",
  "lieuDocument": "string",
  "trousseClesPompier": true|false,
  "trousseClesPompierLieu": "string",
  "boiteClePompier": "string",
  "panneauAlarme": true|false,
  "panneauType": "SIMPLE|DOUBLE|AUCUN",
  "panneauTechno": "Adressable|Zone|Hybride",
  "panneauMarque": "string",
  "panneauModele": "string",
  "panneauLocalisation": "string",
  "panneauAnnonciateurDistance": true|false,
  "panneauAnnonciateurLieu": "string",
  "teleSurveillance": true|false,
  "centraleSurveillance": "string",
  "centraleTelephone": "string",
  "telephonePompier": true|false,
  "stationManuelle": true|false,
  "detecteurFumee": true|false,
  "detecteurChaleur": true|false,
  "detecteurDebitGicleurs": true|false,
  "rappelAscenseurs": true|false,
  "arretVentilation": true|false,
  "desenfumageAutomatique": true|false,
  "deverrouillagePorces": true|false,
  "fermeturePortesCoupeFeu": true|false,
  "systemePhonic": true|false,
  "radiosCommunication": true|false,
  "nbRadios": number,
  "gicleurs": true|false,
  "salleGicleurs": "string",
  "pompeIncendie": true|false,
  "pompeIncendieLieu": "string",
  "gapmUsgpm": "string",
  "boyauIncendie": true|false,
  "raccordPompier": true|false,
  "raccordPompierLieu": "string",
  "bornesFontaine": true|false,
  "bornesFontaineLieu": "string",
  "vannesIsolement": true|false,
  "vannesIsolementLieu": "string",
  "extincteurPortatif": true|false,
  "ascenseurs": true|false,
  "nbAscenseurs": number,
  "typeAscenseur": "Hydraulique|Cable (traction)|MRL (sans salle machines)|Monte-charge|Mixte",
  "salleAscenseur": "string",
  "ascenseurPompier": true|false,
  "escaliersPressurises": true|false,
  "nbEscaliers": number,
  "toitVerrouille": true|false,
  "accesToit": "string",
  "separationCoupeFeu": true|false,
  "separationCoupeFeuLieu": "string",
  "compacteur": true|false,
  "chuteADechets": true|false,
  "cvac": true|false,
  "cvacLocalisation": "string",
  "typeChautfage": "Gaz naturel|Electrique|Mazout|Vapeur|Geothermique|Autre",
  "typeRefroidissement": "Central|Unitaire|VRF/VRV|Autre|Aucun",
  "desenfumage": true|false,
  "salleElectrique": "string",
  "generatrice": true|false,
  "generatriceLieu": "string",
  "generatriceCarburant": "Diesel|Gaz naturel|Propane|Essence|Autre",
  "autonomieGeneratrice": number,
  "capaciteReservoir": number,
  "gazNaturel": true|false,
  "gazNaturelLieu": "string",
  "propane": true|false,
  "propaneLieu": "string",
  "detecteurCO": true|false,
  "detecteurCOSeuil1": number,
  "detecteurCOSeuil2": number,
  "detecteurGazNaturel": true|false,
  "detecteurAmmoniac": true|false,
  "detecteurAmmoniacSeuil1": number,
  "detecteurAmmoniacSeuil2": number,
  "matieresDangereuses": true|false,
  "ammoniac": true|false,
  "batteriesLithium": true|false,
  "trousseDeversement": true|false,
  "palettierPresent": true|false,
  "palettierGicleurs": "Giclé|Non giclé|Partiel",
  "chariotsPresent": true|false,
  "chariotsNombre": "string",
  "chariotsType": "Lithium|Propane|Diesel|Essence|Combustion|Mixte (lithium + combustion)|Electrique",
  "chariotsEmplacementRecharge": "string",
  "batteriesLithiumPresent": true|false,
  "certBOMA": true|false,
  "certLEED": true|false,
  "gicleursSystemes": [
    { "type": "Sous eau|Sous air|Sous mousse|Deluge|Pre-action", "lieu": "string", "complet": true }
  ],
  "extincteursList": [
    { "type": "ABC|BC|CO2|Eau|Autre", "lieu": "string" }
  ],
  "matieresList": [
    { "nom": "string", "numeroUN": "string", "quantiteEmplacement": "string", "tmd": true, "simdut": true }
  ],
  "equipementsSoins": [
    { "type": "Trousse de premiers soins|DEA|Douche oculaire|Douche corporelle|Masque respiratoire|Infirmerie|Autre", "lieu": "string", "quantite": 1 }
  ],
  "trousseDeversementListe": [
    { "lieu": "string" }
  ],
  "quartsOccupation": [
    { "nomQuart": "Jour|Soir|Nuit", "heureDebut": "string", "heureFin": "string", "occupantsSemaine": 0, "occupantsSamedi": 0, "occupantsDimanche": 0 }
  ]
  "historiqueList": [
    { "date": "YYYY-MM-DD", "type": "Création initiale|Mise à jour mineure|Mise à jour majeure|Révision annuelle|Mise à jour complète", "responsable": "string" }
  ]
}

IMPORTANT : Pour les champs de type liste (gicleursSystemes, extincteursList, matieresList, equipementsSoins, trousseDeversementListe, quartsOccupation), retourne un tableau d'objets même s'il n'y a qu'un seul élément. Si l'information n'est pas trouvée, omets le champ entièrement.

Document à analyser :
${this.extractRelevantSections(text)}`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY || '',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 4000,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    const data = await response.json() as any;
    const content = data.content?.[0]?.text || '{}';

    try {
      const cleaned = content.replace(/```json|```/g, '').trim();
      return JSON.parse(cleaned);
    } catch {
      return {};
    }
  }

  async importDocument(base64: string): Promise<{ config: Record<string, any>; fieldsFound: number; text: string }> {
    const text = await this.extractTextFromDocx(base64);
    const config = await this.analyzeWithClaude(text);
    const fieldsFound = Object.keys(config).length;
    return { config, fieldsFound, text: text.substring(0, 500) };
  }
}