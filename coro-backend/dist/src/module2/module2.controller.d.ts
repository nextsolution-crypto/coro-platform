import { Module2Service } from './module2.service';
import { SaveModule2Dto } from './dto/save-module2.dto';
export declare class Module2Controller {
    private readonly module2Service;
    constructor(module2Service: Module2Service);
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
