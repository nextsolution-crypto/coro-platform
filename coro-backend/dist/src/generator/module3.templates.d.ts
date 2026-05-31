import { DocumentContext } from './module1.templates';
export type ShiftType = 'jour' | 'soir' | 'nuit';
export type ScheduleType = 'semaine' | 'weekend';
export type ColumnType = 'left' | 'right' | 'top' | 'full';
export type RoleSource = 'system' | 'custom';
export interface OrgRole {
    id: string;
    roleCode?: string;
    label: string;
    label_en: string;
    note?: string;
    note_en?: string;
    color: string;
    textColor?: string;
    borderColor?: string;
    level: number;
    column: ColumnType;
    isActive: boolean;
    isSystem: boolean;
    source: RoleSource;
    order: number;
}
export interface MemberEntry {
    id: string;
    roleId: string;
    roleLabel: string;
    roleLabel_en: string;
    shift: ShiftType;
    schedule: ScheduleType;
    personneDesignee: string;
    substitut: string;
}
export interface Module3Data {
    orgRoles: OrgRole[];
    members: MemberEntry[];
    activeShifts: ShiftType[];
}
export declare const ROLE_COLORS_PALETTE: ({
    label: string;
    value: string;
    text: string;
    border?: undefined;
} | {
    label: string;
    value: string;
    text: string;
    border: string;
})[];
export declare const SYSTEM_ROLES: OrgRole[];
export declare function activateSystemRoles(config: any, ctx: DocumentContext): OrgRole[];
export declare function extractNameFromSection2_2(roleId: string, section2_2: any[]): string;
export declare function buildMemberTable(orgRoles: OrgRole[], config: any, section2_2: any[]): MemberEntry[];
export declare function getActiveShifts(config: any): ShiftType[];
export declare function generateModule3(ctx: DocumentContext, config?: any, section2_2?: any[], existingCustomRoles?: OrgRole[]): any;
