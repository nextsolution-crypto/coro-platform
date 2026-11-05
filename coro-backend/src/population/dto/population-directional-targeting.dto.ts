import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional } from 'class-validator';

export enum PopulationCompassDirection {
  N = 'N',
  NE = 'NE',
  E = 'E',
  SE = 'SE',
  S = 'S',
  SW = 'SW',
  W = 'W',
  NW = 'NW',
}

export enum PopulationTargetingMode {
  GLOBAL = 'GLOBAL',
  DIRECTIONAL = 'DIRECTIONAL',
}

const toBoolean = ({ value }: { value: unknown }) => {
  if (value === true || value === 'true') return true;
  if (value === false || value === 'false') return false;
  return value;
};

export class PopulationDirectionalPreviewQueryDto {
  @IsOptional()
  @IsEnum(PopulationTargetingMode)
  targetingMode?: PopulationTargetingMode;

  @IsOptional()
  @IsEnum(PopulationCompassDirection)
  propagationDirection?: PopulationCompassDirection;

  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  includeAdjacentSectors?: boolean;
}
