import { useEffect, useRef, useState } from 'react';

type PlacePin = {
  key: string;
  name: string;
  latitude: number | null;
  longitude: number | null;
};

type Props = {
  places: PlacePin[];
  activePlaceKey: string | null;
  onSelectPlace: (key: string) => void;
};

type KakaoCoordinate = object;
type KakaoBounds = { extend: (coordinate: KakaoCoordinate) => void };
type KakaoOverlay = { setMap: (map: KakaoMap | null) => void };
type KakaoPolyline = KakaoOverlay;
type KakaoMap = {
  addControl: (control: unknown, position: string) => void;
  relayout: () => void;
  setBounds: (bounds: KakaoBounds, top?: number, right?: number, bottom?: number, left?: number) => void;
  setCenter: (coordinate: KakaoCoordinate) => void;
  setLevel: (level: number) => void;
};
type KakaoMaps = {
  Map: new (container: HTMLElement, options: { center: KakaoCoordinate; level: number }) => KakaoMap;
  LatLng: new (latitude: number, longitude: number) => KakaoCoordinate;
  LatLngBounds: new () => KakaoBounds;
  CustomOverlay: new (options: {
    clickable: boolean;
    content: HTMLElement;
    map: KakaoMap;
    position: KakaoCoordinate;
    xAnchor: number;
    yAnchor: number;
    zIndex: number;
  }) => KakaoOverlay;
  Polyline: new (options: {
    map: KakaoMap;
    path: KakaoCoordinate[];
    strokeColor: string;
    strokeOpacity: number;
    strokeWeight: number;
  }) => KakaoPolyline;
  ZoomControl: new () => unknown;
  ControlPosition: { RIGHT: string };
  load: (callback: () => void) => void;
};
type KakaoSdk = { maps: KakaoMaps };

declare global {
  interface Window {
    kakao?: KakaoSdk;
  }
}

let sdkRequest: { appKey: string; promise: Promise<KakaoSdk> } | null = null;

function loadKakaoMapSdk(appKey: string): Promise<KakaoSdk> {
  if (window.kakao?.maps.Map) return Promise.resolve(window.kakao);
  if (sdkRequest?.appKey === appKey) return sdkRequest.promise;

  const promise = new Promise<KakaoSdk>((resolve, reject) => {
    const script = document.createElement('script');
    let settled = false;
    const timeoutId = window.setTimeout(() => fail(new Error('Kakao Maps SDK load timed out')), 15000);
    const fail = (error: Error) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeoutId);
      reject(error);
    };

    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(appKey)}&autoload=false`;
    script.async = true;
    script.dataset.kakaoMapSdk = 'true';
    script.onload = () => {
      const maps = window.kakao?.maps;
      if (!maps?.load) {
        fail(new Error('Kakao Maps SDK did not initialize'));
        return;
      }
      maps.load(() => {
        if (settled) return;
        if (window.kakao?.maps.Map) {
          settled = true;
          window.clearTimeout(timeoutId);
          resolve(window.kakao);
        } else {
          fail(new Error('Kakao Maps SDK did not initialize'));
        }
      });
    };
    script.onerror = () => fail(new Error('Kakao Maps SDK request failed'));
    document.head.append(script);
  });

  sdkRequest = { appKey, promise };
  void promise.catch(() => {
    if (sdkRequest?.promise === promise) sdkRequest = null;
  });
  return promise;
}

function coordinatePlaces(places: PlacePin[]) {
  return places.flatMap((place, order) => (
    place.latitude !== null && place.longitude !== null
      && Number.isFinite(place.latitude) && Number.isFinite(place.longitude)
      ? [{ ...place, order }]
      : []
  ));
}

export function ItineraryMapPreview({ places, activePlaceKey, onSelectPlace }: Props) {
  const mapElementRef = useRef<HTMLDivElement>(null);
  const [sdk, setSdk] = useState<KakaoSdk | null>(null);
  const [map, setMap] = useState<KakaoMap | null>(null);
  const [sdkState, setSdkState] = useState<'loading' | 'ready' | 'missing' | 'error'>(
    import.meta.env.VITE_KAKAO_MAP_APP_KEY?.trim() ? 'loading' : 'missing',
  );
  const appKey = import.meta.env.VITE_KAKAO_MAP_APP_KEY?.trim();
  const locatedPlaces = coordinatePlaces(places);

  useEffect(() => {
    if (!appKey) {
      setSdkState('missing');
      return;
    }

    let active = true;
    setSdkState('loading');
    loadKakaoMapSdk(appKey)
      .then((loadedSdk) => {
        if (!active) return;
        setSdk(loadedSdk);
        setSdkState('ready');
      })
      .catch(() => {
        if (active) setSdkState('error');
      });

    return () => { active = false; };
  }, [appKey]);

  useEffect(() => {
    const container = mapElementRef.current;
    if (!sdk || !container) return;

    const createdMap = new sdk.maps.Map(container, {
      center: new sdk.maps.LatLng(36.3504, 127.3845),
      level: 7,
    });
    createdMap.addControl(new sdk.maps.ZoomControl(), sdk.maps.ControlPosition.RIGHT);
    setMap(createdMap);

    const resizeObserver = new ResizeObserver(() => createdMap.relayout());
    resizeObserver.observe(container);
    return () => {
      resizeObserver.disconnect();
      setMap(null);
    };
  }, [sdk]);

  useEffect(() => {
    if (!sdk || !map) return;

    const bounds = new sdk.maps.LatLngBounds();
    const overlays: KakaoOverlay[] = [];
    const coordinates = locatedPlaces.map((place) => {
      const position = new sdk.maps.LatLng(place.latitude as number, place.longitude as number);
      bounds.extend(position);

      const pin = document.createElement('button');
      const active = place.key === activePlaceKey;
      pin.type = 'button';
      pin.className = 'kakao-routine-pin' + (active ? ' is-active' : '');
      pin.textContent = String(place.order + 1).padStart(2, '0');
      pin.setAttribute('aria-label', `${place.order + 1}번째 장소, ${place.name}`);
      pin.setAttribute('aria-pressed', String(active));
      pin.addEventListener('click', () => onSelectPlace(place.key));

      overlays.push(new sdk.maps.CustomOverlay({
        clickable: true,
        content: pin,
        map,
        position,
        xAnchor: 0.5,
        yAnchor: 1,
        zIndex: active ? 10 : 1,
      }));
      return position;
    });

    let route: KakaoPolyline | null = null;
    if (coordinates.length > 1) {
      route = new sdk.maps.Polyline({
        map,
        path: coordinates,
        strokeColor: '#16856e',
        strokeOpacity: 0.85,
        strokeWeight: 3,
      });
      map.setBounds(bounds, 72, 72, 72, 72);
    } else if (coordinates.length === 1) {
      map.setCenter(coordinates[0]);
      map.setLevel(5);
    }

    return () => {
      overlays.forEach((overlay) => overlay.setMap(null));
      route?.setMap(null);
    };
  }, [activePlaceKey, locatedPlaces, map, onSelectPlace, sdk]);

  const mapMessage = sdkState === 'missing'
    ? '카카오 지도 JavaScript 키를 설정하면 실제 지도가 표시돼요.'
    : sdkState === 'error'
      ? '지도를 불러오지 못했어요. 앱 키와 등록 도메인을 확인해 주세요.'
      : sdkState === 'loading'
        ? '카카오 지도를 불러오는 중이에요.'
        : locatedPlaces.length === 0
          ? places.length ? '좌표가 있는 장소만 지도에 표시할 수 있어요.' : '장소를 추가하면 위치가 지도에 표시돼요.'
          : '';

  return (
    <section className="routine-map-card" aria-label="루틴 위치 지도">
      <div className="routine-map-canvas">
        <div ref={mapElementRef} className="kakao-map-surface" aria-label="저장한 장소의 카카오 지도" />
        {!!mapMessage && <div className={'routine-map-state is-' + sdkState} role="status">{mapMessage}</div>}
      </div>
    </section>
  );
}
