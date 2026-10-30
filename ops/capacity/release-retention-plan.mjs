import fs from "node:fs";

const IMAGE = /^ghcr\.io\/[a-z0-9_.-]+\/[a-z0-9_.-]+@sha256:[0-9a-f]{64}$/;

function validDate(value) {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

export function buildRetentionPlan({ releases, explicitCandidates = [], blockedRollbackImages = [], now = new Date().toISOString() }) {
  if (!validDate(now)) throw new Error("NOW_INVALID");
  const reconciled = releases
    .filter((release) => release?.status === "SUCCESS" && release?.reconciled === true && validDate(release.timestampUtc))
    .sort((left, right) => Date.parse(right.timestampUtc) - Date.parse(left.timestampUtc));
  const active = reconciled[0];
  if (!active) throw new Error("RECONCILED_RELEASE_MISSING");

  const activeImages = Object.values(active.images || {});
  const rollbackImages = (active.previousImages || []).filter((ref) => typeof ref === "string" && ref.length > 0);
  if (activeImages.length !== 4 || !activeImages.every((ref) => IMAGE.test(ref))) throw new Error("ACTIVE_IMAGE_SET_INVALID");
  if (rollbackImages.length !== 4 || !rollbackImages.every((ref) => IMAGE.test(ref))) throw new Error("ROLLBACK_IMAGE_SET_INVALID");
  const blocked = new Set(blockedRollbackImages);
  if (rollbackImages.some((ref) => blocked.has(ref))) throw new Error("ROLLBACK_IMAGE_BLOCKED");

  const activeCandidates = [];
  const expiredCandidates = [];
  for (const candidate of explicitCandidates) {
    if (!candidate?.reason || !validDate(candidate.expiresAt) || !Array.isArray(candidate.images) || !candidate.images.every((ref) => IMAGE.test(ref))) {
      throw new Error("EXPLICIT_CANDIDATE_INVALID");
    }
    if (Date.parse(candidate.expiresAt) <= Date.parse(now)) expiredCandidates.push(candidate.id || "unnamed");
    else activeCandidates.push(candidate);
  }
  const explicitImages = activeCandidates.flatMap((candidate) => candidate.images);
  return {
    activeReleaseId: active.releaseId,
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
