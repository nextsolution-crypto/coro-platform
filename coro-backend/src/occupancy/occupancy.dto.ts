export class CheckInDto {
  buildingId: string;
  type: 'EMPLOYE' | 'VISITEUR' | 'CONTRACTEUR';
  firstName: string;
  lastName: string;
  company?: string;
  email?: string;
  phone?: string;
  reason?: string;
  hostName?: string;
  floor?: string;
  kioskToken: string;
}

export class CheckOutDto {
  recordId: string;
  kioskToken: string;
}

export class TriggerEvacuationDto {
  buildingId: string;
  triggeredBy?: string;
  notes?: string;
}

export class AccountForOccupantDto {
  evacuationEventId: string;
  occupantRecordId: string;
  checkedBy?: string;
}