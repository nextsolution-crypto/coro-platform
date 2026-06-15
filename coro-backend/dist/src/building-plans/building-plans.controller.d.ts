import { BuildingPlansService } from './building-plans.service';
export declare class BuildingPlansController {
    private readonly service;
    constructor(service: BuildingPlansService);
    findAll(projectId: string): Promise<{
        id: string;
        section: import("@prisma/client").$Enums.PlanSection;
        name: string;
        description: string | null;
        fileName: string;
        fileSize: number;
        emissionDate: string | null;
        revision: string | null;
        order: number;
        createdAt: Date;
        updatedAt: Date;
    }[]>;
    create(projectId: string, dto: any): Promise<{
        id: string;
        section: import("@prisma/client").$Enums.PlanSection;
        name: string;
        description: string | null;
        fileName: string;
        fileSize: number;
        emissionDate: string | null;
        revision: string | null;
        order: number;
        createdAt: Date;
        updatedAt: Date;
    }>;
    update(projectId: string, planId: string, dto: any): Promise<{
        id: string;
        section: import("@prisma/client").$Enums.PlanSection;
        name: string;
        description: string | null;
        fileName: string;
        fileSize: number;
        emissionDate: string | null;
        revision: string | null;
        order: number;
        createdAt: Date;
        updatedAt: Date;
    }>;
    remove(projectId: string, planId: string): Promise<void>;
    reorder(projectId: string, planId: string, dto: {
        order: number;
    }): Promise<{
        id: string;
        projectId: string;
        section: import("@prisma/client").$Enums.PlanSection;
        name: string;
        description: string | null;
        fileBase64: string;
        fileName: string;
        fileSize: number;
        emissionDate: string | null;
        revision: string | null;
        order: number;
        createdAt: Date;
        updatedAt: Date;
    }>;
}
