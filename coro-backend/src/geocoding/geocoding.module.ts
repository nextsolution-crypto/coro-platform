import { Module } from '@nestjs/common';
import { GEOCODING_CACHE, GeocodingCache } from './geocoding-cache.interface';
import { GEOCODING_PROVIDER } from './geocoding-provider.interface';
import { GeocodingService } from './geocoding.service';
import { MemoryGeocodingCache } from './memory-geocoding-cache';

function positiveInteger(value: string | undefined): number | undefined {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

@Module({
  providers: [
    GeocodingService,
    {
      provide: GEOCODING_PROVIDER,
      useValue: null,
    },
    {
      provide: GEOCODING_CACHE,
      useFactory: (): GeocodingCache =>
        new MemoryGeocodingCache({
          secret: process.env.GEOCODING_CACHE_HMAC_SECRET,
          ttlSeconds: positiveInteger(process.env.GEOCODING_CACHE_TTL_SECONDS),
          maxEntries: positiveInteger(process.env.GEOCODING_CACHE_MAX_ENTRIES),
        }),
    },
  ],
  exports: [GeocodingService, GEOCODING_PROVIDER, GEOCODING_CACHE],
})
export class GeocodingModule {}
