import { useMemo, useState } from 'react';
import type { CoursePlace, PlaceCategory } from './types';

type ExplorePanelProps = {
  candidates: CoursePlace[];
  coursePlaceIds: string[];
  onAddPlace: (place: CoursePlace) => void;
};

const categories: PlaceCategory[] = ['전체', '먹을 곳', '카페', '관광명소', '문화시설'];
const scopes = ['현재 코스 주변', '야구장 주변', '대전역 주변', '소제동'];

export function ExplorePanel({ candidates, coursePlaceIds, onAddPlace }: ExplorePanelProps) {
  const [category, setCategory] = useState<PlaceCategory>('전체');
  const [scope, setScope] = useState(scopes[0]);
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const filteredCandidates = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return candidates.filter((place) => {
      const categoryMatches = category === '전체' || place.category === category;
      const queryMatches = !normalizedQuery || `${place.name} ${place.description}`.toLowerCase().includes(normalizedQuery);
      return categoryMatches && queryMatches;
    });
  }, [candidates, category, query]);

  const search = () => {
    setIsLoading(true);
    window.setTimeout(() => setIsLoading(false), 550);
  };

  return (
    <div className="panel-content explore-panel">
      <div className="panel-heading panel-heading--stacked">
        <div><h1>장소 찾기</h1><p>코스 가까이에 있는 장소부터 보여드려요.</p></div>
      </div>

      <div className="search-box">
        <label htmlFor="place-search">장소 이름 또는 키워드</label>
        <div className="search-row">
          <input id="place-search" value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') search(); }} placeholder="예: 전시, 두부두루치기" />
          <button className="button button--primary" type="button" onClick={search}>검색</button>
        </div>
      </div>

      <fieldset className="filter-group">
        <legend>검색 위치</legend>
        <div className="chip-list">
          {scopes.map((item) => <button key={item} className={scope === item ? 'filter-chip is-active' : 'filter-chip'} type="button" onClick={() => setScope(item)}>{item}</button>)}
        </div>
      </fieldset>

      <fieldset className="filter-group">
        <legend>장소 종류</legend>
        <div className="chip-list">
          {categories.map((item) => <button key={item} className={category === item ? 'filter-chip is-active' : 'filter-chip'} type="button" onClick={() => setCategory(item)}>{item}</button>)}
        </div>
      </fieldset>

      <div className="result-summary"><span>{scope}</span><strong>{filteredCandidates.length}곳</strong></div>

      {isLoading ? (
        <div className="result-list" aria-label="장소 검색 중">{[1, 2, 3].map((item) => <div className="result-skeleton" key={item} />)}</div>
      ) : filteredCandidates.length === 0 ? (
        <div className="empty-state empty-state--compact"><strong>조건에 맞는 장소가 없어요.</strong><p>검색어나 장소 종류를 바꿔 보세요.</p></div>
      ) : (
        <ul className="result-list">
          {filteredCandidates.map((place) => {
            const isAdded = coursePlaceIds.includes(place.id);
            return (
              <li key={place.id} className="result-item">
                <div className={`result-thumbnail result-thumbnail--${place.kind}`} aria-hidden="true"><span>{place.name.slice(0, 1)}</span></div>
                <div className="result-copy"><span>{place.category} · 코스에서 {place.travelMinutes}분</span><strong>{place.name}</strong><p>{place.description}</p></div>
                <button className={isAdded ? 'add-button is-added' : 'add-button'} type="button" disabled={isAdded} onClick={() => onAddPlace(place)}>{isAdded ? '추가됨' : '추가'}</button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
