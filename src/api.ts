export type Game = {
  gameId: string;
  city: string;
  gameDate: string;
  gameStartTime: string;
  stadium: string;
  homeTeam: string;
  awayTeam: string;
};

export type TrainCity = {
  cityCode: string;
  cityName: string;
};

export type TrainStation = {
  stationId: string;
  stationName: string;
  cityCode: string;
};

export type TrainSchedule = {
  trainNumber: string;
  trainType: string;
  departureStation: string;
  departureAt: string;
  arrivalStation: string;
  arrivalAt: string;
};

export type PlaceInput = {
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
  places: PlaceInput[];
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
  places: PlaceInput[];
  createdAt: string;
};

type ApiErrorResponse = {
  code?: string;
  message?: string;
  details?: Record<string, string>;
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;

  try {
    response = await fetch(path, {
      ...init,
      headers: {
        Accept: 'application/json',
        ...init?.headers,
      },
    });
  } catch {
    throw new Error('백엔드 서버에 연결할 수 없습니다. 서버 실행 상태를 확인해 주세요.');
  }

  const responseText = await response.text();
  const payload: unknown = responseText ? JSON.parse(responseText) : null;

  if (!response.ok) {
    const apiError = payload as ApiErrorResponse | null;
    throw new Error(apiError?.message || '요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.');
  }

  return payload as T;
}

export const api = {
  getGames: () => request<Game[]>('/api/games'),

  getCities: () => request<TrainCity[]>('/api/trains/cities'),

  getStations: (cityCode: string) => {
    const params = new URLSearchParams({ cityCode });
    return request<TrainStation[]>('/api/trains/stations?' + params.toString());
  },

  getKtxSchedules: (departureStationId: string, arrivalStationId: string, date: string) => {
    const params = new URLSearchParams({ departureStationId, arrivalStationId, date });
    return request<TrainSchedule[]>('/api/trains/ktx?' + params.toString());
  },

  createItinerary: (body: ItineraryRequest) =>
    request<Itinerary>('/api/itineraries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),

  getItinerary: (id: number) => request<Itinerary>('/api/itineraries/' + id),
};
