import { useEffect, useState } from 'react';
import { GameSelection } from '../features/games/GameSelection';
import type { Game } from '../features/games/api';
import { ItineraryDetail } from '../features/itinerary/ItineraryDetail';
import { CourseEditorRoute, ItineraryDetailRoute } from '../features/itinerary/CourseEditorRoute';
import { ItineraryPlanner } from '../features/itinerary/ItineraryPlanner';
import { SavedItineraries } from '../features/itinerary/SavedItineraries';
import { getItinerary } from '../features/itinerary/api';
import type { Itinerary } from '../features/itinerary/api';
import { loadItineraryIds, rememberItineraryId } from '../features/itinerary/storage';

type Screen = 'games' | 'planner' | 'saved' | 'detail';

function MainApp() {
  const [screen, setScreen] = useState<Screen>('games');
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [itinerary, setItinerary] = useState<Itinerary | null>(null);
  const [savedIds, setSavedIds] = useState<number[]>(loadItineraryIds);
  const [savedGameDates, setSavedGameDates] = useState<string[]>([]);
  const [detailFromSaved, setDetailFromSaved] = useState(false);

  useEffect(() => {
    if (savedIds.length === 0) {
      setSavedGameDates([]);
      return;
    }

    let active = true;
    Promise.all(savedIds.map((id) => getItinerary(id).catch(() => null)))
      .then((result) => {
        if (!active) return;
        const dates = result
          .filter((item): item is Itinerary => item !== null)
          .map((item) => item.gameDate);
        setSavedGameDates([...new Set(dates)]);
      });

    return () => { active = false; };
  }, [savedIds]);

  useEffect(() => {
    if (screen !== 'detail' || !itinerary) return;
    const refresh = () => {
      void getItinerary(itinerary.id).then(setItinerary).catch(() => undefined);
    };
    window.addEventListener('focus', refresh);
    return () => window.removeEventListener('focus', refresh);
  }, [itinerary?.id, screen]);

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
    <div className={screen === 'detail' ? 'app-shell app-shell-detail' : 'app-shell'}>
      <header className="site-header">
        <button className="brand" type="button" onClick={() => setScreen('games')} aria-label="홈런홈 경기 선택 화면">
          <span className="brand-name">HOMERUN<span>HOME</span></span>
        </button>
        <nav aria-label="주요 메뉴">
          <button className={screen === 'games' || screen === 'planner' ? 'nav-link is-active' : 'nav-link'} type="button" onClick={() => setScreen('games')}>경기 일정</button>
          <button className={screen === 'saved' || (screen === 'detail' && detailFromSaved) ? 'nav-link is-active' : 'nav-link'} type="button" onClick={() => setScreen('saved')}>내 원정 기록 <span className="nav-count">{savedIds.length}</span></button>
        </nav>
      </header>
      <main className="page-content">
        {screen === 'games' && <GameSelection savedGameDates={savedGameDates} onSelect={(game) => { setSelectedGame(game); setScreen('planner'); }} />}
        {screen === 'planner' && selectedGame && <ItineraryPlanner key={selectedGame.gameId} game={selectedGame} onCancel={() => setScreen('games')} onSaved={handleSaved} />}
        {screen === 'saved' && <SavedItineraries ids={savedIds} onSelect={handleSavedSelection} onBrowseGames={() => setScreen('games')} />}
        {screen === 'detail' && itinerary && <ItineraryDetail itinerary={itinerary} isSaved={detailFromSaved} onBack={() => setScreen(detailFromSaved ? 'saved' : 'games')} onUpdated={setItinerary} />}
      </main>
      <footer className="site-footer"><span>경기장에서 시작되는 대전의 하루</span><span>YOUR GAME. YOUR DAY.</span></footer>
    </div>
  );
}

export default function App() {
  const editorMatch = window.location.pathname.match(/^\/itineraries\/(\d+)\/course\/edit\/?$/);
  if (editorMatch?.[1]) return <CourseEditorRoute itineraryId={Number(editorMatch[1])} />;
  const detailMatch = window.location.pathname.match(/^\/itineraries\/(\d+)\/?$/);
  if (detailMatch?.[1]) return <ItineraryDetailRoute itineraryId={Number(detailMatch[1])} />;
  return <MainApp />;
}
