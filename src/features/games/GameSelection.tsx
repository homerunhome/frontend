import { useEffect, useState } from 'react';
import { getGames } from './api';
import type { Game } from './api';

type Props = { onSelect: (game: Game) => void };

function shortDate(value: string): string {
  const parts = value.split('-');
  return parts.length === 3 ? parts[1] + '월 ' + parts[2] + '일' : value;
}

function formatTime(value: string): string {
  return value.slice(0, 5);
}

export function GameSelection({ onSelect }: Props) {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function loadGames() {
    setLoading(true);
    setError('');
    try {
      setGames(await getGames());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '경기 목록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadGames();
  }, []);

  return (
    <>
      <section className="hero">
        <div>
          <span className="eyebrow">YOUR AWAY-GAME DAY, PLANNED</span>
          <h1>야구 보러 가는 날,<br /><em>대전의 하루</em>를 계획해요.</h1>
          <p>경기를 고르면 교통편부터 취향에 맞는 코스까지 한 번에 정리할 수 있어요.</p>
          <span className="hero-note"><i /> 경기 일정을 선택해 원정 계획 시작하기</span>
        </div>
        <div className="hero-ball" aria-hidden="true"><span>PLAY<br />BALL</span></div>
        <span className="hero-index" aria-hidden="true">01 / AWAY DAY</span>
      </section>

      <section className="content-section" aria-labelledby="games-heading">
        <div className="section-heading">
          <div><span className="eyebrow">CHOOSE YOUR GAME</span><h2 id="games-heading">어떤 경기를 보러 갈까요?</h2></div>
          <p>경기 선택 후 교통편과 일정을 입력할 수 있어요.</p>
        </div>
        {loading && <div className="state-panel" role="status"><span className="spinner" /> 경기 일정을 불러오고 있어요.</div>}
        {!loading && error && (
          <div className="state-panel state-error" role="alert">
            <div><strong>경기 목록을 불러오지 못했어요.</strong><p>{error}</p></div>
            <button className="button button-secondary" type="button" onClick={() => void loadGames()}>다시 시도</button>
          </div>
        )}
        {!loading && !error && games.length === 0 && (
          <div className="state-panel"><div><strong>등록된 경기가 아직 없어요.</strong><p>백엔드 DB에 경기를 추가하면 이곳에서 선택할 수 있습니다.</p></div></div>
        )}
        {!loading && !error && games.length > 0 && (
          <div className="game-grid">
            {games.map((game) => (
              <button className="game-card" key={game.gameId} type="button" onClick={() => onSelect(game)}>
                <span className="game-date"><span>{shortDate(game.gameDate)}</span><strong>{formatTime(game.gameStartTime)}</strong></span>
                <span className="game-info">
                  <span className="game-meta">{game.city} · {game.stadium}</span>
                  <span className="team-line"><strong>{game.homeTeam}</strong><small>VS</small><strong>{game.awayTeam}</strong></span>
                  <span className="game-action">이 경기로 일정 만들기 <b>↗</b></span>
                </span>
                <span className="game-arrow" aria-hidden="true">→</span>
              </button>
            ))}
          </div>
        )}
      </section>
      <section className="how-section" aria-label="일정 계획 순서">
        <div><span className="eyebrow">SIMPLE AS 1-2-3</span><strong>원정 준비도 경기처럼 간단하게</strong></div>
        <div className="how-steps"><span><b>01</b> 경기 선택</span><span><b>02</b> 교통편 입력</span><span><b>03</b> 하루 일정 저장</span></div>
      </section>
    </>
  );
}
