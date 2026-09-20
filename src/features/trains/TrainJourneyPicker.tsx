import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { getKtxSchedules, getTrainCities, getTrainStations } from './api';
import type { TrainCity, TrainSchedule, TrainStation } from './api';

export type JourneyInput = {
  arrivalPlace: string;
  arrivalAt: string;
  departurePlace: string;
  departureAt: string;
};

type Props = {
  gameDate: string;
  value: JourneyInput;
  onChange: (value: JourneyInput) => void;
};

type TransportCardProps = {
  title: string;
  eyebrow: string;
  date: string;
  onDateChange: (date: string) => void;
  loading: boolean;
  onSearch: () => void;
  error: string;
  schedules: ReactNode;
  placeLabel: string;
  timeLabel: string;
  place: string;
  dateTime: string;
  onPlaceChange: (value: string) => void;
  onDateTimeChange: (value: string) => void;
  icon: string;
};

function formatTime(value: string): string {
  return value.slice(0, 5);
}

function TransportCard(props: TransportCardProps) {
  return (
    <div className="transport-card">
      <div className="transport-title"><div><span className="eyebrow">{props.eyebrow}</span><h3>{props.title}</h3></div><b>{props.icon}</b></div>
      <div className="search-row">
        <label className="field"><span>탑승 날짜</span><input type="date" value={props.date} onChange={(event) => props.onDateChange(event.target.value)} /></label>
        <button className="button button-dark" type="button" disabled={props.loading} onClick={props.onSearch}>{props.loading ? '조회 중…' : '시간표 조회'}</button>
      </div>
      {props.error && <p className="inline-warning" role="status">{props.error}</p>}
      {props.schedules}
      <div className="manual-fields">
        <span>일정에 저장할 정보</span>
        <label className="field"><span>{props.placeLabel}</span><input value={props.place} onChange={(event) => props.onPlaceChange(event.target.value)} placeholder="예: 대전역" required /></label>
        <label className="field"><span>{props.timeLabel}</span><input type="datetime-local" value={props.dateTime} onChange={(event) => props.onDateTimeChange(event.target.value)} required /></label>
      </div>
    </div>
  );
}

export function TrainJourneyPicker({ gameDate, value, onChange }: Props) {
  const [cities, setCities] = useState<TrainCity[]>([]);
  const [citiesLoading, setCitiesLoading] = useState(true);
  const [citiesError, setCitiesError] = useState('');
  const [originCityCode, setOriginCityCode] = useState('');
  const [originStations, setOriginStations] = useState<TrainStation[]>([]);
  const [originStationId, setOriginStationId] = useState('');
  const [originError, setOriginError] = useState('');
  const [daejeonStations, setDaejeonStations] = useState<TrainStation[]>([]);
  const [daejeonStationId, setDaejeonStationId] = useState('');
  const [daejeonError, setDaejeonError] = useState('');
  const [outboundDate, setOutboundDate] = useState(gameDate);
  const [returnDate, setReturnDate] = useState(gameDate);
  const [arrivalSchedules, setArrivalSchedules] = useState<TrainSchedule[]>([]);
  const [returnSchedules, setReturnSchedules] = useState<TrainSchedule[]>([]);
  const [arrivalSelected, setArrivalSelected] = useState<TrainSchedule | null>(null);
  const [returnSelected, setReturnSelected] = useState<TrainSchedule | null>(null);
  const [arrivalLoading, setArrivalLoading] = useState(false);
  const [returnLoading, setReturnLoading] = useState(false);
  const [arrivalError, setArrivalError] = useState('');
  const [returnError, setReturnError] = useState('');

  const originCities = cities.filter((city) => !city.cityName.includes('대전'));
  const daejeonCityCode = cities.find((city) => city.cityName.includes('대전'))?.cityCode ?? '';

  useEffect(() => {
    let active = true;
    getTrainCities()
      .then((result) => {
        if (!active) return;
        setCities(result);
        const firstOrigin = result.find((city) => !city.cityName.includes('대전'));
        if (firstOrigin) setOriginCityCode(firstOrigin.cityCode);
        if (!result.some((city) => city.cityName.includes('대전'))) {
          setDaejeonError('TAGO 도시 목록에서 대전을 찾지 못했습니다. 장소와 시각을 직접 입력해 주세요.');
        }
      })
      .catch((error: Error) => { if (active) setCitiesError(error.message); })
      .finally(() => { if (active) setCitiesLoading(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!originCityCode) return;
    let active = true;
    setOriginStations([]);
    setOriginStationId('');
    setOriginError('');
    getTrainStations(originCityCode)
      .then((result) => {
        if (!active) return;
        setOriginStations(result);
        setOriginStationId(result[0]?.stationId ?? '');
      })
      .catch((error: Error) => { if (active) setOriginError(error.message); });
    return () => { active = false; };
  }, [originCityCode]);

  useEffect(() => {
    if (!daejeonCityCode) return;
    let active = true;
    setDaejeonStations([]);
    setDaejeonStationId('');
    getTrainStations(daejeonCityCode)
      .then((result) => {
        if (!active) return;
        setDaejeonStations(result);
        setDaejeonStationId(result[0]?.stationId ?? '');
        if (!result.length) setDaejeonError('대전역 목록이 비어 있습니다. 장소와 시각을 직접 입력해 주세요.');
      })
      .catch((error: Error) => { if (active) setDaejeonError(error.message); });
    return () => { active = false; };
  }, [daejeonCityCode]);

  async function search(direction: 'arrival' | 'return') {
    const outbound = direction === 'arrival';
    const date = outbound ? outboundDate : returnDate;
    const departureId = outbound ? originStationId : daejeonStationId;
    const arrivalId = outbound ? daejeonStationId : originStationId;
    if (!date || !departureId || !arrivalId) {
      const message = '출발역, 대전역, 날짜를 선택해 주세요.';
      if (outbound) setArrivalError(message);
      else setReturnError(message);
      return;
    }
    if (outbound) {
      setArrivalLoading(true);
      setArrivalError('');
      setArrivalSelected(null);
    } else {
      setReturnLoading(true);
      setReturnError('');
      setReturnSelected(null);
    }
    try {
      const result = await getKtxSchedules(departureId, arrivalId, date);
      if (outbound) setArrivalSchedules(result);
      else setReturnSchedules(result);
      if (!result.length) {
        const message = '해당 날짜에 조회된 KTX가 없습니다. 장소와 시각을 직접 입력할 수 있어요.';
        if (outbound) setArrivalError(message);
        else setReturnError(message);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : '시간표를 불러오지 못했습니다.';
      if (outbound) setArrivalError(message);
      else setReturnError(message);
    } finally {
      if (outbound) setArrivalLoading(false);
      else setReturnLoading(false);
    }
  }

  function choose(direction: 'arrival' | 'return', schedule: TrainSchedule) {
    if (direction === 'arrival') {
      setArrivalSelected(schedule);
      setArrivalError('');
      onChange({ ...value, arrivalPlace: schedule.arrivalStation, arrivalAt: schedule.arrivalAt.slice(0, 16) });
    } else {
      setReturnSelected(schedule);
      setReturnError('');
      onChange({ ...value, departurePlace: schedule.departureStation, departureAt: schedule.departureAt.slice(0, 16) });
    }
  }

  function options(direction: 'arrival' | 'return', schedules: TrainSchedule[], selected: TrainSchedule | null) {
    return schedules.length ? (
      <div className="schedule-list">
        {schedules.map((schedule, index) => {
          const active = selected?.trainNumber === schedule.trainNumber && selected?.departureAt === schedule.departureAt;
          return (
            <button className={'schedule-option' + (active ? ' is-selected' : '')} type="button" aria-pressed={active} key={schedule.trainNumber + schedule.departureAt + index} onClick={() => choose(direction, schedule)}>
              <span className="train-badge">{schedule.trainType}<small>{schedule.trainNumber}호</small></span>
              <span className="train-route"><strong>{formatTime(schedule.departureAt)}</strong><span>{schedule.departureStation}<i />{schedule.arrivalStation}</span><strong>{formatTime(schedule.arrivalAt)}</strong></span>
              <span className="select-label">{active ? '선택됨' : '선택'}</span>
            </button>
          );
        })}
      </div>
    ) : null;
  }

  return (
    <section className="form-section">
      <div className="form-heading"><b>01</b><div><h2>왕복 교통편</h2><p>TAGO 시간표를 불러오거나 장소와 시각을 직접 입력할 수 있어요.</p></div></div>
      <div className="station-picker">
        <label className="field"><span>출발 도시</span><select value={originCityCode} onChange={(event) => setOriginCityCode(event.target.value)} disabled={citiesLoading || !originCities.length}>
          {!originCities.length && <option value="">도시 목록 확인 중</option>}
          {originCities.map((city) => <option key={city.cityCode} value={city.cityCode}>{city.cityName}</option>)}
        </select></label>
        <label className="field"><span>출발역</span><select value={originStationId} onChange={(event) => setOriginStationId(event.target.value)} disabled={!originStations.length}>
          {!originStations.length && <option value="">역을 선택해 주세요</option>}
          {originStations.map((station) => <option key={station.stationId} value={station.stationId}>{station.stationName}</option>)}
        </select></label>
        <span className="route-arrow" aria-hidden="true">→</span>
        <label className="field"><span>대전 도착역</span><select value={daejeonStationId} onChange={(event) => setDaejeonStationId(event.target.value)} disabled={!daejeonStations.length}>
          {!daejeonStations.length && <option value="">역 목록 확인 중</option>}
          {daejeonStations.map((station) => <option key={station.stationId} value={station.stationId}>{station.stationName}</option>)}
        </select></label>
      </div>
      {citiesLoading && <p className="inline-note">열차 도시와 역 목록을 불러오는 중이에요.</p>}
      {citiesError && <p className="inline-warning" role="status">{citiesError} 교통편은 직접 입력할 수 있어요.</p>}
      {originError && <p className="inline-warning" role="status">{originError}</p>}
      {daejeonError && <p className="inline-warning" role="status">{daejeonError}</p>}
      <div className="transport-grid">
        <TransportCard
          title="대전으로 가는 편" eyebrow="GOING TO DAEJEON" icon="↘"
          date={outboundDate} onDateChange={(date) => { setOutboundDate(date); setArrivalSchedules([]); setArrivalSelected(null); }}
          loading={arrivalLoading} onSearch={() => void search('arrival')} error={arrivalError}
          schedules={options('arrival', arrivalSchedules, arrivalSelected)}
          placeLabel="대전 도착 장소" timeLabel="대전 도착 시각"
          place={value.arrivalPlace} dateTime={value.arrivalAt}
          onPlaceChange={(arrivalPlace) => onChange({ ...value, arrivalPlace })}
          onDateTimeChange={(arrivalAt) => onChange({ ...value, arrivalAt })}
        />
        <TransportCard
          title="집으로 돌아가는 편" eyebrow="HEADING BACK HOME" icon="↗"
          date={returnDate} onDateChange={(date) => { setReturnDate(date); setReturnSchedules([]); setReturnSelected(null); }}
          loading={returnLoading} onSearch={() => void search('return')} error={returnError}
          schedules={options('return', returnSchedules, returnSelected)}
          placeLabel="대전 출발 장소" timeLabel="대전 출발 시각"
          place={value.departurePlace} dateTime={value.departureAt}
          onPlaceChange={(departurePlace) => onChange({ ...value, departurePlace })}
          onDateTimeChange={(departureAt) => onChange({ ...value, departureAt })}
        />
      </div>
      <p className="form-note">시간표 조회는 운행 정보만 제공합니다. 잔여 좌석 확인과 승차권 예매는 지원하지 않아요.</p>
    </section>
  );
}
