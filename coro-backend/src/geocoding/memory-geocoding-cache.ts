import { createHmac } from 'node:crypto';
import { GeocodingCache } from './geocoding-cache.interface';
import { GeocodingAddress, GeocodingResult } from './geocoding.types';

type CacheEntry = {
  expiresAt: number;
  result: GeocodingResult;
};

export type MemoryGeocodingCacheOptions = {
  secret?: string;
  ttlSeconds?: number;
  maxEntries?: number;
  now?: () => number;
};

const DEFAULT_TTL_SECONDS = 86_400;
const DEFAULT_MAX_ENTRIES = 1_000;

export class MemoryGeocodingCache implements GeocodingCache {
  private readonly entries = new Map<string, CacheEntry>();
  private readonly secret?: string;
  private readonly ttlMs: number;
  private readonly maxEntries: number;
  private readonly now: () => number;

  constructor(options: MemoryGeocodingCacheOptions = {}) {
    this.secret = options.secret?.trim() || undefined;
    this.ttlMs =
      this.positiveInteger(options.ttlSeconds, DEFAULT_TTL_SECONDS) * 1_000;
    this.maxEntries = this.positiveInteger(
      options.maxEntries,
      DEFAULT_MAX_ENTRIES,
    );
    this.now = options.now ?? Date.now;
  }

  get(address: GeocodingAddress): GeocodingResult | undefined {
    const key = this.keyFor(address);
    if (!key) return undefined;

    const entry = this.entries.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt <= this.now()) {
      this.entries.delete(key);
      return undefined;
    }

    return structuredClone(entry.result);
  }

  set(address: GeocodingAddress, result: GeocodingResult): void {
    const key = this.keyFor(address);
    if (!key) return;

    this.removeExpired();
    if (!this.entries.has(key) && this.entries.size >= this.maxEntries) {
      const oldestKey = this.entries.keys().next().value as string | undefined;
      if (oldestKey) this.entries.delete(oldestKey);
    }

    this.entries.delete(key);
    this.entries.set(key, {
      expiresAt: this.now() + this.ttlMs,
      result: structuredClone(result),
    });
  }

  private keyFor(address: GeocodingAddress): string | undefined {
    if (!this.secret) return undefined;
    return createHmac('sha256', this.secret)
      .update(JSON.stringify(address))
      .digest('hex');
  }

  private removeExpired(): void {
    const now = this.now();
    for (const [key, entry] of this.entries) {
      if (entry.expiresAt <= now) this.entries.delete(key);
    }
  }

  private positiveInteger(value: number | undefined, fallback: number): number {
    return Number.isInteger(value) && (value as number) > 0
      ? (value as number)
      : fallback;
  }
}
