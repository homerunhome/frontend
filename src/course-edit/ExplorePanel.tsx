import { useCallback, useEffect, useMemo, useState } from 'react';
import { getCoursePlaceCandidates } from '../api/client';
import type { CandidateCategory, CoursePlaceCandidate, DaejeonHotspot, ExploreScope, ItineraryResponse } from '../api/types';
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
  { label: '은행동·대흥동', value: 'DAEJEON_HOTSPOT', hotspot: 'EUNHAENG_DAEHEUNG' },
  { label: '소제동', value: 'DAEJEON_HOTSPOT', hotspot: 'SOJE_DONG' },
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
  const selectedScope = scopes[scopeIndex] ?? scopes[1]!;

  const search = useCallback((signal?: AbortSignal) => {
    setIsLoading(true);
    setError('');
    const request = {
      scope: selectedScope.value,
      categories: [category],
      ...(selectedScope.value === 'COURSE_NEARBY' ? { coursePoints } : {}),
      ...(selectedScope.hotspot ? { hotspot: selectedScope.hotspot } : {}),
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
  }, [category, coursePoints, itinerary.gameDate, selectedScope, submittedQuery]);

  useEffect(() => {
    const controller = new AbortController();
    void search(controller.signal);
    return () => controller.abort();
  }, [search]);

  const coursePlaceIds = useMemo(() => new Set(coursePlaces.map((place) => place.id)), [coursePlaces]);

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
            <button key={`${item.value}-${item.hotspot ?? ''}`} className={scopeIndex === index ? 'filter-chip is-active' : 'filter-chip'} type="button" disabled={item.value === 'COURSE_NEARBY' && coursePoints.length === 0} onClick={() => setScopeIndex(index)}>{item.label}</button>
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
                <button className={isAdded ? 'add-button is-added' : 'add-button'} type="button" disabled={isAdded} onClick={() => onAddPlace(place)}>{isAdded ? '추가됨' : '추가'}</button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
