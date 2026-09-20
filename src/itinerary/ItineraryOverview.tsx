import { useEffect } from 'react';
import { initialCourse } from '../course-edit/mockData';

export function ItineraryOverview() {
  useEffect(() => {
    document.title = '대전 야구 원정 | 홈런홈';
  }, []);

  return (
    <div className="overview-page">
      <header className="overview-header">
        <a className="brand" href="/" aria-label="홈런홈 홈">HOMERUN HOME</a>
        <nav aria-label="주요 메뉴">
          <a href="#schedule">내 원정</a>
          <a href="#games">경기 찾기</a>
        </nav>
      </header>

      <main className="overview-main" id="schedule">
        <div className="overview-title">
          <div>
            <span>다가오는 원정</span>
            <h1>대전 야구 원정</h1>
            <p>2026년 9월 20일 일요일 · 한화생명 볼파크</p>
          </div>
          <a className="button button--primary overview-edit" href="/course/edit" target="_blank" rel="noopener noreferrer">
            코스 수정
          </a>
        </div>

        <section className="overview-grid" aria-label="원정 일정 요약">
          <article className="journey-card">
            <div className="journey-card__top">
              <span>KTX 왕복</span>
              <strong>서울 ↔ 대전</strong>
            </div>
            <div className="train-route">
              <div><small>출발</small><strong>08:34</strong><span>서울역</span></div>
              <div className="train-route__line"><span>KTX 205</span></div>
              <div><small>도착</small><strong>09:37</strong><span>대전역</span></div>
            </div>
            <div className="journey-card__return">돌아오는 열차 · 대전역 22:06 출발</div>
          </article>

          <article className="game-card">
            <span className="game-card__league">2026 KBO 정규시즌</span>
            <div className="game-matchup">
              <div><b>한화</b><span>HOME</span></div>
              <strong>17:00</strong>
              <div><b>두산</b><span>AWAY</span></div>
            </div>
            <p>대전 한화생명 볼파크</p>
          </article>
        </section>

        <section className="overview-course" aria-labelledby="course-title">
          <div className="overview-section-heading">
            <div><h2 id="course-title">오늘의 코스</h2><p>경기 전 대전에서 들를 장소를 확인하세요.</p></div>
            <a className="button button--secondary" href="/course/edit" target="_blank" rel="noopener noreferrer">수정</a>
          </div>
          <ol className="overview-course-list">
            {initialCourse.map((place, index) => (
              <li key={place.id}>
                <span>{index + 1}</span>
                <div><strong>{place.name}</strong><small>{place.description}</small></div>
                <time>{place.stayMinutes}분</time>
              </li>
            ))}
          </ol>
        </section>
      </main>
    </div>
  );
}
