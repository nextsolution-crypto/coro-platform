/** A building selection narrows the server-authorized list; it never grants access. */
export function belongsToBuilding(project: { buildingId?: string | null; building?: { id: string } | null }, buildingId: string): boolean {
  return !buildingId || (project.buildingId ?? project.building?.id) === buildingId;
}
