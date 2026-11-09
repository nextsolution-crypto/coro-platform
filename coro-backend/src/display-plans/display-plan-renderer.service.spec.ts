import { BadRequestException } from '@nestjs/common';
import { DisplayPlanRendererService } from './display-plan-renderer.service';

describe('DisplayPlanRendererService', () => {
  const renderer = new DisplayPlanRendererService();

  it('preserves source proportions and places an oriented marker deterministically', () => {
    const png = Buffer.alloc(24);
    png.writeUInt8(0x89, 0);
    png.write('PNG', 1, 'ascii');
    png.writeUInt32BE(2200, 16);
    png.writeUInt32BE(1700, 20);
    const first = renderer.render({
      source: png,
      mimeType: 'image/png',
      youAreHereX: 0.25,
      youAreHereY: 0.75,
      orientationDegrees: 90,
    });
    const second = renderer.render({
      source: png,
      mimeType: 'image/png',
      youAreHereX: 0.25,
      youAreHereY: 0.75,
      orientationDegrees: 90,
    });
    expect(first.width).toBe(2200);
    expect(first.height).toBe(1700);
    expect(first.bytes).toEqual(second.bytes);
    expect(first.bytes.toString()).toContain('viewBox="0 0 2200 1700"');
    expect(first.bytes.toString()).toContain('translate(550 1275) rotate(90)');
    expect(first.bytes.toString()).toContain(
      'preserveAspectRatio="xMidYMid meet"',
    );
  });

  it('refuses an unsupported source instead of inventing a rendering', () => {
    expect(() =>
      renderer.render({
        source: Buffer.from('%PDF-1.7'),
        mimeType: 'application/pdf',
        youAreHereX: 0.5,
        youAreHereY: 0.5,
        orientationDegrees: 0,
      }),
    ).toThrow(BadRequestException);
  });
});
