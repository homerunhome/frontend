import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { ItineraryMapPreview } from './ItineraryMapPreview';
import { searchPlaces, updateItineraryPlaces } from './api';
import type { Itinerary, ItineraryCandidate, ItineraryPlace, PlaceSearchResult, TravelMode } from './api';
import { formatApiError, measureSequentialRoute, resolveNamedLocation, resolvePlaceCandidates } from './routePlanning';

type Props = {
  itinerary: Itinerary;
  isSaved: boolean;
  onBack: () => void;
  onUpdated: (itinerary: Itinerary) => void;
};

type PlaceDraft = {
  key: string;
  placeId: string | null;
  name: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  stayDurationMinutes: number;
  mustVisit: boolean;
};

function dateLabel(value: string): string {
  const [year, month, day] = value.split('-');
  return `${year}년 ${Number(month)}월 ${Number(day)}일`;
}

function timeLabel(value?: string | null): string {
  if (!value) return '—';
  return value.match(/[T ](\d{2}:\d{2})/)?.[1] ?? value.slice(0, 5);
}

function statusLabel(status: string | null, calculated: boolean): string {
  const labels: Record<string, string> = {
    AMPLE: '시간 여유 있음',
    ADEQUATE: '일정 적당함',
    TIGHT: '일정이 촉박함',
    GAME_LATE_POSSIBLE: '경기 지각 가능성',
    RETURN_CAUTION: '귀가 시간 확인 필요',
  };
  return status ? labels[status] ?? status : calculated ? '코스 계산 완료' : '코스 계산 필요';
}

function travelModeOf(value: string | null): TravelMode {
  return value === 'CAR' || value === 'WALK' ? value : 'PUBLIC_TRANSIT';
}

function expectedDuration(itinerary: Itinerary): number {
  if (!itinerary.expectedGameEndAt) return 180;
  const startsAt = Date.parse(`${itinerary.gameDate}T${itinerary.gameStartTime}`);
  const endsAt = Date.parse(itinerary.expectedGameEndAt);
  const minutes = Math.round((endsAt - startsAt) / 60000);
  return Number.isFinite(minutes) && minutes > 0 ? minutes : 180;
}

function draftFromPlace(place: ItineraryPlace, index: number): PlaceDraft {
  return {
    key: `${place.placeId ?? place.name}-${index}`,
    placeId: place.placeId ?? null,
    name: place.name,
    address: place.address ?? '',
    latitude: place.latitude ?? null,
    longitude: place.longitude ?? null,
    stayDurationMinutes: place.stayDurationMinutes ?? 60,
    mustVisit: place.mustVisit ?? false,
  };
}

export function ItineraryDetail({ itinerary, isSaved, onBack, onUpdated }: Props) {
  const [activePlaceKey, setActivePlaceKey] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [draftPlaces, setDraftPlaces] = useState<PlaceDraft[]>([]);
  const [travelMode, setTravelMode] = useState<TravelMode>(travelModeOf(itinerary.travelMode));
  const [placeQuery, setPlaceQuery] = useState('');
  const [searchResults, setSearchResults] = useState<PlaceSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchMessage, setSearchMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  useEffect(() => {
    setDraftPlaces(itinerary.places.map(draftFromPlace));
    setTravelMode(travelModeOf(itinerary.travelMode));
  }, [itinerary]);

  const visiblePlaces = editing
    ? draftPlaces
    : itinerary.places.map((place, index) => draftFromPlace(place, index));
  const mapPlaces = visiblePlaces.map((place) => ({
    key: place.key,
    name: place.name,
    latitude: place.latitude,
    longitude: place.longitude,
  }));
  const planCalculated = itinerary.stadiumArrivalAt !== null;

  function beginEditing() {
    setDraftPlaces(itinerary.places.map(draftFromPlace));
    setTravelMode(travelModeOf(itinerary.travelMode));
    setSearchResults([]);
    setSearchMessage('');
    setSaveMessage('');
    setEditing(true);
  }

  async function searchPlace() {
    const keyword = placeQuery.trim();
    if (!keyword) {
      setSearchMessage('장소나 지역을 입력해 주세요.');
      return;
    }
    setSearching(true);
    setSearchMessage('');
    try {
      const result = await searchPlaces(keyword);
      setSearchResults(result.places);
      if (!result.places.length) setSearchMessage('검색 결과가 없어요. 다른 이름으로 검색해 주세요.');
    } catch (error) {
      setSearchMessage(formatApiError(error, '장소를 검색하지 못했습니다.'));
    } finally {
      setSearching(false);
    }
  }

  function addPlace(place: PlaceSearchResult) {
    if (draftPlaces.length >= 8) {
      setSearchMessage('자동 코스는 장소를 최대 8곳까지 지원합니다.');
      return;
    }
    setDraftPlaces((current) => [...current, {
      key: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      placeId: place.id,
      name: place.name,
      address: place.roadAddress || place.address || '',
      latitude: place.latitude,
      longitude: place.longitude,
      stayDurationMinutes: 60,
      mustVisit: false,
    }]);
    setSearchResults([]);
    setPlaceQuery('');
    setSearchMessage('');
  }

  async function savePlaces(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaveMessage('');
    if (draftPlaces.some((place) => !place.name.trim())) {
      setSaveMessage('장소 이름을 확인해 주세요.');
      return;
    }
    setSaving(true);
    try {
      setSaveMessage('출발지와 장소 좌표를 확인하는 중…');
      const candidates: ItineraryCandidate[] = await resolvePlaceCandidates(draftPlaces);
      const [arrival, stadium, departure] = await Promise.all([
        resolveNamedLocation(itinerary.arrivalPlace),
        resolveNamedLocation(itinerary.stadium),
        resolveNamedLocation(itinerary.departurePlace),
      ]);
      setSaveMessage('변경한 순서의 이동시간을 계산하는 중…');
      const route = await measureSequentialRoute(arrival, stadium, departure, candidates, travelMode);
      setSaveMessage('코스 시간표를 다시 계산해 저장하는 중…');
      const updated = await updateItineraryPlaces(itinerary.id, {
        stadiumEntryBufferMinutes: itinerary.stadiumEntryBufferMinutes ?? 30,
        finalLegToStadiumMinutes: route.finalLegToStadiumMinutes,
        stadiumToDepartureMinutes: route.stadiumToDepartureMinutes,
        postGameCrowdBufferMinutes: 30,
        boardingBufferMinutes: 15,
        travelMode,
        expectedGameDurationMinutes: expectedDuration(itinerary),
        places: candidates.map((place, index) => ({
          ...place,
          travelFromPreviousMinutes: route.travelFromPreviousMinutes[index],
        })),
      });
      onUpdated(updated);
      setEditing(false);
      setSaveMessage('');
    } catch (error) {
      setSaveMessage(formatApiError(error, '일정을 다시 계산하지 못했습니다.'));
    } finally {
      setSaving(false);
    }
  }

  function movePlace(index: number, direction: -1 | 1) {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= draftPlaces.length) return;
    setDraftPlaces((current) => {
      const updated = [...current];
      [updated[index], updated[nextIndex]] = [updated[nextIndex], updated[index]];
      return updated;
    });
  }

  return (
    <section className="detail-page" aria-label="저장한 원정 일정">
      <button className="back-link detail-back-link" type="button" onClick={onBack}>
        ← {isSaved ? '저장한 일정' : '경기 목록'}
      </button>
      <div className="routine-workspace detail-routine-workspace">
        <div className="detail-map-pane">
          <ItineraryMapPreview
            places={mapPlaces}
            activePlaceKey={activePlaceKey}
            onSelectPlace={setActivePlaceKey}
          />
        </div>
        <aside className="routine-sidebar" aria-label={editing ? '코스 수정' : '일정 상세'}>
          {editing ? (
            <form className="detail-editor" onSubmit={savePlaces}>
              <div className="detail-editor-header">
                <div><h1>코스 수정</h1><p>{itinerary.stadium} · {dateLabel(itinerary.gameDate)}</p></div>
                <button className="button button-secondary" type="button" onClick={() => setEditing(false)}>취소</button>
              </div>
              <label className="field detail-mode-field"><span>이동수단</span>
                <select value={travelMode} onChange={(event) => setTravelMode(event.target.value as TravelMode)}>
                  <option value="PUBLIC_TRANSIT">대중교통</option>
                  <option value="WALK">도보</option>
                  <option value="CAR">자동차</option>
                </select>
              </label>
              <div className="detail-place-search">
                <label className="field"><span>장소 추가 검색</span><input value={placeQuery} onChange={(event) => setPlaceQuery(event.target.value)} placeholder="장소 또는 지역" /></label>
                <button className="button button-secondary" type="button" disabled={searching} onClick={() => void searchPlace()}>{searching ? '검색 중…' : '검색'}</button>
              </div>
              {searchMessage && <p className="detail-form-message" role="status">{searchMessage}</p>}
              {searchResults.length > 0 && <ul className="detail-search-results" aria-label="장소 검색 결과">
                {searchResults.map((place) => <li key={place.id}>
                  <span><strong>{place.name}</strong><small>{place.roadAddress || place.address || '주소 정보 없음'}</small></span>
                  <button className="button button-secondary" type="button" onClick={() => addPlace(place)}>추가</button>
                </li>)}
              </ul>}
              <ol className="detail-editor-list">
                {draftPlaces.map((place, index) => <li key={place.key}>
                  <span className="routine-place-order">{String(index + 1).padStart(2, '0')}</span>
                  <div className="detail-editor-fields">
                    <label className="field"><span>장소</span><input required value={place.name} onChange={(event) => setDraftPlaces((current) => current.map((item) => item.key === place.key ? { ...item, name: event.target.value, placeId: null, latitude: null, longitude: null } : item))} /></label>
                    <label className="field"><span>체류 시간 (분)</span><input type="number" min="0" max="1440" step="15" value={place.stayDurationMinutes} onChange={(event) => setDraftPlaces((current) => current.map((item) => item.key === place.key ? { ...item, stayDurationMinutes: Number(event.target.value) } : item))} /></label>
                    <label className="field detail-address-field"><span>주소</span><input value={place.address} placeholder="검색하거나 주소 입력" onChange={(event) => setDraftPlaces((current) => current.map((item) => item.key === place.key ? { ...item, address: event.target.value, placeId: null, latitude: null, longitude: null } : item))} /></label>
                  </div>
                  <div className="detail-editor-actions">
                    <button type="button" aria-label={(index + 1) + '번째 장소 위로'} disabled={index === 0} onClick={() => movePlace(index, -1)}>↑</button>
                    <button type="button" aria-label={(index + 1) + '번째 장소 아래로'} disabled={index === draftPlaces.length - 1} onClick={() => movePlace(index, 1)}>↓</button>
                    <button type="button" aria-label={place.name + ' 삭제'} onClick={() => setDraftPlaces((current) => current.filter((item) => item.key !== place.key))}>×</button>
                  </div>
                </li>)}
              </ol>
              {saveMessage && <p className="detail-form-message" role="status">{saveMessage}</p>}
              <div className="detail-editor-footer">
                <button className="button button-secondary" type="button" onClick={() => setEditing(false)} disabled={saving}>취소</button>
                <button className="button button-primary detail-edit-button" type="submit" disabled={saving}>{saving ? saveMessage || '계산 중…' : '다시 계산해 저장'}</button>
              </div>
            </form>
          ) : (
            <>
              <header className="detail-overview">
                <div className="detail-overview-heading">
                  <div>
                    <h1>{itinerary.homeTeam} vs {itinerary.awayTeam}</h1>
                    <p>{itinerary.stadium} · {dateLabel(itinerary.gameDate)} · {timeLabel(itinerary.gameStartTime)}</p>
                  </div>
                  <button className="button button-primary detail-edit-button" type="button" onClick={beginEditing}>코스 수정</button>
                </div>
                <div className="detail-summary-status">
                  <span className="detail-status-badge">{statusLabel(itinerary.status, planCalculated)}</span>
                  {itinerary.gameStartSlackMinutes !== null && <span>경기 시작까지 {itinerary.gameStartSlackMinutes}분</span>}
                </div>
              </header>
              <div className="routine-sidebar-heading"><strong>방문 순서</strong><span>{itinerary.places.length}곳</span></div>
              {!itinerary.places.length && <p className="routine-list-empty">아직 장소를 추가하지 않았어요.</p>}
              <ol className="routine-place-list detail-routine-list">
                {itinerary.places.map((place, index) => {
                  const key = mapPlaces[index].key;
                  const active = activePlaceKey === key;
                  return (
                    <li key={key}>
                      <button className={'detail-routine-item' + (active ? ' is-active' : '')} type="button" aria-pressed={active} onClick={() => setActivePlaceKey(key)}>
                        <span className="routine-place-order">{String(index + 1).padStart(2, '0')}</span>
                        <span className="detail-routine-place-info">
                          <strong>{place.name}</strong>
                          <small>{(place.address || '주소 미입력') + ' · ' + timeLabel(place.arrivesAt) + ' 도착 · ' + (place.stayDurationMinutes ?? 0) + '분 체류'}</small>
                        </span>
                        <span className="detail-leg-time">{place.travelFromPreviousMinutes ?? 0}분</span>
                      </button>
                    </li>
                  );
                })}
              </ol>
              {itinerary.returnTransportBoardable === false && <p className="detail-return-alert">예상 경기 종료 후 귀가편 탑승이 어려울 수 있습니다.</p>}
              {itinerary.returnTransportBoardable === true && <p className="detail-return-alert is-clear">예상 경기 종료 후 귀가편 탑승 여유가 있습니다.</p>}
              <details className="detail-extra">
                <summary>경기 시간과 교통편</summary>
                <dl className="detail-plan-times" aria-label="일정 시간">
                  <div><dt>대전 도착</dt><dd>{timeLabel(itinerary.arrivalAt)}</dd></div>
                  <div><dt>구장 도착</dt><dd>{timeLabel(itinerary.stadiumArrivalAt)}</dd></div>
                  <div><dt>경기 시작</dt><dd>{timeLabel(itinerary.gameDate + 'T' + itinerary.gameStartTime)}</dd></div>
                </dl>
                <div className="detail-train-summary">
                  <div><small>왕편</small><strong>{itinerary.arrivalTrain ? itinerary.arrivalTrain.trainType + ' ' + itinerary.arrivalTrain.trainNumber + ' · ' + itinerary.arrivalTrain.departureStation + ' ' + timeLabel(itinerary.arrivalTrain.departureAt) + ' → ' + itinerary.arrivalTrain.arrivalStation + ' ' + timeLabel(itinerary.arrivalTrain.arrivalAt) : '직접 입력'}</strong></div>
                  <div><small>귀가편</small><strong>{itinerary.returnTrain ? itinerary.returnTrain.trainType + ' ' + itinerary.returnTrain.trainNumber + ' · ' + itinerary.returnTrain.departureStation + ' ' + timeLabel(itinerary.returnTrain.departureAt) + ' → ' + itinerary.returnTrain.arrivalStation + ' ' + timeLabel(itinerary.returnTrain.arrivalAt) : '직접 입력'}</strong></div>
                </div>
                {itinerary.warnings?.length > 0 && <ul className="detail-warning-list" aria-label="일정 경고">
                  {itinerary.warnings.map((warning) => <li key={warning}>{warning}</li>)}
                </ul>}
                {itinerary.stadiumDepartureRecommendedAt && <p className="detail-return-time">경기장 출발 권장 <strong>{timeLabel(itinerary.stadiumDepartureRecommendedAt)}</strong></p>}
              </details>
            </>
          )}
        </aside>
      </div>
    </section>
  );
}
