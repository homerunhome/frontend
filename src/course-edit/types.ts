export type PlaceKind = 'station' | 'food' | 'cafe' | 'tour' | 'stadium';
export type PlaceCategory = '전체' | '먹을 곳' | '카페' | '관광명소' | '문화시설';
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
  category: Exclude<PlaceCategory, '전체'> | '이동';
  stayMinutes: number;
  travelMinutes: number;
  position: MapPosition;
  locked?: boolean;
};
