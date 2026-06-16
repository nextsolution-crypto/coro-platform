import { BuildingPlansService } from './building-plans.service';
export declare class BuildingPlansController {
    private readonly service;
    constructor(service: BuildingPlansService);
    findAll(projectId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
        section: import("@prisma/client").$Enums.PlanSection;
        fileName: string;
        fileSize: number;
        emissionDate: string | null;
        revision: string | null;
        order: number;
    }[]>;
    create(projectId: string, dto: any): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
        section: import("@prisma/client").$Enums.PlanSection;
        fileName: string;
        fileSize: number;
        emissionDate: string | null;
        revision: string | null;
        order: number;
    }>;
    update(projectId: string, planId: string, dto: any): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
        section: import("@prisma/client").$Enums.PlanSection;
        fileName: string;
        fileSize: number;
        emissionDate: string | null;
        revision: string | null;
        order: number;
    }>;
    remove(projectId: string, planId: string): Promise<void>;
    reorder(projectId: string, planId: string, dto: {
        order: number;
    }): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
        projectId: string;
        section: import("@prisma/client").$Enums.PlanSection;
        fileBase64: string;
        fileName: string;
        fileSize: number;
        emissionDate: string | null;
        revision: string | null;
        order: number;
    }>;
}
