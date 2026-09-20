import type { Itinerary } from './api';

type Props = {
  itinerary: Itinerary;
  isSaved: boolean;
  onBack: () => void;
  onNewPlan: () => void;
};

const PREFERENCE_LABELS: Record<string, string> = {
  BREAD: '빵',
  LOCAL_FOOD: '지역 먹거리',
  DOWNTOWN: '원도심',
  SCIENCE: '과학',
  CULTURE: '문화',
  // Previously saved itineraries may still contain these values.
  FOOD: '맛집 탐방',
  CAFE: '카페',
  TOURISM: '대전 명소',
  NATURE: '산책과 휴식',
  SHOPPING: '쇼핑',
};

function longDate(value: string): string {
  const date = new Date(value + 'T00:00:00');
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' }).format(date);
}

function dateTime(value: string): string {
  const [date, clock] = value.split('T');
  return clock ? longDate(date) + ' · ' + clock.slice(0, 5) : value;
}

export function ItineraryDetail({ itinerary, isSaved, onBack, onNewPlan }: Props) {
  return (
    <section className="detail-page">
      <button className="back-link" type="button" onClick={onBack}>← {isSaved ? '저장한 일정' : '경기 목록'}</button>
      <div className="detail-heading"><span className="success-mark">✓</span><div><span className="eyebrow">{isSaved ? 'SAVED AWAY DAY' : 'PLAN SAVED'}</span><h1>{isSaved ? '다시 불러온 일정이에요.' : '원정 일정이 저장됐어요.'}</h1></div></div>
      <article className="itinerary-card">
        <div className="itinerary-top"><span>AWAY PLAN <b>#{itinerary.id}</b></span><span>{longDate(itinerary.gameDate)}</span></div>
        <div className="detail-game"><span className="eyebrow">{itinerary.stadium}</span><h2>{itinerary.homeTeam}<small>VS</small>{itinerary.awayTeam}</h2><p>{itinerary.gameStartTime.slice(0, 5)} 경기 시작</p></div>
        <div className="detail-transport">
          <div><span className="eyebrow">ARRIVAL IN DAEJEON</span><strong>{itinerary.arrivalPlace}</strong><span>{dateTime(itinerary.arrivalAt)}</span></div>
          <span className="transport-divider" aria-hidden="true">······→</span>
          <div><span className="eyebrow">DEPARTURE FROM DAEJEON</span><strong>{itinerary.departurePlace}</strong><span>{dateTime(itinerary.departureAt)}</span></div>
        </div>
        <div className="detail-subsection">
          <h3>오늘의 취향</h3>
          {itinerary.preferences.length
            ? <div className="tag-list">{itinerary.preferences.map((value) => <span className="preference-tag" key={value}>{PREFERENCE_LABELS[value] ?? value}</span>)}</div>
            : <p>선택한 성향이 없습니다.</p>}
        </div>
        <div className="detail-subsection">
          <h3>가볼 장소 <small>{itinerary.places.length}</small></h3>
          {itinerary.places.length
            ? <ol className="detail-place-list">{itinerary.places.map((place, index) => <li key={(place.placeId ?? place.name) + index}><span>{String(index + 1).padStart(2, '0')}</span><div><strong>{place.name}</strong><small>{place.address || '주소 미입력'}</small></div></li>)}</ol>
            : <p>아직 장소를 추가하지 않았어요.</p>}
        </div>
      </article>
      <button className="button button-primary detail-new" type="button" onClick={onNewPlan}>다른 경기 일정 만들기 <span>↗</span></button>
    </section>
  );
}
