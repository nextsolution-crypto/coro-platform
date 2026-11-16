import fs from "node:fs";

const IMAGE = /^ghcr\.io\/[a-z0-9_.-]+\/[a-z0-9_.-]+@sha256:[0-9a-f]{64}$/;
const IMAGE_KEYS = ["backend", "frontend", "clientPortal", "website"];
const DEPLOYED_SERVICES = Object.freeze({
  backend: "backend",
  "display-pdf-spool-init": "backend",
  "display-pdf-worker": "backend",
  "display-pdf-rasterizer": "backend",
  frontend: "frontend",
  "client-portal": "clientPortal",
  website: "website",
});

function validDate(value) {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

function imageMap(release) {
  const result = {};
  for (const key of IMAGE_KEYS) {
    const ref = release?.images?.[key];
    if (!IMAGE.test(ref || "")) throw new Error("ACTIVE_IMAGE_SET_INVALID");
    result[key] = ref;
  }
  return result;
}

function rollbackMap(release) {
  if (release?.rollbackImagesByService) {
    const result = {};
    for (const key of IMAGE_KEYS) {
      const ref = release.rollbackImagesByService[key];
      if (!IMAGE.test(ref || "")) throw new Error("ROLLBACK_IMAGE_SET_INVALID");
      result[key] = ref;
    }
    return result;
  }
  const refs = (release?.previousImages || []).filter(Boolean);
  if (refs.length !== IMAGE_KEYS.length || !refs.every((ref) => IMAGE.test(ref)))
    throw new Error("ROLLBACK_IMAGE_SET_INVALID");
  return Object.fromEntries(IMAGE_KEYS.map((key, index) => [key, refs[index]]));
}

export function buildRetentionPlan({ releases, explicitCandidates = [], blockedRollbackImages = [], now = new Date().toISOString() }) {
  if (!validDate(now)) throw new Error("NOW_INVALID");
  const reconciled = releases
    .filter((release) => release?.status === "SUCCESS" && release?.reconciled === true && validDate(release.timestampUtc))
    .sort((left, right) => Date.parse(right.timestampUtc) - Date.parse(left.timestampUtc));
  const active = reconciled[0];
  if (!active) throw new Error("RECONCILED_RELEASE_MISSING");
  const activeByImageKey = imageMap(active);
  const fallbackRollback = rollbackMap(active);
  const rollbackByImageKey = {};

  for (const key of IMAGE_KEYS) {
    // An unchanged service keeps its last distinct known-good rollback.
    const priorDistinct = reconciled.slice(1)
      .map((release) => imageMap(release)[key])
      .find((ref) => ref !== activeByImageKey[key]);
    rollbackByImageKey[key] = priorDistinct || fallbackRollback[key];
  }

  const blocked = new Set(blockedRollbackImages);
  if (Object.values(rollbackByImageKey).some((ref) => blocked.has(ref)))
    throw new Error("ROLLBACK_IMAGE_BLOCKED");

  const activeCandidates = [];
  const expiredCandidates = [];
  for (const candidate of explicitCandidates) {
    if (!candidate?.reason || !validDate(candidate.expiresAt) || !Array.isArray(candidate.images) || !candidate.images.every((ref) => IMAGE.test(ref)))
      throw new Error("EXPLICIT_CANDIDATE_INVALID");
    if (Date.parse(candidate.expiresAt) <= Date.parse(now)) expiredCandidates.push(candidate.id || "unnamed");
    else activeCandidates.push(candidate);
  }
  const explicitImages = activeCandidates.flatMap((candidate) => candidate.images);
  const servicePlan = Object.fromEntries(Object.entries(DEPLOYED_SERVICES).map(([service, key]) => [service, {
    imageKey: key,
    active: activeByImageKey[key],
    rollback: rollbackByImageKey[key],
    unchangedAcrossLatestRelease: reconciled[1]?.images?.[key] === activeByImageKey[key],
  }]));
  const activeImages = [...new Set(Object.values(activeByImageKey))];
  const rollbackImages = [...new Set(Object.values(rollbackByImageKey))];
  return {
    activeReleaseId: active.releaseId,
    servicePlan,
    activeImages,
    rollbackImages,
    explicitImages,
    expiredCandidates,
    protectedImages: [...new Set([...activeImages, ...rollbackImages, ...explicitImages])],
  };
}

if (process.argv[1] && import.meta.url === new URL(`file:${process.argv[1]}`).href) {
  const input = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
  process.stdout.write(`${JSON.stringify(buildRetentionPlan(input), null, 2)}\n`);
}
