import { useState } from 'react';
import type { Itinerary } from './api';
import { ItineraryMapPreview } from './ItineraryMapPreview';

type Props = {
  itinerary: Itinerary;
  isSaved: boolean;
  onBack: () => void;
};

export function ItineraryDetail({ itinerary, isSaved, onBack }: Props) {
  const [activePlaceKey, setActivePlaceKey] = useState<string | null>(null);
  const mapPlaces = itinerary.places.map((place, index) => ({
    key: `${place.placeId ?? place.name}-${index}`,
    name: place.name,
    latitude: place.latitude ?? null,
    longitude: place.longitude ?? null,
  }));

  return (
    <section className="detail-page" aria-label="저장한 원정 루틴 지도">
      <button className="back-link" type="button" onClick={onBack}>
        ← {isSaved ? '저장한 일정' : '경기 목록'}
      </button>
      <div className="routine-workspace detail-routine-workspace">
        <ItineraryMapPreview
          places={mapPlaces}
          activePlaceKey={activePlaceKey}
          onSelectPlace={setActivePlaceKey}
        />
        <aside className="routine-sidebar" aria-label="저장한 방문 순서">
          <div className="routine-sidebar-heading">
            <strong>방문 순서</strong>
          </div>
          {!itinerary.places.length && <p className="routine-list-empty">아직 장소를 추가하지 않았어요.</p>}
          <ol className="routine-place-list detail-routine-list">
            {itinerary.places.map((place, index) => {
              const key = mapPlaces[index].key;
              const active = activePlaceKey === key;
              return (
                <li key={key}>
                  <button className={'detail-routine-item' + (active ? ' is-active' : '')} type="button" aria-pressed={active} onClick={() => setActivePlaceKey(key)}>
                    <span className="routine-place-order">{String(index + 1).padStart(2, '0')}</span>
                    <span className="detail-routine-place-info"><strong>{place.name}</strong><small>{place.address || '주소 미입력'}</small></span>
                  </button>
                </li>
              );
            })}
          </ol>
        </aside>
      </div>
    </section>
  );
}
