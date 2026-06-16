import { DocumentContext } from './module1.templates';
export interface TrainingEntry {
    nom: string;
    titre: string;
    date: string;
    formateur: string;
}
export interface PhoneticMessage {
    evenement: string;
    messageFR: string;
    messageEN: string;
}
export interface EvacuationReport {
    adresse: string;
    telephoneContact: string;
    dateEvenement: string;
    heure: string;
    coordonnateurUrgence: string;
    typeEvenement: string;
    cause: string;
    heureDeClenchement: string;
    deroulement: string;
    recommandation: string;
    tempsEvacuationComplete: string;
    signatureResponsable: string;
    dateSignature: string;
}
export interface RiskInspectionRow {
    equipement: string;
    codeNorme: string;
    article: string;
    observations: string;
}
export interface EvacuationSectorRow {
    etage: string;
    evacue: boolean;
    notes: string;
}
export declare function generateModule8(ctx: DocumentContext): any;
