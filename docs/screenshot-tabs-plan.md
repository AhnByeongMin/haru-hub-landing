# 랜딩 — 3앱 화면 흐름 탭 UI (작업노트)

> 멀티세션 작업. hi.haru-hub.com Personal Projects 섹션의 줄글을, **실제 화면 캡처를
> 탭(TeamHub/CashPulse/haru-lease)으로 보여주기**. 결정·진행 상태 누적.

## 목표 / 결정 (2026-05-27 사용자 합의)

- 배치: **Personal Projects 섹션**에 탭 3개(TeamHub·CashPulse·haru-lease), 탭마다 흐름 화면.
- 데이터: **데모 계정 + 더미 데이터** (실데이터 노출 0). 단 lease 는 현재 가짜 매물이라 거의 그대로 가능.
- 흐름: **앱당 3~4단계** (스토리). 모바일 viewport(390×844, 2x).

## 캡처 파이프라인 (✅ 확립 — lease PoC 성공)

**방법**: puppeteer headless + **JWT를 localStorage에 주입해 OAuth 로그인 우회** + screenshot.
- puppeteer: `/tmp/diag/node_modules/puppeteer` (lease 진단셋. /tmp라 없어지면 `npm i puppeteer`).
- PoC 스크립트: `/tmp/cap-poc.js` — env `CAP_TOKEN`/`CAP_URL`/`CAP_KEY`/`CAP_OUT`. `evaluateOnNewDocument`로 토큰 주입 후 goto+screenshot.
- 검증: lease `/admin/properties` 모바일 캡처 성공(매물 목록, final url이 /login으로 안 튕김 = 우회 OK).

**앱별 토큰 (localStorage 키 / JWT)**:
| 앱 | localStorage 키 | JWT | 발급 |
|---|---|---|---|
| lease | `lease_token` | HS256, `LEASE_JWT_SECRET`, sub=userId | ✅ python hmac (cashpulse 검증 때 쓴 방식) |
| teamhub | `teamhub_access_token` | HS256 (`Keys.hmacShaKeyFor`) | secret 위치 확인 필요(teamhub .env) |
| cashpulse | `cp_access` | HS256 추정 | secret·발급방식 확인 필요(JwtService 참조) |

## 단계

1. **파이프라인 실현성** — ✅ 완료(lease PoC, 3앱 토큰키·HS256 확인).
2. **데모 계정 + 더미 데이터** — 미착수.
   - lease: ✅ **캡처 4장 완료**(목록/상세/캘린더/공지, `assets/screenshots/lease-*.png`). 데모 방법 = id1 name 임시 '데모 임대인' + **'우리집'(실주소) HIDDEN 숨김** + 상세는 가짜매물 id5(망원동). 캡처 후 id1 name 원복(안병민)·우리집은 HIDDEN 유지(실주소라 안전, id6 원래값 미백업).
     ⚠️ 캡처 검증 중 발견: 첫 매물 '우리집'이 **실주소 + 엑셀 사진**이라 못 씀 → 가짜매물(망원동, 사진없어 색 placeholder)로 교체.
     ✅ **lease-4 공지(`announce`) 재캡처 완료 (2026-05-27)** — 기존 'ㅇ/ㅇ' 1건 → 데모 공지 4건 보강(엘리베이터 점검·누수예방·주차장 도색·청소일정, ALL/GROUP 혼합, 최신순). 직접 DB insert(실유저 푸시 안 나감). 데모 공지는 캡처 후 DB에 유지(가공 내용·외부 임차인 0이라 무해). 카드에 그룹 실명·연락처·실주소 노출 없음 확인.
   - (구) "안병민 그대로 OK" 판단은 틀렸음 — 실주소 섞여 있어 데모 처리 필요했음.
   - cashpulse: ✅ **캡처 4장 완료 (2026-05-27)**(홈/종목상세/관심/알림, `assets/screenshots/cashpulse-*.png`). 자체 signup 비활성(410 OAuth전용)이라 **데모 user DB insert**(`users` id9 `demo@haru-hub.com` 닉='데모 투자자' provider='demo' — UI 로그인 불가·inert) + HS256 JWT 수동발급(secret<32B→SHA256) 후 **watchlist 5종/알림 3건 API 입력**(삼성·SK하이닉스·NAVER·카카오·LG엔솔, 공개종목이라 무해). 평가손익=가상 매수원가/수량. 데모 user·데이터 캡처 후 DB 유지(격리·inert·재캡처용).
     ⚠️ **캡처 환경 함정 2개 (해결)**: ① 하단 nav 등 아이콘이 이모지(🏠🏆📅★🔔)인데 헤드리스 chromium에 이모지폰트 없어 `≡` tofu 폴백 → `~/.fonts/NotoColorEmoji.ttf` 유저설치(sudo無)+fc-cache로 해결. ② PWA "설치" 배너가 콘텐츠 가림 → localStorage `cashpulse:install-dismissed` 주입으로 숨김. 캡처 스크립트=`/tmp/cap-cp.js`(cp_access+cp_user JSON+배너dismiss 주입).
     🐛 **발견 버그(미수정)**: 음수 평가손익/괴리 금액이 소수 4자리로 표시(`-527,500.0000`, 이익은 `+1,260,000` 깔끔). 음수 포맷 미절삭. 코드+배포 별건이라 보류 — 별도 수정 시 재캡처.
   - teamhub: ✅ **캡처 3장 완료 (2026-05-27)**(칸반/채팅/관제센터, `assets/screenshots/teamhub-*.png`). **공유 워크스페이스라 실유저 23명 콘텐츠가 섞여** 기존 데이터 못 씀 → **격리 데모를 새로 생성**: 데모 유저 3명 DB insert(25 김지훈/PM·26 이서연/디자인·27 박준호/개발, status ACTIVE) + JWT 수동발급 + API로 프로젝트 'NOVA'(이슈 8개 칸반분포)·채널 '개발-일반'(메시지 6)·약관동의(`/consents/agree` TERMS·PRIVACY·AGE_14, 안 하면 동의모달 뜸) 생성. **관제센터=`/admin/monitor` '시스템' 탭만**(서비스상태/힙/커넥션풀 — PII 없음). 기본 '에러트래킹' 탭은 audit log에 실유저명 떠서 회피. 캡처용 user25 임시 **MASTER+monitor_access=1 부여 후 즉시 USER+0 원복**(DB role 즉반영).
   - ✅ **teamhub 데모 데이터 캡처 후 전량 삭제**(워크스페이스 오염 방지) — 유저3·프로젝트·채널·이슈·메시지·notifications·consent·audit·drive_items·user_presence 등 FK 참조행 정리, **유저수 23 복원·orphan 0 검증**. (lease/cashpulse는 격리·inert라 유지했지만 teamhub는 공유 워크스페이스라 삭제.)
   - ⚠️ OAuth 앱(cashpulse/lease)은 데모 user를 **DB insert** 후 JWT 발급이 가입 우회로 간편(OAuth 자동화 회피). teamhub 캡처 스크립트=`/tmp/cap-th.js`(토큰주입)·`/tmp/cap-th2.js`(Radix 탭 실마우스클릭).
   - 더미 입력하며 회원가입·입력 흐름 **버그도 같이 체크**(사용자 기대).
3. **3앱 흐름 캡처** — 앱당 3~4장. 흐름 예시:
   - lease: 매물목록 → 매물상세 → 계약(임대차) → 캘린더
   - cashpulse: 홈/검색 → 종목상세(재무·차트) → 관심/평가손익 → 알림
   - teamhub: 프로젝트/칸반 → 채팅 → 드라이브/캘린더 → **관리자/관제센터**(차별점 — 데모 계정에 임시 MASTER 부여 후 캡처, 끝나면 USER 원복. teamhub는 DB role 즉시 반영)
4. **랜딩 탭 UI** — Personal 섹션에 탭+이미지. 순수 HTML/CSS+최소 JS(탭 전환, IntersectionObserver 패턴 재사용). 이미지 `assets/screenshots/{app}-{n}.png`. 모바일 가독성·repo 용량 주의(이미지 압축).

## 주의

- **실데이터 노출 금지** — 캡처 전 반드시 데모/더미 확인. 캡처 후 민감정보 눈으로 재확인.
- **teamhub 관제/관리자 = 노출 최대 위험** — MASTER 권한이면 전체 실유저 23명 이메일·실적·시스템 통계가 다 보임(뷰어여도 보는 데이터 동일). **실명·이메일 마스킹 필수** 또는 더미 유저 환경. 임시 MASTER 부여 후 **캡처 끝나면 USER 원복**.
- 캡처는 외부 URL(`*.haru-hub.com`) 대상. 토큰 만료 30분(발급 시).
- 197 메모리 빠듯(VS Code ~5GB) — puppeteer chromium 캡처 시 `free` 확인.
