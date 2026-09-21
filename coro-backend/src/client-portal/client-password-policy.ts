import { BadRequestException } from '@nestjs/common';

export function validateClientPassword(password: string): void {
  if (typeof password !== 'string' || password.length < 8)
    throw new BadRequestException('Le mot de passe doit contenir au moins 8 caracteres.');
  if (!/[A-Z]/.test(password))
    throw new BadRequestException('Le mot de passe doit contenir au moins une majuscule.');
  if (!/[a-z]/.test(password))
    throw new BadRequestException('Le mot de passe doit contenir au moins une minuscule.');
  if (!/[0-9]/.test(password))
    throw new BadRequestException('Le mot de passe doit contenir au moins un chiffre.');
  if (!/[^A-Za-z0-9]/.test(password))
    throw new BadRequestException('Le mot de passe doit contenir au moins un caractere special.');
}
