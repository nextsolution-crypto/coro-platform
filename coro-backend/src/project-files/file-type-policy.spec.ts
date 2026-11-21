import { detectAllowedFileType } from './file-type-policy';

describe('types de fichiers acceptés (M3-06)', () => {
  it('accepte un PDF, un Word, une image et un CSV vérifiés sur le contenu', () => {
    expect(detectAllowedFileType('plan.PDF', Buffer.from('%PDF-1.7')).mimeType).toBe('application/pdf');
    expect(detectAllowedFileType('a.docx', Buffer.from([0x50, 0x4b, 0x03, 0x04, 0])).mimeType).toContain('wordprocessingml');
    expect(detectAllowedFileType('photo.jpg', Buffer.from([0xff, 0xd8, 0xff, 0xe0])).mimeType).toBe('image/jpeg');
    expect(detectAllowedFileType('liste.csv', Buffer.from('nom;prénom\nA;B')).mimeType).toBe('text/csv');
  });

  it('refuse exécutables, HTML et fichiers déguisés', () => {
    expect(() => detectAllowedFileType('outil.exe', Buffer.from('MZ'))).toThrow('Type de fichier non accepté');
    expect(() => detectAllowedFileType('page.html', Buffer.from('<html>'))).toThrow('Type de fichier non accepté');
    expect(() => detectAllowedFileType('a.zip', Buffer.from('MZ'))).toThrow('ne correspond pas');
    expect(() => detectAllowedFileType('a.bat', Buffer.from('echo'))).toThrow('Type de fichier non accepté');
    expect(() => detectAllowedFileType('facture.pdf', Buffer.from('MZ\x90\x00'))).toThrow('ne correspond pas');
    expect(() => detectAllowedFileType('note.txt', Buffer.from('<script>alert(1)</script>'))).toThrow('ne correspond pas');
    expect(() => detectAllowedFileType('pdf', Buffer.from('%PDF-'))).toThrow('Type de fichier non accepté');
  });
});
