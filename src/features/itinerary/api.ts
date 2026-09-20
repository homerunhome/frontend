import { request } from '../../api/http';

export type Place = {
  placeId?: string | null;
  name: string;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
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

export type ItineraryRequest = {
  gameId: string;
  arrivalPlace: string;
  arrivalAt: string;
  departurePlace: string;
  departureAt: string;
  preferences: string[];
  places: Place[];
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
  departurePlace: string;
  departureAt: string;
  preferences: string[];
  places: Place[];
  createdAt: string;
};

export function createItinerary(body: ItineraryRequest): Promise<Itinerary> {
  return request<Itinerary>('/api/itineraries', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
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
