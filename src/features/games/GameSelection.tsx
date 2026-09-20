import { useEffect, useState } from 'react';
import { getGames } from './api';
import type { Game } from './api';

type Props = { savedGameDates: string[]; onSelect: (game: Game) => void };

const weekdays = ['일', '월', '화', '수', '목', '금', '토'];

function dateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseDate(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function formatTime(value: string): string {
  return value.slice(0, 5);
}

function formatSelectedDate(value: string): string {
  return new Intl.DateTimeFormat('ko-KR', {
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  }).format(parseDate(value));
}

function BaseballIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={`baseball-icon ${className}`.trim()} viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="11.5" />
      <path d="M6 4c2.8 3 2.8 13 0 16M18 4c-2.8 3-2.8 13 0 16" />
    </svg>
  );
}

export function GameSelection({ savedGameDates, onSelect }: Props) {
  const [games, setGames] = useState<Game[]>([]);
  const [visibleMonth, setVisibleMonth] = useState(() => startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function loadGames() {
    setLoading(true);
    setError('');
    try {
      const result = await getGames();
      const sortedGames = [...result].sort((a, b) =>
        `${a.gameDate}T${a.gameStartTime}`.localeCompare(`${b.gameDate}T${b.gameStartTime}`),
      );
      setGames(sortedGames);

      if (sortedGames.length > 0) {
        const today = dateKey(new Date());
        const initialGame = sortedGames.find((game) => game.gameDate >= today)
          ?? sortedGames[sortedGames.length - 1];
        setVisibleMonth(startOfMonth(parseDate(initialGame.gameDate)));
        setSelectedDate(initialGame.gameDate);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '경기 목록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadGames();
  }, []);

  const gamesByDate = new Map<string, Game[]>();
  for (const game of games) {
    const gamesOnDate = gamesByDate.get(game.gameDate) ?? [];
    gamesOnDate.push(game);
    gamesByDate.set(game.gameDate, gamesOnDate);
  }

  const year = visibleMonth.getFullYear();
  const month = visibleMonth.getMonth();
  const monthLabel = new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'long',
  }).format(visibleMonth);
  const offset = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cellCount = Math.ceil((offset + daysInMonth) / 7) * 7;
  const calendarCells = Array.from({ length: cellCount }, (_, index) => {
    const day = index - offset + 1;
    return day > 0 && day <= daysInMonth ? day : null;
  });
  const selectedGames = selectedDate ? gamesByDate.get(selectedDate) ?? [] : [];
  const todayKey = dateKey(new Date());

  function changeMonth(amount: number) {
    setVisibleMonth(new Date(year, month + amount, 1));
    setSelectedDate(null);
  }

  return (
    <>
      <section className="calendar-intro" aria-labelledby="games-heading">
        <h1 id="games-heading">경기 있는 날을 골라볼까요?</h1>
        <p>경기 날짜를 선택하고, 그날의 원정 일정을 등록해 보세요.</p>
      </section>

      {loading && <div className="state-panel" role="status"><span className="spinner" /> 경기 일정을 불러오고 있어요.</div>}
      {!loading && error && (
        <div className="state-panel state-error" role="alert">
          <div><strong>경기 목록을 불러오지 못했어요.</strong><p>{error}</p></div>
          <button className="button button-secondary" type="button" onClick={() => void loadGames()}>다시 시도</button>
        </div>
      )}
      {!loading && !error && (
        <section className="calendar-layout" aria-label="경기 날짜 선택">
          <div className="calendar-panel">
            <div className="calendar-toolbar">
              <div>
                <h2 aria-live="polite">{monthLabel}</h2>
              </div>
              <div className="calendar-controls" aria-label="달력 월 이동">
                <button type="button" onClick={() => changeMonth(-1)} aria-label="이전 달">
                  <svg viewBox="0 0 20 20" aria-hidden="true"><path d="m12 4-6 6 6 6" /></svg>
                </button>
                <button type="button" onClick={() => changeMonth(1)} aria-label="다음 달">
                  <svg viewBox="0 0 20 20" aria-hidden="true"><path d="m8 4 6 6-6 6" /></svg>
                </button>
              </div>
            </div>

            <div className="calendar-grid" role="group" aria-label={`${monthLabel} 경기 일정`}>
              {weekdays.map((weekday) => (
                <span className="calendar-weekday" key={weekday}>{weekday}</span>
              ))}
              {calendarCells.map((day, index) => {
                if (day === null) {
                  return <span className="calendar-empty" aria-hidden="true" key={`empty-${index}`} />;
                }

                const key = dateKey(new Date(year, month, day));
                const dayGames = gamesByDate.get(key) ?? [];
                const hasSavedItinerary = savedGameDates.includes(key);
                const classes = [
                  'calendar-day',
                  dayGames.length > 0 ? 'has-game' : '',
                  hasSavedItinerary ? 'has-itinerary' : '',
                  selectedDate === key ? 'is-selected' : '',
                  todayKey === key ? 'is-today' : '',
                ].filter(Boolean).join(' ');

                return (
                  <button
                    className={classes}
                    type="button"
                    key={key}
                    aria-label={`${day}일${key === todayKey ? ', 오늘' : ''}${dayGames.length > 0 ? `, 경기 ${dayGames.length}개` : ', 경기 없음'}${hasSavedItinerary ? ', 내 일정 등록됨' : ''}`}
                    aria-pressed={selectedDate === key}
                    onClick={() => setSelectedDate(key)}
                  >
                    {hasSavedItinerary && <BaseballIcon className="calendar-day-baseball" />}
                    <span className="calendar-day-number">{day}</span>
                  </button>
                );
              })}
            </div>
            <div className="calendar-legend">
              <span className="calendar-legend-item"><span className="calendar-game-day-swatch" aria-hidden="true" />경기 있는 날</span>
              <span className="calendar-legend-item"><BaseballIcon />내 일정 등록일</span>
            </div>
          </div>

          <aside className="calendar-selection" aria-live="polite">
            {games.length === 0 ? (
              <div className="calendar-selection-prompt">
                <strong>등록된 경기가 아직 없어요</strong>
                <p>백엔드 DB에 일정을 추가하면 경기 날짜가 달력에 표시됩니다.</p>
              </div>
            ) : selectedDate ? (
              <>
                <div className="selection-heading">
                  <h2>{formatSelectedDate(selectedDate)}</h2>
                  <p>{selectedGames.length > 0 ? `${selectedGames.length}개의 경기가 있어요.` : '이 날은 예정된 경기가 없어요.'}</p>
                </div>
                {selectedGames.length > 0 ? (
                  <div className="calendar-game-list">
                    {selectedGames.map((game) => (
                      <button className="calendar-game-card" key={game.gameId} type="button" onClick={() => onSelect(game)}>
                        <span className="calendar-game-time">{formatTime(game.gameStartTime)}</span>
                        <span className="calendar-game-details">
                          <strong>{game.homeTeam}<small>VS</small>{game.awayTeam}</strong>
                          <span>{game.city} · {game.stadium}</span>
                          <b>이 경기로 일정 등록 <i aria-hidden="true">→</i></b>
                        </span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="calendar-no-game">
                    <p>선택한 날짜에는 등록된 경기가 없습니다.</p>
                    <p>경기 표시가 있는 날짜를 선택해 보세요.</p>
                  </div>
                )}
              </>
            ) : (
              <div className="calendar-selection-prompt">
                <strong>경기 날짜를 선택해 주세요</strong>
                <p>달력에서 표시된 날짜를 누르면 해당 경기를 볼 수 있어요.</p>
              </div>
            )}
          </aside>
        </section>
      )}
    </>
  );
}
