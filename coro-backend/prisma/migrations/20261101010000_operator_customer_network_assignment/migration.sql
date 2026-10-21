-- P-4.3: an explicitly governed CORO operator may receive a customer Network
-- read assignment without weakening the tenant-bound customer subject types.
ALTER TYPE "CustomerPortfolioAssignmentSubjectType" ADD VALUE 'OPERATOR_USER';
