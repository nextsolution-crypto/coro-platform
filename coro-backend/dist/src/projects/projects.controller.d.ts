import { ProjectsService } from './projects.service';
export declare class ProjectsController {
    private projectsService;
    constructor(projectsService: ProjectsService);
    findAll(): Promise<({
        client: {
            id: string;
            name: string;
        };
        building: {
            id: string;
            name: string;
            address: string;
        };
        user: {
            id: string;
            firstName: string;
            lastName: string;
        };
        _count: {
            documents: number;
        };
    } & {
        id: string;
        name: string;
        documentType: import("@prisma/client").$Enums.DocumentType;
        status: import("@prisma/client").$Enums.ProjectStatus;
        year: number;
        progress: number;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        clientId: string;
        buildingId: string;
        userId: string;
    })[]>;
    findOne(id: string): Promise<({
        client: {
            id: string;
            name: string;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            email: string | null;
            phone: string | null;
            address: string | null;
            city: string | null;
            province: string | null;
        };
        building: {
            id: string;
            name: string;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            clientId: string;
            address: string;
            city: string;
            province: string;
            postalCode: string | null;
            floors: number | null;
            units: number | null;
            buildingType: string | null;
        };
        user: {
            id: string;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            email: string;
            password: string;
            firstName: string;
            lastName: string;
            role: import("@prisma/client").$Enums.UserRole;
        };
        documents: {
            id: string;
            status: import("@prisma/client").$Enums.DocumentStatus;
            createdAt: Date;
            updatedAt: Date;
            title: string;
            content: import("@prisma/client/runtime/library").JsonValue | null;
            version: number;
            projectId: string;
        }[];
    } & {
        id: string;
        name: string;
        documentType: import("@prisma/client").$Enums.DocumentType;
        status: import("@prisma/client").$Enums.ProjectStatus;
        year: number;
        progress: number;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        clientId: string;
        buildingId: string;
        userId: string;
    }) | null>;
    create(body: any, req: any): Promise<{
        client: {
            id: string;
            name: string;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            email: string | null;
            phone: string | null;
            address: string | null;
            city: string | null;
            province: string | null;
        };
        building: {
            id: string;
            name: string;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            clientId: string;
            address: string;
            city: string;
            province: string;
            postalCode: string | null;
            floors: number | null;
            units: number | null;
            buildingType: string | null;
        };
    } & {
        id: string;
        name: string;
        documentType: import("@prisma/client").$Enums.DocumentType;
        status: import("@prisma/client").$Enums.ProjectStatus;
        year: number;
        progress: number;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        clientId: string;
        buildingId: string;
        userId: string;
    }>;
    update(id: string, body: any): Promise<{
        id: string;
        name: string;
        documentType: import("@prisma/client").$Enums.DocumentType;
        status: import("@prisma/client").$Enums.ProjectStatus;
        year: number;
        progress: number;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        clientId: string;
        buildingId: string;
        userId: string;
    }>;
    remove(id: string): Promise<{
        id: string;
        name: string;
        documentType: import("@prisma/client").$Enums.DocumentType;
        status: import("@prisma/client").$Enums.ProjectStatus;
        year: number;
        progress: number;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        clientId: string;
        buildingId: string;
        userId: string;
    }>;
}
