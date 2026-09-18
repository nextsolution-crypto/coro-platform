import { Injectable } from '@nestjs/common';

type GeoJsonPosition = [number, number];

type GeoJsonPolygon = {
  type: 'Polygon';
  coordinates: GeoJsonPosition[][];
};

type GeoJsonMultiPolygon = {
  type: 'MultiPolygon';
  coordinates: GeoJsonPosition[][][];
};

type SupportedGeometry =
  | GeoJsonPolygon
  | GeoJsonMultiPolygon;

@Injectable()
export class PopulationGeospatialService {
  /**
   * Distance géodésique entre deux coordonnées.
   *
   * Formule de Haversine.
   * Résultat en kilomètres.
   */
  distanceKm(
    latitude1: number,
    longitude1: number,
    latitude2: number,
    longitude2: number,
  ) {
    const earthRadiusKm = 6371.0088;

    const toRadians = (degrees: number) =>
      (degrees * Math.PI) / 180;

    const deltaLatitude = toRadians(
      latitude2 - latitude1,
    );

    const deltaLongitude = toRadians(
      longitude2 - longitude1,
    );

    const lat1 = toRadians(latitude1);
    const lat2 = toRadians(latitude2);

    const a =
      Math.sin(deltaLatitude / 2) ** 2 +
      Math.cos(lat1) *
        Math.cos(lat2) *
        Math.sin(deltaLongitude / 2) ** 2;

    const c =
      2 *
      Math.atan2(
        Math.sqrt(a),
        Math.sqrt(1 - a),
      );

    return earthRadiusKm * c;
  }

  /**
   * Détermine si un point se trouve dans une géométrie
   * GeoJSON Polygon ou MultiPolygon.
   *
   * GeoJSON utilise l'ordre [longitude, latitude].
   */
  isPointInsideGeometry(
    latitude: number,
    longitude: number,
    geometry: unknown,
  ) {
    if (!this.isSupportedGeometry(geometry)) {
      return false;
    }

    const point: GeoJsonPosition = [
      longitude,
      latitude,
    ];

    if (geometry.type === 'Polygon') {
      return this.isPointInsidePolygon(
        point,
        geometry.coordinates,
      );
    }

    return geometry.coordinates.some((polygon) =>
      this.isPointInsidePolygon(point, polygon),
    );
  }

  /**
   * Détermine l'appartenance à une zone d'impact.
   *
   * Priorité :
   * 1. GeoJSON lorsqu'une géométrie valide existe;
   * 2. rayon maxDistanceKm lorsque le GeoJSON est absent;
   * 3. false lorsque la zone ne peut pas être calculée.
   *
   * Une géométrie présente mais invalide ne bascule pas
   * silencieusement vers le rayon.
   */
  isPointInsideImpactZone(params: {
    latitude: number;
    longitude: number;

    geometry: unknown;

    maxDistanceKm: number | null;

    referenceLatitude: number | null;
    referenceLongitude: number | null;
  }) {
    const {
      latitude,
      longitude,
      geometry,
      maxDistanceKm,
      referenceLatitude,
      referenceLongitude,
    } = params;

    if (geometry !== null && geometry !== undefined) {
      return this.isPointInsideGeometry(
        latitude,
        longitude,
        geometry,
      );
    }

    if (
      maxDistanceKm === null ||
      maxDistanceKm <= 0 ||
      referenceLatitude === null ||
      referenceLongitude === null
    ) {
      return false;
    }

    return (
      this.distanceKm(
        referenceLatitude,
        referenceLongitude,
        latitude,
        longitude,
      ) <= maxDistanceKm
    );
  }

  private isSupportedGeometry(
    geometry: unknown,
  ): geometry is SupportedGeometry {
    if (
      !geometry ||
      typeof geometry !== 'object'
    ) {
      return false;
    }

    const candidate =
      geometry as Partial<SupportedGeometry>;

    if (
      candidate.type !== 'Polygon' &&
      candidate.type !== 'MultiPolygon'
    ) {
      return false;
    }

    return Array.isArray(candidate.coordinates);
  }

  /**
   * Ray casting avec prise en charge :
   * - anneau extérieur;
   * - trous intérieurs.
   */
  private isPointInsidePolygon(
    point: GeoJsonPosition,
    rings: GeoJsonPosition[][],
  ) {
    if (!rings.length) {
      return false;
    }

    if (!this.isPointInsideRing(point, rings[0])) {
      return false;
    }

    for (let index = 1; index < rings.length; index++) {
      if (this.isPointInsideRing(point, rings[index])) {
        return false;
      }
    }

    return true;
  }

  private isPointInsideRing(
    point: GeoJsonPosition,
    ring: GeoJsonPosition[],
  ) {
    if (!Array.isArray(ring) || ring.length < 3) {
      return false;
    }

    const [x, y] = point;

    let inside = false;

    for (
      let current = 0, previous = ring.length - 1;
      current < ring.length;
      previous = current++
    ) {
      const currentPosition = ring[current];
      const previousPosition = ring[previous];

      if (
        !this.isPosition(currentPosition) ||
        !this.isPosition(previousPosition)
      ) {
        return false;
      }

      const [currentX, currentY] =
        currentPosition;

      const [previousX, previousY] =
        previousPosition;

      const intersects =
        currentY > y !== previousY > y &&
        x <
          ((previousX - currentX) *
            (y - currentY)) /
            (previousY - currentY) +
            currentX;

      if (intersects) {
        inside = !inside;
      }
    }

    return inside;
  }

  private isPosition(
    position: unknown,
  ): position is GeoJsonPosition {
    return (
      Array.isArray(position) &&
      position.length >= 2 &&
      typeof position[0] === 'number' &&
      typeof position[1] === 'number' &&
      Number.isFinite(position[0]) &&
      Number.isFinite(position[1])
    );
  }
}