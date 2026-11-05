import { IncidentType } from '@prisma/client';
import { validate } from 'class-validator';
import { INCIDENT_LABELS, INCIDENT_PROCEDURE_MAP, PROCEDURE_MAP } from './incident.service';
import { TriggerIncidentDto } from './incident-trigger.dto';

const EXPECTED: Array<[IncidentType, string]> = [
  [IncidentType.ELEVATOR_ENTRAPMENT, 'P012'],
  [IncidentType.FIRE_PROTECTION_IMPAIRMENT, 'P032'],
  [IncidentType.HAZARDOUS_ATMOSPHERE, 'P029'],
  [IncidentType.EMERGENCY_POWER_FAILURE, 'P030'],
  [IncidentType.SEVERE_ICE_CONDITIONS, 'P025'],
  [IncidentType.CRITICAL_SAFETY_SYSTEM_LOSS, 'P031'],
];

describe('Incident operational events', () => {
  it.each(EXPECTED)('maps %s to an available coordinator procedure', (type, procedureCode) => {
    expect(INCIDENT_PROCEDURE_MAP[type]).toBe(procedureCode);
    const procedure = PROCEDURE_MAP[procedureCode];
    expect(procedure).toBeDefined();
    expect(procedure.roleSections.some((section) => section.roleCode === 'ROLE-CU')).toBe(true);
    expect(INCIDENT_LABELS[type]).toBeTruthy();
  });

  it('keeps emergency power failure separate from PCA activation', () => {
    expect(INCIDENT_PROCEDURE_MAP[IncidentType.EMERGENCY_POWER_FAILURE]).toBe('P030');
    expect(PROCEDURE_MAP.P030.code).toBe('P030');
    expect(PROCEDURE_MAP.P030.roleSections.flatMap((section) => section.steps).some((step) =>
      step.textFR.includes('Ne pas activer automatiquement le PCA'),
    )).toBe(true);
  });

  it('keeps operational procedures out of technical repair instructions', () => {
    for (const procedureCode of ['P029', 'P030', 'P031', 'P032']) {
      const text = PROCEDURE_MAP[procedureCode].roleSections
        .flatMap((section) => section.steps)
        .map((step) => `${step.textFR} ${step.textEN}`)
        .join(' ');
      expect(text).toMatch(/ne pas|do not/i);
      expect(text).not.toMatch(/démonter|remplacer une pièce|ouvrir le panneau|disassemble|replace a part|open the panel/i);
    }
  });

  it('rejects an unknown incident type and browser-supplied author field', async () => {
    const dto = Object.assign(new TriggerIncidentDto(), {
      buildingId: '5b3032fa-a8e8-4d3d-9fe0-fb51917c96c7',
      type: 'GENERATOR_REPAIR',
      triggeredBy: 'Impersonated User',
    });
    const errors = await validate(dto, { whitelist: true, forbidNonWhitelisted: true });
    expect(errors.some((error) => error.property === 'type')).toBe(true);
    expect(errors.some((error) => error.property === 'triggeredBy')).toBe(true);
  });

  it('accepts all six governed event types', async () => {
    for (const [type] of EXPECTED) {
      const dto = Object.assign(new TriggerIncidentDto(), {
        buildingId: '5b3032fa-a8e8-4d3d-9fe0-fb51917c96c7',
        type,
        description: 'Synthetic QA event',
        isExercise: true,
      });
      expect(await validate(dto, { whitelist: true, forbidNonWhitelisted: true })).toEqual([]);
    }
  });
});
