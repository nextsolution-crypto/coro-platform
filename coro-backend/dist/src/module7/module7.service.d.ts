import { PrismaService } from '../prisma/prisma.service';
export declare class Module7Service {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getData(projectId: string): Promise<{
        quartsData: any;
        photosData: any;
        extraData: any;
    }>;
    saveData(projectId: string, dto: {
        quartsData?: any;
        photosData?: any;
        extraData?: any;
    }): Promise<{
        success: boolean;
        updatedAt: string;
    }>;
    getConfigForProject(projectId: string): Promise<any>;
}
