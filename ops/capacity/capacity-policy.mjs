import fs from "node:fs";

const GiB = 1024 ** 3;

export function evaluateCapacity(input) {
  const n = (value, name) => {
    if (!Number.isSafeInteger(value) || value < 0) throw new Error(`INVALID_${name}`);
    return value;
  };
  const total = n(input.filesystem.totalBytes, "TOTAL_BYTES");
  const free = n(input.filesystem.freeBytes, "FREE_BYTES");
  const backup = n(input.requirements.backupBytes, "BACKUP_BYTES");
  const images = n(input.requirements.nextImageSetBytes, "IMAGE_BYTES");
  const database = n(input.requirements.databaseGrowthBytes, "DATABASE_BYTES");
  const reserve = Math.max(5 * GiB, Math.ceil(total * 0.1));
  const imageExtraction = Math.ceil(images * 1.25);
  const release = backup + imageExtraction + database + reserve;
  const warning = Math.max(10 * GiB, Math.ceil(total * 0.2));
  const critical = Math.max(backup, reserve);
  return {
    reserveBytes: reserve,
    warningBytes: warning,
    criticalBytes: critical,
    backupRequiredBytes: backup,
    releaseRequiredBytes: release,
    backupHeadroomBytes: free - backup,
    releaseHeadroomBytes: free - release,
    status: free < critical ? "CRITICAL" : free < warning ? "WARNING" : "HEALTHY",
    backupReady: free >= backup,
    releaseReady: free >= release,
  };
}

if (process.argv[1] && import.meta.url === new URL(`file:${process.argv[1]}`).href) {
  const input = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
  process.stdout.write(`${JSON.stringify(evaluateCapacity(input), null, 2)}\n`);
}
