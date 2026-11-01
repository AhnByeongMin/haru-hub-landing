# haru-hub landing

불필요한 업무 과정을 제거하는 빌더 — 안병민 포트폴리오 랜딩 페이지.

**Live:** https://hi.haru-hub.com

## 구조

```
haru-hub-landing/
├── index.html                 # 섹션 13개, 문구는 docs/DESIGN-2026-11.md 3절 그대로
├── assets/
│   ├── style.css              # 토큰(:root) → 기본 → 부품 → 섹션
│   ├── app.js                 # 실시간 띠·지도 불 켜기·목차·칩/탭·영상 제어 (외부 라이브러리 0)
│   ├── fonts/                 # Pretendard(OFL)·IBM Plex Mono(OFL) 자체 호스팅 + 라이선스
│   ├── device/                # 새 실기기 녹화(S1~S9) — docs/CAPTURE-TODO.md
│   ├── dev/status-sample.json # ?live=sample 시험용 감시 응답 사본
│   └── automation/ crm2/ media/ screenshots/   # 예전 캡처(MP4·WebP)
└── docs/                      # 디자인 명세·촬영 목록·QA 스크린샷 (배포 제외: .assetsignore)
```

순수 HTML + CSS + 작은 JS. 빌드 도구 없음. 다크 고정.

## 로컬 미리보기

```bash
python -m http.server 8766
# http://localhost:8766            ← 실시간 띠는 CORS 로 '실패' 상태가 정상
# http://localhost:8766/?live=sample   전부 응답 / ?live=down 일부 문제 / ?live=stale 기록 멈춤 / ?live=fail 실패
```

## 글꼴 부분 파일 다시 만들기

본문 글꼴은 이 페이지에 쓰인 한글만 담은 `assets/fonts/pretendard-page-subset.woff2`(약 146KB)를 먼저 쓰고,
없는 글자는 Pretendard 동적 부분 파일(`pretendardvariable-dynamic-subset.css`)로 넘어갑니다.
문구를 많이 바꿨다면 다시 만들기(fonttools 필요, `pretendard@1.3.9` npm 패키지의 `dist/web/variable/woff2/PretendardVariable.woff2` 원본):

```bash
cat index.html assets/app.js | python -c "import sys;t=sys.stdin.read();print(''.join(sorted({c for c in t if 0xAC00<=ord(c)<=0xD7A3})),end='')" > hangul.txt
pyftsubset PretendardVariable.woff2 --text-file=hangul.txt \
  --unicodes="U+0020-007E,U+00A0-00FF,U+2010-2027,U+2030-205E,U+2190-21FF,U+2212,U+3000-303F" \
  --layout-features='*' --flavor=woff2 --output-file=assets/fonts/pretendard-page-subset.woff2
```

## 배포 (Cloudflare Workers · Static Assets)

`main` 브랜치에 push → Cloudflare가 자동 빌드·배포.

- **Production**: https://hi.haru-hub.com
- **Worker URL**: https://haru-hub-landing.qudals0617.workers.dev
- **Repo**: https://github.com/AhnByeongMin/haru-hub-landing

배포 전: CSS/JS 를 바꿨으면 `index.html` 의 `?v=` 값을 올립니다(옛 캐시 방지).
