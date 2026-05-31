import { PrismaService } from '../prisma/prisma.service';
import { SaveModule2Dto } from './dto/save-module2.dto';
export declare class Module2Service {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getModule2(projectId: string): Promise<{
        documentId: string;
        module2: any;
    }>;
    saveModule2(projectId: string, dto: SaveModule2Dto): Promise<{
        success: boolean;
        message: string;
        updatedAt: any;
    }>;
}
