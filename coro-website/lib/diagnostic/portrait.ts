import { diagnosticQuestions } from './config.ts';
import type { CompleteDiagnosticResponses, DiagnosticAnswerId, DiagnosticDimensionId } from './types.ts';

export const PORTRAIT_VIEWBOX_SIZE = 640;
export const PORTRAIT_CENTER = 320;
export const PORTRAIT_RADIUS = 210;
export const PORTRAIT_MINIMUM_RADAR_DIMENSIONS = 3;

export type PortraitPoint = {
  dimensionId: DiagnosticDimensionId;
  answerId: DiagnosticAnswerId;
  axisIndex: number;
  value: 0 | 2 | 3 | null;
  x: number;
  y: number;
  axisX: number;
  axisY: number;
};

export type ResiliencePortraitGeometry = {
  points: readonly PortraitPoint[];
  numericPoints: readonly PortraitPoint[];
  gridPolygons: readonly string[];
  closedPolygon: string | null;
  openSegments: readonly string[];
  evaluableCount: number;
  usesAlternative: boolean;
};

const portraitValues = { A: 3, B: 2, C: 0 } as const;
const rounded = (value: number) => Math.round(value * 100) / 100;

function coordinate(axisIndex: number, radius: number) {
  const angle = (-Math.PI / 2) + (axisIndex * Math.PI * 2) / diagnosticQuestions.length;
  return { x: rounded(PORTRAIT_CENTER + Math.cos(angle) * radius), y: rounded(PORTRAIT_CENTER + Math.sin(angle) * radius) };
}

function path(points: readonly Pick<PortraitPoint, 'x' | 'y'>[]) {
  return points.map(({ x, y }) => `${x},${y}`).join(' ');
}

function contiguousSegments(points: readonly PortraitPoint[]) {
  const segments: string[] = [];
  let current: PortraitPoint[] = [];
  for (const point of points) {
    if (point.value === null) {
      if (current.length > 1) segments.push(path(current));
      current = [];
      continue;
    }
    current.push(point);
  }
  if (current.length > 1) segments.push(path(current));
  return segments;
}

export function buildResiliencePortraitGeometry(responses: CompleteDiagnosticResponses): ResiliencePortraitGeometry {
  const points = diagnosticQuestions.map(({ id }, axisIndex): PortraitPoint => {
    const answerId = responses[id];
    const value = answerId in portraitValues ? portraitValues[answerId as keyof typeof portraitValues] : null;
    const axis = coordinate(axisIndex, PORTRAIT_RADIUS);
    const plotted = value === null ? axis : coordinate(axisIndex, PORTRAIT_RADIUS * (value / 3));
    return { dimensionId: id, answerId, axisIndex, value, x: plotted.x, y: plotted.y, axisX: axis.x, axisY: axis.y };
  });
  const numericPoints = points.filter((point) => point.value !== null);
  const evaluableCount = numericPoints.length;
  const complete = evaluableCount === diagnosticQuestions.length;
  return {
    points,
    numericPoints,
    gridPolygons: [1, 2, 3].map((level) => path(diagnosticQuestions.map((_, axisIndex) => coordinate(axisIndex, PORTRAIT_RADIUS * (level / 3))))),
    closedPolygon: complete ? path(points) : null,
    openSegments: complete ? [] : contiguousSegments(points),
    evaluableCount,
    usesAlternative: evaluableCount < PORTRAIT_MINIMUM_RADAR_DIMENSIONS,
  };
}
