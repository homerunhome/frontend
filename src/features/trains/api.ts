import { request } from '../../api/http';

export type TrainCity = { cityCode: string; cityName: string };
export type TrainStation = { stationId: string; stationName: string; cityCode: string };
export type TrainSchedule = {
  trainNumber: string;
  trainType: string;
  departureStation: string;
  departureAt: string;
  arrivalStation: string;
  arrivalAt: string;
};

export function getTrainCities(): Promise<TrainCity[]> {
  return request<TrainCity[]>('/api/trains/cities');
}

export function getTrainStations(cityCode: string): Promise<TrainStation[]> {
  const query = new URLSearchParams({ cityCode });
  return request<TrainStation[]>('/api/trains/stations?' + query.toString());
}

export function getKtxSchedules(departureStationId: string, arrivalStationId: string, date: string): Promise<TrainSchedule[]> {
  const query = new URLSearchParams({ departureStationId, arrivalStationId, date });
  return request<TrainSchedule[]>('/api/trains/ktx?' + query.toString());
}
