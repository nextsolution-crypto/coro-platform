import { BadRequestException } from '@nestjs/common';

const EXTENSIONS: Record<string, string[]> = {
  'application/pdf': ['pdf'],
  'image/jpeg': ['jpg', 'jpeg'],
};

export function assertIncidentReportBinary(
  bytes: Buffer,
  mediaType: string,
  fileName: string,
): void {
  const lower = fileName.trim().toLowerCase();
  const dot = lower.lastIndexOf('.');
  const extension = dot < 0 ? '' : lower.slice(dot + 1);
  if (!EXTENSIONS[mediaType]?.includes(extension)) {
    throw new BadRequestException(
      "L'extension du fichier ne correspond pas au type autorise.",
    );
  }
  let valid = false;
  if (mediaType === 'image/jpeg') {
    valid =
      bytes.length >= 4 &&
      bytes[0] === 0xff &&
      bytes[1] === 0xd8 &&
      bytes[bytes.length - 2] === 0xff &&
      bytes[bytes.length - 1] === 0xd9;
  } else if (mediaType === 'image/png') {
    const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
    const end = Buffer.from([73, 69, 78, 68, 174, 66, 96, 130]);
    valid =
      bytes.length >= 20 &&
      bytes.subarray(0, 8).equals(signature) &&
      bytes.subarray(bytes.length - 8).equals(end);
  } else if (mediaType === 'application/pdf') {
    const head = bytes
      .subarray(0, Math.min(bytes.length, 1024))
      .toString('latin1');
    const tail = bytes
      .subarray(Math.max(0, bytes.length - 2048))
      .toString('latin1');
    valid =
      bytes.length >= 16 &&
      head.startsWith('%PDF-') &&
      /%%EOF\s*$/.test(tail) &&
      /startxref\s+\d+/.test(tail);
  }
  if (!valid) {
    throw new BadRequestException(
      'Le contenu binaire du fichier est invalide ou tronque.',
    );
  }
}
