import { PrismaService } from '../prisma/prisma.service';
export declare class Module3Service {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getModule3(projectId: string): Promise<{
        documentId: string;
        module3: any;
    }>;
    saveModule3(projectId: string, dto: any): Promise<{
        success: boolean;
        message: string;
        updatedAt: any;
    }>;
}
