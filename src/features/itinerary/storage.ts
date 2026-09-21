const STORAGE_KEY = 'homerunhome.itineraryIds:v1';
const MAX_SAVED_IDS = 8;

export function loadItineraryIds(): number[] {
  try {
    const value: unknown = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '[]');
    return Array.isArray(value)
      ? value.filter((id): id is number => Number.isInteger(id) && id > 0).slice(0, MAX_SAVED_IDS)
      : [];
  } catch {
    return [];
  }
}

export function rememberItineraryId(id: number): number[] {
  const next = [id, ...loadItineraryIds().filter((savedId) => savedId !== id)].slice(0, MAX_SAVED_IDS);
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // 일정 저장 자체는 성공했으므로 브라우저 기록 저장 실패가 흐름을 막지 않게 합니다.
  }
  return next;
}

export function removeItineraryId(id: number): number[] {
  const next = loadItineraryIds().filter((savedId) => savedId !== id);
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // 목록 화면에서 제거하는 동작이므로 브라우저 저장 실패가 화면 상태를 막지 않게 합니다.
  }
  return next;
}
