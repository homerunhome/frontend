import { useEffect, useMemo, useState } from 'react';
import { getTravelTime } from './api/client';
import { useItinerary } from './api/useItinerary';
import type { Coordinate } from './api/types';
import { candidateToCoursePlace, itineraryPlacesToCoursePlaces, recalculateMapPositions } from './course-edit/coursePlaces';
import { CourseMap } from './course-edit/CourseMap';
import { CoursePanel } from './course-edit/CoursePanel';
import { ExplorePanel } from './course-edit/ExplorePanel';
import type { CoursePlace, PanelMode } from './course-edit/types';
import { formatDate, formatTime } from './itinerary/format';
import { ItineraryOverview } from './itinerary/ItineraryOverview';

function PageState({ title, message, onRetry }: { title: string; message: string; onRetry?: () => void }) {
  return (
    <main className="page-state">
      <span>HOMERUN HOME</span>
      <h1>{title}</h1>
      <p>{message}</p>
      {onRetry && <button className="button button--primary" type="button" onClick={onRetry}>다시 시도</button>}
    </main>
  );
}

function MissingItinerary() {
  const [id, setId] = useState('');
  const openItinerary = () => {
    const parsedId = Number(id);
    if (Number.isInteger(parsedId) && parsedId > 0) window.location.assign(`/itineraries/${parsedId}`);
  };

  return (
    <main className="page-state">
      <span>HOMERUN HOME</span>
      <h1>조회할 일정이 필요해요.</h1>
      <p>일정 생성 API가 반환한 ID를 입력하면 저장된 데이터를 조회합니다.</p>
      <div className="itinerary-id-form">
        <label htmlFor="itinerary-id">일정 ID</label>
        <input id="itinerary-id" inputMode="numeric" value={id} onChange={(event) => setId(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') openItinerary(); }} />
        <button className="button button--primary" type="button" onClick={openItinerary}>일정 열기</button>
      </div>
    </main>
  );
}

export function CourseEditPage({ itineraryId }: { itineraryId: number }) {
  const { data: itinerary, error, isLoading, retry } = useItinerary(itineraryId);
  const [course, setCourse] = useState<CoursePlace[]>([]);
  const [selectedPlaceId, setSelectedPlaceId] = useState('');
  const [panelMode, setPanelMode] = useState<PanelMode>('course');
  const [notice, setNotice] = useState('');
  const [travelMinutes, setTravelMinutes] = useState<Record<string, number | null>>({});

  useEffect(() => {
    if (!itinerary) return;
    const places = itineraryPlacesToCoursePlaces(itinerary.places);
    setCourse(places);
    setSelectedPlaceId(places[0]?.id ?? '');
    document.title = `코스 수정 | ${itinerary.stadium}`;
  }, [itinerary]);

  useEffect(() => {
    if (!notice) return;
    const timeoutId = window.setTimeout(() => setNotice(''), 4000);
    return () => window.clearTimeout(timeoutId);
  }, [notice]);

  useEffect(() => {
    const controller = new AbortController();
    const loadTravelTimes = async () => {
      const entries = await Promise.all(course.slice(1).map(async (place, index) => {
        const previous = course[index];
        if (!previous || previous.latitude === null || previous.longitude === null || place.latitude === null || place.longitude === null) {
          return [place.id, null] as const;
        }
        const origin: Coordinate = { latitude: previous.latitude, longitude: previous.longitude };
        const destination: Coordinate = { latitude: place.latitude, longitude: place.longitude };
        try {
          const result = await getTravelTime(origin, destination, controller.signal);
          return [place.id, Math.ceil(result.durationSeconds / 60)] as const;
        } catch {
          return [place.id, null] as const;
        }
      }));
      if (!controller.signal.aborted) setTravelMinutes(Object.fromEntries(entries));
    };
    void loadTravelTimes();
    return () => controller.abort();
  }, [course]);

  const mapPlaces = useMemo(() => recalculateMapPositions(course), [course]);
  const closeEditorWindow = () => {
    window.setTimeout(() => window.location.assign(`/itineraries/${itineraryId}`), 100);
    window.close();
  };

  if (isLoading) return <PageState title="일정을 불러오는 중입니다" message="저장된 경기와 장소 정보를 확인하고 있어요." />;
  if (error) return <PageState title="일정을 불러오지 못했습니다" message={error} onRetry={retry} />;
  if (!itinerary) return null;

  const addPlace = (candidate: Parameters<typeof candidateToCoursePlace>[0]) => {
    const place = candidateToCoursePlace(candidate);
    if (course.some((coursePlace) => coursePlace.id === place.id)) {
      setNotice('이미 코스에 포함된 장소예요.');
      return;
    }
    setCourse((current) => [...current, place]);
    setSelectedPlaceId(place.id);
    setPanelMode('course');
    setNotice(`${place.name}을 코스에 추가했어요.`);
  };

  const removePlace = (id: string) => {
    const target = course.find((place) => place.id === id);
    if (!target) return;
    setCourse((current) => current.filter((place) => place.id !== id));
    setSelectedPlaceId((current) => (current === id ? '' : current));
    setNotice(`${target.name}을 코스에서 제외했어요.`);
  };

  const movePlace = (id: string, direction: -1 | 1) => {
    setCourse((current) => {
      const index = current.findIndex((place) => place.id === id);
      const targetIndex = index + direction;
      if (index < 0 || targetIndex < 0 || targetIndex >= current.length) return current;
      const next = [...current];
      const [moved] = next.splice(index, 1);
      if (!moved) return current;
      next.splice(targetIndex, 0, moved);
      return next;
    });
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar__lead">
          <button className="text-button text-button--back" type="button" aria-label="편집 창 닫기" onClick={closeEditorWindow}><span aria-hidden="true">←</span>내 원정</button>
          <div className="topbar__title"><strong>{itinerary.stadium} 원정</strong><span>{formatDate(itinerary.gameDate)} · {itinerary.homeTeam} vs {itinerary.awayTeam}</span></div>
        </div>
        <div className="topbar__actions">
          <button className="button button--secondary" type="button" onClick={closeEditorWindow}>취소</button>
          <button className="button button--primary" type="button" disabled title="백엔드 일정 수정 API가 아직 제공되지 않습니다.">저장 API 연결 대기</button>
        </div>
      </header>

      <main className="editor-layout">
        <section className="map-section" aria-label={`${itinerary.stadium} 원정 코스 지도`}>
          <div className="trip-card">
            <span className="trip-card__label">{formatDate(itinerary.gameDate)}</span>
            <strong>{itinerary.arrivalPlace} {formatTime(itinerary.arrivalAt)} 도착</strong>
            <span>{itinerary.homeTeam} vs {itinerary.awayTeam} · {formatTime(itinerary.gameStartTime)} 경기</span>
            <div className="trip-card__meta"><span>{course.length}개 장소</span><span>{itinerary.stadium}</span></div>
          </div>
          <CourseMap places={mapPlaces} selectedPlaceId={selectedPlaceId} onSelectPlace={setSelectedPlaceId} />
          <div className="map-legend" aria-label="지도 범례"><span><i className="legend-dot legend-dot--place" />저장된 장소</span><span><i className="legend-dot legend-dot--tour" />추가한 장소</span></div>
        </section>

        <aside className="side-panel" aria-label="코스 편집 패널">
          <div className="panel-tabs" role="tablist" aria-label="편집 메뉴">
            <button className={panelMode === 'course' ? 'panel-tab is-active' : 'panel-tab'} type="button" role="tab" aria-selected={panelMode === 'course'} onClick={() => setPanelMode('course')}>방문 순서 <span>{course.length}</span></button>
            <button className={panelMode === 'explore' ? 'panel-tab is-active' : 'panel-tab'} type="button" role="tab" aria-selected={panelMode === 'explore'} onClick={() => setPanelMode('explore')}>장소 찾기</button>
          </div>
          {panelMode === 'course' ? (
            <CoursePanel places={course} selectedPlaceId={selectedPlaceId} travelMinutes={travelMinutes} departureLabel={`${itinerary.departurePlace} ${formatTime(itinerary.departureAt)} 출발`} onSelectPlace={setSelectedPlaceId} onMovePlace={movePlace} onRemovePlace={removePlace} onExplore={() => setPanelMode('explore')} />
          ) : (
            <ExplorePanel itinerary={itinerary} coursePlaces={course} onAddPlace={addPlace} />
          )}
        </aside>
      </main>

      {notice && <div className="toast" role="status"><span>{notice}</span><button type="button" onClick={() => setNotice('')} aria-label="알림 닫기">×</button></div>}
    </div>
  );
}

export default function App() {
  const editorMatch = window.location.pathname.match(/^\/itineraries\/(\d+)\/course\/edit\/?$/);
  if (editorMatch?.[1]) return <CourseEditPage itineraryId={Number(editorMatch[1])} />;
  const overviewMatch = window.location.pathname.match(/^\/itineraries\/(\d+)\/?$/);
  if (overviewMatch?.[1]) return <ItineraryOverview itineraryId={Number(overviewMatch[1])} />;
  return <MissingItinerary />;
}
