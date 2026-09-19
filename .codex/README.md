# 프로젝트 하네스

| 구성 | 위치 | 역할 |
| --- | --- | --- |
| Rule | `AGENTS.md` | 공통·프론트엔드 개발 원칙 |
| Hook | `.githooks/` | 커밋 전 기본 안전 검사와 타입 검사 |
| Skill | `.agents/skills/` | 기능 구현, 리뷰, CI 분석 절차 |
| Template | `.github/`, `.codex/` | 이슈·PR·커밋 형식 통일 |

## 검증 수준

- 커밋 메시지, 보호 브랜치, 민감정보·충돌 마커·대용량 파일은 로컬 Hook에서 확인합니다.
- 소스·설정 변경은 커밋 전 `npm run typecheck`로 확인합니다.
- PR 전에는 `npm run build`로 프로덕션 빌드를 확인합니다.
- 원격 브랜치 보호와 강제 푸시 제한은 GitHub 저장소 설정에서 관리합니다.

## 시작

```bash
./scripts/install-hooks.sh
```
