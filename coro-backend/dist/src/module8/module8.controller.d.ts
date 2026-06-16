import { Module8Service } from './module8.service';
export declare class Module8Controller {
    private readonly service;
    constructor(service: Module8Service);
    getData(projectId: string): Promise<{
        module8: any;
    }>;
    saveData(projectId: string, dto: any): Promise<{
        success: boolean;
        updatedAt: string;
    }>;
}
