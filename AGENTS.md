# React 프로젝트 개발 규칙

이 저장소는 React 19, TypeScript 6, Vite 8을 사용하는 단독 프론트엔드 프로젝트입니다. 작업 원칙과 화면·기능 구현 원칙은 이 문서에서 관리합니다.

## 작업 원칙

- 작업 전에 이 문서와 관련 Skill을 확인합니다.
- 기능·구조 변경 전 구현 방향, 변경 범위, 제외 범위를 공유하고 승인을 받습니다.
- 요청하지 않은 기능, 리팩터링, 추상화를 추가하지 않습니다.
- 불필요한 전역 상태나 재사용을 위한 과도한 공통화를 만들지 않습니다.
- 민감정보, API 키, 개인정보를 코드·로그·응답·커밋에 남기지 않습니다.
- 커밋 메시지는 `.codex/commit-convention.md` 형식을 따릅니다.
- `main`, `dev`에 직접 커밋하거나 강제 푸시하지 않습니다.

## 프론트엔드 원칙

- 화면, 기능 로직, 공통 컴포넌트의 책임을 분명히 합니다.
- 서버 데이터와 화면 상태를 구분하고, API 타입은 명세에 맞춥니다.
- 로딩, 빈 결과, 오류 상태와 기본적인 반응형·접근성을 고려합니다.
- 사용자 입력을 검증하고 오류 상황을 명확히 처리합니다.
- 현재 프로젝트에 없는 라이브러리나 검사 도구를 작업 범위 밖에서 추가하지 않습니다.

## 작업 절차

- 기능 구현: `.agents/skills/frontend-feature/SKILL.md`
- 코드 리뷰: `.agents/skills/code-review/SKILL.md`
- CI 실패 분석: `.agents/skills/ci-failure-analysis/SKILL.md`

## 검증 명령

- 로컬 타입 검사: `npm run typecheck`
- PR 전 프로덕션 빌드: `npm run build`

## 로컬 Git Hook

`.githooks/`의 검사를 사용하려면 저장소에서 최초 1회 실행합니다.

```bash
./scripts/install-hooks.sh
```
