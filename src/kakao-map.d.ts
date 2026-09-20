type KakaoLatLng = {
  getLat(): number;
  getLng(): number;
};

type KakaoMap = {
  addControl(control: KakaoZoomControl, position: unknown): void;
  panTo(position: KakaoLatLng): void;
  relayout(): void;
  setBounds(bounds: KakaoLatLngBounds, paddingTop?: number, paddingRight?: number, paddingBottom?: number, paddingLeft?: number): void;
};

type KakaoLatLngBounds = {
  extend(position: KakaoLatLng): void;
};

type KakaoZoomControl = object;

type KakaoCustomOverlay = {
  setMap(map: KakaoMap | null): void;
};

type KakaoPolyline = {
  setMap(map: KakaoMap | null): void;
};

type KakaoMapsNamespace = {
  load(callback: () => void): void;
  LatLng: new (latitude: number, longitude: number) => KakaoLatLng;
  LatLngBounds: new () => KakaoLatLngBounds;
  Map: new (container: HTMLElement, options: { center: KakaoLatLng; level: number }) => KakaoMap;
  ZoomControl: new () => KakaoZoomControl;
  CustomOverlay: new (options: {
    clickable?: boolean;
    content: HTMLElement;
    map: KakaoMap;
    position: KakaoLatLng;
    xAnchor?: number;
    yAnchor?: number;
    zIndex?: number;
  }) => KakaoCustomOverlay;
  Polyline: new (options: {
    map: KakaoMap;
    path: KakaoLatLng[];
    strokeColor: string;
    strokeOpacity: number;
    strokeStyle: string;
    strokeWeight: number;
  }) => KakaoPolyline;
  ControlPosition: {
    RIGHT: unknown;
  };
};

interface Window {
  kakao?: {
    maps: KakaoMapsNamespace;
  };
}
