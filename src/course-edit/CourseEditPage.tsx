import { useEffect, useMemo, useState } from 'react';
import { geocodeAddress, getTravelTime, updateItineraryPlaces } from '../api/client';
import type { Coordinate, TravelMode } from '../api/types';
import { useItinerary } from '../api/useItinerary';
import { formatDate, formatTime } from '../itinerary/format';
import { candidateToCoursePlace, itineraryPlacesToCoursePlaces, recalculateMapPositions } from './coursePlaces';
import { CourseMap } from './CourseMap';
import { CoursePanel } from './CoursePanel';
import { ExplorePanel } from './ExplorePanel';
import type { CoursePlace, PanelMode } from './types';

type RouteState = {
  travelMinutes: Record<string, number | null>;
  finalLegToStadiumMinutes: number | null;
  stadiumToDepartureMinutes: number | null;
  calculating: boolean;
};

const modeLabels: Record<TravelMode, string> = {
  CAR: '자동차',
  WALK: '도보',
  PUBLIC_TRANSIT: '대중교통',
};

function PageState({ title, message, onRetry }: { title: string; message: string; onRetry?: () => void }) {
  return (
    <main className="page-state">
      <strong>{title}</strong>
      <p>{message}</p>
      {onRetry && <button className="button button-primary" type="button" onClick={onRetry}>다시 시도</button>}
    </main>
  );
}

function coordinateOf(place: CoursePlace): Coordinate | null {
  return place.latitude === null || place.longitude === null
    ? null
    : { latitude: place.latitude, longitude: place.longitude };
}

function boundaryPlace(id: string, name: string, address: string, kind: 'station' | 'stadium', coordinate: Coordinate): CoursePlace {
  return {
    id,
    name,
    address,
    description: address,
    kind,
    category: kind === 'station' ? '도착 장소' : '경기장',
    position: { x: 50, y: 50 },
    latitude: coordinate.latitude,
    longitude: coordinate.longitude,
    provider: 'ITINERARY',
    stayMinutes: 0,
    mustVisit: true,
  };
}

export function CourseEditPage({ itineraryId }: { itineraryId: number }) {
  const { data: itinerary, error, isLoading, retry } = useItinerary(itineraryId);
  const [course, setCourse] = useState<CoursePlace[]>([]);
  const [selectedPlaceId, setSelectedPlaceId] = useState('');
  const [panelMode, setPanelMode] = useState<PanelMode>('course');
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);
  const [boundaryCoordinates, setBoundaryCoordinates] = useState<{ arrival: Coordinate; stadium: Coordinate; departure: Coordinate } | null>(null);
  const [routeState, setRouteState] = useState<RouteState>({ travelMinutes: {}, finalLegToStadiumMinutes: null, stadiumToDepartureMinutes: null, calculating: false });

  const travelMode: TravelMode = itinerary?.travelMode ?? 'PUBLIC_TRANSIT';

  useEffect(() => {
    if (!itinerary) return;
    const places = itineraryPlacesToCoursePlaces(itinerary.places);
    setCourse(places);
    setSelectedPlaceId(places[0]?.id ?? 'ARRIVAL');
    document.title = `코스 수정 | ${itinerary.stadium}`;
  }, [itinerary]);

  useEffect(() => {
    if (!itinerary) return;
    let active = true;
    void Promise.all([
      geocodeAddress(itinerary.arrivalPlace),
      geocodeAddress(itinerary.stadium),
      geocodeAddress(itinerary.departurePlace),
    ]).then(([arrival, stadium, departure]) => {
      if (active) setBoundaryCoordinates({ arrival, stadium, departure });
    }).catch((requestError: unknown) => {
      if (active) setNotice(requestError instanceof Error ? requestError.message : '출발지와 경기장 위치를 확인하지 못했습니다.');
    });
    return () => { active = false; };
  }, [itinerary]);

  useEffect(() => {
    if (!boundaryCoordinates) return;
    const controller = new AbortController();
    setRouteState((current) => ({ ...current, calculating: true }));

    const calculate = async () => {
      const entries = await Promise.all(course.map(async (place, index) => {
        const destination = coordinateOf(place);
        const origin = index === 0 ? boundaryCoordinates.arrival : coordinateOf(course[index - 1]!);
        if (!origin || !destination) return [place.id, null] as const;
        try {
          const result = await getTravelTime(origin, destination, travelMode, controller.signal);
          return [place.id, Math.ceil(result.durationSeconds / 60)] as const;
        } catch {
          return [place.id, null] as const;
        }
      }));

      const lastCoordinate = course.length ? coordinateOf(course[course.length - 1]!) : boundaryCoordinates.arrival;
      const [finalLeg, departureLeg] = await Promise.all([
        lastCoordinate
          ? getTravelTime(lastCoordinate, boundaryCoordinates.stadium, travelMode, controller.signal).then((value) => Math.ceil(value.durationSeconds / 60)).catch(() => null)
          : Promise.resolve(null),
        getTravelTime(boundaryCoordinates.stadium, boundaryCoordinates.departure, travelMode, controller.signal).then((value) => Math.ceil(value.durationSeconds / 60)).catch(() => null),
      ]);
      if (!controller.signal.aborted) {
        setRouteState({
          travelMinutes: Object.fromEntries(entries),
          finalLegToStadiumMinutes: finalLeg,
          stadiumToDepartureMinutes: departureLeg,
          calculating: false,
        });
      }
    };

    void calculate();
    return () => controller.abort();
  }, [boundaryCoordinates, course, travelMode]);

  useEffect(() => {
    if (!notice) return;
    const timeoutId = window.setTimeout(() => setNotice(''), 5000);
    return () => window.clearTimeout(timeoutId);
  }, [notice]);

  const mapPlaces = useMemo(() => {
    if (!itinerary || !boundaryCoordinates) return recalculateMapPositions(course);
    return recalculateMapPositions([
      boundaryPlace('ARRIVAL', itinerary.arrivalPlace, `${formatTime(itinerary.arrivalAt)} 도착`, 'station', boundaryCoordinates.arrival),
      ...course,
      boundaryPlace('STADIUM', itinerary.stadium, `${formatTime(itinerary.gameStartTime)} 경기`, 'stadium', boundaryCoordinates.stadium),
    ]);
  }, [boundaryCoordinates, course, itinerary]);

  if (isLoading) return <PageState title="일정을 불러오는 중입니다." message="저장된 경기와 장소 정보를 확인하고 있어요." />;
  if (error) return <PageState title="일정을 불러오지 못했습니다." message={error} onRetry={retry} />;
  if (!itinerary) return null;

  function addPlace(candidate: Parameters<typeof candidateToCoursePlace>[0]) {
    const place = candidateToCoursePlace(candidate);
    if (course.some((coursePlace) => coursePlace.id === place.id)) {
      setNotice('이미 코스에 포함된 장소예요.');
      return;
    }
    if (course.length >= 30) {
      setNotice('방문 장소는 최대 30곳까지 저장할 수 있어요.');
      return;
    }
    setCourse((current) => [...current, place]);
    setSelectedPlaceId(place.id);
    setPanelMode('course');
    setNotice(`${place.name}을 코스에 추가했어요.`);
  }

  function removePlace(id: string) {
    const target = course.find((place) => place.id === id);
    if (!target) return;
    setCourse((current) => current.filter((place) => place.id !== id));
    setSelectedPlaceId((current) => current === id ? '' : current);
    setNotice(`${target.name}을 코스에서 제외했어요.`);
  }

  function movePlace(id: string, direction: -1 | 1) {
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
  }

  function updateStayMinutes(id: string, stayMinutes: number) {
    setCourse((current) => current.map((place) => place.id === id ? { ...place, stayMinutes } : place));
  }

  async function saveCourse() {
    if (!itinerary) return;
    const missingCoordinate = course.find((place) => coordinateOf(place) === null);
    const missingTravelTime = course.find((place) => routeState.travelMinutes[place.id] == null);
    if (!boundaryCoordinates || routeState.finalLegToStadiumMinutes == null || routeState.stadiumToDepartureMinutes == null) {
      setNotice('출발지와 경기장 이동시간을 계산한 뒤 저장할 수 있어요.');
      return;
    }
    if (missingCoordinate || missingTravelTime) {
      setNotice('좌표 또는 이동시간을 확인할 수 없는 장소가 있어요.');
      return;
    }
    setSaving(true);
    try {
      const updated = await updateItineraryPlaces(itinerary.id, {
        stadiumEntryBufferMinutes: itinerary.stadiumEntryBufferMinutes ?? 30,
        finalLegToStadiumMinutes: routeState.finalLegToStadiumMinutes,
        stadiumToDepartureMinutes: routeState.stadiumToDepartureMinutes,
        postGameCrowdBufferMinutes: 30,
        boardingBufferMinutes: 15,
        travelMode,
        expectedGameDurationMinutes: 180,
        places: course.map((place) => ({
          placeId: place.id,
          name: place.name,
          address: place.address,
          latitude: place.latitude as number,
          longitude: place.longitude as number,
          travelFromPreviousMinutes: routeState.travelMinutes[place.id] as number,
          stayDurationMinutes: place.stayMinutes,
          mustVisit: place.mustVisit,
        })),
      });
      setCourse(itineraryPlacesToCoursePlaces(updated.places));
      setNotice('변경한 방문 순서와 이동시간을 저장했어요.');
    } catch (requestError) {
      setNotice(requestError instanceof Error ? requestError.message : '코스를 저장하지 못했습니다.');
    } finally {
      setSaving(false);
    }
  }

  const leaveEditor = () => window.location.assign(`/itineraries/${itineraryId}`);

  return (
    <div className="course-editor-shell">
      <header className="topbar">
        <div className="topbar__lead">
          <button className="text-button text-button--back" type="button" onClick={leaveEditor} aria-label="일정 상세로 돌아가기"><span aria-hidden="true">←</span>내 원정</button>
          <div className="topbar__title"><strong>{itinerary.stadium} 원정</strong><span>{formatDate(itinerary.gameDate)} · {itinerary.homeTeam} vs {itinerary.awayTeam}</span></div>
        </div>
        <div className="topbar__actions">
          <button className="button button--secondary" type="button" onClick={leaveEditor}>취소</button>
          <button className="button button--primary" type="button" disabled={saving || routeState.calculating} onClick={() => void saveCourse()}>{saving ? '저장 중' : routeState.calculating ? '경로 계산 중' : '변경 저장'}</button>
        </div>
      </header>

      <main className="editor-layout">
        <section className="map-section" aria-label={`${itinerary.stadium} 원정 코스 지도`}>
          <div className="trip-card">
            <span className="trip-card__label">{formatDate(itinerary.gameDate)}</span>
            <strong>{itinerary.arrivalPlace} {formatTime(itinerary.arrivalAt)} 도착</strong>
            <span>{itinerary.homeTeam} vs {itinerary.awayTeam} · {formatTime(itinerary.gameStartTime)} 경기</span>
            <div className="trip-card__meta"><span>방문 {course.length}곳</span><span>{modeLabels[travelMode]}</span></div>
          </div>
          <CourseMap places={mapPlaces} selectedPlaceId={selectedPlaceId} onSelectPlace={setSelectedPlaceId} />
          <div className="map-legend" aria-label="지도 범례"><span><i className="legend-dot legend-dot--station" />도착 장소</span><span><i className="legend-dot" />방문 장소</span><span><i className="legend-dot legend-dot--stadium" />경기장</span></div>
        </section>

        <aside className="side-panel" aria-label="코스 편집 패널">
          <div className="panel-tabs" role="tablist" aria-label="편집 메뉴">
            <button className={panelMode === 'course' ? 'panel-tab is-active' : 'panel-tab'} type="button" role="tab" aria-selected={panelMode === 'course'} onClick={() => setPanelMode('course')}>방문 순서 <span>{course.length}</span></button>
            <button className={panelMode === 'explore' ? 'panel-tab is-active' : 'panel-tab'} type="button" role="tab" aria-selected={panelMode === 'explore'} onClick={() => setPanelMode('explore')}>장소 찾기</button>
          </div>
          {panelMode === 'course' ? (
            <CoursePanel
              places={course}
              selectedPlaceId={selectedPlaceId}
              travelMinutes={routeState.travelMinutes}
              travelModeLabel={modeLabels[travelMode]}
              departureLabel={`${itinerary.departurePlace} ${formatTime(itinerary.departureAt)} 출발`}
              onSelectPlace={setSelectedPlaceId}
              onMovePlace={movePlace}
              onRemovePlace={removePlace}
              onUpdateStayMinutes={updateStayMinutes}
              onExplore={() => setPanelMode('explore')}
            />
          ) : <ExplorePanel itinerary={itinerary} coursePlaces={course} onAddPlace={addPlace} />}
        </aside>
      </main>

      {notice && <div className="toast" role="status"><span>{notice}</span><button type="button" onClick={() => setNotice('')} aria-label="알림 닫기">×</button></div>}
    </div>
  );
}
