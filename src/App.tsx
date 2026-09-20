import { useEffect, useMemo, useState } from 'react';
import { CourseMap } from './course-edit/CourseMap';
import { CoursePanel } from './course-edit/CoursePanel';
import { ExplorePanel } from './course-edit/ExplorePanel';
import { initialCourse, placeCandidates } from './course-edit/mockData';
import type { CoursePlace, PanelMode } from './course-edit/types';

export default function App() {
  const [course, setCourse] = useState<CoursePlace[]>(initialCourse);
  const [selectedPlaceId, setSelectedPlaceId] = useState(initialCourse[1]?.id ?? '');
  const [panelMode, setPanelMode] = useState<PanelMode>('course');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (!notice) return;
    const timeoutId = window.setTimeout(() => setNotice(''), 4000);
    return () => window.clearTimeout(timeoutId);
  }, [notice]);

  const totalStayMinutes = useMemo(
    () => course.reduce((total, place) => total + place.stayMinutes, 0),
    [course],
  );

  const addPlace = (place: CoursePlace) => {
    if (course.some((coursePlace) => coursePlace.id === place.id)) {
      setNotice('이미 코스에 포함된 장소예요.');
      return;
    }

    const stadiumIndex = course.findIndex((coursePlace) => coursePlace.kind === 'stadium');
    const insertIndex = stadiumIndex === -1 ? course.length : stadiumIndex;
    setCourse((current) => [
      ...current.slice(0, insertIndex),
      place,
      ...current.slice(insertIndex),
    ]);
    setSelectedPlaceId(place.id);
    setPanelMode('course');
    setNotice(`${place.name}을 코스에 추가했어요.`);
  };

  const removePlace = (id: string) => {
    const target = course.find((place) => place.id === id);
    if (!target || target.locked) return;

    setCourse((current) => current.filter((place) => place.id !== id));
    setSelectedPlaceId((current) => (current === id ? '' : current));
    setNotice(`${target.name}을 코스에서 제외했어요.`);
  };

  const movePlace = (id: string, direction: -1 | 1) => {
    setCourse((current) => {
      const index = current.findIndex((place) => place.id === id);
      const targetIndex = index + direction;
      if (index < 0 || targetIndex < 0 || targetIndex >= current.length) return current;
      if (current[index]?.locked || current[targetIndex]?.locked) return current;

      const next = [...current];
      const [moved] = next.splice(index, 1);
      if (!moved) return current;
      next.splice(targetIndex, 0, moved);
      return next;
    });
  };

  const updateStayMinutes = (id: string, stayMinutes: number) => {
    setCourse((current) =>
      current.map((place) => (place.id === id ? { ...place, stayMinutes } : place)),
    );
  };

  const saveCourse = () => {
    setNotice(`방문 장소 ${course.length}곳의 변경 내용을 저장했어요.`);
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar__lead">
          <button className="text-button text-button--back" type="button" aria-label="이전 화면으로 돌아가기">
            <span aria-hidden="true">←</span>
            내 원정
          </button>
          <div className="topbar__title">
            <strong>대전 야구 원정</strong>
            <span>9월 20일 일요일 · 한화생명 볼파크</span>
          </div>
        </div>
        <div className="topbar__actions">
          <button className="button button--secondary" type="button" onClick={() => setNotice('수정 내용을 취소했어요.')}>취소</button>
          <button className="button button--primary" type="button" onClick={saveCourse}>변경 저장</button>
        </div>
      </header>

      <main className="editor-layout">
        <section className="map-section" aria-label="대전 코스 지도">
          <div className="trip-card">
            <span className="trip-card__label">당일 원정</span>
            <strong>서울역 08:34 출발</strong>
            <span>KTX 205 · 대전역 09:37 도착</span>
            <div className="trip-card__meta">
              <span>{course.length}개 장소</span>
              <span>체류 {Math.floor(totalStayMinutes / 60)}시간 {totalStayMinutes % 60}분</span>
            </div>
          </div>
          <CourseMap
            places={course}
            selectedPlaceId={selectedPlaceId}
            onSelectPlace={setSelectedPlaceId}
          />
          <div className="map-legend" aria-label="지도 범례">
            <span><i className="legend-dot legend-dot--station" />기차역</span>
            <span><i className="legend-dot legend-dot--place" />방문 장소</span>
            <span><i className="legend-dot legend-dot--stadium" />야구장</span>
          </div>
        </section>

        <aside className="side-panel" aria-label="코스 편집 패널">
          <div className="panel-tabs" role="tablist" aria-label="편집 메뉴">
            <button
              className={panelMode === 'course' ? 'panel-tab is-active' : 'panel-tab'}
              type="button"
              role="tab"
              aria-selected={panelMode === 'course'}
              onClick={() => setPanelMode('course')}
            >
              방문 순서 <span>{course.length}</span>
            </button>
            <button
              className={panelMode === 'explore' ? 'panel-tab is-active' : 'panel-tab'}
              type="button"
              role="tab"
              aria-selected={panelMode === 'explore'}
              onClick={() => setPanelMode('explore')}
            >
              장소 찾기
            </button>
          </div>

          {panelMode === 'course' ? (
            <CoursePanel
              places={course}
              selectedPlaceId={selectedPlaceId}
              onSelectPlace={setSelectedPlaceId}
              onMovePlace={movePlace}
              onRemovePlace={removePlace}
              onUpdateStayMinutes={updateStayMinutes}
              onExplore={() => setPanelMode('explore')}
            />
          ) : (
            <ExplorePanel
              candidates={placeCandidates}
              coursePlaceIds={course.map((place) => place.id)}
              onAddPlace={addPlace}
            />
          )}
        </aside>
      </main>

      {notice && (
        <div className="toast" role="status">
          <span>{notice}</span>
          <button type="button" onClick={() => setNotice('')} aria-label="알림 닫기">×</button>
        </div>
      )}
    </div>
  );
}
