import { useEffect, useRef, useState } from 'react';
import { loadKakaoMaps } from './loadKakaoMaps';
import type { CoursePlace } from './types';

type CourseMapProps = {
  places: CoursePlace[];
  selectedPlaceId: string;
  onSelectPlace: (id: string) => void;
};

const DAEJEON_STADIUM = { latitude: 36.317067, longitude: 127.429188 };

export function CourseMap({ places, selectedPlaceId, onSelectPlace }: CourseMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<KakaoMap | null>(null);
  const [mapError, setMapError] = useState('');
  const [isLocating, setIsLocating] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let cancelled = false;
    let resizeObserver: ResizeObserver | null = null;
    const overlays: KakaoCustomOverlay[] = [];
    let route: KakaoPolyline | null = null;

    setMapError('');
    void loadKakaoMaps()
      .then((maps) => {
        if (cancelled) return;

        container.replaceChildren();
        const coordinatePlaces = places.filter(
          (place): place is CoursePlace & { latitude: number; longitude: number } =>
            place.latitude !== null && place.longitude !== null,
        );
        const centerPlace = coordinatePlaces[0] ?? DAEJEON_STADIUM;
        const map = new maps.Map(container, {
          center: new maps.LatLng(centerPlace.latitude, centerPlace.longitude),
          level: 5,
        });
        mapRef.current = map;
        map.addControl(new maps.ZoomControl(), maps.ControlPosition.RIGHT);

        const bounds = new maps.LatLngBounds();
        const path = coordinatePlaces.map((place, index) => {
          const position = new maps.LatLng(place.latitude, place.longitude);
          bounds.extend(position);

          const marker = document.createElement('button');
          marker.type = 'button';
          marker.className = `kakao-course-marker${selectedPlaceId === place.id ? ' is-selected' : ''}`;
          marker.setAttribute('aria-label', `${index + 1}번째 장소 ${place.name}`);
          const number = document.createElement('span');
          number.textContent = String(index + 1);
          const label = document.createElement('strong');
          label.textContent = place.name;
          marker.append(number, label);
          marker.addEventListener('click', () => onSelectPlace(place.id));

          overlays.push(new maps.CustomOverlay({
            map,
            position,
            content: marker,
            clickable: true,
            xAnchor: 0.5,
            yAnchor: 1,
            zIndex: selectedPlaceId === place.id ? 4 : 3,
          }));
          return position;
        });

        if (path.length > 1) {
          route = new maps.Polyline({
            map,
            path,
            strokeColor: '#e85f2b',
            strokeOpacity: 0.9,
            strokeStyle: 'shortdash',
            strokeWeight: 5,
          });
        }
        if (coordinatePlaces.length > 1) map.setBounds(bounds, 110, 80, 80, 80);

        resizeObserver = new ResizeObserver(() => map.relayout());
        resizeObserver.observe(container);
      })
      .catch((error: unknown) => {
        if (!cancelled) setMapError(error instanceof Error ? error.message : '지도를 불러오지 못했습니다.');
      });

    return () => {
      cancelled = true;
      resizeObserver?.disconnect();
      overlays.forEach((overlay) => overlay.setMap(null));
      route?.setMap(null);
      mapRef.current = null;
    };
  }, [onSelectPlace, places, selectedPlaceId]);

  const moveToCurrentLocation = () => {
    if (!navigator.geolocation) {
      setMapError('이 브라우저에서는 현재 위치를 사용할 수 없습니다.');
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const maps = window.kakao?.maps;
        if (maps && mapRef.current) mapRef.current.panTo(new maps.LatLng(coords.latitude, coords.longitude));
        setIsLocating(false);
      },
      () => {
        setMapError('현재 위치 권한을 확인해 주세요.');
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 8000 },
    );
  };

  return (
    <div className="course-map">
      <div ref={containerRef} className="kakao-map-canvas" aria-label="카카오 코스 지도" />
      {mapError && <div className="map-error" role="alert"><strong>지도를 표시하지 못했어요.</strong><span>{mapError}</span></div>}
      <button className="map-current" type="button" onClick={moveToCurrentLocation} disabled={isLocating}>
        {isLocating ? '위치 확인 중' : '현재 위치'}
      </button>
    </div>
  );
}
