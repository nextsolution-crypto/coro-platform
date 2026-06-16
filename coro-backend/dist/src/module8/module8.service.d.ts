import { PrismaService } from '../prisma/prisma.service';
export declare class Module8Service {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getData(projectId: string): Promise<{
        module8: any;
    }>;
    saveData(projectId: string, dto: any): Promise<{
        success: boolean;
        updatedAt: string;
    }>;
}
