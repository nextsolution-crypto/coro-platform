import { Injectable } from '@nestjs/common';
import { execFile } from 'child_process';
import { mkdtemp, readFile, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { promisify } from 'util';
import { createHash } from 'crypto';

const run = promisify(execFile);

export class DisplayPdfRejectedError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export type PdfRenderResult = {
  bytes: Buffer;
  width: number;
  height: number;
  pageCount: number;
  engine: 'POPPLER';
  engineVersion: string;
  parameters: { pageNumber: number; dpi: number; format: 'PNG' };
};

@Injectable()
export class DisplayPdfEngineService {
  static readonly MAX_SOURCE_BYTES = 25 * 1024 * 1024;
  static readonly MAX_PAGES = 100;
  static readonly MAX_PIXELS = 100_000_000;
  static readonly TIMEOUT_MS = 30_000;

  static sha256(bytes: Buffer) {
    return createHash('sha256').update(bytes).digest('hex');
  }

  async render(
    source: Buffer,
    pageNumber: number,
    dpi: number,
  ): Promise<PdfRenderResult> {
    this.validateEnvelope(source, pageNumber, dpi);
    const directory = await mkdtemp(join(tmpdir(), 'coro-display-pdf-'));
    const input = join(directory, 'source.pdf');
    const outputPrefix = join(directory, 'page');
    try {
      await writeFile(input, source, { flag: 'wx', mode: 0o600 });
      const versionResult = await run('pdfinfo', ['-v'], {
        timeout: 5_000,
        maxBuffer: 16 * 1024,
      }).catch((error: unknown) => {
        throw new DisplayPdfRejectedError(
          'ENGINE_UNAVAILABLE',
          this.safeError(error),
        );
      });
      const { stdout } = await run('pdfinfo', ['-isodates', input], {
        timeout: 10_000,
        maxBuffer: 128 * 1024,
      }).catch((error: unknown) => {
        throw new DisplayPdfRejectedError('PDF_INVALID', this.safeError(error));
      });
      const metadata = this.parseInfo(stdout);
      if (metadata.encrypted)
        throw new DisplayPdfRejectedError(
          'PDF_ENCRYPTED',
          'Les PDF chiffrés sont refusés en V1.',
        );
      if (
        metadata.pages < 1 ||
        metadata.pages > DisplayPdfEngineService.MAX_PAGES
      )
        throw new DisplayPdfRejectedError(
          'PDF_PAGE_COUNT',
          'Nombre de pages hors limites.',
        );
      if (pageNumber > metadata.pages)
        throw new DisplayPdfRejectedError(
          'PDF_PAGE_RANGE',
          'Page demandée inexistante.',
        );

      if (metadata.widthPoints && metadata.heightPoints) {
        const estimatedPixels =
          ((metadata.widthPoints * dpi) / 72) *
          ((metadata.heightPoints * dpi) / 72);
        if (estimatedPixels > DisplayPdfEngineService.MAX_PIXELS)
          throw new DisplayPdfRejectedError(
            'OUTPUT_PIXEL_LIMIT',
            'Dimensions PDF produisant une sortie supérieure à 100 mégapixels.',
          );
      }

      await run(
        'pdftocairo',
        [
          '-png',
          '-singlefile',
          '-f',
          String(pageNumber),
          '-l',
          String(pageNumber),
          '-r',
          String(dpi),
          input,
          outputPrefix,
        ],
        { timeout: DisplayPdfEngineService.TIMEOUT_MS, maxBuffer: 128 * 1024 },
      ).catch((error: unknown) => {
        throw new DisplayPdfRejectedError(
          this.isTimeout(error) ? 'PDF_TIMEOUT' : 'PDF_RENDER_FAILED',
          this.safeError(error),
        );
      });
      const bytes = await readFile(`${outputPrefix}.png`);
      const { width, height } = this.pngDimensions(bytes);
      if (width * height > DisplayPdfEngineService.MAX_PIXELS)
        throw new DisplayPdfRejectedError(
          'OUTPUT_PIXEL_LIMIT',
          'Sortie dépassant 100 mégapixels.',
        );
      return {
        bytes,
        width,
        height,
        pageCount: metadata.pages,
        engine: 'POPPLER',
        engineVersion: this.version(
          `${versionResult.stdout}\n${versionResult.stderr}`,
        ),
        parameters: { pageNumber, dpi, format: 'PNG' },
      };
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  }

  validateEnvelope(source: Buffer, pageNumber: number, dpi: number) {
    if (
      source.length < 8 ||
      source.length > DisplayPdfEngineService.MAX_SOURCE_BYTES
    )
      throw new DisplayPdfRejectedError('PDF_SIZE', 'Taille PDF hors limites.');
    if (source.subarray(0, 5).toString('ascii') !== '%PDF-')
      throw new DisplayPdfRejectedError('PDF_MAGIC', 'Signature PDF absente.');
    if (!Number.isInteger(pageNumber) || pageNumber < 1)
      throw new DisplayPdfRejectedError('PDF_PAGE_RANGE', 'Page invalide.');
    if (!Number.isInteger(dpi) || dpi < 72 || dpi > 300)
      throw new DisplayPdfRejectedError('PDF_DPI', 'Résolution hors limites.');
    const ascii = source.toString('latin1');
    const eof = ascii.lastIndexOf('%%EOF');
    if (eof < 0 || ascii.slice(eof + 5).trim().length > 0)
      throw new DisplayPdfRejectedError(
        'PDF_TRAILING_DATA',
        'Données non PDF détectées après la marque de fin.',
      );
    const forbidden = [
      '/JavaScript',
      '/JS',
      '/Launch',
      '/EmbeddedFile',
      '/Filespec',
      '/RichMedia',
      '/XFA',
      '/OpenAction',
      '/AA',
      '/URI',
      '/GoToR',
      '/SubmitForm',
      '/ImportData',
    ];
    if (forbidden.some((token) => ascii.includes(token)))
      throw new DisplayPdfRejectedError(
        'PDF_ACTIVE_CONTENT',
        'Contenu PDF actif ou incorporé refusé.',
      );
  }

  private parseInfo(output: string) {
    const pages = Number(/^Pages:\s+(\d+)$/im.exec(output)?.[1] ?? 0);
    const encrypted = /^Encrypted:\s+yes/im.test(output);
    const pageSize = /^Page size:\s+([\d.]+)\s+x\s+([\d.]+)\s+pts/im.exec(
      output,
    );
    return {
      pages,
      encrypted,
      widthPoints: pageSize ? Number(pageSize[1]) : null,
      heightPoints: pageSize ? Number(pageSize[2]) : null,
    };
  }

  private pngDimensions(bytes: Buffer) {
    if (bytes.length < 24 || bytes.subarray(1, 4).toString('ascii') !== 'PNG')
      throw new DisplayPdfRejectedError(
        'OUTPUT_INVALID',
        'Sortie PNG invalide.',
      );
    return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
  }

  private version(output: string) {
    return /pdfinfo version\s+([^\s]+)/i.exec(output)?.[1] ?? 'NOT_VERIFIED';
  }

  private safeError(error: unknown) {
    if (!(error instanceof Error)) return 'Erreur moteur PDF.';
    return error.message.replace(/[\r\n]+/g, ' ').slice(0, 300);
  }

  private isTimeout(error: unknown) {
    if (!error || typeof error !== 'object') return false;
    const candidate = error as {
      killed?: boolean;
      code?: string;
      signal?: string;
    };
    return (
      candidate.killed === true ||
      candidate.code === 'ETIMEDOUT' ||
      candidate.signal === 'SIGTERM'
    );
  }
}
