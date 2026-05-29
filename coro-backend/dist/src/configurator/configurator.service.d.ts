import { PrismaService } from '../prisma/prisma.service';
import { RulesEngineService, BuildingConfig } from './rules-engine.service';
export declare class ConfiguratorService {
    private prisma;
    private rulesEngine;
    constructor(prisma: PrismaService, rulesEngine: RulesEngineService);
    analyzeBuilding(config: BuildingConfig): Promise<import("./rules-engine.service").ConfiguratorResult>;
    saveConfiguration(projectId: string, config: BuildingConfig): Promise<{
        projectId: string;
        config: BuildingConfig;
        analysis: import("./rules-engine.service").ConfiguratorResult;
        savedAt: Date;
    }>;
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
}
