import { readFile } from 'node:fs/promises';
import JSZip from 'jszip';
import { DOMParser } from '@xmldom/xmldom';
import mammoth from 'mammoth';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { parseOcrTsv } from './local-ocr-runner.mjs';
const [, , input, mime, maxPagesRaw, ocrRaw] = process.argv;
const maxPages = Number(maxPagesRaw);
const bytes = await readFile(input);
function xml(value) {
  if (/<!DOCTYPE|<!ENTITY/i.test(value)) throw new Error('OFFICE_INVALID');
  return new DOMParser({
    errorHandler: {
      warning() {},
      error() {
        throw new Error('OFFICE_INVALID');
      },
      fatalError() {
        throw new Error('OFFICE_INVALID');
      },
    },
  }).parseFromString(value, 'text/xml');
}
function elements(node, name) {
  return Array.from(node.getElementsByTagName(name));
}
function text(node, name) {
  return elements(node, name)
    .map((n) => n.textContent ?? '')
    .join('');
}
try {
  let pages = [];
  if (mime === 'text/csv' || mime === 'text/tab-separated-values') {
    if (bytes.length > 10 * 1024 * 1024)
      throw new Error('OFFICE_SIZE_LIMIT_EXCEEDED');
    let value;
    try {
      value = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    } catch {
      throw new Error('OFFICE_UTF8_REQUIRED');
    }
    const first = value.split(/\r?\n/)[0];
    const delimiter =
      mime === 'text/tab-separated-values'
        ? '\t'
        : first.split(';').length > first.split(',').length
          ? ';'
          : ',';
    const rows = [];
    let row = [];
    let cell = '';
    let quoted = false;
    for (let i = 0; i < value.length; i++) {
      const char = value[i];
      if (char === '"') {
        if (quoted && value[i + 1] === '"') {
          cell += '"';
          i++;
        } else quoted = !quoted;
      } else if (!quoted && (char === delimiter || char === '\n')) {
        row.push(cell);
        cell = '';
        if (row.length > 1000 || rows.length > 10000)
          throw new Error('OFFICE_ROW_LIMIT_EXCEEDED');
        if (char === '\n') {
          if (row.some((c) => c.trim())) rows.push(row);
          row = [];
        }
      } else if (char !== '\r' || quoted) cell += char;
    }
    if (quoted) throw new Error('OFFICE_INVALID');
    row.push(cell);
    if (row.some((c) => c.trim())) rows.push(row);
    const header = rows[0] ?? [];
    for (let start = 1; start < rows.length; start += 100) {
      pages.push({
        pageNumber: pages.length + 1,
        sectionPath: `Tableau · lignes ${start + 1}–${Math.min(rows.length, start + 100)} · en-têtes ligne 1`,
        text: rows
          .slice(start, start + 100)
          .map(
            (r, index) =>
              `Ligne ${start + index + 1} : ` +
              r
                .map(
                  (v, col) => `${header[col] || `Colonne ${col + 1}`} : ${v}`,
                )
                .join(' | '),
          )
          .join('\n'),
      });
    }
    if (pages.length > maxPages) throw new Error('PAGE_LIMIT_EXCEEDED');
  } else if (mime.startsWith('image/')) {
    const policy = JSON.parse(ocrRaw);
    if (!policy.enabled) throw new Error('OCR_DISABLED');
    const result = await promisify(execFile)(
      'tesseract',
      [
        input,
        'stdout',
        '-l',
        'fra+eng',
        '--psm',
        '3',
        '-c',
        'tessedit_create_tsv=1',
      ],
      {
        timeout: policy.timeoutMs,
        maxBuffer: 2 * 1024 * 1024,
        env: {
          PATH: process.env.PATH,
          LANG: 'C.UTF-8',
          OMP_THREAD_LIMIT: '1',
          ...(process.env.TESSDATA_PREFIX
            ? { TESSDATA_PREFIX: process.env.TESSDATA_PREFIX }
            : {}),
        },
      },
    );
    // Multi-frame TIFF must be exported as PDF to preserve exact page citations.
    if (
      result.stdout
        .split(/\r?\n/)
        .slice(1)
        .some((line) => Number(line.split('\t')[1]) > 1)
    )
      throw new Error('IMAGE_MULTIPAGE_REQUIRES_PDF');
    pages = [
      {
        pageNumber: 1,
        text: parseOcrTsv(result.stdout, policy.minConfidence),
        extractionMethod: 'LOCAL_OCR',
      },
    ];
  } else {
    const zip = await JSZip.loadAsync(bytes);
    const entries = Object.values(zip.files);
    if (
      entries.length > 5000 ||
      entries.reduce((sum, e) => sum + (e._data?.uncompressedSize ?? 0), 0) >
        50 * 1024 * 1024
    )
      throw new Error('OFFICE_SIZE_LIMIT_EXCEEDED');
    if (
      entries.some((e) => /vbaProject|externalLinks|embeddings\//i.test(e.name))
    )
      throw new Error('OFFICE_ACTIVE_CONTENT_UNSUPPORTED');
    if (mime.includes('wordprocessingml')) {
      const result = await mammoth.extractRawText({ buffer: bytes });
      // DOCX has no stable rendered page numbers. Cite explicit logical sections.
      const blocks = result.value.split(/\n\s*\n/).filter((s) => s.trim());
      if (blocks.length > maxPages) throw new Error('PAGE_LIMIT_EXCEEDED');
      pages = blocks.map((block, i) => ({
        pageNumber: i + 1,
        sectionPath: `DOCX · bloc ${i + 1} (pagination logique)`,
        text: block,
      }));
    } else {
      const readXml = async (name) => {
        const entry = zip.file(name);
        if (!entry) throw new Error('OFFICE_INVALID');
        return xml(await entry.async('string'));
      };
      const workbook = await readXml('xl/workbook.xml');
      const relationships = elements(
        await readXml('xl/_rels/workbook.xml.rels'),
        'Relationship',
      );
      const strings = zip.file('xl/sharedStrings.xml')
        ? elements(await readXml('xl/sharedStrings.xml'), 'si').map((n) =>
            text(n, 't'),
          )
        : [];
      const sheets = elements(workbook, 'sheet');
      if (sheets.length > maxPages) throw new Error('PAGE_LIMIT_EXCEEDED');
      for (const sheet of sheets) {
        const rel = relationships.find(
          (r) => r.getAttribute('Id') === sheet.getAttribute('r:id'),
        );
        const target = rel?.getAttribute('Target');
        if (
          !target ||
          rel.getAttribute('TargetMode') === 'External' ||
          target.includes('..')
        )
          throw new Error('OFFICE_INVALID');
        const path = target.startsWith('/') ? target.slice(1) : `xl/${target}`;
        const data = await readXml(path);
        const rows = elements(data, 'row');
        if (rows.length > 10000) throw new Error('OFFICE_ROW_LIMIT_EXCEEDED');
        let count = 0;
        const lines = rows
          .map((row) =>
            elements(row, 'c')
              .map((c) => {
                if (++count > 100000)
                  throw new Error('OFFICE_CELL_LIMIT_EXCEEDED');
                const cell = c.getAttribute('r');
                const type = c.getAttribute('t');
                if (elements(c, 'f').length)
                  return `${cell}: [FORMULE NON RECALCULÉE — valeur non utilisée comme preuve]`;
                if (type === 'e') return `${cell}: [ERREUR EXCEL]`;
                const value =
                  type === 's'
                    ? (strings[Number(text(c, 'v'))] ?? '')
                    : type === 'inlineStr'
                      ? text(c, 't')
                      : text(c, 'v');
                return `${cell}: ${value}`;
              })
              .join(' | '),
          )
          .join('\n');
        pages.push({
          pageNumber: pages.length + 1,
          sectionPath: `Excel · feuille « ${sheet.getAttribute('name')} » · cellules indiquées dans l’extrait · valeurs brutes, sans recalcul`,
          text: `Feuille : ${sheet.getAttribute('name')}\n${lines}`,
        });
      }
    }
  }
  process.stdout.write(JSON.stringify({ pages }));
} catch (error) {
  process.stderr.write(
    /^(OCR_[A-Z_]+|OFFICE_[A-Z_]+|IMAGE_[A-Z_]+|PAGE_LIMIT_EXCEEDED)$/.test(
      error.message,
    )
      ? error.message
      : 'OFFICE_INVALID',
  );
  process.exitCode = 2;
}
