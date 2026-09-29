const SENSITIVE_KEY =
  /(password|secret|token|digest|verifier|credential|authorization|cookie|mfa|otp|reset)/i;
const EMAIL = /([\w.+-]{1,3})[\w.+-]*@([\w.-]+)/g;
const BEARER = /Bearer\s+\S+/gi;

const redactString = (value: string): string =>
  value.replace(BEARER, 'Bearer [REDACTED]').replace(EMAIL, '$1***@$2');

export function redactAuditValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactAuditValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, nested]) => [
        key,
        SENSITIVE_KEY.test(key) ? '[REDACTED]' : redactAuditValue(nested),
      ]),
    );
  }
  return typeof value === 'string' ? redactString(value) : value;
}

export const redactAuditLabel = (value: string | null): string | null =>
  value ? redactString(value) : value;
