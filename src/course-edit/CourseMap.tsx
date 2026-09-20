import type { CoursePlace } from './types';

type CourseMapProps = {
  places: CoursePlace[];
  selectedPlaceId: string;
  onSelectPlace: (id: string) => void;
};

export function CourseMap({ places, selectedPlaceId, onSelectPlace }: CourseMapProps) {
  const routePoints = places.map((place) => `${place.position.x},${place.position.y}`).join(' ');

  return (
    <div className="course-map">
      <div className="map-area map-area--yuseong">유성구</div>
      <div className="map-area map-area--seo">서구</div>
      <div className="map-area map-area--jung">중구</div>
      <div className="map-area map-area--dong">동구</div>
      <div className="map-river" aria-hidden="true" />
      <div className="map-road map-road--one" aria-hidden="true" />
      <div className="map-road map-road--two" aria-hidden="true" />
      <div className="map-road map-road--three" aria-hidden="true" />
      <div className="map-road map-road--four" aria-hidden="true" />

      <svg className="route-layer" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <polyline className="route-line route-line--outline" points={routePoints} />
        <polyline className="route-line" points={routePoints} />
      </svg>

      {places.map((place, index) => (
        <button
          key={place.id}
          className={`map-marker map-marker--${place.kind} ${selectedPlaceId === place.id ? 'is-selected' : ''}`}
          type="button"
          style={{ left: `${place.position.x}%`, top: `${place.position.y}%` }}
          aria-label={`${index + 1}번째 장소 ${place.name}`}
          onClick={() => onSelectPlace(place.id)}
        >
          <span>{index + 1}</span>
          <strong>{place.name}</strong>
        </button>
      ))}

      <div className="map-controls" aria-label="지도 배율 조절">
        <button type="button" aria-label="지도 확대">+</button>
        <button type="button" aria-label="지도 축소">−</button>
      </div>
      <button className="map-current" type="button">현재 위치</button>
    </div>
  );
}
