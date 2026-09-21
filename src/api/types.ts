export type ApiErrorResponse = {
  code?: string;
  message?: string;
  details?: Record<string, string>;
};

export type ItineraryPlaceResponse = {
  placeId: string | null;
  name: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
};

export type ItineraryResponse = {
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
  places: ItineraryPlaceResponse[];
  createdAt: string;
};

export type CandidateCategory =
  | 'FOOD'
  | 'CAFE'
  | 'CONVENIENCE_STORE'
  | 'ACTIVITY'
  | 'TOURIST_ATTRACTION'
  | 'CULTURAL_FACILITY'
  | 'FESTIVAL_EVENT';

export type ExploreScope = 'COURSE_NEARBY' | 'STADIUM_NEARBY' | 'STATION_NEARBY' | 'DAEJEON_HOTSPOT';
export type DaejeonHotspot = 'EUNHAENG_DAEHEUNG' | 'SOJE_DONG' | 'DUNSAN_DONG' | 'EXPO' | 'YUSEONG';

export type Coordinate = {
  latitude: number;
  longitude: number;
};

export type CoursePlaceCandidate = {
  provider: 'KAKAO' | 'TOUR_API';
  externalId: string;
  name: string;
  category: CandidateCategory;
  address: string | null;
  phone: string | null;
  latitude: number;
  longitude: number;
  imageUrl: string | null;
  detailUrl: string | null;
  eventStartDate: string | null;
  eventEndDate: string | null;
  distanceMeters: number | null;
};

export type CoursePlaceCandidateResponse = {
  scope: ExploreScope;
  center: Coordinate | null;
  searchCenters: Coordinate[];
  maxDistanceMeters: number;
  places: CoursePlaceCandidate[];
};

export type CoursePlaceCandidateRequest = {
  scope: ExploreScope;
  categories: CandidateCategory[];
  center?: Coordinate;
  coursePoints?: Coordinate[];
  hotspot?: DaejeonHotspot;
  keyword?: string;
  maxDistanceMeters?: number;
  eventDate?: string;
  limit: number;
};

export type TravelTimeResponse = {
  transportMode: 'CAR';
  durationSeconds: number;
  distanceMeters: number;
};
