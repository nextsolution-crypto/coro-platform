import { BadRequestException } from '@nestjs/common';
import { createHash } from 'node:crypto';

const MAX_CONTENT_BYTES = 256 * 1024;
const FORBIDDEN_KEYS = new Set(['__proto__', 'prototype', 'constructor']);

function normalized(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(normalized);
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return Object.keys(record)
      .sort()
      .reduce<Record<string, unknown>>((result, key) => {
        if (FORBIDDEN_KEYS.has(key)) {
          throw new BadRequestException('Clé de formulaire interdite.');
        }
        result[key] = normalized(record[key]);
        return result;
      }, {});
  }
  return value;
}

export function validateAndHashIncidentReportContent(
  content: Record<string, unknown>,
  formSchema: unknown,
): { normalized: Record<string, unknown>; sha256: string } {
  if (!content || Array.isArray(content) || typeof content !== 'object') {
    throw new BadRequestException('Le contenu du rapport doit être un objet.');
  }
  const canonical = normalized(content) as Record<string, unknown>;
  const serialized = JSON.stringify(canonical);
  if (Buffer.byteLength(serialized, 'utf8') > MAX_CONTENT_BYTES) {
    throw new BadRequestException('Le contenu du rapport dépasse 256 Ko.');
  }
  const requiredFields =
    formSchema && typeof formSchema === 'object'
      ? (formSchema as { requiredFields?: unknown }).requiredFields
      : undefined;
  if (requiredFields !== undefined && !Array.isArray(requiredFields)) {
    throw new BadRequestException('Le modèle de formulaire est invalide.');
  }
  for (const key of (requiredFields ?? []) as unknown[]) {
    if (typeof key !== 'string' || !key || !(key in canonical)) {
      throw new BadRequestException(
        `Champ obligatoire manquant: ${String(key)}.`,
      );
    }
  }
  return {
    normalized: canonical,
    sha256: createHash('sha256').update(serialized).digest('hex'),
  };
}
