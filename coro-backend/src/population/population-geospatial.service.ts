import { Injectable } from '@nestjs/common';
import { PopulationCompassDirection } from './dto/population-directional-targeting.dto';

type GeoJsonPosition = [number, number];

type GeoJsonPolygon = {
  type: 'Polygon';
  coordinates: GeoJsonPosition[][];
};

type GeoJsonMultiPolygon = {
  type: 'MultiPolygon';
  coordinates: GeoJsonPosition[][][];
};

type SupportedGeometry = GeoJsonPolygon | GeoJsonMultiPolygon;

@Injectable()
export class PopulationGeospatialService {
  private readonly directionBearings: Record<
    PopulationCompassDirection,
    number
  > = {
    N: 0,
    NE: 45,
    E: 90,
    SE: 135,
    S: 180,
    SW: 225,
    W: 270,
    NW: 315,
  };

  readonly compassDirections = Object.values(PopulationCompassDirection);

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

    const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

    const deltaLatitude = toRadians(latitude2 - latitude1);

    const deltaLongitude = toRadians(longitude2 - longitude1);

    const lat1 = toRadians(latitude1);
    const lat2 = toRadians(latitude2);

    const a =
      Math.sin(deltaLatitude / 2) ** 2 +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLongitude / 2) ** 2;

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return earthRadiusKm * c;
  }

  bearingDegrees(
    latitude1: number,
    longitude1: number,
    latitude2: number,
    longitude2: number,
  ) {
    const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
    const toDegrees = (radians: number) => (radians * 180) / Math.PI;
    const latitude1Radians = toRadians(latitude1);
    const latitude2Radians = toRadians(latitude2);
    const longitudeDelta = toRadians(longitude2 - longitude1);
    const y = Math.sin(longitudeDelta) * Math.cos(latitude2Radians);
    const x =
      Math.cos(latitude1Radians) * Math.sin(latitude2Radians) -
      Math.sin(latitude1Radians) *
        Math.cos(latitude2Radians) *
        Math.cos(longitudeDelta);
    return (toDegrees(Math.atan2(y, x)) + 360) % 360;
  }

  oppositeDirection(direction: PopulationCompassDirection) {
    const index = this.compassDirections.indexOf(direction);
    return this.compassDirections[(index + 4) % 8];
  }

  includedDirections(
    direction: PopulationCompassDirection,
    includeAdjacentSectors = true,
  ) {
    if (!includeAdjacentSectors) return [direction];
    const index = this.compassDirections.indexOf(direction);
    return [
      this.compassDirections[(index + 7) % 8],
      direction,
      this.compassDirections[(index + 1) % 8],
    ];
  }

  isPointInsideDirectionalSector(params: {
    latitude: number;
    longitude: number;
    referenceLatitude: number;
    referenceLongitude: number;
    maxDistanceKm: number;
    propagationDirection: PopulationCompassDirection;
    includeAdjacentSectors?: boolean;
  }) {
    const distance = this.distanceKm(
      params.referenceLatitude,
      params.referenceLongitude,
      params.latitude,
      params.longitude,
    );
    if (distance > params.maxDistanceKm) return false;
    const bearing = this.bearingDegrees(
      params.referenceLatitude,
      params.referenceLongitude,
      params.latitude,
      params.longitude,
    );
    const center = this.directionBearings[params.propagationDirection];
    const angularDifference = Math.abs(((bearing - center + 540) % 360) - 180);
    const halfWidth = params.includeAdjacentSectors === false ? 22.5 : 67.5;
    return angularDifference <= halfWidth;
  }

  destinationPoint(
    latitude: number,
    longitude: number,
    bearingDegrees: number,
    distanceKm: number,
  ): GeoJsonPosition {
    const earthRadiusKm = 6371.0088;
    const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
    const toDegrees = (radians: number) => (radians * 180) / Math.PI;
    const angularDistance = distanceKm / earthRadiusKm;
    const bearing = toRadians(bearingDegrees);
    const latitudeRadians = toRadians(latitude);
    const longitudeRadians = toRadians(longitude);
    const destinationLatitude = Math.asin(
      Math.sin(latitudeRadians) * Math.cos(angularDistance) +
        Math.cos(latitudeRadians) *
          Math.sin(angularDistance) *
          Math.cos(bearing),
    );
    const destinationLongitude =
      longitudeRadians +
      Math.atan2(
        Math.sin(bearing) *
          Math.sin(angularDistance) *
          Math.cos(latitudeRadians),
        Math.cos(angularDistance) -
          Math.sin(latitudeRadians) * Math.sin(destinationLatitude),
      );
    return [
      ((toDegrees(destinationLongitude) + 540) % 360) - 180,
      toDegrees(destinationLatitude),
    ];
  }

  createSectorGeometry(params: {
    referenceLatitude: number;
    referenceLongitude: number;
    maxDistanceKm: number;
    propagationDirection: PopulationCompassDirection;
    includeAdjacentSectors?: boolean;
  }): GeoJsonPolygon {
    const center = this.directionBearings[params.propagationDirection];
    const halfWidth = params.includeAdjacentSectors === false ? 22.5 : 67.5;
    const steps = Math.max(8, Math.ceil((halfWidth * 2) / 5));
    const ring: GeoJsonPosition[] = [
      [params.referenceLongitude, params.referenceLatitude],
    ];
    for (let index = 0; index <= steps; index += 1) {
      const bearing = center - halfWidth + (index / steps) * halfWidth * 2;
      ring.push(
        this.destinationPoint(
          params.referenceLatitude,
          params.referenceLongitude,
          bearing,
          params.maxDistanceKm,
        ),
      );
    }
    ring.push([params.referenceLongitude, params.referenceLatitude]);
    return { type: 'Polygon', coordinates: [ring] };
  }

  createCompassSectorGrid(params: {
    referenceLatitude: number;
    referenceLongitude: number;
    maxDistanceKm: number;
  }) {
    return this.compassDirections.map((direction) => ({
      direction,
      geometry: this.createSectorGeometry({
        ...params,
        propagationDirection: direction,
        includeAdjacentSectors: false,
      }),
    }));
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

    const point: GeoJsonPosition = [longitude, latitude];

    if (geometry.type === 'Polygon') {
      return this.isPointInsidePolygon(point, geometry.coordinates);
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
      return this.isPointInsideGeometry(latitude, longitude, geometry);
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
    if (!geometry || typeof geometry !== 'object') {
      return false;
    }

    const candidate = geometry as Partial<SupportedGeometry>;

    if (candidate.type !== 'Polygon' && candidate.type !== 'MultiPolygon') {
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

  private isPointInsideRing(point: GeoJsonPosition, ring: GeoJsonPosition[]) {
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

      const [currentX, currentY] = currentPosition;

      const [previousX, previousY] = previousPosition;

      const intersects =
        currentY > y !== previousY > y &&
        x <
          ((previousX - currentX) * (y - currentY)) / (previousY - currentY) +
            currentX;

      if (intersects) {
        inside = !inside;
      }
    }

    return inside;
  }

  private isPosition(position: unknown): position is GeoJsonPosition {
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
