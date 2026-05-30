export interface DocumentContext {
    clientName: string;
    buildingName: string;
    buildingAddress: string;
    city: string;
    province: string;
    year: number;
    documentType: string;
    responsableNom: string;
    responsableTitre: string;
    dateReleve: string;
    floors: number;
    hauteurBatiment: boolean;
    multiLocataires: boolean;
    companyName: string;
}
export declare function generateModule1(ctx: DocumentContext): any;
