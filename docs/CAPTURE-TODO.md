# 촬영본 교체 목록 (2026-11 개편)

촬영 규칙·대본·마스킹은 `DESIGN-2026-11.md` 6.2절. 파일은 `assets/device/<id>.mp4` + 포스터 `assets/device/<id>.webp`.

## 교체 방법 (한 줄)

`assets/app.js` 맨 위 `CAPTURED` 에 한 줄 추가:

```js
const CAPTURED = {
  s5: ['실기기 녹화 · iPhone 15 Pro Max'],
  s9: ['맥북 사파리 녹화', 'laptop'],   // 두 번째 값 = 틀 종류(노트북으로 바꿀 때만)
};
```

그러면 `data-slot` 이 같은 틀의 화면이 그 파일로 바뀌고, 출처 칩 문구도 바뀝니다. HTML 은 손대지 않아도 됩니다.
(파일 이름 규칙만 지키면 됨. 다 바꾼 뒤 `index.html` 의 `?v=` 값 올리기)

## 자리별 현황

| ID | 자리 (`data-slot`) | 틀 | 지금 보이는 것 | 바꿀 파일 | CAPTURED 한 줄 |
|---|---|---|---|---|---|
| S1 | 게임 카드 1 · 하루 온라인 | iPhone | 빈 화면 + "녹화 준비 중" | `assets/device/s1.mp4`, `s1.webp` | `s1: ['실기기 녹화 · iPhone 15 Pro Max'],` |
| S2 | 게임 카드 2 · 하루 디펜스 | Android | **완료** — `s2.mp4`/`s2.webp` (HTML 에 직접 연결, 칩 "안드로이드 에뮬레이터 · 크롬") | — | 필요 없음 |
| S3 | 게임 카드 3 · 하루 던전 | iPhone | 빈 화면 + "녹화 준비 중" | `assets/device/s3.mp4`, `s3.webp` | `s3: ['실기기 녹화 · iPhone 15 Pro Max'],` |
| S4 | 인프라 · 하루 상태판 | iPhone | 빈 화면 + "녹화 준비 중" | `assets/device/s4.mp4`, `s4.webp` | `s4: ['실기기 녹화 · iPhone 15 Pro Max'],` |
| S5 | 서비스 · CashPulse | iPhone | 예전 `media/cashpulse-flow.mp4` (칩 "브라우저 화면 캡처 · 데모 데이터") | `assets/device/s5.mp4`, `s5.webp` | `s5: ['실기기 녹화 · iPhone 15 Pro Max'],` |
| S6 | 인프라 · 상태판 두 번째 장(잠금 화면 푸시) | — | 자리 없음 | `assets/device/s6.webp` | 칩 전환 UI 를 새로 붙여야 함(아래) |
| S7 | 서비스 · CashPulse 두 번째 장(가격 알림 푸시) | — | 자리 없음 | `assets/device/s7.webp` | 칩 전환 UI 를 새로 붙여야 함(아래) |
| S8 | 서비스 · haru-lease | iPhone | 예전 `media/lease-flow.mp4` (칩 "브라우저 화면 캡처 · 데모 데이터") | `assets/device/s8.mp4`, `s8.webp` | `s8: ['실기기 녹화 · iPhone 15 Pro Max'],` |
| S9 | 서비스 · TeamHub | 지금 iPhone → 노트북 | 예전 `media/teamhub-flow.mp4` (칩 "브라우저 화면 캡처 · 데모 데이터") | `assets/device/s9.mp4`, `s9.webp` | `s9: ['맥북 사파리 녹화', 'laptop'],` |
| S10 | (뺌) 하루 온라인 안드로이드 앱 껍데기 | — | 사용자 결정으로 표시 안 함 | — | — |
| S11 | `og:image` | — | 없음 | `assets/og.jpg` (1200×630) | `index.html` 에 `<meta property="og:image" content="https://hi.haru-hub.com/assets/og.jpg">` 한 줄 |

## 함께 바꿀 문구

- S1·S3 가 모두 들어오면 게임 섹션 부제를 명세 원문으로: "같은 통합 로그인과 배포 방식 위에서 만든 게임 3종. 아래는 실제 기기에서 녹화한 화면입니다."
- S4 가 들어오면 상태판 칩 줄에 `실기기 녹화 · iPhone 15 Pro Max` 는 틀 아래 출처 칩으로 이미 붙으므로 따로 넣지 않아도 됨.
- S6·S7(정지 화면 두 번째 장)은 기기 틀 아래 `화면 고르기` 칩 두 개(영상 / 잠금 화면 알림)로 바꾸는 작은 UI 가 필요합니다 — 성과 칸의 `[data-gallery]` 방식 재사용.
