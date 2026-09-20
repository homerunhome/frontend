import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { getSchedulesFromDaejeon, getSchedulesToDaejeon, getTrainCities, getTrainStations } from './api';
import type { TrainCity, TrainSchedule, TrainStation } from './api';
import { StationSelector } from './StationSelector';
import type { StationSelection } from './StationSelector';
import type { ItineraryTrain } from '../itinerary/api';

export type JourneyInput = {
  arrivalPlace: string;
  arrivalAt: string;
  arrivalTrain: ItineraryTrain | null;
  departurePlace: string;
  departureAt: string;
  returnTrain: ItineraryTrain | null;
};

type Props = {
  gameDate: string;
  value: JourneyInput;
  onChange: (value: JourneyInput) => void;
};

type SchedulePeriod = 'all' | 'morning' | 'afternoon' | 'evening';

const schedulePeriods: { value: SchedulePeriod; label: string }[] = [
  { value: 'all', label: '전체' },
  { value: 'morning', label: '오전' },
  { value: 'afternoon', label: '오후' },
  { value: 'evening', label: '저녁' },
];

type TransportCardProps = {
  title: string;
  direction: 'arrival' | 'return';
  cities: TrainCity[];
  daejeonCities: TrainCity[];
  stations: TrainStation[];
  daejeonStations: TrainStation[];
  stationsLoading: boolean;
  station: StationSelection;
  daejeonStation: StationSelection;
  onStationChange: (selection: StationSelection) => void;
  onDaejeonStationChange: (selection: StationSelection, station?: TrainStation) => void;
  date: string;
  onDateChange: (date: string) => void;
  loading: boolean;
  onSearch: () => void;
  error: string;
  schedules: ReactNode;
  scheduleDialogOpen: boolean;
  onCloseScheduleDialog: () => void;
  selected: TrainSchedule | null;
  placeLabel: string;
  timeLabel: string;
  place: string;
  time: string;
  onPlaceChange: (value: string) => void;
  onTimeChange: (value: string) => void;
};

function formatTime(value: string): string {
  return timeValue(value);
}

function formatTrainType(value: string): string {
  return value.replace('(A-type)', ' A형').replace('(B-type)', ' B형');
}

function timeValue(value: string): string {
  const dateTimeMatch = value.match(/[T ](\d{2}:\d{2})/);
  if (dateTimeMatch) return dateTimeMatch[1];
  return /^\d{2}:\d{2}/.test(value) ? value.slice(0, 5) : '';
}

function combineDateAndTime(date: string, time: string): string {
  const normalizedTime = timeValue(time);
  return date && normalizedTime ? `${date}T${normalizedTime}` : '';
}

function scheduleDateTime(date: string, value: string): string {
  const fullDateTime = value.replace(' ', 'T');
  const dateTime = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(fullDateTime)
    ? fullDateTime
    : combineDateAndTime(date, value);
  return dateTime.length === 16 ? `${dateTime}:00` : dateTime;
}

function selectedTrain(schedule: TrainSchedule, date: string): ItineraryTrain {
  return {
    trainNumber: schedule.trainNumber,
    trainType: schedule.trainType,
    departureStation: schedule.departureStation,
    departureAt: scheduleDateTime(date, schedule.departureAt),
    arrivalStation: schedule.arrivalStation,
    arrivalAt: scheduleDateTime(date, schedule.arrivalAt),
  };
}

function matchesPeriod(value: string, period: SchedulePeriod): boolean {
  if (period === 'all') return true;
  const time = timeValue(value);
  if (!time) return false;
  const hour = Number(time.slice(0, 2));
  if (!Number.isFinite(hour)) return false;
  if (period === 'morning') return hour < 12;
  if (period === 'afternoon') return hour >= 12 && hour < 18;
  return hour >= 18;
}

function matchesStationName(scheduleStation: string, selectedStation: string): boolean {
  const normalize = (name: string) => name.replace(/\s/g, '').replace(/역$/, '');
  return normalize(scheduleStation) === normalize(selectedStation);
}

function TransportCard(props: TransportCardProps) {
  const goingToDaejeon = props.direction === 'arrival';
  const scheduleDialogRef = useRef<HTMLDialogElement>(null);
  const [manualEntryOpen, setManualEntryOpen] = useState(false);
  const timetableSearchButton = (
    <button className="button button-dark timetable-search-button" type="button" disabled={props.loading} onClick={props.onSearch}>
      {props.loading ? '조회 중…' : '시간표 조회'}
    </button>
  );

  useEffect(() => {
    const dialog = scheduleDialogRef.current;
    if (!dialog) return;
    if (props.scheduleDialogOpen && !dialog.open) dialog.showModal();
    if (!props.scheduleDialogOpen && dialog.open) dialog.close();
  }, [props.scheduleDialogOpen]);

  return (
    <div className="transport-card">
      <div className="transport-title">
        <h3>{props.title}</h3>
      </div>
      <div className="station-picker">
        {goingToDaejeon
          ? <StationSelector label="출발역" cities={props.cities} stations={props.stations} loading={props.stationsLoading} value={props.station} onChange={props.onStationChange} />
          : <StationSelector label="출발역" cities={props.daejeonCities} stations={props.daejeonStations} loading={props.stationsLoading} value={props.daejeonStation} onChange={props.onDaejeonStationChange} preferredStationName="대전" />}
        <span className="route-arrow" aria-hidden="true">
          <svg viewBox="0 0 96 24" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8">
            <path d="M8 12h80" stroke="var(--line)" />
            <circle cx="8" cy="12" r="4" fill="var(--paper)" stroke="var(--orange)" />
            <circle cx="88" cy="12" r="4" fill="var(--paper)" stroke="var(--orange)" />
            <path d="M42 12h12m-5-5 5 5-5 5" stroke="var(--orange)" />
          </svg>
        </span>
        {goingToDaejeon
          ? <StationSelector label="도착역" cities={props.daejeonCities} stations={props.daejeonStations} loading={props.stationsLoading} value={props.daejeonStation} onChange={props.onDaejeonStationChange} preferredStationName="대전" />
          : <StationSelector label="도착역" cities={props.cities} stations={props.stations} loading={props.stationsLoading} value={props.station} onChange={props.onStationChange} />}
      </div>
      <div className="search-row">
        <label className="field"><span>탑승 날짜</span><input type="date" value={props.date} onChange={(event) => props.onDateChange(event.target.value)} required /></label>
      </div>
      {props.error && <p className="inline-warning" role="status">{props.error}</p>}
      <aside className={'journey-details' + (props.selected || manualEntryOpen ? ' has-details' : '')} aria-label={`${props.title} 선택 정보`}>
        {props.selected ? (
          <div className="selected-train-summary has-selection" aria-live="polite">
            <div className="selected-train-heading">
              <strong>선택한 열차</strong>
              <span>{formatTrainType(props.selected.trainType)} {props.selected.trainNumber}호</span>
            </div>
            <div className="selected-train-route">
              <div className="selected-route-point">
                <small>출발</small>
                <div className="selected-route-location-time">
                  <span>{props.selected.departureStation}</span>
                  <strong>{formatTime(props.selected.departureAt)}</strong>
                </div>
              </div>
              <span className="selected-route-arrow" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8"><path d="M4 12h16m-6-6 6 6-6 6" /></svg>
              </span>
              <div className="selected-route-point">
                <small>도착</small>
                <div className="selected-route-location-time">
                  <span>{props.selected.arrivalStation}</span>
                  <strong>{formatTime(props.selected.arrivalAt)}</strong>
                </div>
              </div>
            </div>
          </div>
        ) : manualEntryOpen ? (
          <div className="selected-train-summary" aria-live="polite">
            <div className="selected-train-heading"><strong>직접 입력</strong></div>
          </div>
        ) : (
          <div className="journey-unselected">
            <p className="selection-empty">열차를 선택하면 일정 정보가 표시돼요.</p>
            <div className="journey-actions">
              {timetableSearchButton}
              <button className="manual-entry-button" type="button" onClick={() => setManualEntryOpen(true)}>직접 입력</button>
            </div>
          </div>
        )}
        {!props.selected && manualEntryOpen && (
          <div className="manual-fields">
            <span>일정에 저장할 정보</span>
            <label className="field"><span>{props.placeLabel}</span><input value={props.place} onChange={(event) => props.onPlaceChange(event.target.value)} placeholder="예: 대전역" required /></label>
            <label className="field"><span>{props.timeLabel}</span><input type="time" step="60" value={props.time} onChange={(event) => props.onTimeChange(event.target.value)} required /></label>
          </div>
        )}
        {(props.selected || manualEntryOpen) && <div className="journey-actions">{timetableSearchButton}</div>}
      </aside>
      <dialog
        ref={scheduleDialogRef}
        className="schedule-dialog"
        aria-labelledby={`schedule-dialog-title-${props.direction}`}
        onClose={() => props.onCloseScheduleDialog()}
        onCancel={() => props.onCloseScheduleDialog()}
        onClick={(event) => { if (event.target === event.currentTarget) props.onCloseScheduleDialog(); }}
        >
        <div className="schedule-dialog-content">
          <div className="schedule-dialog-heading">
            <div>
              <h4 id={`schedule-dialog-title-${props.direction}`}>시간표 조회 결과</h4>
              <p>{goingToDaejeon ? '대전으로 가는 편' : '집으로 돌아가는 편'} · {props.date}</p>
            </div>
            <button className="schedule-dialog-close" type="button" aria-label="시간표 창 닫기" onClick={props.onCloseScheduleDialog}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8"><path d="m6 6 12 12M18 6 6 18" /></svg>
            </button>
          </div>
          {props.loading ? (
            <div className="schedule-loading" role="status">
              <span className="spinner" aria-hidden="true" />
              <strong>시간표를 불러오는 중이에요.</strong>
            </div>
          ) : props.schedules}
        </div>
      </dialog>
    </div>
  );
}

export function TrainJourneyPicker({ gameDate, value, onChange }: Props) {
  const [cities, setCities] = useState<TrainCity[]>([]);
  const [trainStations, setTrainStations] = useState<TrainStation[]>([]);
  const [citiesLoading, setCitiesLoading] = useState(true);
  const [citiesError, setCitiesError] = useState('');
  const [arrivalDeparture, setArrivalDeparture] = useState<StationSelection>({ cityCode: '', stationId: '' });
  const [returnDestination, setReturnDestination] = useState<StationSelection>({ cityCode: '', stationId: '' });
  const [arrivalDaejeonStation, setArrivalDaejeonStation] = useState<StationSelection>({ cityCode: '', stationId: '' });
  const [returnDaejeonStation, setReturnDaejeonStation] = useState<StationSelection>({ cityCode: '', stationId: '' });
  const [arrivalDaejeonStationName, setArrivalDaejeonStationName] = useState('');
  const [returnDaejeonStationName, setReturnDaejeonStationName] = useState('');
  const [outboundDate, setOutboundDate] = useState(gameDate);
  const [returnDate, setReturnDate] = useState(gameDate);
  const [arrivalSchedules, setArrivalSchedules] = useState<TrainSchedule[]>([]);
  const [returnSchedules, setReturnSchedules] = useState<TrainSchedule[]>([]);
  const [arrivalPeriod, setArrivalPeriod] = useState<SchedulePeriod>('all');
  const [returnPeriod, setReturnPeriod] = useState<SchedulePeriod>('all');
  const [arrivalSelected, setArrivalSelected] = useState<TrainSchedule | null>(null);
  const [returnSelected, setReturnSelected] = useState<TrainSchedule | null>(null);
  const [openSchedule, setOpenSchedule] = useState<'arrival' | 'return' | null>(null);
  const [arrivalLoading, setArrivalLoading] = useState(false);
  const [returnLoading, setReturnLoading] = useState(false);
  const [arrivalError, setArrivalError] = useState('');
  const [returnError, setReturnError] = useState('');

  const originCities = cities.filter((city) => !city.cityName.includes('대전'));
  const daejeonCity = cities.find((city) => city.cityName.includes('대전'));
  const daejeonCities = daejeonCity ? [daejeonCity] : [];
  const originStations = trainStations.filter((station) => station.cityCode !== daejeonCity?.cityCode);
  const daejeonStations = trainStations.filter((station) => station.cityCode === daejeonCity?.cityCode);
  useEffect(() => {
    let active = true;
    getTrainCities()
      .then(async (result) => {
        if (!active) return;
        setCities(result);
        const firstOrigin = result.find((city) => !city.cityName.includes('대전'));
        if (firstOrigin) {
          const origin = { cityCode: firstOrigin.cityCode, stationId: '' };
          setArrivalDeparture(origin);
          setReturnDestination(origin);
        }
        const daejeon = result.find((city) => city.cityName.includes('대전'));
        if (daejeon) {
          setArrivalDaejeonStation({ cityCode: daejeon.cityCode, stationId: '' });
          setReturnDaejeonStation({ cityCode: daejeon.cityCode, stationId: '' });
        } else {
          setCitiesError('TAGO 도시 목록에서 대전을 찾지 못했습니다. 장소와 시각을 직접 입력해 주세요.');
        }
        const stationGroups = await Promise.all(result.map(async (city) => {
          const stations = await getTrainStations(city.cityCode).catch(() => []);
          return stations.map((station) => ({ ...station, cityCode: station.cityCode || city.cityCode }));
        }));
        if (!active) return;
        const allStations = stationGroups.flat();
        setTrainStations(allStations);
        if (!allStations.length) setCitiesError('열차 역 목록을 불러오지 못했습니다. 직접 입력을 이용해 주세요.');
      })
      .catch((error: Error) => { if (active) setCitiesError(error.message); })
      .finally(() => { if (active) setCitiesLoading(false); });
    return () => { active = false; };
  }, []);

  function changeStation(direction: 'arrival' | 'return', selection: StationSelection) {
    const outbound = direction === 'arrival';
    const selected = outbound ? arrivalSelected : returnSelected;
    if (outbound) {
      setArrivalDeparture(selection);
      setArrivalSchedules([]);
      setArrivalSelected(null);
      setArrivalPeriod('all');
      setArrivalError('');
      if (openSchedule === 'arrival') setOpenSchedule(null);
      if (selected) onChange({ ...value, arrivalPlace: '', arrivalAt: '', arrivalTrain: null });
    } else {
      setReturnDestination(selection);
      setReturnSchedules([]);
      setReturnSelected(null);
      setReturnPeriod('all');
      setReturnError('');
      if (openSchedule === 'return') setOpenSchedule(null);
      if (selected) onChange({ ...value, departurePlace: '', departureAt: '', returnTrain: null });
    }
  }

  function changeDaejeonStation(direction: 'arrival' | 'return', selection: StationSelection, station?: TrainStation) {
    const outbound = direction === 'arrival';
    const selected = outbound ? arrivalSelected : returnSelected;
    if (outbound) {
      setArrivalDaejeonStation(selection);
      setArrivalDaejeonStationName(station?.stationName ?? '');
      setArrivalSchedules([]);
      setArrivalSelected(null);
      setArrivalPeriod('all');
      setArrivalError('');
      if (openSchedule === 'arrival') setOpenSchedule(null);
      if (selected) onChange({ ...value, arrivalPlace: '', arrivalAt: '', arrivalTrain: null });
    } else {
      setReturnDaejeonStation(selection);
      setReturnDaejeonStationName(station?.stationName ?? '');
      setReturnSchedules([]);
      setReturnSelected(null);
      setReturnPeriod('all');
      setReturnError('');
      if (openSchedule === 'return') setOpenSchedule(null);
      if (selected) onChange({ ...value, departurePlace: '', departureAt: '', returnTrain: null });
    }
  }

  async function search(direction: 'arrival' | 'return') {
    const outbound = direction === 'arrival';
    setOpenSchedule(null);
    const date = outbound ? outboundDate : returnDate;
    const stationId = (outbound ? arrivalDeparture : returnDestination).stationId;
    const daejeonStation = outbound ? arrivalDaejeonStation : returnDaejeonStation;
    const daejeonStationName = outbound ? arrivalDaejeonStationName : returnDaejeonStationName;
    if (!date || !stationId || !daejeonStation.stationId || !daejeonStationName) {
      const message = outbound
        ? '출발역과 대전 도착역, 날짜를 선택해 주세요.'
        : '대전 출발역과 도착역, 날짜를 선택해 주세요.';
      if (outbound) setArrivalError(message);
      else setReturnError(message);
      return;
    }
    setOpenSchedule(direction);
    if (outbound) {
      setArrivalLoading(true);
      setArrivalError('');
      setArrivalSelected(null);
      setArrivalPeriod('all');
      setArrivalSchedules([]);
    } else {
      setReturnLoading(true);
      setReturnError('');
      setReturnSelected(null);
      setReturnPeriod('all');
      setReturnSchedules([]);
    }
    try {
      const result = outbound
        ? await getSchedulesToDaejeon(stationId, date)
        : await getSchedulesFromDaejeon(stationId, date);
      const matchingSchedules = result.filter((schedule) => matchesStationName(
        outbound ? schedule.arrivalStation : schedule.departureStation,
        daejeonStationName,
      ));
      if (outbound) setArrivalSchedules(matchingSchedules);
      else setReturnSchedules(matchingSchedules);
    } catch (error) {
      setOpenSchedule(null);
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
      const train = selectedTrain(schedule, outboundDate);
      setArrivalSelected(schedule);
      setOpenSchedule(null);
      setArrivalError('');
      onChange({
        ...value,
        arrivalPlace: schedule.arrivalStation,
        arrivalAt: train.arrivalAt,
        arrivalTrain: train,
      });
    } else {
      const train = selectedTrain(schedule, returnDate);
      setReturnSelected(schedule);
      setOpenSchedule(null);
      setReturnError('');
      onChange({
        ...value,
        departurePlace: schedule.departureStation,
        departureAt: train.departureAt,
        returnTrain: train,
      });
    }
  }

  function changeDate(direction: 'arrival' | 'return', date: string) {
    if (direction === 'arrival') {
      if (openSchedule === 'arrival') setOpenSchedule(null);
      setOutboundDate(date);
      setArrivalSchedules([]);
      setArrivalSelected(null);
      setArrivalPeriod('all');
      setArrivalError('');
      onChange({
        ...value,
        arrivalAt: arrivalSelected ? '' : combineDateAndTime(date, value.arrivalAt),
        arrivalTrain: null,
      });
    } else {
      if (openSchedule === 'return') setOpenSchedule(null);
      setReturnDate(date);
      setReturnSchedules([]);
      setReturnSelected(null);
      setReturnPeriod('all');
      setReturnError('');
      onChange({
        ...value,
        departureAt: returnSelected ? '' : combineDateAndTime(date, value.departureAt),
        returnTrain: null,
      });
    }
  }

  function options(
    direction: 'arrival' | 'return',
    schedules: TrainSchedule[],
    selected: TrainSchedule | null,
    period: SchedulePeriod,
    onPeriodChange: (period: SchedulePeriod) => void,
  ) {
    const relevantTime = (schedule: TrainSchedule) => direction === 'arrival' ? schedule.arrivalAt : schedule.departureAt;
    const filteredSchedules = schedules.filter((schedule) => matchesPeriod(relevantTime(schedule), period));

    return (
      <div className="schedule-results">
        <div className="schedule-results-heading">
          <strong>{direction === 'arrival' ? '대전 도착 열차' : '대전 출발 열차'}</strong>
          <span>{schedules.length}편</span>
        </div>
        {schedules.length > 0 && (
          <div className="schedule-periods" role="group" aria-label={direction === 'arrival' ? '대전 도착 시간대 필터' : '대전 출발 시간대 필터'}>
            {schedulePeriods.map((item) => {
              const count = item.value === 'all'
                ? schedules.length
                : schedules.filter((schedule) => matchesPeriod(relevantTime(schedule), item.value)).length;
              return (
                <button
                  className={'schedule-period' + (period === item.value ? ' is-active' : '')}
                  type="button"
                  key={item.value}
                  aria-pressed={period === item.value}
                  disabled={count === 0}
                  onClick={() => onPeriodChange(item.value)}
                >
                  <span>{item.label}</span><small>{count}</small>
                </button>
              );
            })}
          </div>
        )}
        {filteredSchedules.length ? (
          <div className="schedule-list" role="region" aria-label={direction === 'arrival' ? '대전 도착 열차 목록' : '대전 출발 열차 목록'} tabIndex={0}>
            {filteredSchedules.map((schedule, index) => {
              const active = selected?.trainNumber === schedule.trainNumber && selected?.departureAt === schedule.departureAt;
              return (
                <button
                  className={'schedule-option' + (active ? ' is-selected' : '')}
                  type="button"
                  aria-pressed={active}
                  key={schedule.trainNumber + schedule.departureAt + index}
                  onClick={() => choose(direction, schedule)}
                >
                  <span className="train-badge" title={schedule.trainType}>{formatTrainType(schedule.trainType)}<small>{schedule.trainNumber}호</small></span>
                  <span className="train-route"><strong>{formatTime(schedule.departureAt)}</strong><span>{schedule.departureStation}<i />{schedule.arrivalStation}</span><strong>{formatTime(schedule.arrivalAt)}</strong></span>
                  <span className="select-label">{active ? '선택됨' : '선택'}</span>
                </button>
              );
            })}
          </div>
        ) : (
        <p className="schedule-period-empty">
          {schedules.length > 0
              ? '이 시간대에는 열차가 없어요. 다른 시간대를 선택해 보세요.'
              : `선택한 대전 ${direction === 'arrival' ? '도착역' : '출발역'}에 운행하는 열차가 없어요. 다른 역이나 날짜로 다시 조회해 보세요.`}
          </p>
        )}
      </div>
    );
  }

  return (
    <section className="form-section transport-section">
      <div className="form-heading"><b>01</b><div><h2>왕복 교통편</h2><p>시간표 조회는 운행 정보만 제공합니다. 잔여 좌석 확인과 승차권 예매는 지원하지 않아요.</p></div></div>
      {citiesLoading && <p className="inline-note">열차 역 목록을 불러오는 중이에요.</p>}
      {citiesError && <p className="inline-warning" role="status">{citiesError} 교통편은 직접 입력할 수 있어요.</p>}
      <div className="transport-grid">
        <TransportCard
          title="대전 도착"
          direction="arrival" cities={originCities} daejeonCities={daejeonCities}
          stations={originStations} daejeonStations={daejeonStations} stationsLoading={citiesLoading}
          station={arrivalDeparture} daejeonStation={arrivalDaejeonStation}
          onStationChange={(selection) => changeStation('arrival', selection)}
          onDaejeonStationChange={(selection, station) => changeDaejeonStation('arrival', selection, station)}
          date={outboundDate} onDateChange={(date) => changeDate('arrival', date)}
          loading={arrivalLoading} onSearch={() => void search('arrival')} error={arrivalError}
          schedules={options('arrival', arrivalSchedules, arrivalSelected, arrivalPeriod, setArrivalPeriod)}
          scheduleDialogOpen={openSchedule === 'arrival'} onCloseScheduleDialog={() => setOpenSchedule(null)}
          selected={arrivalSelected}
          placeLabel="대전 도착 장소" timeLabel="대전 도착 시각"
          place={value.arrivalPlace} time={timeValue(value.arrivalAt)}
          onPlaceChange={(arrivalPlace) => onChange({ ...value, arrivalPlace, arrivalTrain: null })}
          onTimeChange={(time) => onChange({ ...value, arrivalAt: combineDateAndTime(outboundDate, time), arrivalTrain: null })}
        />
        <TransportCard
          title="대전 출발"
          direction="return" cities={originCities} daejeonCities={daejeonCities}
          stations={originStations} daejeonStations={daejeonStations} stationsLoading={citiesLoading}
          station={returnDestination} daejeonStation={returnDaejeonStation}
          onStationChange={(selection) => changeStation('return', selection)}
          onDaejeonStationChange={(selection, station) => changeDaejeonStation('return', selection, station)}
          date={returnDate} onDateChange={(date) => changeDate('return', date)}
          loading={returnLoading} onSearch={() => void search('return')} error={returnError}
          schedules={options('return', returnSchedules, returnSelected, returnPeriod, setReturnPeriod)}
          scheduleDialogOpen={openSchedule === 'return'} onCloseScheduleDialog={() => setOpenSchedule(null)}
          selected={returnSelected}
          placeLabel="대전 출발 장소" timeLabel="대전 출발 시각"
          place={value.departurePlace} time={timeValue(value.departureAt)}
          onPlaceChange={(departurePlace) => onChange({ ...value, departurePlace, returnTrain: null })}
          onTimeChange={(time) => onChange({ ...value, departureAt: combineDateAndTime(returnDate, time), returnTrain: null })}
        />
      </div>
    </section>
  );
}
