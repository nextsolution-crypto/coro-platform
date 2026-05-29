import { ClientsService } from './clients.service';
export declare class ClientsController {
    private clientsService;
    constructor(clientsService: ClientsService);
    findAll(): Promise<({
        _count: {
            projects: number;
            buildings: number;
        };
    } & {
        id: string;
        email: string | null;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        phone: string | null;
        address: string | null;
        city: string | null;
        province: string | null;
    })[]>;
    findOne(id: string): Promise<({
        projects: {
            id: string;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            year: number;
            clientId: string;
            documentType: import("@prisma/client").$Enums.DocumentType;
            status: import("@prisma/client").$Enums.ProjectStatus;
            progress: number;
            buildingId: string;
            userId: string;
        }[];
        buildings: {
            id: string;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            address: string;
            city: string;
            province: string;
            postalCode: string | null;
            floors: number | null;
            units: number | null;
            buildingType: string | null;
            clientId: string;
        }[];
    } & {
        id: string;
        email: string | null;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        phone: string | null;
        address: string | null;
        city: string | null;
        province: string | null;
    }) | null>;
    create(body: any): Promise<{
        id: string;
        email: string | null;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        phone: string | null;
        address: string | null;
        city: string | null;
        province: string | null;
    }>;
    update(id: string, body: any): Promise<{
        id: string;
        email: string | null;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        phone: string | null;
        address: string | null;
        city: string | null;
        province: string | null;
    }>;
    remove(id: string): Promise<{
        id: string;
        email: string | null;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        phone: string | null;
        address: string | null;
        city: string | null;
        province: string | null;
    }>;
}
