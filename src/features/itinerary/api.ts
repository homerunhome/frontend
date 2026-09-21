import { request } from '../../api/http';

export type TravelMode = 'CAR' | 'WALK' | 'PUBLIC_TRANSIT';

export type Place = {
  placeId?: string | null;
  name: string;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

export type ItineraryPlace = Place & {
  travelFromPreviousMinutes?: number | null;
  arrivesAt?: string | null;
  departsAt?: string | null;
  stayDurationMinutes?: number | null;
  mustVisit?: boolean | null;
  scheduled?: boolean | null;
};

export type ItineraryTrain = {
  trainNumber: string;
  trainType: string;
  departureStation: string;
  departureAt: string;
  arrivalStation: string;
  arrivalAt: string;
};

export type PlaceSearchResult = {
  id: string;
  name: string;
  address: string | null;
  roadAddress: string | null;
  latitude: number;
  longitude: number;
  category: string | null;
  categoryName: string | null;
  phone: string | null;
  placeUrl: string | null;
  distanceMeters: number | null;
};

export type PlaceSearchResponse = {
  places: PlaceSearchResult[];
  page: number;
  size: number;
  totalCount: number;
  pageableCount: number;
  hasNext: boolean;
};

export type CoursePlaceCategory =
  | 'FOOD'
  | 'CAFE'
  | 'CONVENIENCE_STORE'
  | 'ACTIVITY'
  | 'TOURIST_ATTRACTION'
  | 'CULTURAL_FACILITY'
  | 'FESTIVAL_EVENT';

export type CoursePlaceCandidateRequest = {
  scope: 'CURRENT_LOCATION' | 'DAEJEON_HOTSPOT';
  categories: CoursePlaceCategory[];
  center?: Coordinate;
  hotspot?: 'EUNHAENG_DAEHEUNG' | 'SOJE_DONG' | 'DUNSAN_DONG' | 'EXPO' | 'YUSEONG';
  keyword?: string;
  maxDistanceMeters?: number;
  limit?: number;
};

export type CoursePlaceCandidate = {
  provider: 'KAKAO' | 'TOUR_API';
  externalId: string;
  name: string;
  category: CoursePlaceCategory;
  address: string | null;
  latitude: number;
  longitude: number;
  imageUrl: string | null;
  detailUrl: string | null;
  distanceMeters: number | null;
};

type CoursePlaceCandidateResponse = {
  places: CoursePlaceCandidate[];
};

export type ItineraryRequest = {
  gameId: string;
  arrivalPlace: string;
  arrivalAt: string;
  departurePlace: string;
  departureAt: string;
  preferences: string[];
  places: Place[];
};

export type ItineraryCandidate = Place & {
  placeId: string;
  name: string;
  stayDurationMinutes: number;
  mustVisit: boolean;
};

export type ItineraryRouteTime = {
  fromPlaceId: string;
  toPlaceId: string;
  minutes: number;
};

export type GenerateItineraryRequest = {
  gameId: string;
  arrivalPlace: string;
  arrivalAt: string;
  arrivalTrain: ItineraryTrain | null;
  departurePlace: string;
  departureAt: string;
  returnTrain: ItineraryTrain | null;
  stadiumEntryBufferMinutes: number;
  stadiumToDepartureMinutes: number;
  postGameCrowdBufferMinutes: number;
  boardingBufferMinutes: number;
  expectedGameDurationMinutes: number;
  preferences: string[];
  travelMode: TravelMode;
  places: ItineraryCandidate[];
  travelTimes: ItineraryRouteTime[];
};

export type EditItineraryPlacesRequest = {
  stadiumEntryBufferMinutes: number;
  finalLegToStadiumMinutes: number;
  stadiumToDepartureMinutes: number;
  postGameCrowdBufferMinutes: number;
  boardingBufferMinutes: number;
  travelMode: TravelMode;
  expectedGameDurationMinutes: number;
  places: (ItineraryCandidate & { travelFromPreviousMinutes: number })[];
};

export type Itinerary = {
  id: number;
  gameId: string;
  gameDate: string;
  gameStartTime: string;
  stadium: string;
  homeTeam: string;
  awayTeam: string;
  arrivalPlace: string;
  arrivalAt: string;
  arrivalTrain: ItineraryTrain | null;
  departurePlace: string;
  departureAt: string;
  returnTrain: ItineraryTrain | null;
  preferences: string[];
  places: ItineraryPlace[];
  travelMode: string | null;
  stadiumEntryBufferMinutes: number | null;
  stadiumArrivalAt: string | null;
  gameStartSlackMinutes: number | null;
  stadiumDepartureRecommendedAt: string | null;
  returnTransportBoardable: boolean | null;
  expectedGameEndAt: string | null;
  gameEndMayBeDelayed: boolean | null;
  status: string | null;
  warnings: string[];
  timeline: { type: string; description: string; startsAt: string; endsAt: string }[];
  createdAt: string;
};

export function createItinerary(body: ItineraryRequest): Promise<Itinerary> {
  return request<Itinerary>('/api/itineraries', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export function generateItinerary(body: GenerateItineraryRequest): Promise<Itinerary> {
  return request<Itinerary>('/api/itineraries/generate/optimized', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export function updateItineraryPlaces(id: number, body: EditItineraryPlacesRequest): Promise<Itinerary> {
  return request<Itinerary>(`/api/itineraries/${id}/places`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export type Coordinate = { latitude: number; longitude: number };

export async function geocodeAddress(address: string): Promise<Coordinate> {
  const result = await request<Coordinate>('/api/geocoding', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ address }),
  });
  return result;
}

export async function getTravelMinutes(
  origin: Coordinate,
  destination: Coordinate,
  transportMode: TravelMode,
): Promise<number> {
  const result = await request<{ durationSeconds: number }>('/api/travel-times', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ origin, destination, transportMode }),
  });
  return Math.ceil(result.durationSeconds / 60);
}

export function getItinerary(id: number): Promise<Itinerary> {
  return request<Itinerary>('/api/itineraries/' + id);
}

export function searchPlaces(keyword: string, page = 1, size = 15): Promise<PlaceSearchResponse> {
  return request<PlaceSearchResponse>('/api/places/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ keyword, page, size }),
  });
}

export function getCoursePlaceCandidates(body: CoursePlaceCandidateRequest): Promise<CoursePlaceCandidateResponse> {
  return request<CoursePlaceCandidateResponse>('/api/course-place-candidates', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}
