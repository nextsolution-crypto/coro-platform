export type OperationalDataQuality =
  | 'CANONICAL'
  | 'DERIVED'
  | 'INFERABLE'
  | 'NOT_AVAILABLE';
export interface ActiveOperationalState {
  active: boolean | null;
  count: number | null;
  quality: OperationalDataQuality;
  provenance: string[];
  warning?: 'SOURCE_UNAVAILABLE';
}
