import { BuildingsService } from './buildings.service';
export declare class BuildingsController {
    private buildingsService;
    constructor(buildingsService: BuildingsService);
    findAll(clientId?: string): Promise<({
        client: {
            id: string;
            name: string;
        };
        _count: {
            projects: number;
        };
    } & {
        id: string;
        name: string;
        address: string;
        city: string;
        province: string;
        postalCode: string | null;
        floors: number | null;
        units: number | null;
        buildingType: string | null;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        clientId: string;
    })[]>;
    findOne(id: string): Promise<({
        client: {
            id: string;
            name: string;
            address: string | null;
            city: string | null;
            province: string | null;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            email: string | null;
            phone: string | null;
        };
        projects: {
            id: string;
            name: string;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            clientId: string;
            documentType: import("@prisma/client").$Enums.DocumentType;
            status: import("@prisma/client").$Enums.ProjectStatus;
            year: number;
            progress: number;
            buildingId: string;
            userId: string;
        }[];
    } & {
        id: string;
        name: string;
        address: string;
        city: string;
        province: string;
        postalCode: string | null;
        floors: number | null;
        units: number | null;
        buildingType: string | null;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        clientId: string;
    }) | null>;
    create(body: any): Promise<{
        id: string;
        name: string;
        address: string;
        city: string;
        province: string;
        postalCode: string | null;
        floors: number | null;
        units: number | null;
        buildingType: string | null;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        clientId: string;
    }>;
    update(id: string, body: any): Promise<{
        id: string;
        name: string;
        address: string;
        city: string;
        province: string;
        postalCode: string | null;
        floors: number | null;
        units: number | null;
        buildingType: string | null;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        clientId: string;
    }>;
    remove(id: string): Promise<{
        id: string;
        name: string;
        address: string;
        city: string;
        province: string;
        postalCode: string | null;
        floors: number | null;
        units: number | null;
        buildingType: string | null;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        clientId: string;
    }>;
}
