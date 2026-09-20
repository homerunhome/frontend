import { useState } from 'react';
import { GameSelection } from '../features/games/GameSelection';
import type { Game } from '../features/games/api';
import { ItineraryDetail } from '../features/itinerary/ItineraryDetail';
import { ItineraryPlanner } from '../features/itinerary/ItineraryPlanner';
import { SavedItineraries } from '../features/itinerary/SavedItineraries';
import type { Itinerary } from '../features/itinerary/api';
import { loadItineraryIds, rememberItineraryId } from '../features/itinerary/storage';

type Screen = 'games' | 'planner' | 'saved' | 'detail';

export default function App() {
  const [screen, setScreen] = useState<Screen>('games');
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [itinerary, setItinerary] = useState<Itinerary | null>(null);
  const [savedIds, setSavedIds] = useState<number[]>(loadItineraryIds);
  const [detailFromSaved, setDetailFromSaved] = useState(false);

  function openDetail(result: Itinerary, fromSaved: boolean) {
    setItinerary(result);
    setDetailFromSaved(fromSaved);
    setScreen('detail');
  }

  function handleSaved(result: Itinerary) {
    setSavedIds(rememberItineraryId(result.id));
    openDetail(result, false);
  }

  function handleSavedSelection(result: Itinerary) {
    openDetail(result, true);
  }

  return (
    <div className="app-shell">
      <header className="site-header">
        <button className="brand" type="button" onClick={() => setScreen('games')} aria-label="홈런홈 경기 선택 화면">
          <span className="brand-mark">H</span><span className="brand-name">HOMERUN<span>HOME</span></span>
        </button>
        <nav aria-label="주요 메뉴">
          <button className={screen === 'games' || screen === 'planner' ? 'nav-link is-active' : 'nav-link'} type="button" onClick={() => setScreen('games')}>경기 일정</button>
          <button className={screen === 'saved' || (screen === 'detail' && detailFromSaved) ? 'nav-link is-active' : 'nav-link'} type="button" onClick={() => setScreen('saved')}>내 원정 기록 <span className="nav-count">{savedIds.length}</span></button>
        </nav>
        <span className="header-caption">BASEBALL, THEN THE CITY.</span>
      </header>
      <main className="page-content">
        {screen === 'games' && <GameSelection onSelect={(game) => { setSelectedGame(game); setScreen('planner'); }} />}
        {screen === 'planner' && selectedGame && <ItineraryPlanner key={selectedGame.gameId} game={selectedGame} onCancel={() => setScreen('games')} onSaved={handleSaved} />}
        {screen === 'saved' && <SavedItineraries ids={savedIds} onSelect={handleSavedSelection} onBrowseGames={() => setScreen('games')} />}
        {screen === 'detail' && itinerary && <ItineraryDetail itinerary={itinerary} isSaved={detailFromSaved} onBack={() => setScreen(detailFromSaved ? 'saved' : 'games')} onNewPlan={() => setScreen('games')} />}
      </main>
      <footer className="site-footer"><span className="brand-name">HOMERUN<span>HOME</span></span><span>경기장에서 시작되는 대전의 하루</span><span>YOUR GAME. YOUR DAY.</span></footer>
    </div>
  );
}
