export function stationNameForDisplay(stationName: string): string {
  const normalized = stationName.trim();
  if (!normalized || normalized.endsWith('역')) return normalized;
  return `${normalized}역`;
}
