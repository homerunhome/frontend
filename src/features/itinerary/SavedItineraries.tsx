import { useEffect, useState } from 'react';
import { getItinerary } from './api';
import type { Itinerary } from './api';

type Props = {
  ids: number[];
  onSelect: (itinerary: Itinerary) => void;
  onBrowseGames: () => void;
};

function shortDate(value: string): string {
  const parts = value.split('-');
  return parts.length === 3 ? parts[1] + '월 ' + parts[2] + '일' : value;
}

export function SavedItineraries({ ids, onSelect, onBrowseGames }: Props) {
  const [itineraries, setItineraries] = useState<Itinerary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!ids.length) {
      setItineraries([]);
      setError('');
      return;
    }
    let active = true;
    setLoading(true);
    Promise.all(ids.map((id) => getItinerary(id).catch(() => null)))
      .then((result) => {
        if (!active) return;
        const loaded = result.filter((item): item is Itinerary => item !== null);
        setItineraries(loaded);
        setError(loaded.length < ids.length ? '일부 일정을 불러오지 못했습니다. 백엔드 연결 또는 일정 ID를 확인해 주세요.' : '');
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [ids]);

  return (
    <section className="saved-page">
      <div className="section-heading"><div><h1>내 원정 기록</h1></div></div>
      {error && <p className="inline-warning" role="status">{error}</p>}
      {loading && <div className="state-panel" role="status"><span className="spinner" /> 저장한 일정을 확인하고 있어요.</div>}
      {!loading && itineraries.length === 0 && (
        <div className="state-panel"><div><strong>저장한 일정이 아직 없어요.</strong><p>경기 목록에서 첫 원정 계획을 만들어 보세요.</p></div><button className="button button-primary" type="button" onClick={onBrowseGames}>경기 고르기</button></div>
      )}
      {!loading && itineraries.length > 0 && (
        <div className="saved-list">{itineraries.map((item) => (
          <button className="saved-card" key={item.id} type="button" onClick={() => onSelect(item)}>
            <span className="saved-date"><strong>{shortDate(item.gameDate)}</strong><small>{item.gameStartTime.slice(0, 5)}</small></span>
            <span className="saved-info"><strong>{item.homeTeam} <small>VS</small> {item.awayTeam}</strong><span>{item.stadium}</span><small>{item.arrivalPlace} 도착 · {item.arrivalAt.split('T')[1]?.slice(0, 5)}</small></span>
            <span className="saved-id"><span>#{item.id}</span><span aria-hidden="true">→</span></span>
          </button>
        ))}</div>
      )}
    </section>
  );
}
