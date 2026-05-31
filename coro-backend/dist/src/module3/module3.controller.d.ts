import { Module3Service } from './module3.service';
export declare class Module3Controller {
    private readonly module3Service;
    constructor(module3Service: Module3Service);
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
