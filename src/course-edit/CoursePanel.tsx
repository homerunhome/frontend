import type { CoursePlace } from './types';

type CoursePanelProps = {
  places: CoursePlace[];
  selectedPlaceId: string;
  onSelectPlace: (id: string) => void;
  onMovePlace: (id: string, direction: -1 | 1) => void;
  onRemovePlace: (id: string) => void;
  onUpdateStayMinutes: (id: string, minutes: number) => void;
  onExplore: () => void;
};

export function CoursePanel({ places, selectedPlaceId, onSelectPlace, onMovePlace, onRemovePlace, onUpdateStayMinutes, onExplore }: CoursePanelProps) {
  return (
    <div className="panel-content course-panel">
      <div className="panel-heading">
        <div>
          <h1>코스 수정</h1>
          <p>방문 순서를 바꾸면 지도 경로도 함께 변경돼요.</p>
        </div>
        <button className="button button--dark" type="button" onClick={onExplore}>+ 장소 추가</button>
      </div>

      {places.length === 0 ? (
        <div className="empty-state">
          <strong>아직 방문 장소가 없어요.</strong>
          <p>원정 일정에 들를 장소를 찾아 추가해 보세요.</p>
          <button className="button button--primary" type="button" onClick={onExplore}>장소 찾기</button>
        </div>
      ) : (
        <ol className="course-list">
          {places.map((place, index) => (
            <li key={place.id} className="course-item-wrap">
              {index > 0 && <div className="travel-connector"><span>자동차 {place.travelMinutes}분</span></div>}
              <article className={selectedPlaceId === place.id ? 'course-item is-selected' : 'course-item'}>
                <div className={`place-index place-index--${place.kind}`}>{index + 1}</div>
                <div className="place-copy">
                  <span className="place-category">{place.category}</span>
                  <h2>
                    <button
                      className="place-name-button"
                      type="button"
                      aria-pressed={selectedPlaceId === place.id}
                      onClick={() => onSelectPlace(place.id)}
                    >
                      {place.name}
                    </button>
                  </h2>
                  <p>{place.description}</p>
                  <label className="stay-control">
                    체류 시간
                    <select
                      value={place.stayMinutes}
                      disabled={place.kind === 'station' || place.kind === 'stadium'}
                      onChange={(event) => onUpdateStayMinutes(place.id, Number(event.target.value))}
                      onClick={(event) => event.stopPropagation()}
                    >
                      {[10, 30, 45, 50, 55, 60, 70, 80, 90, 120, 180, 210].map((minutes) => <option key={minutes} value={minutes}>{minutes}분</option>)}
                    </select>
                  </label>
                </div>
                <div className="place-actions" aria-label={`${place.name} 순서 변경`}>
                  {!place.locked ? (
                    <>
                      <button type="button" onClick={(event) => { event.stopPropagation(); onMovePlace(place.id, -1); }} aria-label={`${place.name} 위로 이동`}>↑</button>
                      <button type="button" onClick={(event) => { event.stopPropagation(); onMovePlace(place.id, 1); }} aria-label={`${place.name} 아래로 이동`}>↓</button>
                      <button className="remove-button" type="button" onClick={(event) => { event.stopPropagation(); onRemovePlace(place.id); }} aria-label={`${place.name} 삭제`}>×</button>
                    </>
                  ) : <span className="fixed-label">고정</span>}
                </div>
              </article>
            </li>
          ))}
        </ol>
      )}

      <div className="return-ticket">
        <span>돌아오는 열차</span>
        <strong>대전역 22:06 → 서울역 23:14</strong>
        <small>KTX 220 · 출발 40분 전까지 도착 권장</small>
      </div>
    </div>
  );
}
