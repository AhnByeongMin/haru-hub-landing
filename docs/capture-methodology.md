<!-- 3앱 데모 세팅 + 화면 캡처 방법론 (재캡처 런북) -->
# 데모 세팅 + 캡처 방법론 (재캡처 런북)

> hi.haru-hub.com Personal 섹션 "화면 흐름 탭"용 캡처를 **재현/갱신**하기 위한 정본 런북.
> 진행 상태·결정은 [`screenshot-tabs-plan.md`](./screenshot-tabs-plan.md), 여기는 **어떻게**에 집중.
> ⚠️ **시크릿(JWT secret·DB 비번) 평문 금지** — env 변수명·획득 방법만 적는다.

---

## 0. 핵심 원리

실서비스는 OAuth/세션 로그인이라 헤드리스 자동화가 번거롭다. 그래서 **JWT를 직접 발급해
`localStorage`에 주입 → 로그인 단계를 건너뛰고** 보호된 화면을 바로 캡처한다.
데이터는 **실데이터를 절대 안 쓰고** 데모 계정 + 더미 데이터로 격리한다.

```
[데모 데이터 준비] → [JWT 발급] → [puppeteer가 localStorage 주입 후 공개 URL 접속] → [모바일 캡처] → [실데이터 점검] → [원복/정리]
```

- 도구: puppeteer 헤드리스(`/tmp/diag/node_modules/puppeteer`, /tmp라 휘발 — 없으면 `npm i puppeteer`).
- 뷰포트: **390×844, deviceScaleFactor 2** (모바일 2x).
- 캡처 대상 = **공개 URL**(`*.haru-hub.com`). 데모 데이터 준비는 **로컬 API**(localhost 포트) 직접 호출.

---

## 1. 앱별 인증 (토큰 키 · JWT)

| 앱 | localStorage 키 | JWT subject | claim | 서명(HS256) secret | 키 길이 보정 |
|---|---|---|---|---|---|
| lease | `lease_token` | userId | role(무시·DB기준) | env `LEASE_JWT_SECRET` | 그대로 |
| cashpulse | `cp_access` (+ `cp_user` JSON) | userId | `email`,`typ=access` | env `CASHPULSE_JWT_SECRET` | **<32B면 SHA-256** 해서 키 생성 |
| teamhub | `teamhub_access_token` | userId | `type=access` | env `JWT_SECRET` (64B) | 그대로 |

- **공통**: 백엔드 JwtAuthFilter가 **매 요청 DB role로 권한 생성**(토큰 claim 무관) → DB role만 바꿔도 즉시 반영.
- **cashpulse**: 프론트가 `cp_user`(JSON: `{id,email,username,nickname,theme,colorGainSign,locale}`)도 읽으니 토큰과 함께 주입. 헤더 이름 등은 `/api/users/me`로도 채워짐.
- **teamhub**: AuthProvider가 `/auth/me`를 토큰으로 호출 → 토큰만 주입하면 됨.
- **secret 획득**: `.env` 또는 **실행 중 프로세스 환경** `tr '\0' '\n' < /proc/<PID>/environ | grep <KEY>` (pm2 프로세스가 inject). teamhub DB 비번도 동일(`DB_PASSWORD`). **사용 후 /tmp의 토큰/secret 파일은 `shred -u`**.

**JWT 발급 (python, 의사코드)**:
```python
# secret 바이트, HS256. cashpulse만 len(secret)<32 → hashlib.sha256(secret).digest()
b64 = lambda x: base64.urlsafe_b64encode(x).rstrip(b'=')
header  = {"alg":"HS256","typ":"JWT"}
payload = {"sub":str(uid), ...claims..., "iat":now, "exp":now+3600}
sig = hmac.new(key, h+b'.'+p, hashlib.sha256).digest()
token = h + '.' + p + '.' + b64(sig)
```

---

## 2. 앱별 데모 데이터 준비

### lease (OAuth 전용)
- 데모 = **DB 직접**. id1 name 임시 `'데모 임대인'`(캡처 후 `'안병민'` 원복). 실주소 매물('우리집')은 `status=HIDDEN`.
- 공지는 `announcements` 테이블 직접 insert(API 아님 → 실유저 Web Push 미발송). 컬럼: `title`,`body`,`scope`(ALL/GROUP/LEASE),`scope_id`,`landlord_id`,`created_at`(목록은 created_at DESC).
- DB: `mysql --protocol=TCP -h127.0.0.1 -P3306 -uharu_lease -p"$LEASE_DB_PASSWORD" haru_lease`.

### cashpulse (자체 signup 비활성=410, OAuth 전용)
- 데모 user **DB insert**(`users`: email/username/nickname/oauth_provider='demo'/theme/color_gain_sign/locale, 나머지 default). provider='demo'라 UI 로그인 불가·inert.
- JWT 발급 후 **API로** watchlist/알림 입력(가입·입력 흐름도 같이 검증):
  - `POST /api/watchlist {companyId, costBasis, quantity, isImportant, notes}` (companyId=공개종목, `companies` 테이블에서 ticker로 조회).
  - `POST /api/notifications/alerts {companyId, direction(ABOVE/BELOW), targetPrice}`.
- 평가손익은 가상 매수원가/수량. DB(docker): `mysql --protocol=TCP -h127.0.0.1 -P3307 -ucashpulse -p"$CASHPULSE_DB_PASSWORD" cashpulse_dev`.

### teamhub (공유 워크스페이스 — 격리 필수)
- 메인 프로젝트/채팅엔 실유저 23명 콘텐츠가 섞여 있어 **격리 데모를 새로 생성** 후 **전량 삭제**.
- 절차(로컬 API `http://localhost:8085/api`, 각 데모 유저 JWT로):
  1. 데모 유저 3명 DB insert(`users`: username/email/full_name/role='USER'/status='ACTIVE'/provider='LOCAL'/email_verified/...). `monitor_access` 컬럼이 관제센터 접근 게이트.
  2. **약관 동의 필수** — 안 하면 동의 모달이 화면 가림. `GET /consents/pending`로 타입(TERMS/PRIVACY/AGE_14) 확인 → 각 `POST /consents/agree {type, agreed:true}`.
  3. `POST /projects {key,name,description}` → `POST /projects/{id}/members {userId,role:'DEVELOPER'}`.
  4. `POST /projects/{id}/issues {projectId,title,type(TASK/BUG/FEATURE/IMPROVEMENT),priority(LOWEST..HIGH),assigneeId}` → `PUT /issues/{id}/status {status(BACKLOG/TODO/IN_PROGRESS/IN_REVIEW/DONE)}`로 칸반 컬럼 이동. **이슈 title에 `/ \ : * ? " < > |` 금지**(폴더명 검증).
  5. `POST /channels {projectId,name,description,type:'PUBLIC',inviteMemberIds:[...]}` → `POST /channels/{id}/messages {channelId,content,messageType:'TEXT'}`(messageType 필수). 작성자별 토큰으로 보내 대화 구성.
- **관제센터** = `/admin/monitor`. 캡처용 유저에 임시 `role='MASTER', monitor_access=1` → 캡처 → **즉시 `role='USER', monitor_access=0` 원복**.

---

## 3. 캡처 스크립트 (puppeteer)

기본 패턴(`/tmp/cap-*.js`): `evaluateOnNewDocument`로 localStorage 주입 → `goto(공개URL, networkidle2)` → 대기 → `screenshot`. final url이 `/login`으로 안 튕기면 우회 성공.

```js
await page.setViewport({ width:390, height:844, deviceScaleFactor:2 });
await page.evaluateOnNewDocument((t,u)=>{
  localStorage.setItem('<TOKEN_KEY>', t);
  // cashpulse: localStorage.setItem('cp_user', u); localStorage.setItem('cashpulse:install-dismissed', Date.now());
}, token, userJson);
await page.goto(url, { waitUntil:'networkidle2', timeout:45000 });
await new Promise(r=>setTimeout(r,5000));     // SPA 데이터 로드 대기
await page.screenshot({ path: out, fullPage:false });
```

**캡처 URL**: lease `https://lease.haru-hub.com/admin/{properties|...}` · cashpulse `https://cashpulse.haru-hub.com/{|stock/005930|watchlist|alerts}` · teamhub `https://haru-hub.com/teamhub/{projects/<id>|chat?channel=<id>|admin/monitor}` (basePath `/teamhub`).

---

## 4. 환경 함정 (해결책)

1. **이모지 깨짐(`≡` tofu)** — 헤드리스 chromium에 컬러 이모지 폰트 없음(앱은 이모지 아이콘 사용). → `~/.fonts/NotoColorEmoji.ttf` 다운로드 + `fc-cache -f ~/.fonts` (sudo 불필요·유저 로컬).
2. **cashpulse PWA 설치 배너가 콘텐츠 가림** — localStorage `cashpulse:install-dismissed`에 타임스탬프 주입.
3. **teamhub 약관 동의 모달** — §2 teamhub-2 동의 처리.
4. **Radix 탭 등 클릭 전환** — 네이티브 `.click()`이 안 먹으면 `getBoundingClientRect` 중심 좌표로 `page.mouse.click(x,y)`(실제 마우스 이벤트).
5. **fixed nav가 element 캡처 위를 덮음**(로컬 미리보기 시) — `document.querySelector('.nav').style.display='none'` 후 `el.screenshot()`.

---

## 5. 실데이터 노출 점검 (필수)

캡처 후 **눈으로** 확인: 실명·이메일·전화번호·실주소·투자내역·실유저 흔적 0. 특히
- lease: 매물 실주소/엑셀 사진(→ 가짜매물·HIDDEN), 임대인 실명(→ '데모 임대인').
- cashpulse: 본인 관심종목/평가손익(→ 데모 user 가상 포트폴리오). 시장지표는 공개라 OK.
- teamhub: **관제센터 기본 '에러트래킹' 탭은 audit log에 실유저명** → **'시스템' 탭만**(서비스 상태/힙/커넥션풀 = PII 없음). `/admin` 유저관리(이메일 테이블)는 캡처 금지.

---

## 6. 원복 / 정리

| 앱 | 캡처 후 처리 |
|---|---|
| lease | id1 name `'안병민'` 원복. 데모 공지·HIDDEN 매물은 **유지**(가공·외부 임차인 0이라 무해). |
| cashpulse | 데모 user(id9)·watchlist·알림 **유지**(격리·inert·재캡처용). |
| teamhub | 임시 MASTER **즉시 원복**. 데모 유저3·프로젝트·채널·이슈·메시지·notifications·consent·audit·drive_items·user_presence **전량 삭제**(`FOREIGN_KEY_CHECKS=0`로 참조행 정리) → 유저수 23 복원·orphan 0 검증(공유 워크스페이스 오염 방지). |
| 공통 | /tmp의 JWT secret·DB 비번 파일 `shred -u`. |

---

## 7. 산출물

- 이미지: `assets/screenshots/{app}-{n}-{desc}.png` (lease 4·cashpulse 4·teamhub 3 = 11장).
- UI: index.html `.shots`(탭) + `assets/style.css` `.shots*` + 하단 script 탭 토글.

---

## 8. 흐름 영상 (WebM) 녹화 — 특화점 중심

정적 캡처는 "화면 나열"이라, 각 앱의 **특장점을 흐름(모션)으로** 보여주려 WebM 루프를 추가.

- **도구**: puppeteer `page.screencast({path})` (v22+). **ffmpeg 필요** (Rocky: `sudo dnf install -y ffmpeg-free`). 출력 VP9 WebM, 390×844, ~0.7~1.3MB/영상.
- **포맷 결정**: GIF는 웹에 부적합(앱당 수 MB). **WebM `<video autoplay muted loop playsinline preload=none>`** + poster=시작 프레임 PNG. 랜딩 `.shot-flow` figure 로 폰 프레임에 삽입(`.shots-row` 첫 칸).
- **녹화 패턴**: `localStorage` 토큰 주입 → `goto` → `screencast 시작` → 스크립트된 인터랙션(부드러운 스크롤 `scrollTo{behavior:smooth}` + 화면 전환) → `rec.stop()`.
- **함정**:
  - **SPA 카드/행 클릭이 안 먹을 때 많음**(watchlist 종목·kanban 카드) → 해당 화면은 **`goto` 직접 이동**이 신뢰성↑(전환은 컷이지만 슬라이드처럼 읽힘). 칸반 이슈는 **접힌 컬럼**이면 클릭 불가.
  - 탭 전환은 네이티브 `.click()` 대신 **bbox 중심 `page.mouse.click`**. 단 cashpulse 종목상세 **재무 탭은 swipe형이라 클릭 안 먹음** → 스크롤로 대체.
  - 검증은 `ffmpeg`로 프레임 추출(`select='eq(n\,N)'`) / 컨택트시트(`tile=Nx1`) 후 눈으로.
- **앱별 특화점 흐름** (정본):
  - **TeamHub** = 히스토리·연결성: 칸반 → 이슈 상세(댓글 → **히스토리 탭**=상태전환·활동 이력) → 드라이브(프로젝트 폴더) → 관제센터(시스템 헬스). 데모 재생성 시 이슈 **다단계 상태전환 + 댓글**로 이력 보강.
  - **CashPulse** = 인사이트 밀도: 관심(평가손익) → 종목상세(차트 + **강점·시그널 분석**·별점 지표).
  - **haru-lease** = 살아있는 계약: 매물 목록 → 매물 상세 → **계약 변경 이력 타임라인**(월세인상·연장·특약·보증금조정). revision은 `PATCH /leases/{id}`가 자동 생성하나 **endDate PATCH가 403 나는 케이스 있음(미규명 — 추후 확인)** → 데모는 `lease_revisions` 직접 insert(snapshot JSON+summary)로 일관 스토리 구성.
- **산출물**: `assets/media/{app}-flow.webm` 3종. lease 데모는 contract(역삼 502호 lease 1) revision 보강 상태 유지(가공·무해), cashpulse 데모 user 유지, **teamhub 데모는 매 녹화마다 재생성→전량삭제**.
