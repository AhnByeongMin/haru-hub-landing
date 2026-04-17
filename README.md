# haru-hub.com Landing

현업 문제를 해결하는 개발자 — 랜딩 페이지.

## 구조

```
haru-hub-landing/
├── index.html
├── assets/
│   ├── style.css
│   └── favicon.svg
└── README.md
```

순수 HTML + CSS. 빌드 도구 없음. Cloudflare Pages에 그대로 업로드.

## 로컬 미리보기

```bash
cd haru-hub-landing
python3 -m http.server 8000
# 브라우저에서 http://localhost:8000
```

## 배포 (Cloudflare Pages)

1. GitHub repo에 push
2. Cloudflare 대시보드 → Workers & Pages → Create → Pages → Connect to Git
3. repo 선택 → Build command 공란 → Output directory `/`
4. Deploy → custom domain `www.haru-hub.com` 연결

## 수정 가이드

- 문구는 `index.html` 직접 편집
- 색·간격은 `assets/style.css`의 CSS 변수/토큰 영역 참고
- 섹션 추가 시 기존 `.container > section-label / section-title` 패턴 재사용
