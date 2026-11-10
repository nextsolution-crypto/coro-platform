import { BadRequestException, Injectable } from '@nestjs/common';

export type RenderedDisplayPlan = {
  bytes: Buffer;
  mimeType: 'image/svg+xml';
  width: number;
  height: number;
};

@Injectable()
export class DisplayPlanRendererService {
  private static readonly MAX_SOURCE_BYTES = 25 * 1024 * 1024;
  private static readonly MAX_DIMENSION = 16_384;
  private static readonly MAX_PIXELS = 100_000_000;

  render(input: {
    source: Buffer;
    mimeType: string;
    youAreHereX: number;
    youAreHereY: number;
    orientationDegrees: number;
  }): RenderedDisplayPlan {
    if (input.source.length > DisplayPlanRendererService.MAX_SOURCE_BYTES)
      throw new BadRequestException('Source graphique trop volumineuse.');
    if (
      !Number.isFinite(input.youAreHereX) ||
      !Number.isFinite(input.youAreHereY) ||
      input.youAreHereX < 0 ||
      input.youAreHereX > 1 ||
      input.youAreHereY < 0 ||
      input.youAreHereY > 1
    )
      throw new BadRequestException('Coordonnées du repère invalides.');
    if (
      !Number.isFinite(input.orientationDegrees) ||
      input.orientationDegrees < 0 ||
      input.orientationDegrees >= 360
    )
      throw new BadRequestException('Orientation du repère invalide.');
    const dimensions = this.dimensions(input.source, input.mimeType);
    this.assertDimensions(dimensions.width, dimensions.height);
    const x = Math.round(input.youAreHereX * dimensions.width * 1000) / 1000;
    const y = Math.round(input.youAreHereY * dimensions.height * 1000) / 1000;
    const radius = Math.max(
      10,
      Math.round(Math.min(dimensions.width, dimensions.height) * 0.018),
    );
    const escapedMime =
      input.mimeType === 'image/png' ? 'image/png' : 'image/jpeg';
    const data = input.source.toString('base64');
    const svg = [
      `<svg xmlns="http://www.w3.org/2000/svg" width="${dimensions.width}" height="${dimensions.height}" viewBox="0 0 ${dimensions.width} ${dimensions.height}">`,
      `<image width="${dimensions.width}" height="${dimensions.height}" preserveAspectRatio="xMidYMid meet" href="data:${escapedMime};base64,${data}"/>`,
      `<g aria-label="Vous êtes ici" transform="translate(${x} ${y}) rotate(${input.orientationDegrees})">`,
      `<circle r="${radius}" fill="#d71920" stroke="#ffffff" stroke-width="${Math.max(3, Math.round(radius / 4))}"/>`,
      `<path d="M 0 ${-radius * 2.2} L ${-radius * 0.55} ${-radius * 1.15} L ${radius * 0.55} ${-radius * 1.15} Z" fill="#d71920" stroke="#ffffff" stroke-width="${Math.max(2, Math.round(radius / 6))}"/>`,
      '</g></svg>',
    ].join('');
    return {
      bytes: Buffer.from(svg, 'utf8'),
      mimeType: 'image/svg+xml',
      width: dimensions.width,
      height: dimensions.height,
    };
  }

  private dimensions(bytes: Buffer, mimeType: string) {
    if (mimeType === 'image/png') {
      if (bytes.length < 24 || bytes.subarray(1, 4).toString('ascii') !== 'PNG')
        throw new BadRequestException('Source PNG invalide.');
      return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
    }
    if (mimeType === 'image/jpeg') return this.jpegDimensions(bytes);
    throw new BadRequestException(
      'DISPLAY-03 génère les variantes PNG/JPEG; le rendu PDF reste à raccorder.',
    );
  }

  private jpegDimensions(bytes: Buffer) {
    if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8)
      throw new BadRequestException('Source JPEG invalide.');
    let offset = 2;
    while (offset + 8 < bytes.length) {
      if (bytes[offset] !== 0xff) {
        offset++;
        continue;
      }
      const marker = bytes[offset + 1];
      const length = bytes.readUInt16BE(offset + 2);
      if ([0xc0, 0xc1, 0xc2].includes(marker)) {
        return {
          height: bytes.readUInt16BE(offset + 5),
          width: bytes.readUInt16BE(offset + 7),
        };
      }
      if (length < 2) break;
      offset += length + 2;
    }
    throw new BadRequestException('Dimensions JPEG introuvables.');
  }

  private assertDimensions(width: number, height: number) {
    if (
      width < 1 ||
      height < 1 ||
      width > DisplayPlanRendererService.MAX_DIMENSION ||
      height > DisplayPlanRendererService.MAX_DIMENSION ||
      width * height > DisplayPlanRendererService.MAX_PIXELS
    )
      throw new BadRequestException('Dimensions graphiques non admissibles.');
  }
}
