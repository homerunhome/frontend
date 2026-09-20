import { useState } from 'react';
import type { FormEvent } from 'react';
import { createItinerary, getItinerary } from './api';
import type { Itinerary, Place } from './api';
import { TrainJourneyPicker } from '../trains/TrainJourneyPicker';
import type { JourneyInput } from '../trains/TrainJourneyPicker';
import type { Game } from '../games/api';

type Props = {
  game: Game;
  onCancel: () => void;
  onSaved: (itinerary: Itinerary) => void;
};

type PlaceDraft = { key: string; name: string; address: string };
const PREFERENCES = [
  { value: 'FOOD', label: '맛집 탐방' },
  { value: 'CAFE', label: '카페 투어' },
  { value: 'TOURISM', label: '대전 명소' },
  { value: 'NATURE', label: '산책과 휴식' },
  { value: 'SHOPPING', label: '쇼핑' },
];

function PreferenceIcon({ value }: { value: string }) {
  const icons: Record<string, React.ReactNode> = {
    FOOD: <><path d="M5 3v7M8 3v7M5 7h3M6.5 10v11M16 3v18M16 3c2 2 3 5 3 8h-3" /></>,
    CAFE: <><path d="M4 8h13v8a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4V8Z" /><path d="M17 10h1a3 3 0 0 1 0 6h-2M7 4c0 1 1 1 1 2M12 4c0 1 1 1 1 2" /></>,
    TOURISM: <><path d="m3 9 9-6 9 6M5 10v9M9 10v9M15 10v9M19 10v9M3 21h18M2 9h20" /></>,
    NATURE: <><path d="M20 4C10 4 5 7 5 13a6 6 0 0 0 6 6c6 0 9-5 9-15Z" /><path d="M4 21c3-6 7-9 13-13" /></>,
    SHOPPING: <><path d="M4 8h16l-1 13H5L4 8Z" /><path d="M8 9V6a4 4 0 0 1 8 0v3" /></>,
  };

  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{icons[value]}</svg>;
}

export function ItineraryPlanner({ game, onCancel, onSaved }: Props) {
  const [journey, setJourney] = useState<JourneyInput>({
    arrivalPlace: '',
    arrivalAt: '',
    departurePlace: '',
    departureAt: '',
  });
  const [preferences, setPreferences] = useState<string[]>([]);
  const [places, setPlaces] = useState<PlaceDraft[]>([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  function togglePreference(value: string) {
    setPreferences((current) => current.includes(value)
      ? current.filter((item) => item !== value)
      : [...current, value]);
  }

  function addPlace() {
    setPlaces((current) => [...current, {
      key: String(Date.now()) + Math.random().toString(36).slice(2),
      name: '',
      address: '',
    }]);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    if (!journey.arrivalPlace.trim() || !journey.arrivalAt || !journey.departurePlace.trim() || !journey.departureAt) {
      setError('대전 도착·출발 장소와 시각을 모두 입력해 주세요.');
      return;
    }
    const itineraryPlaces: Place[] = places
      .filter((place) => place.name.trim())
      .map((place) => ({ name: place.name.trim(), address: place.address.trim() || null }));
    setSaving(true);
    try {
      const created = await createItinerary({
        gameId: game.gameId,
        arrivalPlace: journey.arrivalPlace.trim(),
        arrivalAt: journey.arrivalAt.length === 16 ? journey.arrivalAt + ':00' : journey.arrivalAt,
        departurePlace: journey.departurePlace.trim(),
        departureAt: journey.departureAt.length === 16 ? journey.departureAt + ':00' : journey.departureAt,
        preferences,
        places: itineraryPlaces,
      });
      let detail = created;
      try {
        detail = await getItinerary(created.id);
      } catch {
        // 생성 응답도 상세 데이터이므로 저장 후 상세 재조회가 실패하면 응답을 표시합니다.
      }
      onSaved(detail);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '일정을 저장하지 못했습니다.');
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
          <div className="form-heading"><b>03</b><div><h2>가보고 싶은 장소</h2><p>장소 검색 없이 직접 추가해 기억해 둘 수 있어요.</p></div></div>
          {!places.length && (
            <div className="places-empty-state">
              <p>아직 추가한 장소가 없어요. 장소는 나중에 생각나도 괜찮아요.</p>
              <button className="button button-add" type="button" onClick={addPlace}>＋ 장소 추가</button>
            </div>
          )}
          <div className="place-list">{places.map((place, index) => (
            <div className="place-row" key={place.key}>
              <span>{String(index + 1).padStart(2, '0')}</span>
              <label className="field"><span>장소명</span><input value={place.name} onChange={(event) => setPlaces((current) => current.map((item) => item.key === place.key ? { ...item, name: event.target.value } : item))} placeholder="예: 성심당 본점" /></label>
              <label className="field"><span>주소 (선택)</span><input value={place.address} onChange={(event) => setPlaces((current) => current.map((item) => item.key === place.key ? { ...item, address: event.target.value } : item))} placeholder="주소를 입력해 주세요" /></label>
              <button className="remove-place" type="button" aria-label={(index + 1) + '번째 장소 삭제'} onClick={() => setPlaces((current) => current.filter((item) => item.key !== place.key))}>×</button>
            </div>
          ))}</div>
          {!!places.length && <button className="button button-add" type="button" onClick={addPlace}>＋ 장소 추가</button>}
        </section>

        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="submit-row"><button className="button button-primary" type="submit" disabled={saving}>{saving ? '저장 중…' : '원정 일정 저장하기'} <span>↗</span></button></div>
      </form>
    </section>
  );
}
