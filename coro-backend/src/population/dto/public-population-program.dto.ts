export class PublicPopulationProgramDto {
  publicSlug: string;

  nameFR: string;
  nameEN: string | null;

  descriptionFR: string | null;
  descriptionEN: string | null;

  publicPhone: string | null;
  publicEmail: string | null;
  websiteUrl: string | null;

  registrationEnabled: boolean;

  smsEnabled: boolean;
  emailEnabled: boolean;

  privacyTextFR: string | null;
  privacyTextEN: string | null;

  consentTextFR: string | null;
  consentTextEN: string | null;

  consentVersion: string | null;
}