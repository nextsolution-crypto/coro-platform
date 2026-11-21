import { BadRequestException } from '@nestjs/common';

/**
 * Types de fichiers acceptés dans l'espace documentaire client-conseiller
 * (audit M3-06). Le type est déterminé par le contenu (signature binaire)
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

const OOXML_MIME: Record<string, string> = {
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
};
const OLE_MIME: Record<string, string> = {
  doc: 'application/msword',
  xls: 'application/vnd.ms-excel',
  ppt: 'application/vnd.ms-powerpoint',
  msg: 'application/vnd.ms-outlook',
};

const TEXT_MIME: Record<string, string> = {
  txt: 'text/plain',
  csv: 'text/csv',
  tsv: 'text/tab-separated-values',
  md: 'text/markdown',
};

function isPlainText(bytes: Buffer): boolean {
  if (bytes.includes(0)) return false;
  const text = bytes.toString('utf8');
  if (text.includes('�')) return false;
  // Pas de HTML ni de script déguisé en texte.
  return !/<\s*(script|html|iframe|svg|object|embed)\b/i.test(text.slice(0, 65_536));
}

const RULES: Rule[] = [
  { extensions: ['pdf'], mimeType: 'application/pdf', matches: (b) => startsWith(b, [0x25, 0x50, 0x44, 0x46, 0x2d]) },
  { extensions: ['docx', 'xlsx', 'pptx'], mimeType: (ext) => OOXML_MIME[ext], matches: (b) => startsWith(b, [0x50, 0x4b, 0x03, 0x04]) },
  { extensions: ['doc', 'xls', 'ppt', 'msg'], mimeType: (ext) => OLE_MIME[ext], matches: (b) => startsWith(b, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]) },
  { extensions: ['png'], mimeType: 'image/png', matches: (b) => startsWith(b, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]) },
  { extensions: ['jpg', 'jpeg'], mimeType: 'image/jpeg', matches: (b) => startsWith(b, [0xff, 0xd8, 0xff]) },
  { extensions: ['gif'], mimeType: 'image/gif', matches: (b) => startsWith(b, [0x47, 0x49, 0x46, 0x38]) },
  { extensions: ['webp'], mimeType: 'image/webp', matches: (b) => startsWith(b, [0x52, 0x49, 0x46, 0x46]) && startsWith(b, [0x57, 0x45, 0x42, 0x50], 8) },
  { extensions: ['heic', 'heif'], mimeType: 'image/heic', matches: (b) => startsWith(b, [0x66, 0x74, 0x79, 0x70], 4) },
  { extensions: ['dwg'], mimeType: 'application/acad', matches: (b) => startsWith(b, [0x41, 0x43, 0x31, 0x30]) },
  { extensions: ['tif', 'tiff'], mimeType: 'image/tiff', matches: (b) => startsWith(b, [0x49, 0x49, 0x2a, 0x00]) || startsWith(b, [0x4d, 0x4d, 0x00, 0x2a]) },
  // Archives : acceptées car déjà proposées par l'interface (lots de plans) ;
  // leur contenu n'est analysé que si l'antivirus est actif.
  { extensions: ['zip'], mimeType: 'application/zip', matches: (b) => startsWith(b, [0x50, 0x4b, 0x03, 0x04]) },
  { extensions: ['ifc'], mimeType: 'application/x-step', matches: (b) => b.subarray(0, 32).toString('latin1').startsWith('ISO-10303-21') && isPlainText(b) },
  { extensions: ['dxf'], mimeType: 'application/dxf', matches: isPlainText },
  { extensions: ['txt', 'csv', 'tsv', 'md'], mimeType: (ext) => TEXT_MIME[ext], matches: isPlainText },
];

export const ACCEPTED_FILE_EXTENSIONS = RULES.flatMap((rule) => rule.extensions);

export function detectAllowedFileType(fileName: string, bytes: Buffer): DetectedFileType {
  const extension = (fileName.split('.').pop() || '').toLowerCase();
  const rule = RULES.find((candidate) => candidate.extensions.includes(extension));
  if (!rule || fileName.lastIndexOf('.') <= 0) {
    throw new BadRequestException(
      `Type de fichier non accepté. Formats acceptés : ${ACCEPTED_FILE_EXTENSIONS.join(', ')}.`,
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
