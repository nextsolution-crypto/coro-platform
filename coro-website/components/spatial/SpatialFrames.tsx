import { SpatialFigure, type SpatialFigureProps } from './SpatialFigure';

type FrameProps = Omit<SpatialFigureProps, 'variant'>;

/**
 * BuildingFrame: a building photograph or cutaway as an architectural plate. Photographic media: 10px on the visible
 * corners, no shadow, no device or browser chrome. The optional note is a hairline caption row, not a filled card.
 */
export function BuildingFrame(props: FrameProps) {
  return <SpatialFigure variant="building" {...props} />;
}

/** BlueprintFrame: technical media. A sharp 2px frame in structural blue, closed by a navy cartouche. Never 10px. */
export function BlueprintFrame(props: FrameProps) {
  return <SpatialFigure variant="blueprint" tone="dark" {...props} />;
}

/**
 * MapFrame: territory scale. Technical frame at panel radius (4px) with a cartouche and an HTML legend. The base map is
 * demonstration / reference media: its zones, geography and values are not claimed to be real.
 */
export function MapFrame(props: FrameProps) {
  return <SpatialFigure variant="map" tone="dark" {...props} />;
}
