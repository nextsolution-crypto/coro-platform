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

const PROFILE_ASPECT_RATIOS = {
  SOURCE_NATIVE: null,
  ORIGINAL_17X11: [17, 11],
  SCREEN_16X9: [16, 9],
  SCREEN_16X10: [16, 10],
} as const;

export function assertCurrentVisualAcceptance(
  authority: VisualAcceptanceAuthority,
  acceptance: ApproveDisplayPlanDto,
) {
  const expectedAspectRatio = PROFILE_ASPECT_RATIOS[acceptance.profile];
  if (
    authority.sourceVersion !== acceptance.sourceVersion ||
    authority.sourceSha256 !== acceptance.sourceSha256 ||
    authority.variantVersion !== acceptance.variantVersion ||
    authority.variantSha256 !== acceptance.variantSha256 ||
    authority.locationId !== acceptance.locationId ||
    !authority.widthPixels ||
    !authority.heightPixels ||
    (expectedAspectRatio !== null &&
      authority.widthPixels * expectedAspectRatio[1] !==
        authority.heightPixels * expectedAspectRatio[0])
  )
    throw new ConflictException(
      'Le plan ou son emplacement a été modifié depuis votre dernière vérification. Veuillez vérifier l’aperçu actuel avant de l’approuver.',
    );
}
