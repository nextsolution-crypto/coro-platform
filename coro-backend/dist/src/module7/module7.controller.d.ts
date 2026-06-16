import { Module7Service } from './module7.service';
export declare class Module7Controller {
    private readonly service;
    constructor(service: Module7Service);
    getData(projectId: string): Promise<{
        quartsData: any;
        photosData: any;
        extraData: any;
    }>;
    getConfig(projectId: string): Promise<any>;
    saveData(projectId: string, dto: any): Promise<{
        success: boolean;
        updatedAt: string;
    }>;
}
