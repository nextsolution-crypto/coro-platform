export type ClauseParameterDefinition = {
  key: string;
  type:
    | "DURATION_DAYS"
    | "DURATION_MONTHS"
    | "MONEY_MINOR"
    | "TEXT"
    | "JURISDICTION";
  required: boolean;
};
export type ApprovedClause = {
  effectiveAt: string | null;
  parameterSchema: ClauseParameterDefinition[];
  applicabilities: Array<{ scope: string }>;
};
export const CLAUSE_PARAMETER_LABELS: Readonly<Record<string, string>>;
export function applicableApprovedClauses<T extends ApprovedClause>(
  clauses: T[],
  templateCode: string,
  now: Date | string,
): T[];
export function typedClauseParameters(
  clauses: ApprovedClause[],
  values: Record<string, string>,
): Record<string, string | number>;
export function missingRequiredClauseParameters(
  clauses: ApprovedClause[],
  values: Record<string, string>,
): string[];
export function hasVerifiedIssuer(
  issuers: Array<{ versions: Array<{ status: string }> }>,
): boolean;
export function approvedContentForLines<
  L extends { componentCode: string },
  B extends { targetType: string; targetCode: string },
>(
  contents: Array<{
    code: string;
    versions: Array<{
      id: string;
      status: string;
      bindings: B[];
    }>;
  }>,
  lines: L[],
): Array<{
  line: L;
  bindings: Array<B & { contentCode: string; versionId: string }>;
}>;
