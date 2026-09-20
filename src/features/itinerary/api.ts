import { request } from '../../api/http';

export type Place = {
  placeId?: string | null;
  name: string;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
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
