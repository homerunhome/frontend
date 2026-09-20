export type PlaceKind = 'food' | 'cafe' | 'convenience' | 'activity' | 'tour' | 'culture' | 'event' | 'place';
export type PanelMode = 'course' | 'explore';

export type MapPosition = {
  x: number;
  y: number;
};

export type CoursePlace = {
  id: string;
  name: string;
  address: string;
  description: string;
  kind: PlaceKind;
  category: string;
  position: MapPosition;
  latitude: number | null;
  longitude: number | null;
  imageUrl?: string | null;
  detailUrl?: string | null;
  distanceMeters?: number | null;
  provider?: 'KAKAO' | 'TOUR_API' | 'ITINERARY';
};
