import { BadRequestException, Injectable } from '@nestjs/common';
import { spawn } from 'child_process';
import { mkdtemp, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { KnowledgeConfig } from './knowledge.config';
import { ExtractedPage } from './knowledge.types';

@Injectable()
export class KnowledgeExtractorService {
  private active = 0;
  constructor(private readonly config: KnowledgeConfig) {}

  async extract(bytes: Buffer, mimeType: string): Promise<ExtractedPage[]> {
    if (this.active >= 2) throw new Error('EXTRACTOR_BUSY');
    this.active++;
    try {
      return await this.extractBounded(bytes, mimeType);
    } finally {
      this.active--;
    }
  }

  private async extractBounded(
    bytes: Buffer,
    mimeType: string,
  ): Promise<ExtractedPage[]> {
    if (bytes.length > 50 * 1024 * 1024)
      throw new Error('SOURCE_SIZE_LIMIT_EXCEEDED');
    if (mimeType === 'text/plain' || mimeType === 'text/markdown') {
      if (bytes.length > this.config.maxExtractionBytes)
        throw new Error('EXTRACTION_OUTPUT_LIMIT_EXCEEDED');
      let text: string;
      try {
        text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
      } catch {
        throw new Error('TEXT_UTF8_REQUIRED');
      }
      return [{ pageNumber: 1, text }];
    }
    if (
      ![
        'text/csv',
        'text/tab-separated-values',
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'image/png',
        'image/jpeg',
        'image/tiff',
      ].includes(mimeType)
    )
      throw new BadRequestException(
        'Format non indexable sans adaptateur local.',
      );
    return this.extractPdf(bytes, mimeType);
  }

  private async extractPdf(
    bytes: Buffer,
    mimeType: string,
  ): Promise<ExtractedPage[]> {
    if (bytes.length > 50 * 1024 * 1024)
      throw new Error('PDF_SIZE_LIMIT_EXCEEDED');
    const directory = await mkdtemp(join(tmpdir(), 'coro-knowledge-'));
    const input = join(
      directory,
      mimeType === 'application/pdf' ? 'input.pdf' : 'input.bin',
    );
    try {
      await writeFile(input, bytes, { flag: 'wx', mode: 0o600 });
      return await new Promise((resolve, reject) => {
        const runner = join(
          __dirname,
          mimeType === 'application/pdf'
            ? 'pdfjs-extractor-runner.mjs'
            : 'office-extractor-runner.mjs',
        );
        const child = spawn(
          process.execPath,
          [
            runner,
            input,
            ...(mimeType === 'application/pdf' ? [] : [mimeType]),
            String(this.config.maxPages),
            JSON.stringify({
              enabled: this.config.localOcrEnabled,
              maxPages: this.config.ocrMaxPages,
              minConfidence: this.config.ocrMinConfidence,
              timeoutMs: this.config.ocrPageTimeoutMs,
            }),
          ],
          {
            shell: false,
            windowsHide: true,
            detached: process.platform !== 'win32',
            env: {
              PATH: process.env.PATH,
              LANG: 'C.UTF-8',
              TMPDIR: directory,
              ...(process.env.TESSDATA_PREFIX
                ? { TESSDATA_PREFIX: process.env.TESSDATA_PREFIX }
                : {}),
            },
            stdio: ['ignore', 'pipe', 'pipe'],
          },
        );
        const stdout: Buffer[] = [];
        const stderr: Buffer[] = [];
        let settled = false;
        let outputBytes = 0;
        const stop = () => {
          try {
            if (process.platform !== 'win32' && child.pid)
              process.kill(-child.pid, 'SIGKILL');
            else child.kill('SIGKILL');
          } catch {
            /* the worker may already have exited */
          }
        };
        const finish = (error?: Error, pages?: ExtractedPage[]) => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          error ? reject(error) : resolve(pages ?? []);
        };
        const timer = setTimeout(() => {
          stop();
          finish(new Error('EXTRACTION_TIMEOUT'));
        }, this.config.extractionTimeoutMs);
        child.stdout.on('data', (chunk: Buffer) => {
          outputBytes += chunk.length;
          if (outputBytes > this.config.maxExtractionBytes) {
            stop();
            finish(new Error('EXTRACTION_OUTPUT_LIMIT_EXCEEDED'));
          } else stdout.push(chunk);
        });
        child.stderr.on('data', (chunk: Buffer) => {
          if (Buffer.concat(stderr).length < 4096) stderr.push(chunk);
        });
        child.once('error', () => finish(new Error('EXTRACTOR_CRASHED')));
        child.once('close', (code) => {
          if (settled) return;
          if (code !== 0)
            return finish(
              new Error(
                Buffer.concat(stderr).toString('utf8') || 'PDF_INVALID',
              ),
            );
          try {
            const result = JSON.parse(
              Buffer.concat(stdout).toString('utf8'),
            ) as {
              pages: ExtractedPage[];
            };
            if (
              !Array.isArray(result.pages) ||
              result.pages.length > this.config.maxPages ||
              result.pages.some(
                (p, i) =>
                  p.pageNumber !== i + 1 ||
                  typeof p.text !== 'string' ||
                  !['NATIVE_TEXT', 'LOCAL_OCR'].includes(
                    p.extractionMethod ?? 'NATIVE_TEXT',
                  ),
              )
            )
              throw new Error('MALFORMED_EXTRACTION');
            finish(undefined, result.pages);
          } catch {
            finish(new Error('MALFORMED_EXTRACTION'));
          }
        });
      });
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  }
}
