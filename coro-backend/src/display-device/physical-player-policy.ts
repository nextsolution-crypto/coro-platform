export const REFERENCE_OS = Object.freeze({
  id: 'ubuntu',
  versionId: '24.04',
  architecture: 'x64',
  minimumMemoryBytes: 4 * 1024 ** 3,
  minimumFreeDiskBytes: 16 * 1024 ** 3,
});

export interface PhysicalHostFacts {
  osId: string;
  versionId: string;
  architecture: string;
  memoryBytes: number;
  freeDiskBytes: number;
  tpm2Present: boolean;
  pkcs11Ed25519Capable: boolean;
  chromiumMajorVersion: number;
}

export interface PhysicalPreflightResult {
  ready: boolean;
  blockers: string[];
  warnings: string[];
}

/** Fail closed before an installer is allowed to mutate a Player host. */
export function evaluatePhysicalHost(
  facts: PhysicalHostFacts,
): PhysicalPreflightResult {
  const blockers: string[] = [];
  const warnings: string[] = [];
  if (facts.osId !== REFERENCE_OS.id) blockers.push('OS_UNSUPPORTED');
  if (facts.versionId !== REFERENCE_OS.versionId)
    blockers.push('OS_VERSION_UNSUPPORTED');
  if (facts.architecture !== REFERENCE_OS.architecture)
    blockers.push('ARCHITECTURE_UNSUPPORTED');
  if (facts.memoryBytes < REFERENCE_OS.minimumMemoryBytes)
    blockers.push('MEMORY_INSUFFICIENT');
  if (facts.freeDiskBytes < REFERENCE_OS.minimumFreeDiskBytes)
    blockers.push('DISK_INSUFFICIENT');
  if (facts.chromiumMajorVersion < 130) blockers.push('CHROMIUM_UNSUPPORTED');
  if (!facts.pkcs11Ed25519Capable) blockers.push('ED25519_SIGNER_UNAVAILABLE');
  if (!facts.tpm2Present) warnings.push('TPM2_NOT_ATTESTED');
  return { ready: blockers.length === 0, blockers, warnings };
}

export type DisplayProfile = '17X11_LANDSCAPE' | '16X9' | '16X10';

export function validateDisplayProfile(
  profile: DisplayProfile,
  width: number,
  height: number,
): void {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1280)
    throw new Error('DISPLAY_RESOLUTION_INVALID');
  const ratio = width / height;
  const expected =
    profile === '17X11_LANDSCAPE'
      ? 17 / 11
      : profile === '16X9'
        ? 16 / 9
        : 16 / 10;
  if (Math.abs(ratio - expected) > 0.035)
    throw new Error('DISPLAY_PROFILE_MISMATCH');
}

export interface HardwareTelemetryInput {
  osVersion: string;
  playerVersion: string;
  chromiumVersion: string;
  cpuPercent: number;
  memoryBytes: number;
  freeDiskBytes: number;
  temperatureCelsius?: number;
  restarts: number;
  mode: string;
  activePlanId?: string;
  secret?: string;
  email?: string;
  ipAddress?: string;
}

export function sanitizeHardwareTelemetry(input: HardwareTelemetryInput) {
  const finite = (value: number, minimum: number, maximum: number) => {
    if (!Number.isFinite(value)) throw new Error('TELEMETRY_INVALID');
    return Math.min(maximum, Math.max(minimum, value));
  };
  return Object.freeze({
    osVersion: input.osVersion.slice(0, 64),
    playerVersion: input.playerVersion.slice(0, 64),
    chromiumVersion: input.chromiumVersion.slice(0, 64),
    cpuPercent: finite(input.cpuPercent, 0, 100),
    memoryBytes: finite(input.memoryBytes, 0, Number.MAX_SAFE_INTEGER),
    freeDiskBytes: finite(input.freeDiskBytes, 0, Number.MAX_SAFE_INTEGER),
    temperatureCelsius:
      input.temperatureCelsius === undefined
        ? undefined
        : finite(input.temperatureCelsius, -40, 125),
    restarts: finite(input.restarts, 0, Number.MAX_SAFE_INTEGER),
    mode: input.mode.slice(0, 32),
    activePlanId: input.activePlanId?.slice(0, 128),
  });
}

export interface EnduranceSample {
  atMs: number;
  cpuPercent: number;
  memoryBytes: number;
  freeDiskBytes: number;
  restarts: number;
  errors: number;
}

export function summarizeEndurance(samples: EnduranceSample[]) {
  if (samples.length < 2) throw new Error('ENDURANCE_EVIDENCE_INSUFFICIENT');
  const ordered = [...samples].sort((a, b) => a.atMs - b.atMs);
  const durationMs = ordered.at(-1)!.atMs - ordered[0].atMs;
  if (durationMs <= 0) throw new Error('ENDURANCE_DURATION_INVALID');
  return Object.freeze({
    durationMs,
    samples: ordered.length,
    peakCpuPercent: Math.max(...ordered.map((sample) => sample.cpuPercent)),
    peakMemoryBytes: Math.max(...ordered.map((sample) => sample.memoryBytes)),
    minimumFreeDiskBytes: Math.min(
      ...ordered.map((sample) => sample.freeDiskBytes),
    ),
    restartDelta: ordered.at(-1)!.restarts - ordered[0].restarts,
    errorDelta: ordered.at(-1)!.errors - ordered[0].errors,
  });
}
