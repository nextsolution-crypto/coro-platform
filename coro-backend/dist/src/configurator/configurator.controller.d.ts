import { ConfiguratorService } from './configurator.service';
export declare class ConfiguratorController {
    private configuratorService;
    constructor(configuratorService: ConfiguratorService);
    getQuestions(): Promise<{
        sections: {
            id: string;
            title: string;
            icon: string;
            fields: ({
                key: string;
                label: string;
                type: string;
                options: string[];
            } | {
                key: string;
                label: string;
                type: string;
                options?: undefined;
            })[];
        }[];
    }>;
    analyze(config: any): Promise<import("./rules-engine.service").ConfiguratorResult>;
    save(projectId: string, config: any): Promise<{
        projectId: string;
        config: import("./rules-engine.service").BuildingConfig;
        analysis: import("./rules-engine.service").ConfiguratorResult;
        savedAt: Date;
    }>;
}
