import { BadRequestException } from '@nestjs/common';
import { assertClientUploadSize, CLIENT_UPLOAD_MAX_BYTES, detectAllowedFileType } from './file-type-policy';

describe('fichiers acceptés dans CORO : JPG ou PDF, 25 Mo (M3-06, 23 nov. 2026)', () => {
  it('accepte un PDF et un JPG vérifiés sur le contenu', () => {
    expect(detectAllowedFileType('plan.PDF', Buffer.from('%PDF-1.7')).mimeType).toBe('application/pdf');
    expect(detectAllowedFileType('photo.jpg', Buffer.from([0xff, 0xd8, 0xff, 0xe0])).mimeType).toBe('image/jpeg');
    expect(detectAllowedFileType('photo.JPEG', Buffer.from([0xff, 0xd8, 0xff, 0xe1])).mimeType).toBe('image/jpeg');
  });

  it('refuse tout autre format, même valide', () => {
    for (const [name, bytes] of [
      ['a.docx', Buffer.from([0x50, 0x4b, 0x03, 0x04, 0])],
      ['image.png', Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])],
      ['liste.csv', Buffer.from('nom;prénom')],
      ['plans.zip', Buffer.from([0x50, 0x4b, 0x03, 0x04])],
      ['outil.exe', Buffer.from('MZ')],
      ['page.html', Buffer.from('<html>')],
    ] as const) {
      expect(() => detectAllowedFileType(name, bytes)).toThrow('seuls les fichiers JPG ou PDF');
    }
  });

  it('refuse les fichiers déguisés', () => {
    expect(() => detectAllowedFileType('facture.pdf', Buffer.from('MZ\x90\x00'))).toThrow('ne correspond pas');
    expect(() => detectAllowedFileType('photo.jpg', Buffer.from('%PDF-1.7'))).toThrow('ne correspond pas');
    expect(() => detectAllowedFileType('pdf', Buffer.from('%PDF-'))).toThrow('Type de fichier non accepté');
  });

  it('limite la taille à 25 Mo', () => {
    expect(() => assertClientUploadSize(CLIENT_UPLOAD_MAX_BYTES)).not.toThrow();
    expect(() => assertClientUploadSize(CLIENT_UPLOAD_MAX_BYTES + 1)).toThrow(BadRequestException);
    expect(() => assertClientUploadSize(0)).toThrow('25 Mo');
  });
});
