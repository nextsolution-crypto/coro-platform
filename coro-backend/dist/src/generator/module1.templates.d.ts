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
    buildingType: string;
    has_sprinklers?: boolean;
    has_generator?: boolean;
    has_elevators?: boolean;
    has_hazardous_materials?: boolean;
}
export declare function generateModule1(ctx: DocumentContext): any;
