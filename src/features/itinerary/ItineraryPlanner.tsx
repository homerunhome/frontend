import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { generateItinerary, getCoursePlaceCandidates, getTravelMinutes, searchPlaces } from './api';
import type { CoursePlaceCandidate, CoursePlaceCandidateRequest, Itinerary, ItineraryRouteTime, PlaceSearchResult, TravelMode } from './api';
import { collectOptimizedTravelTimes, resolveNamedLocation, resolvePlaceCandidates, selectFittingPlaces } from './routePlanning';
import { TrainJourneyPicker } from '../trains/TrainJourneyPicker';
import type { JourneyInput } from '../trains/TrainJourneyPicker';
import type { Game } from '../games/api';

type Props = {
  game: Game;
  onCancel: () => void;
  onSaved: (itinerary: Itinerary) => void;
};

type PlaceDraft = {
  key: string;
  placeId: string | null;
  name: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  placeUrl: string | null;
  stayDurationMinutes: number;
};
const PREFERENCES = [
  { value: 'BREAD', label: '빵' },
  { value: 'LOCAL_FOOD', label: '지역 먹거리' },
  { value: 'CAFE', label: '카페' },
  { value: 'DOWNTOWN', label: '원도심' },
  { value: 'SCIENCE', label: '과학' },
  { value: 'CULTURE', label: '문화' },
];

function toLocalDateTime(value: string) {
  return value.length === 16 ? `${value}:00` : value;
}

function recommendationRequest(
  preference: string,
  arrivalCoordinate: { latitude: number; longitude: number },
  city: string,
): CoursePlaceCandidateRequest {
  const isDaejeon = city.includes('대전');
  const nearby = (categories: CoursePlaceCandidateRequest['categories'], keyword?: string): CoursePlaceCandidateRequest => ({
    scope: 'CURRENT_LOCATION',
    categories,
    center: arrivalCoordinate,
    maxDistanceMeters: 10_000,
    limit: 8,
    ...(keyword ? { keyword } : {}),
  });

  switch (preference) {
    case 'BREAD': return nearby(['FOOD'], '빵집');
    case 'LOCAL_FOOD': return nearby(['FOOD']);
    case 'CAFE': return nearby(['CAFE']);
    case 'DOWNTOWN':
      return isDaejeon
        ? { scope: 'DAEJEON_HOTSPOT', hotspot: 'EUNHAENG_DAEHEUNG', categories: ['FOOD', 'CAFE', 'ACTIVITY'], limit: 8 }
        : nearby(['ACTIVITY']);
    case 'SCIENCE':
      return isDaejeon
        ? { scope: 'DAEJEON_HOTSPOT', hotspot: 'EXPO', categories: ['TOURIST_ATTRACTION', 'CULTURAL_FACILITY'], limit: 8 }
        : nearby(['TOURIST_ATTRACTION', 'CULTURAL_FACILITY'], '과학');
    case 'CULTURE': return nearby(['CULTURAL_FACILITY', 'TOURIST_ATTRACTION']);
    default: throw new Error('선택한 성향을 장소 검색 조건으로 바꾸지 못했습니다.');
  }
}

function shortlistRecommendations(
  groups: { preference: string; places: CoursePlaceCandidate[] }[],
  limit: number,
  manualPlaces: { placeId: string }[],
) {
  const selected: CoursePlaceCandidate[] = [];
  const seen = new Set<string>();
  const manualIds = new Set(manualPlaces.map((place) => place.placeId));
  const add = (place: CoursePlaceCandidate) => {
    const key = `${place.provider}:${place.externalId}`;
    if (selected.length >= limit || seen.has(key)) return;
    if (place.provider === 'KAKAO' && manualIds.has(place.externalId)) return;
    seen.add(key);
    selected.push(place);
  };

  for (const group of groups) {
    const match = group.places.find((place) => (
      !seen.has(`${place.provider}:${place.externalId}`)
      && !(place.provider === 'KAKAO' && manualIds.has(place.externalId))
    ));
    if (match) add(match);
  }

  groups.flatMap((group) => group.places)
    .sort((left, right) => (left.distanceMeters ?? Number.MAX_SAFE_INTEGER) - (right.distanceMeters ?? Number.MAX_SAFE_INTEGER))
    .forEach(add);
  return selected;
}

function routeTimesForPlaces(routeTimes: ItineraryRouteTime[], places: { placeId: string }[]): ItineraryRouteTime[] {
  const ids = new Set(places.map((place) => place.placeId));
  return routeTimes.filter((leg) => (
    (leg.fromPlaceId === 'ARRIVAL' && ids.has(leg.toPlaceId))
    || (ids.has(leg.fromPlaceId) && (leg.toPlaceId === 'STADIUM' || ids.has(leg.toPlaceId)))
  ));
}

function PreferenceIcon({ value }: { value: string }) {
  const icons: Record<string, React.ReactNode> = {
    BREAD: <><path d="M4 11a8 8 0 0 1 16 0v8H4v-8Z" /><path d="M8 8v2M12 6v3M16 8v2M4 14h16" /></>,
    LOCAL_FOOD: <><path d="M5 3v7M8 3v7M5 7h3M6.5 10v11M16 3v18M16 3c2 2 3 5 3 8h-3" /></>,
    CAFE: <><path d="M4 8h13v8a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4V8Z" /><path d="M17 10h1a3 3 0 0 1 0 6h-2M7 4c0 1 1 1 1 2M12 4c0 1 1 1 1 2" /></>,
    DOWNTOWN: <><path d="M3 21h18M5 21V9l7-5 7 5v12M9 21v-6h6v6M8 10h.01M16 10h.01" /></>,
    SCIENCE: <><circle cx="12" cy="12" r="2" /><ellipse cx="12" cy="12" rx="9" ry="4" /><ellipse cx="12" cy="12" rx="9" ry="4" transform="rotate(60 12 12)" /><ellipse cx="12" cy="12" rx="9" ry="4" transform="rotate(120 12 12)" /></>,
    CULTURE: <><path d="m3 9 9-6 9 6M5 10v9M9 10v9M15 10v9M19 10v9M3 21h18M2 9h20" /></>,
  };

  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{icons[value]}</svg>;
}

export function ItineraryPlanner({ game, onCancel, onSaved }: Props) {
  const [journey, setJourney] = useState<JourneyInput>({
    arrivalPlace: '',
    arrivalAt: '',
    arrivalTrain: null,
    departurePlace: '',
    departureAt: '',
    returnTrain: null,
  });
  const [travelMode, setTravelMode] = useState<TravelMode>('PUBLIC_TRANSIT');
  const [preferences, setPreferences] = useState<string[]>([]);
  const [places, setPlaces] = useState<PlaceDraft[]>([]);
  const [placeSearchOpen, setPlaceSearchOpen] = useState(false);
  const [placeQuery, setPlaceQuery] = useState('');
  const [placeResults, setPlaceResults] = useState<PlaceSearchResult[]>([]);
  const [placeSearchLoading, setPlaceSearchLoading] = useState(false);
  const [placeSearchError, setPlaceSearchError] = useState('');
  const [placeSearchPage, setPlaceSearchPage] = useState(1);
  const [hasMorePlaces, setHasMorePlaces] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [savingMessage, setSavingMessage] = useState('일정을 저장하는 중…');
  const placeDialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = placeDialogRef.current;
    if (!dialog) return;
    if (placeSearchOpen && !dialog.open) dialog.showModal();
    if (!placeSearchOpen && dialog.open) dialog.close();
  }, [placeSearchOpen]);

  function togglePreference(value: string) {
    setPreferences((current) => current.includes(value)
      ? current.filter((item) => item !== value)
      : [...current, value]);
  }

  function addPlace(place?: PlaceSearchResult) {
    if (places.length >= 8) {
      setPlaceSearchError('자동 코스는 장소를 최대 8곳까지 추가할 수 있어요.');
      return;
    }
    setPlaces((current) => [...current, {
        key: String(Date.now()) + Math.random().toString(36).slice(2),
        placeId: place?.id ?? null,
        name: place?.name ?? '',
        address: place?.roadAddress || place?.address || '',
        latitude: place?.latitude ?? null,
        longitude: place?.longitude ?? null,
        placeUrl: place?.placeUrl ?? null,
        stayDurationMinutes: 60,
      }]);
  }

  function openPlaceSearch() {
    setPlaceQuery('');
    setPlaceResults([]);
    setPlaceSearchError('');
    setPlaceSearchPage(1);
    setHasMorePlaces(false);
    setPlaceSearchOpen(true);
  }

  async function searchKakaoPlaces(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const keyword = placeQuery.trim();
    if (!keyword) {
      setPlaceSearchError('장소 이름이나 지역을 입력해 주세요.');
      return;
    }
    setPlaceSearchLoading(true);
    setPlaceSearchError('');
    setPlaceResults([]);
    setPlaceSearchPage(1);
    try {
      const result = await searchPlaces(keyword);
      setPlaceResults(result.places);
      setPlaceSearchPage(result.page);
      setHasMorePlaces(result.hasNext);
      if (!result.places.length) setPlaceSearchError('검색 결과가 없어요. 다른 이름으로 검색해 주세요.');
    } catch (cause) {
      setPlaceSearchError(cause instanceof Error ? cause.message : '장소를 검색하지 못했습니다.');
    } finally {
      setPlaceSearchLoading(false);
    }
  }

  async function loadMorePlaces() {
    setPlaceSearchLoading(true);
    setPlaceSearchError('');
    try {
      const result = await searchPlaces(placeQuery.trim(), placeSearchPage + 1);
      setPlaceResults((current) => [...current, ...result.places]);
      setPlaceSearchPage(result.page);
      setHasMorePlaces(result.hasNext);
    } catch (cause) {
      setPlaceSearchError(cause instanceof Error ? cause.message : '장소를 더 불러오지 못했습니다.');
    } finally {
      setPlaceSearchLoading(false);
    }
  }

  function addSearchResult(place: PlaceSearchResult) {
    addPlace(place);
    setPlaceSearchOpen(false);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    if (!journey.arrivalPlace.trim() || !journey.arrivalAt || !journey.departurePlace.trim() || !journey.departureAt) {
      setError('대전 도착·출발 장소와 시각을 모두 입력해 주세요.');
      return;
    }
    if (places.some((place) => !place.name.trim())) {
      setError('장소명을 입력하거나 빈 장소를 삭제해 주세요.');
      return;
    }
    if (places.length > 8) {
      setError('자동 코스에는 장소를 최대 8곳까지 추가할 수 있어요.');
      return;
    }
    setSaving(true);
    try {
      setSavingMessage('출발지와 장소 좌표를 확인하는 중…');
      const [arrivalCoordinate, departureCoordinate, stadiumCoordinate, manualCandidates] = await Promise.all([
        resolveNamedLocation(journey.arrivalPlace.trim(), game.city),
        resolveNamedLocation(journey.departurePlace.trim(), game.city),
        resolveNamedLocation(game.stadium, game.city),
        resolvePlaceCandidates(places, game.city),
      ]);

      if (preferences.length && manualCandidates.length >= 8) {
        throw new Error('직접 추가한 장소가 8곳이라 성향 추천 장소를 더 넣을 수 없어요. 장소를 줄여 주세요.');
      }

      let candidates = manualCandidates;
      if (preferences.length) {
        setSavingMessage('선택한 성향에 맞는 장소를 찾는 중…');
        const selectedPreferences = PREFERENCES.filter((item) => preferences.includes(item.value));
        const groups = await Promise.all(selectedPreferences.map(async (item) => {
          const result = await getCoursePlaceCandidates(recommendationRequest(item.value, arrivalCoordinate, game.city));
          return { preference: item.value, places: result.places };
        }));
        const recommendations = shortlistRecommendations(groups, 8 - manualCandidates.length, manualCandidates);
        if (!recommendations.length && !manualCandidates.length) {
          throw new Error('선택한 성향에 맞는 장소를 찾지 못했어요. 다른 성향을 선택하거나 장소를 직접 추가해 주세요.');
        }
        candidates = [
          ...manualCandidates,
          ...recommendations.map((place) => ({
            placeId: `recommended-${place.provider.toLowerCase()}-${place.externalId}`,
            name: place.name,
            address: place.address,
            latitude: place.latitude,
            longitude: place.longitude,
            stayDurationMinutes: 60,
            mustVisit: false,
          })),
        ];
      }

      setSavingMessage('각 구간의 실제 이동시간을 확인하는 중…');
      const [travelTimes, stadiumToDepartureMinutes] = await Promise.all([
        collectOptimizedTravelTimes(arrivalCoordinate, stadiumCoordinate, candidates, travelMode),
        getTravelMinutes(stadiumCoordinate, departureCoordinate, travelMode),
      ]);

      let plannedCandidates = candidates;
      let plannedTravelTimes = travelTimes;
      if (preferences.length) {
        const gameStartMillis = Date.parse(`${game.gameDate}T${game.gameStartTime}`);
        const arrivalMillis = Date.parse(toLocalDateTime(journey.arrivalAt));
        const minutesUntilGame = Math.floor((gameStartMillis - arrivalMillis) / 60_000) - 30;
        plannedCandidates = selectFittingPlaces(
          candidates,
          travelTimes,
          minutesUntilGame,
          manualCandidates.map((place) => place.placeId),
        );
        if (!plannedCandidates.length) {
          throw new Error('경기 시작 전 방문과 구장 이동까지 할 시간이 부족해요. 도착 시각이나 성향을 조정해 주세요.');
        }
        plannedTravelTimes = routeTimesForPlaces(travelTimes, plannedCandidates);
      }

      setSavingMessage('최적 순서로 일정을 계산하고 저장하는 중…');
      const itinerary = await generateItinerary({
        gameId: game.gameId,
        arrivalPlace: journey.arrivalPlace.trim(),
        arrivalAt: toLocalDateTime(journey.arrivalAt),
        arrivalTrain: journey.arrivalTrain,
        departurePlace: journey.departurePlace.trim(),
        departureAt: toLocalDateTime(journey.departureAt),
        returnTrain: journey.returnTrain,
        stadiumEntryBufferMinutes: 30,
        stadiumToDepartureMinutes,
        postGameCrowdBufferMinutes: 30,
        boardingBufferMinutes: 15,
        expectedGameDurationMinutes: 180,
        preferences,
        travelMode,
        places: plannedCandidates,
        travelTimes: plannedTravelTimes,
      });
      onSaved(itinerary);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '원정 일정을 저장하지 못했습니다.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="planner-page">
      <button className="back-link" type="button" onClick={onCancel}>← 경기 목록으로</button>
      <article className="planner-game-ticket" aria-label="선택한 경기 티켓">
        <div className="planner-ticket-match">
          <span className="planner-ticket-kicker">
            <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M8 5.2c2.1 1.8 3.1 4 3.1 6.8S10.1 17 8 18.8M16 5.2c-2.1 1.8-3.1 4-3.1 6.8s1 5 3.1 6.8" /></svg>
            AWAY GAME PASS
          </span>
          <h1 className="planner-ticket-teams"><span>{game.homeTeam}</span><small>VS</small><span>{game.awayTeam}</span></h1>
          <span className="planner-ticket-venue"><small>구장</small>{game.stadium}</span>
        </div>
        <div className="planner-ticket-date">
          <span>경기 일시</span>
          <time dateTime={`${game.gameDate}T${game.gameStartTime}`}>{game.gameDate.replaceAll('-', '.')}</time>
          <strong>{game.gameStartTime.slice(0, 5)}</strong>
        </div>
      </article>

      <form className="planner-form" onSubmit={submit}>
        <TrainJourneyPicker gameDate={game.gameDate} value={journey} onChange={setJourney} />

        <section className="form-section">
          <div className="form-heading"><b>02</b><div><h2>어떤 하루를 보내고 싶나요?</h2><p>원하는 성향을 골라주세요. 여러 개 선택할 수 있어요.</p></div></div>
          <div className="preference-grid">{PREFERENCES.map((item) => {
            const checked = preferences.includes(item.value);
            return (
              <button className={'preference-option' + (checked ? ' is-selected' : '')} type="button" aria-pressed={checked} key={item.value} onClick={() => togglePreference(item.value)}>
                <b><PreferenceIcon value={item.value} /></b><span>{item.label}</span><i aria-hidden="true">{checked ? '✓' : ''}</i>
              </button>
            );
          })}</div>
        </section>

        <section className="form-section">
          <div className="form-heading"><b>03</b><div><h2>가보고 싶은 장소</h2><p>선택한 장소는 실제 이동시간에 맞춰 순서를 계산해요.</p></div></div>
          <label className="field travel-mode-field"><span>장소 간 이동수단</span>
            <select value={travelMode} onChange={(event) => setTravelMode(event.target.value as TravelMode)}>
              <option value="PUBLIC_TRANSIT">대중교통</option>
              <option value="WALK">도보</option>
              <option value="CAR">자동차</option>
            </select>
          </label>
          <p className="course-order-note">선택한 장소는 실제 이동시간이 짧은 순서로 정렬됩니다. 한 장소당 체류시간은 기본 60분이며 조정할 수 있어요.</p>
          {!places.length && (
            <div className="places-empty-state">
              <p>카카오맵에서 장소를 찾아 원정 일정에 추가해 보세요.</p>
              <button className="button button-add" type="button" onClick={openPlaceSearch}>＋ 장소 추가</button>
            </div>
          )}
          <div className="place-list">{places.map((place, index) => (
            <div className="place-row" key={place.key}>
              <span>{String(index + 1).padStart(2, '0')}</span>
              <label className="field"><span>장소명</span><input value={place.name} onChange={(event) => setPlaces((current) => current.map((item) => item.key === place.key ? { ...item, name: event.target.value, placeId: null, latitude: null, longitude: null, placeUrl: null } : item))} placeholder="예: 성심당 본점" /></label>
              <label className="field"><span>주소 (선택)</span><input value={place.address} onChange={(event) => setPlaces((current) => current.map((item) => item.key === place.key ? { ...item, address: event.target.value, placeId: null, latitude: null, longitude: null, placeUrl: null } : item))} placeholder="주소를 입력해 주세요" /></label>
              <label className="field stay-duration-field"><span>체류 시간</span><span className="number-field"><input type="number" min="0" max="1440" step="15" value={place.stayDurationMinutes} onChange={(event) => setPlaces((current) => current.map((item) => item.key === place.key ? { ...item, stayDurationMinutes: Number(event.target.value) } : item))} /><small>분</small></span></label>
              <button className="remove-place" type="button" aria-label={(index + 1) + '번째 장소 삭제'} onClick={() => setPlaces((current) => current.filter((item) => item.key !== place.key))}>×</button>
            </div>
          ))}</div>
          {!!places.length && places.length < 8 && <button className="button button-add" type="button" onClick={openPlaceSearch}>＋ 장소 추가</button>}
        </section>

        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="submit-row"><button className="button button-primary" type="submit" disabled={saving}>{saving ? savingMessage : '원정 일정 저장하기'} <span>↗</span></button></div>
      </form>
      <dialog
        ref={placeDialogRef}
        className="place-search-dialog"
        aria-labelledby="place-search-title"
        onClose={() => setPlaceSearchOpen(false)}
        onCancel={() => setPlaceSearchOpen(false)}
        onClick={(event) => { if (event.target === event.currentTarget) setPlaceSearchOpen(false); }}
      >
        <div className="place-search-content">
          <div className="place-search-heading">
            <div><h3 id="place-search-title">카카오맵에서 장소 찾기</h3><p>장소를 검색하고 일정에 추가할 수 있어요.</p></div>
            <button className="schedule-dialog-close" type="button" aria-label="장소 검색 창 닫기" onClick={() => setPlaceSearchOpen(false)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8"><path d="m6 6 12 12M18 6 6 18" /></svg>
            </button>
          </div>
          <form className="place-search-form" onSubmit={searchKakaoPlaces}>
            <label className="field"><span>장소 또는 지역 검색</span><input autoFocus value={placeQuery} onChange={(event) => setPlaceQuery(event.target.value)} placeholder="예: 성심당, 대전역" /></label>
            <button className="button button-primary" type="submit" disabled={placeSearchLoading}>{placeSearchLoading ? '검색 중…' : '검색'}</button>
          </form>
          {placeSearchError && <p className="place-search-message" role={placeResults.length ? 'status' : 'alert'}>{placeSearchError}</p>}
          <div className="place-search-results" aria-live="polite">
            {placeResults.map((place) => (
              <article className="place-search-result" key={place.id}>
                <div className="place-search-result-info">
                  <strong>{place.name}</strong>
                  <span>{place.roadAddress || place.address || '주소 정보 없음'}</span>
                  {place.categoryName && <small>{place.categoryName}{place.phone ? ` · ${place.phone}` : ''}</small>}
                </div>
                <div className="place-search-result-actions">
                  {place.placeUrl && <a href={place.placeUrl} target="_blank" rel="noreferrer">지도 보기</a>}
                  <button className="button button-secondary" type="button" onClick={() => addSearchResult(place)}>일정에 추가</button>
                </div>
              </article>
            ))}
            {!placeSearchLoading && !placeSearchError && !placeResults.length && <p className="place-search-empty">장소명이나 지역을 검색해 보세요.</p>}
            {hasMorePlaces && <button className="place-search-more" type="button" disabled={placeSearchLoading} onClick={() => void loadMorePlaces()}>{placeSearchLoading ? '불러오는 중…' : '결과 더 보기'}</button>}
          </div>
          <div className="place-search-footer"><span>검색 결과에서 선택하거나 직접 입력할 수 있어요.</span><button className="button button-secondary" type="button" onClick={() => { addPlace(); setPlaceSearchOpen(false); }}>직접 입력</button></div>
        </div>
      </dialog>
    </section>
  );
}
