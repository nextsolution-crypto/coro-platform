import {
  evaluatePhysicalHost,
  sanitizeHardwareTelemetry,
  summarizeEndurance,
  validateDisplayProfile,
} from './physical-player-policy';

describe('DISPLAY-08 physical Player policy', () => {
  const compliant = {
    osId: 'ubuntu',
    versionId: '24.04',
    architecture: 'x64',
    memoryBytes: 8 * 1024 ** 3,
    freeDiskBytes: 64 * 1024 ** 3,
    tpm2Present: true,
    pkcs11Ed25519Capable: true,
    chromiumMajorVersion: 142,
  };

  it('accepts the reference host and fails closed on every critical prerequisite', () => {
    expect(evaluatePhysicalHost(compliant)).toEqual({
      ready: true,
      blockers: [],
      warnings: [],
    });
    expect(
      evaluatePhysicalHost({
        ...compliant,
        architecture: 'arm64',
        pkcs11Ed25519Capable: false,
      }),
    ).toMatchObject({
      ready: false,
      blockers: ['ARCHITECTURE_UNSUPPORTED', 'ED25519_SIGNER_UNAVAILABLE'],
    });
  });

  it('does not claim TPM-backed Ed25519 from TPM presence alone', () => {
    expect(
      evaluatePhysicalHost({ ...compliant, pkcs11Ed25519Capable: false }),
    ).toMatchObject({ ready: false, blockers: ['ED25519_SIGNER_UNAVAILABLE'] });
    expect(
      evaluatePhysicalHost({ ...compliant, tpm2Present: false }),
    ).toMatchObject({ ready: true, warnings: ['TPM2_NOT_ATTESTED'] });
  });

  it.each([
    ['17X11_LANDSCAPE' as const, 1700, 1100],
    ['16X9' as const, 1920, 1080],
    ['16X10' as const, 1920, 1200],
  ])('accepts %s without cropping', (profile, width, height) => {
    expect(() => validateDisplayProfile(profile, width, height)).not.toThrow();
  });

  it('rejects mismatched or undersized display profiles', () => {
    expect(() => validateDisplayProfile('16X9', 1920, 1200)).toThrow(
      'DISPLAY_PROFILE_MISMATCH',
    );
    expect(() => validateDisplayProfile('16X9', 800, 450)).toThrow(
      'DISPLAY_RESOLUTION_INVALID',
    );
  });

  it('bounds telemetry and drops secrets, addresses and emails', () => {
    const result = sanitizeHardwareTelemetry({
      osVersion: '24.04.5',
      playerVersion: '8.0.0',
      chromiumVersion: '142',
      cpuPercent: 101,
      memoryBytes: 512,
      freeDiskBytes: 1024,
      temperatureCelsius: 200,
      restarts: 2,
      mode: 'NORMAL_CYCLE',
      activePlanId: 'plan-1',
      secret: 'never-export',
      email: 'person@example.invalid',
      ipAddress: '192.0.2.1',
    });
    expect(result).toMatchObject({ cpuPercent: 100, temperatureCelsius: 125 });
    expect(result).not.toHaveProperty('secret');
    expect(result).not.toHaveProperty('email');
    expect(result).not.toHaveProperty('ipAddress');
  });

  it('summarizes measured endurance without inventing physical evidence', () => {
    expect(
      summarizeEndurance([
        {
          atMs: 0,
          cpuPercent: 10,
          memoryBytes: 100,
          freeDiskBytes: 1000,
          restarts: 0,
          errors: 0,
        },
        {
          atMs: 3_600_000,
          cpuPercent: 30,
          memoryBytes: 120,
          freeDiskBytes: 900,
          restarts: 0,
          errors: 0,
        },
      ]),
    ).toEqual({
      durationMs: 3_600_000,
      samples: 2,
      peakCpuPercent: 30,
      peakMemoryBytes: 120,
      minimumFreeDiskBytes: 900,
      restartDelta: 0,
      errorDelta: 0,
    });
  });
});
