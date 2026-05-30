import { ClientsService } from './clients.service';
export declare class ClientsController {
    private clientsService;
    constructor(clientsService: ClientsService);
    findAll(): Promise<({
        _count: {
            buildings: number;
            projects: number;
        };
    } & {
        id: string;
        name: string;
        email: string | null;
        phone: string | null;
        address: string | null;
        city: string | null;
        province: string | null;
        logoUrl: string | null;
        logoBase64: string | null;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
    })[]>;
    findOne(id: string): Promise<({
        buildings: {
            id: string;
            name: string;
            address: string;
            city: string;
            province: string;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            postalCode: string | null;
            floors: number | null;
            units: number | null;
            buildingType: string | null;
            clientId: string;
        }[];
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
        email: string | null;
        phone: string | null;
        address: string | null;
        city: string | null;
        province: string | null;
        logoUrl: string | null;
        logoBase64: string | null;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
    }) | null>;
    create(body: any): Promise<{
        id: string;
        name: string;
        email: string | null;
        phone: string | null;
        address: string | null;
        city: string | null;
        province: string | null;
        logoUrl: string | null;
        logoBase64: string | null;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
    }>;
    update(id: string, body: any): Promise<{
        id: string;
        name: string;
        email: string | null;
        phone: string | null;
        address: string | null;
        city: string | null;
        province: string | null;
        logoUrl: string | null;
        logoBase64: string | null;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
    }>;
    uploadLogo(id: string, body: {
        logoBase64: string;
    }): Promise<{
        id: string;
        name: string;
        email: string | null;
        phone: string | null;
        address: string | null;
        city: string | null;
        province: string | null;
        logoUrl: string | null;
        logoBase64: string | null;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
    }>;
    remove(id: string): Promise<{
        id: string;
        name: string;
        email: string | null;
        phone: string | null;
        address: string | null;
        city: string | null;
        province: string | null;
        logoUrl: string | null;
        logoBase64: string | null;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
    }>;
}
