import { BadRequestException, Injectable } from '@nestjs/common';

export const DISPLAY_PLAN_PROFILES = {
  ORIGINAL_17X11: { width: 4080, height: 2640 },
  SCREEN_16X9: { width: 3840, height: 2160 },
  SCREEN_16X10: { width: 3840, height: 2400 },
} as const;

export type DisplayPlanProfile = keyof typeof DISPLAY_PLAN_PROFILES;

export type PreparedDisplayPlan = {
  bytes: Buffer;
  mimeType: 'image/svg+xml';
  profile: DisplayPlanProfile;
  width: number;
  height: number;
  contentWidth: number;
  contentHeight: number;
  marginLeft: number;
  marginTop: number;
  fit: 'CONTAIN';
};

@Injectable()
export class DisplayPlanProfileService {
  prepare(source: Buffer, profile: DisplayPlanProfile): PreparedDisplayPlan {
    const target = DISPLAY_PLAN_PROFILES[profile];
    if (!target) throw new BadRequestException('Profil Display inconnu.');
    const sourceSize = this.pngDimensions(source);
    const scale = Math.min(
      target.width / sourceSize.width,
      target.height / sourceSize.height,
    );
    const contentWidth = Math.round(sourceSize.width * scale);
    const contentHeight = Math.round(sourceSize.height * scale);
    const marginLeft = Math.floor((target.width - contentWidth) / 2);
    const marginTop = Math.floor((target.height - contentHeight) / 2);
    const encoded = source.toString('base64');
    const svg = [
      `<svg xmlns="http://www.w3.org/2000/svg" width="${target.width}" height="${target.height}" viewBox="0 0 ${target.width} ${target.height}">`,
      `<rect width="${target.width}" height="${target.height}" fill="#ffffff"/>`,
      `<image x="${marginLeft}" y="${marginTop}" width="${contentWidth}" height="${contentHeight}" preserveAspectRatio="xMidYMid meet" href="data:image/png;base64,${encoded}"/>`,
      '</svg>',
    ].join('');
    return {
      bytes: Buffer.from(svg, 'utf8'),
      mimeType: 'image/svg+xml',
      profile,
      width: target.width,
      height: target.height,
      contentWidth,
      contentHeight,
      marginLeft,
      marginTop,
      fit: 'CONTAIN',
    };
  }

  private pngDimensions(bytes: Buffer) {
    if (
      bytes.length < 24 ||
      bytes[0] !== 0x89 ||
      bytes.subarray(1, 4).toString('ascii') !== 'PNG'
    )
      throw new BadRequestException('Raster PDF PNG invalide.');
    const width = bytes.readUInt32BE(16);
    const height = bytes.readUInt32BE(20);
    if (
      width < 1 ||
      height < 1 ||
      width > 16_384 ||
      height > 16_384 ||
      width * height > 100_000_000
    )
      throw new BadRequestException('Dimensions du raster PDF invalides.');
    return { width, height };
  }
}
