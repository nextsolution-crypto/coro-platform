import { Injectable } from '@nestjs/common';

const ALLOWED_HOST = 'getcoro.io';
const PRIVATE_ROUTE_PREFIXES = [
  '/api',
  '/admin',
  '/login',
  '/dashboard',
  '/client-portal',
  '/projects/',
  '/buildings/',
];

@Injectable()
export class PublicKnowledgeSecurity {
  private readonly instructionPattern =
    /(?:ignore|oublie|bypass|contourne|disregard).{0,60}(?:instruction|règle|regle|authorization|system)|\b(system prompt|developer message|tool call)\b/i;

  normalizeText(value: string): string {
    return value
      .normalize('NFC')
      .replace(/\r\n?/g, '\n')
      .replace(/[\t ]+/g, ' ')
      .replace(/ *\n */g, '\n')
      .trim();
  }

  terms(value: string): string[] {
    const stop = new Set([
      'a',
      'au',
      'aux',
      'avec',
      'can',
      'comment',
      'dans',
      'de',
      'des',
      'do',
      'does',
      'du',
      'en',
      'est',
      'et',
      'for',
      'how',
      'is',
      'la',
      'le',
      'les',
      'of',
      'on',
      'ou',
      'pour',
      'que',
      'quel',
      'quelle',
      'the',
      'to',
      'un',
      'une',
      'what',
      'where',
      'which',
      'who',
      'why',
      'your',
      'vous',
      'coro',
    ]);
    return (
      value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .match(/[a-z0-9]{2,}/g) ?? []
    ).filter((term) => !stop.has(term));
  }

  suspicious(value: string): boolean {
    return this.instructionPattern.test(
      value.normalize('NFD').replace(/[\u0300-\u036f]/g, ''),
    );
  }

  assertCanonicalPublicUrl(value: string): string {
    let url: URL;
    try {
      url = new URL(value);
    } catch {
      throw new Error('PUBLIC_KNOWLEDGE_URL_INVALID');
    }
    if (
      url.protocol !== 'https:' ||
      url.hostname !== ALLOWED_HOST ||
      url.username ||
      url.password ||
      url.port
    ) {
      throw new Error('PUBLIC_KNOWLEDGE_URL_NOT_ALLOWED');
    }
    const path = url.pathname.replace(/\/{2,}/g, '/');
    if (
      PRIVATE_ROUTE_PREFIXES.some(
        (prefix) => path === prefix.slice(0, -1) || path.startsWith(prefix),
      )
    ) {
      throw new Error('PUBLIC_KNOWLEDGE_ROUTE_NOT_PUBLIC');
    }
    const language = url.searchParams.get('lang');
    if (language && language !== 'en')
      throw new Error('PUBLIC_KNOWLEDGE_URL_QUERY_NOT_ALLOWED');
    for (const key of url.searchParams.keys())
      if (key !== 'lang')
        throw new Error('PUBLIC_KNOWLEDGE_URL_QUERY_NOT_ALLOWED');
    url.hash = '';
    url.pathname = path === '/' ? '/' : path.replace(/\/$/, '');
    return url.toString();
  }
}
