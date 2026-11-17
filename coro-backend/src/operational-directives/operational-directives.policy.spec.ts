import { isDirectiveTransitionAllowed, isFollowUpTransitionAllowed } from './operational-directives.policy';

describe('operational lifecycle policies', () => {
  it('enforces the governed directive lifecycle', () => {
    expect(isDirectiveTransitionAllowed('DRAFT', 'SUBMITTED')).toBe(true);
    expect(isDirectiveTransitionAllowed('DRAFT', 'PUBLISHED')).toBe(false);
    expect(isDirectiveTransitionAllowed('PUBLISHED', 'APPROVED')).toBe(false);
  });
  it('separates completion, verification and closure', () => {
    expect(isFollowUpTransitionAllowed('IN_PROGRESS', 'COMPLETED')).toBe(true);
    expect(isFollowUpTransitionAllowed('COMPLETED', 'CLOSED')).toBe(false);
    expect(isFollowUpTransitionAllowed('COMPLETED', 'VERIFIED')).toBe(true);
    expect(isFollowUpTransitionAllowed('VERIFIED', 'CLOSED')).toBe(true);
  });
});
