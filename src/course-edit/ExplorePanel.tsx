import { useCallback, useEffect, useMemo, useState } from 'react';
import { getCoursePlaceCandidates, getTourismContentDetail } from '../api/client';
import type { CandidateCategory, Coordinate, CoursePlaceCandidate, DaejeonHotspot, ExploreScope, ItineraryResponse, TourismContentDetail } from '../api/types';
import type { CoursePlace } from './types';

type ExplorePanelProps = {
  itinerary: ItineraryResponse;
  coursePlaces: CoursePlace[];
  onAddPlace: (place: CoursePlaceCandidate) => void;
};

const categories: Array<{ label: string; value: CandidateCategory }> = [
  { label: '먹을 곳', value: 'FOOD' },
  { label: '카페', value: 'CAFE' },
  { label: '편의점', value: 'CONVENIENCE_STORE' },
  { label: '놀거리', value: 'ACTIVITY' },
  { label: '관광명소', value: 'TOURIST_ATTRACTION' },
  { label: '문화시설', value: 'CULTURAL_FACILITY' },
  { label: '축제·행사', value: 'FESTIVAL_EVENT' },
];

const scopes: Array<{ label: string; value: ExploreScope; hotspot?: DaejeonHotspot }> = [
  { label: '현재 코스 주변', value: 'COURSE_NEARBY' },
  { label: '야구장 주변', value: 'STADIUM_NEARBY' },
  { label: '대전역 주변', value: 'STATION_NEARBY' },
  { label: '현재 위치', value: 'CURRENT_LOCATION' },
  { label: '은행동·대흥동', value: 'DAEJEON_HOTSPOT', hotspot: 'EUNHAENG_DAEHEUNG' },
  { label: '소제동', value: 'DAEJEON_HOTSPOT', hotspot: 'SOJE_DONG' },
  { label: '둔산동', value: 'DAEJEON_HOTSPOT', hotspot: 'DUNSAN_DONG' },
  { label: '엑스포·한밭수목원', value: 'DAEJEON_HOTSPOT', hotspot: 'EXPO' },
  { label: '유성온천', value: 'DAEJEON_HOTSPOT', hotspot: 'YUSEONG' },
];

export function ExplorePanel({ itinerary, coursePlaces, onAddPlace }: ExplorePanelProps) {
  const coursePoints = useMemo(() => coursePlaces
    .filter((place): place is CoursePlace & { latitude: number; longitude: number } => place.latitude !== null && place.longitude !== null)
    .slice(0, 10)
    .map((place) => ({ latitude: place.latitude, longitude: place.longitude })), [coursePlaces]);
  const [category, setCategory] = useState<CandidateCategory>('FOOD');
  const [scopeIndex, setScopeIndex] = useState(coursePoints.length ? 0 : 1);
  const [query, setQuery] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('');
  const [candidates, setCandidates] = useState<CoursePlaceCandidate[]>([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [currentLocation, setCurrentLocation] = useState<Coordinate | null>(null);
  const [detail, setDetail] = useState<TourismContentDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const selectedScope = scopes[scopeIndex] ?? scopes[1]!;

  const search = useCallback((signal?: AbortSignal) => {
    setIsLoading(true);
    setError('');
    if (selectedScope.value === 'CURRENT_LOCATION' && !currentLocation) {
      setCandidates([]);
      setError('현재 위치를 확인한 뒤 주변 장소를 조회할 수 있어요.');
      setIsLoading(false);
      return Promise.resolve();
    }
    const request = {
      scope: selectedScope.value,
      categories: [category],
      ...(selectedScope.value === 'COURSE_NEARBY' ? { coursePoints } : {}),
      ...(selectedScope.hotspot ? { hotspot: selectedScope.hotspot } : {}),
      ...(selectedScope.value === 'CURRENT_LOCATION' && currentLocation ? { center: currentLocation } : {}),
      ...(submittedQuery.trim() ? { keyword: submittedQuery.trim() } : {}),
      ...(category === 'FESTIVAL_EVENT' ? { eventDate: itinerary.gameDate } : {}),
      limit: 15,
    };
    return getCoursePlaceCandidates(request, signal)
      .then((response) => setCandidates(response.places))
      .catch((requestError: unknown) => {
        if (signal?.aborted) return;
        setCandidates([]);
        setError(requestError instanceof Error ? requestError.message : '장소를 불러오지 못했습니다.');
      })
      .finally(() => {
        if (!signal?.aborted) setIsLoading(false);
      });
  }, [category, coursePoints, currentLocation, itinerary.gameDate, selectedScope, submittedQuery]);

  useEffect(() => {
    const controller = new AbortController();
    void search(controller.signal);
    return () => controller.abort();
  }, [search]);

  const coursePlaceIds = useMemo(() => new Set(coursePlaces.map((place) => place.id)), [coursePlaces]);

  function selectScope(index: number) {
    const nextScope = scopes[index];
    if (nextScope?.value !== 'CURRENT_LOCATION') {
      setScopeIndex(index);
      return;
    }
    if (!navigator.geolocation) {
      setError('이 브라우저에서는 현재 위치를 사용할 수 없습니다.');
      return;
    }
    setIsLoading(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setCurrentLocation({ latitude: coords.latitude, longitude: coords.longitude });
        setScopeIndex(index);
      },
      () => {
        setIsLoading(false);
        setError('현재 위치 권한을 확인해 주세요.');
      },
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }

  async function openTourismDetail(contentId: string) {
    setDetailLoading(true);
    setDetailError('');
    try {
      setDetail(await getTourismContentDetail(contentId));
    } catch (requestError) {
      setDetailError(requestError instanceof Error ? requestError.message : '관광 정보를 불러오지 못했습니다.');
    } finally {
      setDetailLoading(false);
    }
  }

  if (detail) {
    const usageItems = [
      ['이용 시간', detail.usageInformation?.useTime],
      ['휴무일', detail.usageInformation?.restDate],
      ['이용 요금', detail.usageInformation?.useFee],
      ['주차', detail.usageInformation?.parking],
      ['권장 체류', detail.usageInformation?.duration],
    ].filter((item): item is [string, string] => Boolean(item[1]));
    const accessItems = [
      ['장애인 주차', detail.accessibility?.parking],
      ['휠체어', detail.accessibility?.wheelchair],
      ['장애인 화장실', detail.accessibility?.restroom],
      ['유모차', detail.accessibility?.stroller],
      ['수유실', detail.accessibility?.lactationRoom],
    ].filter((item): item is [string, string] => Boolean(item[1]));
    return (
      <div className="panel-content tourism-detail">
        <button className="text-button text-button--back" type="button" onClick={() => setDetail(null)}><span aria-hidden="true">←</span>장소 목록</button>
        {detail.imageUrl && <img className="tourism-detail__hero" src={detail.imageUrl} alt={detail.title} />}
        <div className="tourism-detail__heading"><span>한국관광공사 관광정보</span><h1>{detail.title}</h1><p>{[detail.address, detail.addressDetail].filter(Boolean).join(' ')}</p></div>
        {detail.overview && <p className="tourism-detail__overview">{detail.overview}</p>}
        {usageItems.length > 0 && <section><h2>이용 안내</h2><dl>{usageItems.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl></section>}
        {accessItems.length > 0 && <section><h2>편의 정보</h2><dl>{accessItems.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl></section>}
        {detail.phone && <p className="tourism-detail__contact">문의 {detail.phone}</p>}
      </div>
    );
  }

  return (
    <div className="panel-content explore-panel">
      <div className="panel-heading panel-heading--stacked"><div><h1>장소 찾기</h1><p>백엔드 통합 장소 후보 API의 결과를 표시합니다.</p></div></div>

      <div className="search-box">
        <label htmlFor="place-search">장소 이름 또는 키워드</label>
        <div className="search-row">
          <input id="place-search" value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') setSubmittedQuery(query); }} placeholder="검색어를 입력하세요" />
          <button className="button button--primary" type="button" onClick={() => setSubmittedQuery(query)}>검색</button>
        </div>
      </div>

      <fieldset className="filter-group">
        <legend>검색 위치</legend>
        <div className="chip-list">
          {scopes.map((item, index) => (
            <button key={`${item.value}-${item.hotspot ?? ''}`} className={scopeIndex === index ? 'filter-chip is-active' : 'filter-chip'} type="button" disabled={item.value === 'COURSE_NEARBY' && coursePoints.length === 0} onClick={() => selectScope(index)}>{item.label}</button>
          ))}
        </div>
      </fieldset>

      <fieldset className="filter-group">
        <legend>장소 종류</legend>
        <div className="chip-list">
          {categories.map((item) => <button key={item.value} className={category === item.value ? 'filter-chip is-active' : 'filter-chip'} type="button" onClick={() => setCategory(item.value)}>{item.label}</button>)}
        </div>
      </fieldset>

      <div className="result-summary"><span>{selectedScope.label}</span><strong>{isLoading ? '조회 중' : `${candidates.length}곳`}</strong></div>

      {detailError && <div className="inline-alert" role="alert"><strong>관광 상세 정보를 불러오지 못했어요.</strong><span>{detailError}</span></div>}

      {isLoading ? (
        <div className="result-list" aria-label="장소 검색 중">{[1, 2, 3].map((item) => <div className="result-skeleton" key={item} />)}</div>
      ) : error ? (
        <div className="empty-state empty-state--compact" role="alert"><strong>장소를 불러오지 못했습니다.</strong><p>{error}</p><button className="button button--secondary" type="button" onClick={() => void search()}>다시 시도</button></div>
      ) : candidates.length === 0 ? (
        <div className="empty-state empty-state--compact"><strong>검색 결과가 없어요.</strong><p>검색 위치나 장소 종류를 바꿔 보세요.</p></div>
      ) : (
        <ul className="result-list">
          {candidates.map((place) => {
            const id = `${place.provider}-${place.externalId}`;
            const isAdded = coursePlaceIds.has(id);
            return (
              <li key={id} className="result-item">
                <div className="result-thumbnail" aria-hidden="true">
                  {place.imageUrl ? <img src={place.imageUrl} alt="" loading="lazy" /> : <span>{place.name.slice(0, 1)}</span>}
                </div>
                <div className="result-copy"><span>{place.provider === 'TOUR_API' ? '한국관광공사' : '카카오'}{place.distanceMeters !== null ? ` · ${place.distanceMeters}m` : ''}</span><strong>{place.name}</strong><p>{place.address || '주소 정보 없음'}</p></div>
                <div className="result-actions">
                  {place.provider === 'TOUR_API' && <button className="detail-button" type="button" disabled={detailLoading} onClick={() => void openTourismDetail(place.externalId)}>상세</button>}
                  <button className={isAdded ? 'add-button is-added' : 'add-button'} type="button" disabled={isAdded} onClick={() => onAddPlace(place)}>{isAdded ? '추가됨' : '추가'}</button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
