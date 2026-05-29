import { PrismaService } from '../prisma/prisma.service';
export declare class ClientsService {
    private prisma;
    constructor(prisma: PrismaService);
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
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
    }) | null>;
    create(data: {
        name: string;
        email?: string;
        phone?: string;
        address?: string;
        city?: string;
        province?: string;
    }): Promise<{
        id: string;
        name: string;
        email: string | null;
        phone: string | null;
        address: string | null;
        city: string | null;
        province: string | null;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
    }>;
    update(id: string, data: any): Promise<{
        id: string;
        name: string;
        email: string | null;
        phone: string | null;
        address: string | null;
        city: string | null;
        province: string | null;
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
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
    }>;
}
