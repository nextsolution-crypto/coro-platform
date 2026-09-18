import {
  ExerciseReportType,
  IncidentStatus,
  IncidentType,
} from '@prisma/client';

export class CompatibleIncidentSourceDto {
  id!: string;
  type!: IncidentType;
  status!: IncidentStatus;
  triggeredAt!: Date;
  resolvedAt!: Date | null;
  hasRex!: boolean;
}

export class CompatibleEvacuationSourceDto {
  id!: string;
  status!: string;
  triggeredAt!: Date;
  resolvedAt!: Date | null;
}

export class CompatibleExerciseSourcesDto {
  activityId!: string;
  canCreateDraft!: boolean;
  reportType!: ExerciseReportType;
  selectionMode!: 'SINGLE_OPERATIONAL_SOURCE';
  incidents!: CompatibleIncidentSourceDto[];
  evacuations!: CompatibleEvacuationSourceDto[];
}
