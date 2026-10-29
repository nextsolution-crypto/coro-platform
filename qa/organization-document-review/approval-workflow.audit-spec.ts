import { createReviewSnapshot, hashReviewSnapshot } from '../../coro-backend/src/approval/document-review-integrity';

describe('Document review immutable identity', () => {
  const input = {
    project: { id: 'project-a', documentType: 'PMU', year: 2026, configData: { b: 2, a: 1 } },
    document: { id: 'document-a', title: 'PMU', status: 'DRAFT', version: 1, lockVersion: 3, content: { section: { z: true, a: 'safe' } } },
  };

  it('is deterministic across object key insertion order', () => {
    const reordered = {
      project: { id: 'project-a', documentType: 'PMU', year: 2026, configData: { a: 1, b: 2 } },
      document: { id: 'document-a', title: 'PMU', status: 'DRAFT', version: 1, lockVersion: 3, content: { section: { a: 'safe', z: true } } },
    };
    expect(hashReviewSnapshot(createReviewSnapshot(input))).toBe(hashReviewSnapshot(createReviewSnapshot(reordered)));
  });

  it.each([
    ['content', { ...input, document: { ...input.document, content: { section: { a: 'changed', z: true } } } }],
    ['lock version', { ...input, document: { ...input.document, lockVersion: 4 } }],
    ['configuration', { ...input, project: { ...input.project, configData: { a: 1, b: 3 } } }],
  ])('changes the hash when %s changes', (_label, changed) => {
    expect(hashReviewSnapshot(createReviewSnapshot(changed))).not.toBe(hashReviewSnapshot(createReviewSnapshot(input)));
  });
});
