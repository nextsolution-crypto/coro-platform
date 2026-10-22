const immutableImage = /^ghcr\.io\/[a-z0-9_.-]+\/[a-z0-9_.-]+@sha256:[0-9a-f]{64}$/;
const commit = /^[0-9a-f]{40}$/;

export function validateSingleServiceRequest(input) {
  if (input.approval !== 'RECONCILE_SINGLE_SERVICE') throw new Error('APPROVAL_INVALID');
  if (input.service !== 'backend') throw new Error('SERVICE_NOT_AUTHORIZED');
  if (!commit.test(input.releaseCommit ?? '')) throw new Error('RELEASE_COMMIT_INVALID');
  if (!immutableImage.test(input.image ?? '')) throw new Error('IMAGE_NOT_IMMUTABLE');
  if (/:latest(?:$|@)/.test(input.image)) throw new Error('MUTABLE_TAG_REJECTED');
  return true;
}
