import type { CoursePlaceCandidate, ItineraryPlaceResponse } from '../api/types';
import type { CoursePlace, PlaceKind } from './types';

const categoryLabels = {
  FOOD: '먹을 곳',
  CAFE: '카페',
  CONVENIENCE_STORE: '편의점',
  ACTIVITY: '놀거리',
  TOURIST_ATTRACTION: '관광명소',
  CULTURAL_FACILITY: '문화시설',
  FESTIVAL_EVENT: '축제·행사',
} as const;

const categoryKinds: Record<keyof typeof categoryLabels, PlaceKind> = {
  FOOD: 'food',
  CAFE: 'cafe',
  CONVENIENCE_STORE: 'convenience',
  ACTIVITY: 'activity',
  TOURIST_ATTRACTION: 'tour',
  CULTURAL_FACILITY: 'culture',
  FESTIVAL_EVENT: 'event',
};

type CoordinateItem = { latitude: number | null; longitude: number | null };

function createPositions(items: CoordinateItem[]) {
  const coordinates = items.filter(
    (item): item is { latitude: number; longitude: number } => item.latitude !== null && item.longitude !== null,
  );
  const latitudes = coordinates.map((item) => item.latitude);
  const longitudes = coordinates.map((item) => item.longitude);
  const minLatitude = Math.min(...latitudes);
  const maxLatitude = Math.max(...latitudes);
  const minLongitude = Math.min(...longitudes);
  const maxLongitude = Math.max(...longitudes);
  const latitudeRange = Math.max(maxLatitude - minLatitude, 0.01);
  const longitudeRange = Math.max(maxLongitude - minLongitude, 0.01);

  return items.map((item, index) => {
    if (item.latitude === null || item.longitude === null) {
      return { x: 32 + (index % 4) * 12, y: 32 + Math.floor(index / 4) * 16 };
    }
    return {
      x: 25 + ((item.longitude - minLongitude) / longitudeRange) * 50,
      y: 25 + ((maxLatitude - item.latitude) / latitudeRange) * 50,
    };
  });
}

export function itineraryPlacesToCoursePlaces(places: ItineraryPlaceResponse[]): CoursePlace[] {
  const positions = createPositions(places);
  return places.map((place, index) => ({
    id: place.placeId || `itinerary-place-${index}`,
    name: place.name,
    address: place.address || '주소 정보 없음',
    description: place.address || '저장된 일정 장소',
    kind: 'place',
    category: '일정 장소',
    position: positions[index] ?? { x: 50, y: 50 },
    latitude: place.latitude,
    longitude: place.longitude,
    provider: 'ITINERARY',
  }));
}

export function candidateToCoursePlace(candidate: CoursePlaceCandidate): CoursePlace {
  return {
    id: `${candidate.provider}-${candidate.externalId}`,
    name: candidate.name,
    address: candidate.address || '주소 정보 없음',
    description: candidate.address || categoryLabels[candidate.category],
    kind: categoryKinds[candidate.category],
    category: categoryLabels[candidate.category],
    position: { x: 50, y: 50 },
    latitude: candidate.latitude,
    longitude: candidate.longitude,
    imageUrl: candidate.imageUrl,
    detailUrl: candidate.detailUrl,
    distanceMeters: candidate.distanceMeters,
    provider: candidate.provider,
  };
}

export function recalculateMapPositions(places: CoursePlace[]): CoursePlace[] {
  const positions = createPositions(places);
  return places.map((place, index) => ({ ...place, position: positions[index] ?? { x: 50, y: 50 } }));
}
