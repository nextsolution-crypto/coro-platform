export function resetPasswordIssue(password: string): string | null {
  if (password.length < 8) return 'Le mot de passe doit contenir au moins 8 caractères.';
  if (!/[A-Z]/.test(password)) return 'Le mot de passe doit contenir au moins une majuscule.';
  if (!/[a-z]/.test(password)) return 'Le mot de passe doit contenir au moins une minuscule.';
  if (!/[0-9]/.test(password)) return 'Le mot de passe doit contenir au moins un chiffre (0-9).';
  if (!/[^A-Za-z0-9]/.test(password)) return 'Le mot de passe doit contenir au moins un caractère spécial.';
  return null;
}

export function resetPasswordsMatch(password: string, confirmation: string): boolean {
  return password === confirmation;
}

export function readResetPasswordFields(form: FormData): { password: string; confirmation: string } {
  const password = form.get('newPassword');
  const confirmation = form.get('confirmPassword');
  return {
    password: typeof password === 'string' ? password : '',
    confirmation: typeof confirmation === 'string' ? confirmation : '',
  };
}
