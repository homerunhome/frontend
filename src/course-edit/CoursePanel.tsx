import type { CoursePlace } from './types';

type CoursePanelProps = {
  places: CoursePlace[];
  selectedPlaceId: string;
  travelMinutes: Record<string, number | null>;
  departureLabel: string;
  travelModeLabel: string;
  onSelectPlace: (id: string) => void;
  onMovePlace: (id: string, direction: -1 | 1) => void;
  onRemovePlace: (id: string) => void;
  onUpdateStayMinutes: (id: string, minutes: number) => void;
  onExplore: () => void;
};

export function CoursePanel({ places, selectedPlaceId, travelMinutes, departureLabel, travelModeLabel, onSelectPlace, onMovePlace, onRemovePlace, onUpdateStayMinutes, onExplore }: CoursePanelProps) {
  return (
    <div className="panel-content course-panel">
      <div className="panel-heading">
        <div><h1>코스 수정</h1><p>백엔드에 저장된 순서대로 장소를 표시합니다.</p></div>
        <button className="button button--dark" type="button" onClick={onExplore}>+ 장소 추가</button>
      </div>

      {places.length === 0 ? (
        <div className="empty-state"><strong>저장된 장소가 없어요.</strong><p>주변 장소를 검색해 코스를 구성해 보세요.</p><button className="button button--primary" type="button" onClick={onExplore}>장소 찾기</button></div>
      ) : (
        <ol className="course-list">
          {places.map((place, index) => (
            <li key={place.id} className="course-item-wrap">
              {index > 0 && (
                <div className="travel-connector">
                  <span>{travelMinutes[place.id] === undefined ? '이동시간 확인 중' : travelMinutes[place.id] === null ? '이동시간 확인 불가' : `${travelModeLabel} ${travelMinutes[place.id]}분`}</span>
                </div>
              )}
              <article className={selectedPlaceId === place.id ? 'course-item is-selected' : 'course-item'}>
                <div className={`place-index place-index--${place.kind}`}>{index + 1}</div>
                <div className="place-copy">
                  <span className="place-category">{place.category}</span>
                  <h2><button className="place-name-button" type="button" aria-pressed={selectedPlaceId === place.id} onClick={() => onSelectPlace(place.id)}>{place.name}</button></h2>
                  <p title={place.address}>{place.address}</p>
                  {place.provider && <span className="place-provider">{place.provider === 'TOUR_API' ? '한국관광공사' : place.provider === 'KAKAO' ? '카카오' : '저장된 일정'}</span>}
                  <label className="stay-control">체류 시간
                    <select value={place.stayMinutes} onChange={(event) => onUpdateStayMinutes(place.id, Number(event.target.value))}>
                      {[30, 45, 60, 90, 120, 180].map((minutes) => <option value={minutes} key={minutes}>{minutes}분</option>)}
                    </select>
                  </label>
                </div>
                <div className="place-actions" aria-label={`${place.name} 순서 변경`}>
                  <button type="button" disabled={index === 0} onClick={() => onMovePlace(place.id, -1)} aria-label={`${place.name} 위로 이동`}>↑</button>
                  <button type="button" disabled={index === places.length - 1} onClick={() => onMovePlace(place.id, 1)} aria-label={`${place.name} 아래로 이동`}>↓</button>
                  <button className="remove-button" type="button" onClick={() => onRemovePlace(place.id)} aria-label={`${place.name} 삭제`}>×</button>
                </div>
              </article>
            </li>
          ))}
        </ol>
      )}

      <div className="return-ticket"><span>일정 종료</span><strong>{departureLabel}</strong><small>일정 조회 API의 출발 장소와 시각입니다.</small></div>
    </div>
  );
}
