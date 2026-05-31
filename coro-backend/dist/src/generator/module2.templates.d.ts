import { DocumentContext } from './module1.templates';
export interface PhoneEntry {
    role: string;
    name: string;
    phone: string;
    isBold?: boolean;
    isFixed?: boolean;
}
export interface ExternalResource {
    role: string;
    phone: string;
    url?: string;
    isBold?: boolean;
    isFixed?: boolean;
}
export interface Module2SectionData {
    type: 'phone_table' | 'external_table';
    entries: PhoneEntry[] | ExternalResource[];
    availableRoles?: string[];
}
export declare const ROLES_INTERNES_BUREAU_FR: string[];
export declare const ROLES_INTERNES_BUREAU_EN: string[];
export declare const ROLES_INTERNES_INDUSTRIEL_FR: string[];
export declare const ROLES_INTERNES_INDUSTRIEL_EN: string[];
export declare const EQUIPEMENTS_BASE_FR: string[];
export declare const EQUIPEMENTS_BASE_EN: string[];
export declare const EQUIPEMENTS_CONDITIONNELS_FR: Record<string, string[]>;
export declare const EQUIPEMENTS_CONDITIONNELS_EN: Record<string, string[]>;
export declare const ALL_EQUIPEMENTS_FR: string[];
export declare const ALL_EQUIPEMENTS_EN: string[];
export declare function generateModule2(ctx: DocumentContext): any;
