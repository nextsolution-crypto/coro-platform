import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  constants,
  lstat,
  mkdir,
  open,
  rename,
  rm,
  writeFile,
} from 'fs/promises';
import { join, resolve } from 'path';
import {
  DisplayPdfEngineService,
  DisplayPdfRejectedError,
  PdfRenderResult,
} from './display-pdf-engine.service';

type RasterizerResult = Omit<PdfRenderResult, 'bytes'> & {
  outputBytes: number;
  outputSha256: string;
};

@Injectable()
export class DisplayPdfRasterizerBridgeService {
  private readonly root = resolve(
    process.env.DISPLAY_PDF_SPOOL_DIR ?? '/var/lib/coro/display-pdf-spool',
  );
  private readonly timeoutMs = 40_000;

  async render(
    source: Buffer,
    pageNumber: number,
    dpi: number,
  ): Promise<PdfRenderResult> {
    new DisplayPdfEngineService().validateEnvelope(source, pageNumber, dpi);
    const requestId = randomUUID();
    const directory = this.safePath(requestId);
    await mkdir(directory, { recursive: false, mode: 0o700 });
    try {
      await writeFile(join(directory, 'source.pdf'), source, {
        flag: 'wx',
        mode: 0o600,
      });
      await writeFile(
        join(directory, 'request.tmp'),
        JSON.stringify({ requestId, pageNumber, dpi }),
        { flag: 'wx', mode: 0o600 },
      );
      await rename(
        join(directory, 'request.tmp'),
        join(directory, 'request.ready'),
      );

      const deadline = Date.now() + this.timeoutMs;
      while (Date.now() < deadline) {
        const failure = await this.readOptional(
          join(directory, 'failure.json'),
        );
        if (failure) {
          const parsed = JSON.parse(failure) as {
            code?: string;
            message?: string;
          };
          throw new DisplayPdfRejectedError(
            parsed.code ?? 'RASTERIZER_FAILURE',
            parsed.message ?? 'Ã‰chec du rasteriseur isolÃ©.',
          );
        }
        const result = await this.readOptional(join(directory, 'result.json'));
        if (result) {
          const parsed = JSON.parse(result) as RasterizerResult;
          const bytes = await this.readBoundedFile(
            join(directory, 'output.png'),
            128 * 1024 * 1024,
          );
          if (
            bytes.length !== parsed.outputBytes ||
            DisplayPdfEngineService.sha256(bytes) !== parsed.outputSha256
          )
            throw new DisplayPdfRejectedError(
              'RASTERIZER_OUTPUT_INTEGRITY',
              'IntÃ©gritÃ© de la sortie du rasteriseur invalide.',
            );
          return { ...parsed, bytes };
        }
        await new Promise((resolveWait) => setTimeout(resolveWait, 50));
      }
      throw new DisplayPdfRejectedError(
        'RASTERIZER_TIMEOUT',
        'DÃ©lai du rasteriseur isolÃ© dÃ©passÃ©.',
      );
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  }

  private safePath(requestId: string) {
    if (!/^[0-9a-f-]{36}$/.test(requestId))
      throw new Error('Invalid request id.');
    const path = resolve(this.root, requestId);
    if (!path.startsWith(`${this.root}\\`) && !path.startsWith(`${this.root}/`))
      throw new Error('Invalid spool path.');
    return path;
  }

  private async readOptional(path: string) {
    try {
      return (await this.readBoundedFile(path, 64 * 1024)).toString('utf8');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
      throw error;
    }
  }

  private async readBoundedFile(path: string, maxBytes: number) {
    const metadata = await lstat(path);
    if (
      !metadata.isFile() ||
      metadata.isSymbolicLink() ||
      metadata.size > maxBytes
    )
      throw new Error('Invalid rasterizer response.');
    const handle = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW);
    try {
      const opened = await handle.stat();
      if (
        !opened.isFile() ||
        opened.size !== metadata.size ||
        opened.size > maxBytes
      )
        throw new Error('Rasterizer response changed while reading.');
      return await handle.readFile();
    } finally {
      await handle.close();
    }
  }
}
