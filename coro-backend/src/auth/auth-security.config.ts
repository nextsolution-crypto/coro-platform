const MIN_SECRET_LENGTH = 32;

export function requireJwtSecret(): string {
  const secret = process.env.JWT_SECRET?.trim();
  if (!secret || secret.length < MIN_SECRET_LENGTH) {
    throw new Error(`JWT_SECRET must contain at least ${MIN_SECRET_LENGTH} characters.`);
  }
  return secret;
}

export function requirePlatformMfaSecret(): string {
  const secret = process.env.PLATFORM_MFA_SECRET?.trim();
  if (!secret || secret.length < MIN_SECRET_LENGTH) {
    throw new Error(`PLATFORM_MFA_SECRET must contain at least ${MIN_SECRET_LENGTH} characters.`);
  }
  return secret;
}
