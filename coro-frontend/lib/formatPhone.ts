// ============================================================
// CORO — Utilitaire de formatage téléphone (norme Canada/US)
// Identique à la logique utilisée dans Module2PhoneTable
// ============================================================

export function formatPhone(raw: string): string {
  // Garde uniquement les chiffres
  const digits = raw.replace(/\D/g, '');

  // Numéro court type 9-1-1, 8-1-1, etc. → on laisse tel quel
  if (raw.match(/^\d[-]\d[-]\d$/)) return raw;

  // 11 chiffres commençant par 1 → 1 (XXX) XXX-XXXX
  if (digits.length === 11 && digits[0] === '1') {
    return `1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7, 11)}`;
  }

  // 10 chiffres → (XXX) XXX-XXXX
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
  }

  // 7 chiffres → XXX-XXXX
  if (digits.length === 7) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}`;
  }

  // Sinon → retourne tel quel (ex: numéros internationaux, extensions)
  return raw;
}