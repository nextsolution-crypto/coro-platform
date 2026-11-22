import {
  ArgumentMetadata,
  BadRequestException,
  Injectable,
  Logger,
  PipeTransform,
} from '@nestjs/common';
import { getMetadataStorage } from 'class-validator';

/**
 * Champs inconnus dans les corps de requête (audit M3-08).
 *
 * La validation globale retire les champs non déclarés sans rien dire. Ce
 * filtre, placé avant elle, repère ces champs sur les routes typées (DTO
 * class-validator) :
 * - par défaut, il les journalise (nom de route et noms des champs, jamais
 *   les valeurs) pour corriger les écrans qui envoient trop ;
 * - avec STRICT_PAYLOAD_VALIDATION=true, il les refuse (400) ;
 * - STRICT_PAYLOAD_PREFIXES=/api/a,/api/b rend la règle stricte route par
 *   route pendant la transition.
 */
@Injectable()
export class UnknownFieldsAuditPipe implements PipeTransform {
  private readonly logger = new Logger('UnknownFields');

  transform(value: unknown, metadata: ArgumentMetadata) {
    if (metadata.type !== 'body' || !metadata.metatype || !value || typeof value !== 'object' || Array.isArray(value)) {
      return value;
    }
    const declared = declaredProperties(metadata.metatype);
    if (declared.size === 0) return value; // route non typée : rien à comparer
    const unknown = Object.keys(value as Record<string, unknown>).filter((key) => !declared.has(key));
    if (unknown.length === 0) return value;
    const route = currentRoute.get() ?? metadata.metatype.name;
    if (isStrict(route)) {
      throw new BadRequestException(`Champ(s) non prévu(s) : ${unknown.join(', ')}.`);
    }
    this.logger.warn(`${route} — champ(s) non déclaré(s) retiré(s) : ${unknown.join(', ')}`);
    return value;
  }
}

export function declaredProperties(metatype: Function): Set<string> {
  const storage = getMetadataStorage() as any;
  const metas: Array<{ propertyName: string }> =
    typeof storage.getTargetValidationMetadatas === 'function'
      ? storage.getTargetValidationMetadatas(metatype, '', true, false)
      : [];
  return new Set(metas.map((meta) => meta.propertyName));
}

function isStrict(route: string): boolean {
  if (process.env.STRICT_PAYLOAD_VALIDATION === 'true') return true;
  const prefixes = (process.env.STRICT_PAYLOAD_PREFIXES ?? '')
    .split(',')
    .map((prefix) => prefix.trim())
    .filter(Boolean);
  return prefixes.some((prefix) => route.startsWith(prefix));
}

/** Route courante, posée par un intergiciel léger (méthode + chemin sans requête). */
export const currentRoute = (() => {
  const { AsyncLocalStorage } = require('async_hooks') as typeof import('async_hooks');
  const storage = new AsyncLocalStorage<string>();
  return {
    middleware: (req: any, _res: any, next: () => void) =>
      storage.run(`${req.method} ${String(req.originalUrl || req.url || '').split('?')[0]}`, next),
    get: () => storage.getStore(),
  };
})();
