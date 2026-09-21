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
  travelFromPreviousMinutes: number | null;
  arrivesAt: string | null;
  departsAt: string | null;
  stayDurationMinutes: number | null;
  mustVisit: boolean | null;
  scheduled: boolean | null;
};

export type TravelMode = 'CAR' | 'WALK' | 'PUBLIC_TRANSIT';

export type ItineraryTrainResponse = {
  trainNumber: string;
  trainType: string;
  departureStation: string;
  departureAt: string;
  arrivalStation: string;
  arrivalAt: string;
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
  arrivalTrain: ItineraryTrainResponse | null;
  departurePlace: string;
  departureAt: string;
  returnTrain: ItineraryTrainResponse | null;
  preferences: string[];
  places: ItineraryPlaceResponse[];
  travelMode: TravelMode | null;
  stadiumEntryBufferMinutes: number | null;
  stadiumArrivalAt: string | null;
  gameStartSlackMinutes: number | null;
  stadiumDepartureRecommendedAt: string | null;
  returnTransportBoardable: boolean | null;
  expectedGameEndAt: string | null;
  gameEndMayBeDelayed: boolean | null;
  status: string | null;
  warnings: string[];
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

export type ExploreScope = 'COURSE_NEARBY' | 'STADIUM_NEARBY' | 'STATION_NEARBY' | 'CURRENT_LOCATION' | 'CUSTOM' | 'DAEJEON_HOTSPOT';
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
  transportMode: TravelMode;
  durationSeconds: number;
  distanceMeters: number;
};

export type ItineraryPlacesEditRequest = {
  stadiumEntryBufferMinutes: number;
  finalLegToStadiumMinutes: number;
  stadiumToDepartureMinutes: number;
  postGameCrowdBufferMinutes: number;
  boardingBufferMinutes: number;
  travelMode: TravelMode;
  expectedGameDurationMinutes: number;
  places: Array<{
    placeId: string;
    name: string;
    address: string | null;
    latitude: number;
    longitude: number;
    travelFromPreviousMinutes: number;
    stayDurationMinutes: number;
    mustVisit: boolean;
  }>;
};

export type TourismUsageInformation = {
  useTime: string;
  restDate: string;
  useFee: string;
  parking: string;
  duration: string;
  eventPlace: string;
  bookingPlace: string;
};

export type TourismAccessibility = {
  parking: string;
  wheelchair: string;
  restroom: string;
  stroller: string;
  lactationRoom: string;
};

export type TourismContentDetail = {
  contentId: string;
  contentType: string;
  title: string;
  overview: string;
  address: string;
  addressDetail: string;
  latitude: number | null;
  longitude: number | null;
  phone: string;
  homepageUrl: string;
  imageUrl: string;
  thumbnailUrl: string;
  images: Array<{ name: string; originalUrl: string; thumbnailUrl: string; copyrightType: string }>;
  usageInformation: TourismUsageInformation | null;
  accessibility: TourismAccessibility | null;
};
