import type { CoursePlace } from './types';

export const initialCourse: CoursePlace[] = [
  { id: 'daejeon-station', name: '대전역', address: '대전 동구 중앙로 215', description: 'KTX 205 · 09:37 도착', kind: 'station', category: '이동', stayMinutes: 10, travelMinutes: 8, position: { x: 58, y: 61 }, locked: true },
  { id: 'sungsimdang', name: '성심당 본점', address: '대전 중구 대종로480번길 15', description: '대전 대표 빵집에서 간단한 아침', kind: 'food', category: '먹을 곳', stayMinutes: 50, travelMinutes: 12, position: { x: 48, y: 55 } },
  { id: 'soje-dong', name: '소제동 카페거리', address: '대전 동구 소제동', description: '골목을 걷고 카페에서 쉬어가기', kind: 'cafe', category: '카페', stayMinutes: 70, travelMinutes: 22, position: { x: 63, y: 43 } },
  { id: 'hanbat-arboretum', name: '한밭수목원', address: '대전 서구 둔산대로 169', description: '도심 속 수목원 산책', kind: 'tour', category: '관광명소', stayMinutes: 80, travelMinutes: 18, position: { x: 38, y: 32 } },
  { id: 'ballpark', name: '한화생명 볼파크', address: '대전 중구 대종로 373', description: '한화 vs 두산 · 17:00 경기 시작', kind: 'stadium', category: '관광명소', stayMinutes: 210, travelMinutes: 0, position: { x: 45, y: 71 }, locked: true },
];

export const placeCandidates: CoursePlace[] = [
  { id: 'daejeon-modern-history', name: '대전근현대사전시관', address: '대전 중구 중앙로 101', description: '옛 충남도청사에서 만나는 대전의 역사', kind: 'tour', category: '문화시설', stayMinutes: 60, travelMinutes: 14, position: { x: 43, y: 51 } },
  { id: 'euneungjeongi', name: '으능정이 문화의거리', address: '대전 중구 은행동', description: '중앙로를 따라 이어지는 도심 산책길', kind: 'tour', category: '관광명소', stayMinutes: 45, travelMinutes: 10, position: { x: 50, y: 49 } },
  { id: 'daejeon-art-center', name: '대전예술의전당', address: '대전 서구 둔산대로 135', description: '한밭수목원 옆 공연·전시 공간', kind: 'tour', category: '문화시설', stayMinutes: 70, travelMinutes: 17, position: { x: 34, y: 29 } },
  { id: 'jinsuroo', name: '진로집', address: '대전 중구 중교로 45-5', description: '두부두루치기로 유명한 대전 노포', kind: 'food', category: '먹을 곳', stayMinutes: 55, travelMinutes: 11, position: { x: 47, y: 57 } },
  { id: 'coffee-interview', name: '커피인터뷰', address: '대전 유성구 한밭대로371번길 25-3', description: '정원이 있는 로스터리 카페', kind: 'cafe', category: '카페', stayMinutes: 60, travelMinutes: 24, position: { x: 23, y: 37 } },
];
