import { PopulationGeospatialService } from './population-geospatial.service';

describe('PopulationGeospatialService', () => {
  let service: PopulationGeospatialService;

  beforeEach(() => {
    service = new PopulationGeospatialService();
  });

  describe('distanceKm', () => {
    it('retourne zéro pour le même point', () => {
      expect(
        service.distanceKm(
          45.5017,
          -73.5673,
          45.5017,
          -73.5673,
        ),
      ).toBeCloseTo(0, 6);
    });

    it('calcule une distance géographique plausible', () => {
      const distance = service.distanceKm(
        45.5017,
        -73.5673,
        45.5088,
        -73.554,
      );

      expect(distance).toBeGreaterThan(1);
      expect(distance).toBeLessThan(2);
    });
  });

  describe('Polygon', () => {
    const polygon = {
      type: 'Polygon',
      coordinates: [
        [
          [-73.6, 45.4],
          [-73.4, 45.4],
          [-73.4, 45.6],
          [-73.6, 45.6],
          [-73.6, 45.4],
        ],
      ],
    };

    it('détecte un point dans un Polygon', () => {
      expect(
        service.isPointInsideGeometry(
          45.5,
          -73.5,
          polygon,
        ),
      ).toBe(true);
    });

    it('rejette un point hors du Polygon', () => {
      expect(
        service.isPointInsideGeometry(
          46,
          -73.5,
          polygon,
        ),
      ).toBe(false);
    });
  });

  describe('Polygon avec trou', () => {
    const polygonWithHole = {
      type: 'Polygon',
      coordinates: [
        [
          [-73.6, 45.4],
          [-73.4, 45.4],
          [-73.4, 45.6],
          [-73.6, 45.6],
          [-73.6, 45.4],
        ],
        [
          [-73.52, 45.48],
          [-73.48, 45.48],
          [-73.48, 45.52],
          [-73.52, 45.52],
          [-73.52, 45.48],
        ],
      ],
    };

    it('exclut un point situé dans un trou', () => {
      expect(
        service.isPointInsideGeometry(
          45.5,
          -73.5,
          polygonWithHole,
        ),
      ).toBe(false);
    });
  });

  describe('MultiPolygon', () => {
    const multiPolygon = {
      type: 'MultiPolygon',
      coordinates: [
        [
          [
            [-73.6, 45.4],
            [-73.5, 45.4],
            [-73.5, 45.5],
            [-73.6, 45.5],
            [-73.6, 45.4],
          ],
        ],
        [
          [
            [-73.4, 45.6],
            [-73.3, 45.6],
            [-73.3, 45.7],
            [-73.4, 45.7],
            [-73.4, 45.6],
          ],
        ],
      ],
    };

    it('détecte un point dans le deuxième Polygon', () => {
      expect(
        service.isPointInsideGeometry(
          45.65,
          -73.35,
          multiPolygon,
        ),
      ).toBe(true);
    });
  });

  describe('isPointInsideImpactZone', () => {
    it('utilise le rayon lorsque geometry est absente', () => {
      expect(
        service.isPointInsideImpactZone({
          latitude: 45.505,
          longitude: -73.5,
          geometry: null,
          maxDistanceKm: 2,
          referenceLatitude: 45.5,
          referenceLongitude: -73.5,
        }),
      ).toBe(true);
    });

    it('rejette un point situé au-delà du rayon', () => {
      expect(
        service.isPointInsideImpactZone({
          latitude: 45.55,
          longitude: -73.5,
          geometry: null,
          maxDistanceKm: 2,
          referenceLatitude: 45.5,
          referenceLongitude: -73.5,
        }),
      ).toBe(false);
    });

    it('donne priorité à geometry sur maxDistanceKm', () => {
      const distantPolygon = {
        type: 'Polygon',
        coordinates: [
          [
            [-70.1, 45],
            [-70, 45],
            [-70, 45.1],
            [-70.1, 45.1],
            [-70.1, 45],
          ],
        ],
      };

      expect(
        service.isPointInsideImpactZone({
          latitude: 45.5,
          longitude: -73.5,
          geometry: distantPolygon,
          maxDistanceKm: 100,
          referenceLatitude: 45.5,
          referenceLongitude: -73.5,
        }),
      ).toBe(false);
    });

    it('ne bascule pas silencieusement sur le rayon si geometry est invalide', () => {
      expect(
        service.isPointInsideImpactZone({
          latitude: 45.5,
          longitude: -73.5,
          geometry: {
            type: 'LineString',
            coordinates: [],
          },
          maxDistanceKm: 100,
          referenceLatitude: 45.5,
          referenceLongitude: -73.5,
        }),
      ).toBe(false);
    });

    it('retourne false sans géométrie ni rayon exploitable', () => {
      expect(
        service.isPointInsideImpactZone({
          latitude: 45.5,
          longitude: -73.5,
          geometry: null,
          maxDistanceKm: null,
          referenceLatitude: 45.5,
          referenceLongitude: -73.5,
        }),
      ).toBe(false);
    });
  });
});