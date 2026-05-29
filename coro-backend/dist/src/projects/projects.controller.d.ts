import { ProjectsService } from './projects.service';
export declare class ProjectsController {
    private projectsService;
    constructor(projectsService: ProjectsService);
    findAll(): Promise<({
        user: {
            id: string;
            firstName: string;
            lastName: string;
        };
        client: {
            id: string;
            name: string;
        };
        building: {
            id: string;
            name: string;
            address: string;
        };
        _count: {
            documents: number;
        };
    } & {
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
    })[]>;
    findOne(id: string): Promise<({
        user: {
            role: import("@prisma/client").$Enums.UserRole;
            id: string;
            email: string;
            password: string;
            firstName: string;
            lastName: string;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
        };
        client: {
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
        };
        building: {
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
        };
        documents: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            status: import("@prisma/client").$Enums.DocumentStatus;
            title: string;
            content: import("@prisma/client/runtime/library").JsonValue | null;
            version: number;
            projectId: string;
        }[];
    } & {
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
    }) | null>;
    create(body: any, req: any): Promise<{
        client: {
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
        };
        building: {
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
        };
    } & {
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
    }>;
    update(id: string, body: any): Promise<{
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
    }>;
    remove(id: string): Promise<{
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
    }>;
}
