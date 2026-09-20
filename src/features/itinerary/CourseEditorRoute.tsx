import { useEffect, useState } from 'react';
import { ItineraryDetail } from './ItineraryDetail';
import { getItinerary } from './api';
import type { Itinerary } from './api';

type Props = {
  itineraryId: number;
  initialEditing?: boolean;
};

function closeEditor() {
  window.close();
  window.setTimeout(() => window.location.assign('/'), 100);
}

function ItineraryRoute({ itineraryId, initialEditing = false }: Props) {
  const [itinerary, setItinerary] = useState<Itinerary | null>(null);
  const [error, setError] = useState('');
  const [requestKey, setRequestKey] = useState(0);

  useEffect(() => {
    let active = true;
    setError('');
    getItinerary(itineraryId)
      .then((result) => {
        if (!active) return;
        setItinerary(result);
        document.title = `${initialEditing ? '코스 수정' : `${result.stadium} 원정`} | 홈런홈`;
      })
      .catch((requestError: unknown) => {
        if (active) setError(requestError instanceof Error ? requestError.message : '일정을 불러오지 못했습니다.');
      });
    return () => { active = false; };
  }, [initialEditing, itineraryId, requestKey]);

  if (error) {
    return (
      <main className="page-state">
        <strong>일정을 불러오지 못했습니다.</strong>
        <p>{error}</p>
        <button className="button button-primary" type="button" onClick={() => setRequestKey((key) => key + 1)}>다시 시도</button>
      </main>
    );
  }

  if (!itinerary) return <main className="page-state"><strong>일정을 불러오는 중입니다.</strong></main>;

  const leavePage = initialEditing ? closeEditor : () => window.location.assign('/');

  return (
    <div className="app-shell app-shell-detail">
      <header className="site-header">
        <button className="brand" type="button" onClick={leavePage} aria-label={initialEditing ? '코스 수정 창 닫기' : '경기 일정으로 이동'}>
          <span className="brand-name">HOMERUN<span>HOME</span></span>
        </button>
        <nav aria-label={initialEditing ? '코스 수정 메뉴' : '일정 상세 메뉴'}>
          <button className="nav-link" type="button" onClick={leavePage}>{initialEditing ? '편집 창 닫기' : '경기 일정'}</button>
        </nav>
      </header>
      <main className="page-content">
        <ItineraryDetail
          itinerary={itinerary}
          isSaved
          initialEditing={initialEditing}
          onBack={leavePage}
          onUpdated={setItinerary}
          onSaved={initialEditing ? closeEditor : undefined}
        />
      </main>
    </div>
  );
}

export function CourseEditorRoute({ itineraryId }: Props) {
  return <ItineraryRoute itineraryId={itineraryId} initialEditing />;
}

export function ItineraryDetailRoute({ itineraryId }: Props) {
  return <ItineraryRoute itineraryId={itineraryId} />;
}
