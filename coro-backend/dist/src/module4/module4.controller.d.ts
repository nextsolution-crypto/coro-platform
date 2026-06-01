import { Module4Service } from './module4.service';
export declare class Module4Controller {
    private readonly module4Service;
    constructor(module4Service: Module4Service);
    getModule4(projectId: string): Promise<{
        documentId: string;
        module4: any;
    }>;
    saveModule4(projectId: string, dto: any): Promise<{
        success: boolean;
        message: string;
        updatedAt: any;
    }>;
}
