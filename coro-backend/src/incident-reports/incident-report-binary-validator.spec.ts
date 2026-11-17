import { BadRequestException } from '@nestjs/common';
import { assertIncidentReportBinary } from './incident-report-binary-validator';

describe('assertIncidentReportBinary', () => {
  const pdf = Buffer.from(
    '%PDF-1.7\n1 0 obj\n<<>>\nendobj\nstartxref\n9\n%%EOF\n',
    'latin1',
  );
  const jpeg = Buffer.from([0xff, 0xd8, 0x01, 0x02, 0xff, 0xd9]);
  const png = Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    Buffer.alloc(12),
    Buffer.from([73, 69, 78, 68, 174, 66, 96, 130]),
  ]);
  it.each([
    [pdf, 'application/pdf', 'preuve.pdf'],
    [jpeg, 'image/jpeg', 'photo.jpeg'],
    [png, 'image/png', 'photo.png'],
  ])('accepts a structurally valid %s', (bytes, mediaType, name) => {
    expect(() =>
      assertIncidentReportBinary(bytes as Buffer, mediaType, name),
    ).not.toThrow();
  });
  it.each([
    [Buffer.from('not a pdf'), 'application/pdf', 'preuve.pdf'],
    [pdf.subarray(0, 12), 'application/pdf', 'preuve.pdf'],
    [jpeg.subarray(0, 4), 'image/jpeg', 'photo.jpg'],
    [png.subarray(0, 12), 'image/png', 'photo.png'],
    [pdf, 'application/pdf', 'preuve.jpg'],
  ])(
    'rejects malformed, truncated, or disguised content',
    (bytes, mediaType, name) => {
      expect(() =>
        assertIncidentReportBinary(bytes as Buffer, mediaType, name),
      ).toThrow(BadRequestException);
    },
  );
});
