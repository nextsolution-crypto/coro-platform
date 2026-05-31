// ============================================================
// CORO — Module 2 DTO
// ============================================================

export class PhoneEntryDto {
  id: string;
  role: string;
  name: string;
  phone: string;
  isBold?: boolean;
  isFixed?: boolean;
}

export class ExternalEntryDto {
  id: string;
  role: string;
  phone: string;
  url?: string;
  isBold?: boolean;
  isFixed?: boolean;
}

export class SaveModule2Dto {
  section2_1: PhoneEntryDto[];
  section2_2: PhoneEntryDto[];
  section2_3: PhoneEntryDto[];
  section2_4: ExternalEntryDto[];
}