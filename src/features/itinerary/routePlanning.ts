import { geocodeAddress, getTravelMinutes, searchPlaces } from './api';
import type { Coordinate, ItineraryCandidate, ItineraryRouteTime, ItineraryPlace, TravelMode } from './api';
import { ApiRequestError } from '../../api/http';

type PlaceInput = {
  placeId?: string | null;
  name: string;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  stayDurationMinutes?: number | null;
  mustVisit?: boolean | null;
};

type RoutePair = {
  fromPlaceId: string;
  toPlaceId: string;
  origin: Coordinate;
  destination: Coordinate;
};

export async function resolvePlaceCandidates(places: PlaceInput[], cityHint = ''): Promise<ItineraryCandidate[]> {
  return Promise.all(places.map(async (place, index) => {
    const hasCoordinates = Number.isFinite(place.latitude) && Number.isFinite(place.longitude);
    let coordinate: Coordinate;
    if (hasCoordinates) {
      coordinate = { latitude: place.latitude as number, longitude: place.longitude as number };
    } else if (place.address?.trim()) {
      try {
        coordinate = await geocodeAddress(place.address.trim());
      } catch {
        coordinate = await resolveNamedLocation(place.name.trim(), cityHint);
      }
    } else {
      coordinate = await resolveNamedLocation(place.name.trim(), cityHint);
    }
    const placeId = place.placeId?.trim() || `manual-${index + 1}-${Math.random().toString(36).slice(2, 10)}`;
    if (placeId === 'ARRIVAL' || placeId === 'STADIUM') {
      throw new Error('장소 식별자가 코스 출발지·경기장 식별자와 겹칩니다. 장소를 다시 선택해 주세요.');
    }
    return {
      placeId,
      name: place.name.trim(),
      address: place.address?.trim() || null,
      latitude: coordinate.latitude,
      longitude: coordinate.longitude,
      stayDurationMinutes: place.stayDurationMinutes ?? 60,
      mustVisit: place.mustVisit ?? false,
    };
  }));
}

export async function resolveNamedLocation(location: string, cityHint = ''): Promise<Coordinate> {
  const query = `${cityHint} ${location}`.trim();
  try {
    const result = await searchPlaces(query, 1, 10);
    const normalize = (value: string) => value.replace(/\s/g, '').toLowerCase();
    const exact = result.places.find((place) => normalize(place.name) === normalize(location));
    const single = result.places.length === 1 ? result.places[0] : null;
    const selected = exact ?? single;
    if (selected) return { latitude: selected.latitude, longitude: selected.longitude };
  } catch {
    // Use address geocoding below when keyword lookup has no usable result.
  }
  return geocodeAddress(query);
}

export async function collectOptimizedTravelTimes(
  arrival: Coordinate,
  stadium: Coordinate,
  places: ItineraryCandidate[],
  mode: TravelMode,
): Promise<ItineraryRouteTime[]> {
  const ids = new Set(places.map((place) => place.placeId));
  if (ids.size !== places.length) throw new Error('같은 장소가 중복으로 추가되어 있어요. 중복 장소를 삭제해 주세요.');

  const pairs: RoutePair[] = [];
  if (places.length === 0) {
    pairs.push({ fromPlaceId: 'ARRIVAL', toPlaceId: 'STADIUM', origin: arrival, destination: stadium });
  } else {
    for (const place of places) {
      pairs.push({
        fromPlaceId: 'ARRIVAL',
        toPlaceId: place.placeId,
        origin: arrival,
        destination: coordinateOf(place),
      });
      pairs.push({
        fromPlaceId: place.placeId,
        toPlaceId: 'STADIUM',
        origin: coordinateOf(place),
        destination: stadium,
      });
      for (const destination of places) {
        if (destination.placeId === place.placeId) continue;
        pairs.push({
          fromPlaceId: place.placeId,
          toPlaceId: destination.placeId,
          origin: coordinateOf(place),
          destination: coordinateOf(destination),
        });
      }
    }
  }

  const minutes = new Array<number | null>(pairs.length);
  let nextIndex = 0;
  const workers = Array.from({ length: Math.min(6, pairs.length) }, async () => {
    while (nextIndex < pairs.length) {
      const index = nextIndex++;
      const pair = pairs[index];
      try {
        minutes[index] = await getTravelMinutes(pair.origin, pair.destination, mode);
      } catch (error) {
        if (!(error instanceof ApiRequestError) || error.status !== 404 || error.code !== 'ROUTE_NOT_FOUND') {
          throw error;
        }
        minutes[index] = null;
      }
    }
  });
  await Promise.all(workers);
  return pairs.flatMap((pair, index) => {
    const legMinutes = minutes[index];
    return legMinutes === null ? [] : [{
      fromPlaceId: pair.fromPlaceId,
      toPlaceId: pair.toPlaceId,
      minutes: legMinutes,
    }];
  });
}

export function selectFittingPlaces(
  places: ItineraryCandidate[],
  travelTimes: ItineraryRouteTime[],
  availableMinutes: number,
  mandatoryPlaceIds: string[] = [],
): ItineraryCandidate[] {
  if (places.length === 0) return [];
  if (places.length > 8) throw new Error('자동 코스에는 장소를 최대 8곳까지 추가할 수 있어요.');

  const mandatoryIds = new Set(mandatoryPlaceIds);
  const mandatoryMask = places.reduce((mask, place, index) => (
    mandatoryIds.has(place.placeId) ? mask | (1 << index) : mask
  ), 0);
  const minutesByLeg = new Map(
    travelTimes.map((leg) => [`${leg.fromPlaceId}\u0000${leg.toPlaceId}`, leg.minutes]),
  );
  const durationFor = (lastIndex: number, elapsedMinutes: number) => {
    const fromPlaceId = lastIndex < 0 ? 'ARRIVAL' : places[lastIndex].placeId;
    const finalLeg = minutesByLeg.get(`${fromPlaceId}\u0000STADIUM`);
    return finalLeg === undefined ? Number.POSITIVE_INFINITY : elapsedMinutes + finalLeg;
  };

  let bestMask = -1;
  let bestOptionalCount = -1;
  let bestDuration = Number.POSITIVE_INFINITY;

  function visit(mask: number, lastIndex: number, elapsedMinutes: number) {
    const completeDuration = durationFor(lastIndex, elapsedMinutes);
    if ((mask & mandatoryMask) === mandatoryMask && completeDuration <= availableMinutes) {
      const visitedOptionalCount = places.reduce((count, place, index) => (
        mandatoryIds.has(place.placeId) || (mask & (1 << index)) === 0 ? count : count + 1
      ), 0);
      if (visitedOptionalCount > bestOptionalCount
        || (visitedOptionalCount === bestOptionalCount && completeDuration < bestDuration)) {
        bestMask = mask;
        bestOptionalCount = visitedOptionalCount;
        bestDuration = completeDuration;
      }
    }

    for (let index = 0; index < places.length; index++) {
      const bit = 1 << index;
      if (mask & bit) continue;
      const fromPlaceId = lastIndex < 0 ? 'ARRIVAL' : places[lastIndex].placeId;
      const travelMinutes = minutesByLeg.get(`${fromPlaceId}\u0000${places[index].placeId}`);
      if (travelMinutes === undefined) continue;
      visit(mask | bit, index, elapsedMinutes + travelMinutes + places[index].stayDurationMinutes);
    }
  }

  visit(0, -1, 0);
  const selectedMask = bestMask >= 0 ? bestMask : mandatoryMask;
  return places.filter((_, index) => (selectedMask & (1 << index)) !== 0);
}

export async function measureSequentialRoute(
  arrival: Coordinate,
  stadium: Coordinate,
  departure: Coordinate,
  places: ItineraryCandidate[],
  mode: TravelMode,
): Promise<{ travelFromPreviousMinutes: number[]; finalLegToStadiumMinutes: number; stadiumToDepartureMinutes: number }> {
  const stops: { place: ItineraryPlace | ItineraryCandidate; coordinate: Coordinate }[] = places.map((place) => ({
    place,
    coordinate: coordinateOf(place),
  }));
  const travelFromPreviousMinutes: number[] = [];
  let previous = arrival;
  for (const stop of stops) {
    travelFromPreviousMinutes.push(await getTravelMinutes(previous, stop.coordinate, mode));
    previous = stop.coordinate;
  }
  const [finalLegToStadiumMinutes, stadiumToDepartureMinutes] = await Promise.all([
    getTravelMinutes(previous, stadium, mode),
    getTravelMinutes(stadium, departure, mode),
  ]);
  return { travelFromPreviousMinutes, finalLegToStadiumMinutes, stadiumToDepartureMinutes };
}

export function coordinateOf(place: Pick<ItineraryPlace, 'latitude' | 'longitude'>): Coordinate {
  if (!Number.isFinite(place.latitude) || !Number.isFinite(place.longitude)) {
    throw new Error('장소 좌표를 찾을 수 없어요. 장소를 다시 검색해 주세요.');
  }
  return { latitude: place.latitude as number, longitude: place.longitude as number };
}

export function formatApiError(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}
