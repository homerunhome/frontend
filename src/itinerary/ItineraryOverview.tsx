import { useEffect } from 'react';
import { useItinerary } from '../api/useItinerary';
import { formatDate, formatTime } from './format';

export function ItineraryOverview({ itineraryId }: { itineraryId: number }) {
  const { data: itinerary, error, isLoading, retry } = useItinerary(itineraryId);

  useEffect(() => {
    document.title = itinerary ? `${itinerary.stadium} 원정 | 홈런홈` : '원정 일정 | 홈런홈';
  }, [itinerary]);

  if (isLoading) {
    return <main className="page-state"><span>HOMERUN HOME</span><h1>일정을 불러오는 중입니다</h1><p>저장된 원정 정보를 확인하고 있어요.</p></main>;
  }
  if (error) {
    return <main className="page-state"><span>HOMERUN HOME</span><h1>일정을 불러오지 못했습니다</h1><p>{error}</p><button className="button button--primary" type="button" onClick={retry}>다시 시도</button></main>;
  }
  if (!itinerary) return null;

  const editUrl = `/itineraries/${itinerary.id}/course/edit`;

  return (
    <div className="overview-page">
      <header className="overview-header">
        <a className="brand" href="/" aria-label="홈런홈 홈">HOMERUN HOME</a>
        <nav aria-label="주요 메뉴"><a href="#schedule">내 원정</a><a href="#course">코스</a></nav>
      </header>

      <main className="overview-main" id="schedule">
        <div className="overview-title">
          <div><span>다가오는 원정</span><h1>{itinerary.stadium} 원정</h1><p>{formatDate(itinerary.gameDate)} · {itinerary.homeTeam} vs {itinerary.awayTeam}</p></div>
          <a className="button button--primary overview-edit" href={editUrl} target="_blank" rel="noopener noreferrer">코스 수정</a>
        </div>

        <section className="overview-grid" aria-label="원정 일정 요약">
          <article className="journey-card">
            <div className="journey-card__top"><span>이동 일정</span><strong>{itinerary.arrivalPlace} → {itinerary.departurePlace}</strong></div>
            <div className="train-route">
              <div><small>도착</small><strong>{formatTime(itinerary.arrivalAt)}</strong><span>{itinerary.arrivalPlace}</span></div>
              <div className="train-route__line"><span>{formatDate(itinerary.gameDate)}</span></div>
              <div><small>출발</small><strong>{formatTime(itinerary.departureAt)}</strong><span>{itinerary.departurePlace}</span></div>
            </div>
            <div className="journey-card__return">일정 생성 시 저장한 도착·출발 정보</div>
          </article>

          <article className="game-card">
            <span className="game-card__league">{formatDate(itinerary.gameDate)}</span>
            <div className="game-matchup"><div><b>{itinerary.homeTeam}</b><span>HOME</span></div><strong>{formatTime(itinerary.gameStartTime)}</strong><div><b>{itinerary.awayTeam}</b><span>AWAY</span></div></div>
            <p>{itinerary.stadium}</p>
          </article>
        </section>

        <section className="overview-course" id="course" aria-labelledby="course-title">
          <div className="overview-section-heading">
            <div><h2 id="course-title">저장된 코스</h2><p>일정 API에 저장된 장소를 순서대로 표시합니다.</p></div>
            <a className="button button--secondary" href={editUrl} target="_blank" rel="noopener noreferrer">수정</a>
          </div>
          {itinerary.places.length === 0 ? (
            <div className="empty-state"><strong>저장된 장소가 없어요.</strong><p>코스 수정 화면에서 장소를 검색해 추가할 수 있습니다.</p></div>
          ) : (
            <ol className="overview-course-list">
              {itinerary.places.map((place, index) => (
                <li key={place.placeId || `${place.name}-${index}`}><span>{index + 1}</span><div><strong>{place.name}</strong><small>{place.address || '주소 정보 없음'}</small></div></li>
              ))}
            </ol>
          )}
        </section>
      </main>
    </div>
  );
}
