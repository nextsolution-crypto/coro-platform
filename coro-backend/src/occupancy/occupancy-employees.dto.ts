export class CreateBuildingEmployeeDto {
  buildingId: string;
  firstName: string;
  lastName: string;
  poste?: string;
  email?: string;
  phone?: string;
}

export class CreateVisitorInvitationDto {
  buildingId: string;
  firstName: string;
  lastName: string;
  email: string;
  company?: string;
  reason?: string;
  hostName?: string;
  visitDate: string; // ISO string
}