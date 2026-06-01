export interface ProcedureStep {
    id: string;
    textFR: string;
    textEN: string;
    isBold?: boolean;
    isRed?: boolean;
    isCommentable?: boolean;
    isList?: boolean;
    subSteps?: ProcedureStep[];
}
export interface RoleSection {
    roleCode: string;
    roleLabelFR: string;
    roleLabelEN: string;
    headerColor: string;
    steps: ProcedureStep[];
}
export interface ProcedureTemplate {
    id: string;
    code: string;
    titleFR: string;
    titleEN: string;
    icon?: string;
    headerColor: string;
    incidentCode?: string;
    activationRule: string;
    documentTypes: string[];
    phase?: string;
    directivesGenerales?: ProcedureStep[];
    roleSections: RoleSection[];
}
export declare const COLORS: {
    red: string;
    orange: string;
    yellow: string;
    dark: string;
    blue: string;
    green: string;
};
export declare function sid(procedureCode: string, index: number): string;
