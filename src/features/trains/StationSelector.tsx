import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { TrainCity, TrainStation } from './api';

export type StationSelection = {
  cityCode: string;
  stationId: string;
};

type Props = {
  label: string;
  cities: TrainCity[];
  stations: TrainStation[];
  loading: boolean;
  value: StationSelection;
  onChange: (value: StationSelection, station?: TrainStation) => void;
  preferredStationName?: string;
};

const popularCityPatterns = [/서울/, /경기/, /부산/, /인천/, /대구/, /광주/, /울산/, /강원/];

export function StationSelector({ label, cities, stations, loading, value, onChange, preferredStationName }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const headingId = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const popularCities = useMemo(() => cities.filter((city) => !city.cityName.includes('대전'))
    .sort((first, second) => {
      const firstRank = popularCityPatterns.findIndex((pattern) => pattern.test(first.cityName));
      const secondRank = popularCityPatterns.findIndex((pattern) => pattern.test(second.cityName));
      return (firstRank < 0 ? popularCityPatterns.length : firstRank) - (secondRank < 0 ? popularCityPatterns.length : secondRank)
        || first.cityName.localeCompare(second.cityName, 'ko');
    })
    .slice(0, 6), [cities]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    if (loading || !stations.length || value.stationId || !preferredStationName) return;
    const preferred = stations.find((station) => station.stationName === preferredStationName) ?? stations[0];
    onChange({ cityCode: preferred.cityCode, stationId: preferred.stationId }, preferred);
  }, [loading, onChange, preferredStationName, stations, value.stationId]);

  const selected = stations.find((station) => station.cityCode === value.cityCode && station.stationId === value.stationId);
  const visibleStations = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return stations
      .filter((station) => {
        const cityName = cities.find((city) => city.cityCode === station.cityCode)?.cityName ?? '';
        return !normalizedQuery || `${station.stationName} ${cityName}`.toLocaleLowerCase().includes(normalizedQuery);
      })
      .sort((first, second) => {
        const firstCity = cities.find((city) => city.cityCode === first.cityCode)?.cityName ?? '';
        const secondCity = cities.find((city) => city.cityCode === second.cityCode)?.cityName ?? '';
        const firstRank = popularCities.findIndex((city) => city.cityCode === first.cityCode);
        const secondRank = popularCities.findIndex((city) => city.cityCode === second.cityCode);
        return (firstRank < 0 ? popularCities.length : firstRank) - (secondRank < 0 ? popularCities.length : secondRank)
          || firstCity.localeCompare(secondCity, 'ko')
          || first.stationName.localeCompare(second.stationName, 'ko');
      });
  }, [cities, popularCities, query, stations]);
  const stationGroups = useMemo(() => {
    const groups = new Map<string, { cityName: string; stations: TrainStation[] }>();
    visibleStations.forEach((station) => {
      const cityName = cities.find((city) => city.cityCode === station.cityCode)?.cityName ?? '';
      const group = groups.get(station.cityCode) ?? { cityName, stations: [] };
      group.stations.push(station);
      groups.set(station.cityCode, group);
    });
    return [...groups.entries()].map(([cityCode, group]) => ({ cityCode, ...group }))
      .sort((first, second) => {
        const firstRank = popularCities.findIndex((city) => city.cityCode === first.cityCode);
        const secondRank = popularCities.findIndex((city) => city.cityCode === second.cityCode);
        return (firstRank < 0 ? popularCities.length : firstRank) - (secondRank < 0 ? popularCities.length : secondRank)
          || first.cityName.localeCompare(second.cityName, 'ko');
      });
  }, [cities, popularCities, visibleStations]);

  function chooseStation(station: TrainStation) {
    onChange({ cityCode: station.cityCode, stationId: station.stationId }, station);
    setOpen(false);
    setQuery('');
  }

  function openPicker() {
    setQuery('');
    setOpen(true);
  }

  return (
    <div className="station-point">
      <strong>{label}</strong>
      <button className="station-select-trigger" type="button" aria-haspopup="dialog" aria-expanded={open} disabled={loading} onClick={openPicker}>
        <span className={selected ? '' : 'is-placeholder'}>{selected?.stationName ?? (loading ? '역 목록 불러오는 중' : '역을 선택해 주세요')}</span>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.3" /><path d="m15.5 15.5 4.2 4.2" /></svg>
      </button>
      <dialog
        ref={dialogRef}
        className="station-picker-dialog"
        aria-labelledby={headingId}
        onClose={() => setOpen(false)}
        onCancel={() => setOpen(false)}
        onClick={(event) => { if (event.target === event.currentTarget) setOpen(false); }}
      >
        <div className="station-picker-dialog-content">
          <div className="station-picker-dialog-heading">
            <h4 id={headingId}>{label} 선택</h4>
            <button className="schedule-dialog-close" type="button" aria-label="역 선택 창 닫기" onClick={() => setOpen(false)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8"><path d="m6 6 12 12M18 6 6 18" /></svg>
            </button>
          </div>
          <label className="station-search-field">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.3" /><path d="m15.5 15.5 4.2 4.2" /></svg>
            <input type="search" autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="도시 또는 역 이름 검색" aria-label="도시 또는 역 이름 검색" />
          </label>
          {!query.trim() && popularCities.length > 0 && (
            <div className="station-popular-cities">
              <span>주요 지역</span>
              <div className="station-popular-city-buttons" role="group" aria-label="주요 지역">
                {popularCities.map((city) => (
                  <button className="station-popular-city-button" type="button" key={city.cityCode} onClick={() => setQuery(city.cityName)}>{city.cityName}</button>
                ))}
              </div>
            </div>
          )}
          <div className="station-options" role="group" aria-label={`${label} 목록`}>
            {stationGroups.map((group) => (
              <section className="station-city-group" key={group.cityCode} aria-labelledby={`${headingId}-${group.cityCode}`}>
                <h5 id={`${headingId}-${group.cityCode}`}>{group.cityName}</h5>
                <div className="station-city-stations">
                  {group.stations.map((station) => (
                    <button
                      className="station-option"
                      type="button"
                      key={`${station.cityCode}-${station.stationId}`}
                      aria-pressed={selected?.cityCode === station.cityCode && selected.stationId === station.stationId}
                      onClick={() => chooseStation(station)}
                    >
                      <strong>{station.stationName}</strong>
                      <span>{selected?.cityCode === station.cityCode && selected.stationId === station.stationId ? '선택됨' : ''}</span>
                    </button>
                  ))}
                </div>
              </section>
            ))}
            {!stationGroups.length && <p className="station-search-empty" role="status">{query.trim() ? '검색한 역이 없어요. 역 이름을 다시 확인해 주세요.' : '선택할 수 있는 역이 없어요.'}</p>}
          </div>
        </div>
      </dialog>
    </div>
  );
}
