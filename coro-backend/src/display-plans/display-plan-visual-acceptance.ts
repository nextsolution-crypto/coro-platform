import { ConflictException } from '@nestjs/common';
import { ApproveDisplayPlanDto } from './dto/display-plan.dto';

export type VisualAcceptanceAuthority = {
  sourceVersion: number;
  sourceSha256: string;
  variantVersion: number;
  variantSha256: string | null;
  locationId: string;
  widthPixels: number | null;
  heightPixels: number | null;
};

const PROFILE_DIMENSIONS = {
  SOURCE_NATIVE: null,
  ORIGINAL_17X11: [4080, 2640],
  SCREEN_16X9: [3840, 2160],
  SCREEN_16X10: [3840, 2400],
} as const;

export function assertCurrentVisualAcceptance(
  authority: VisualAcceptanceAuthority,
  acceptance: ApproveDisplayPlanDto,
) {
  const expectedDimensions = PROFILE_DIMENSIONS[acceptance.profile];
  if (
    authority.sourceVersion !== acceptance.sourceVersion ||
    authority.sourceSha256 !== acceptance.sourceSha256 ||
    authority.variantVersion !== acceptance.variantVersion ||
    authority.variantSha256 !== acceptance.variantSha256 ||
    authority.locationId !== acceptance.locationId ||
    !authority.widthPixels ||
    !authority.heightPixels ||
    (expectedDimensions !== null &&
      (authority.widthPixels !== expectedDimensions[0] ||
        authority.heightPixels !== expectedDimensions[1]))
  )
    throw new ConflictException(
      'La recette visuelle ne correspond plus au document, au rendu ou à l’emplacement courant.',
    );
}
