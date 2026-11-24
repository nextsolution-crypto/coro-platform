import { BadRequestException } from '@nestjs/common';

/**
 * Types de fichiers acceptés dans CORO (audit M3-06). Le type est déterminé par le contenu (signature binaire)
 * et doit correspondre à l'extension ; le type MIME annoncé par le
 * navigateur n'est jamais cru. Exécutables, scripts et HTML sont refusés.
 */
export interface DetectedFileType {
  extension: string;
  mimeType: string;
}

type Rule = {
  extensions: string[];
  mimeType: string | ((ext: string) => string);
  matches: (bytes: Buffer) => boolean;
};

const startsWith = (bytes: Buffer, signature: number[], offset = 0) =>
  bytes.length >= offset + signature.length &&
  signature.every((value, index) => bytes[offset + index] === value);

/**
 * Règle commune à tous les fichiers envoyés par les clients et les conseillers et stockés
 * dans CORO (décision du 23 nov. 2026) : JPG ou PDF seulement, 25 Mo au plus.
 * Les fichiers déjà stockés dans un autre format restent lisibles.
 * L'import Word du configurateur (côté conseiller, non stocké) n'est pas concerné.
 */
export const CLIENT_UPLOAD_MAX_BYTES = 25 * 1024 * 1024;
export const CLIENT_UPLOAD_MAX_LABEL = '25 Mo';
export const CLIENT_UPLOAD_FORMATS_LABEL = 'JPG ou PDF';

const RULES: Rule[] = [
  { extensions: ['pdf'], mimeType: 'application/pdf', matches: (b) => startsWith(b, [0x25, 0x50, 0x44, 0x46, 0x2d]) },
  { extensions: ['jpg', 'jpeg'], mimeType: 'image/jpeg', matches: (b) => startsWith(b, [0xff, 0xd8, 0xff]) },
];

export const ACCEPTED_FILE_EXTENSIONS = RULES.flatMap((rule) => rule.extensions);

export function assertClientUploadSize(size: number): void {
  if (!size || size > CLIENT_UPLOAD_MAX_BYTES) {
    throw new BadRequestException(`Fichier vide ou supérieur à ${CLIENT_UPLOAD_MAX_LABEL}.`);
  }
}

export function detectAllowedFileType(fileName: string, bytes: Buffer): DetectedFileType {
  const extension = (fileName.split('.').pop() || '').toLowerCase();
  const rule = RULES.find((candidate) => candidate.extensions.includes(extension));
  if (!rule || fileName.lastIndexOf('.') <= 0) {
    throw new BadRequestException(
      `Type de fichier non accepté : seuls les fichiers ${CLIENT_UPLOAD_FORMATS_LABEL} sont acceptés.`,
    );
  }
  if (!rule.matches(bytes)) {
    throw new BadRequestException(
      `Le contenu du fichier ne correspond pas à un fichier .${extension}.`,
    );
  }
  const mimeType = typeof rule.mimeType === 'function' ? rule.mimeType(extension) : rule.mimeType;
  return { extension, mimeType };
}
