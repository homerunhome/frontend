import { request } from '../../api/http';

export type Game = {
  gameId: string;
  city: string;
  gameDate: string;
  gameStartTime: string;
  stadium: string;
  homeTeam: string;
  awayTeam: string;
};

export function getGames(): Promise<Game[]> {
  return request<Game[]>('/api/games');
}
