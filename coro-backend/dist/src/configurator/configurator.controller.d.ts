import { ConfiguratorService } from './configurator.service';
export declare class ConfiguratorController {
    private configuratorService;
    constructor(configuratorService: ConfiguratorService);
    getQuestions(): Promise<{
        sections: ({
            id: string;
            title: string;
            icon: string;
            fields: ({
                key: string;
                label: string;
                type: string;
                schema?: undefined;
            } | {
                key: string;
                label: string;
                type: string;
                schema: ({
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
            })[];
        } | {
            id: string;
            title: string;
            icon: string;
            fields: ({
                key: string;
                label: string;
                type: string;
                options?: undefined;
                checkboxOptions?: undefined;
            } | {
                key: string;
                label: string;
                type: string;
                options: string[];
                checkboxOptions?: undefined;
            } | {
                key: string;
                label: string;
                type: string;
                checkboxOptions: string[];
                options?: undefined;
            })[];
        })[];
    }>;
    analyze(config: any): Promise<import("./rules-engine.service").ConfiguratorResult>;
    save(projectId: string, config: any): Promise<{
        projectId: string;
        config: import("./rules-engine.service").BuildingConfig;
        analysis: import("./rules-engine.service").ConfiguratorResult;
        savedAt: Date;
    }>;
}
