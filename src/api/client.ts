import type {
  ApiErrorResponse,
  Coordinate,
  CoursePlaceCandidateRequest,
  CoursePlaceCandidateResponse,
  ItineraryResponse,
  TravelTimeResponse,
  TravelMode,
  ItineraryPlacesEditRequest,
  TourismContentDetail,
} from './types';

export class ApiError extends Error {
  status: number;
  code?: string;

  constructor(status: number, response?: ApiErrorResponse) {
    super(response?.message || '서버 요청을 처리하지 못했습니다.');
    this.name = 'ApiError';
    this.status = status;
    this.code = response?.code;
  }
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      headers: init?.body ? { 'Content-Type': 'application/json', ...init.headers } : init?.headers,
    });
  } catch {
    throw new Error('백엔드 서버에 연결할 수 없습니다. 서버 실행 상태를 확인해 주세요.');
  }

  if (!response.ok) {
    const errorBody = await response.json().catch(() => undefined) as ApiErrorResponse | undefined;
    if (!errorBody && response.status >= 500) {
      throw new Error('백엔드 서버에 연결할 수 없습니다. 서버 실행 상태를 확인해 주세요.');
    }
    throw new ApiError(response.status, errorBody);
  }
  return response.json() as Promise<T>;
}

export function getItinerary(id: number, signal?: AbortSignal) {
  return request<ItineraryResponse>(`/api/itineraries/${id}`, { signal });
}

export function getCoursePlaceCandidates(body: CoursePlaceCandidateRequest, signal?: AbortSignal) {
  return request<CoursePlaceCandidateResponse>('/api/course-place-candidates', {
    method: 'POST',
    body: JSON.stringify(body),
    signal,
  });
}

export function getTravelTime(origin: Coordinate, destination: Coordinate, transportMode: TravelMode = 'CAR', signal?: AbortSignal) {
  return request<TravelTimeResponse>('/api/travel-times', {
    method: 'POST',
    body: JSON.stringify({ origin, destination, transportMode }),
    signal,
  });
}

export function geocodeAddress(address: string, signal?: AbortSignal) {
  return request<Coordinate>('/api/geocoding', {
    method: 'POST',
    body: JSON.stringify({ address }),
    signal,
  });
}

export function updateItineraryPlaces(id: number, body: ItineraryPlacesEditRequest) {
  return request<ItineraryResponse>(`/api/itineraries/${id}/places`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

export function getTourismContentDetail(contentId: string, signal?: AbortSignal) {
  return request<TourismContentDetail>(`/api/tourism/contents/${encodeURIComponent(contentId)}`, { signal });
}
