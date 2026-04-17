# haru-hub landing

불필요한 업무 과정을 제거하는 개발자 — 포트폴리오 랜딩 페이지.

**Live:** https://hi.haru-hub.com

## 구조

```
haru-hub-landing/
├── index.html
├── assets/
│   ├── style.css
│   └── favicon.svg
└── README.md
```

순수 HTML + CSS. 빌드 도구 없음.

## 디자인

- 쿨 모노크롬 에디토리얼 (zinc scale + mint 단일 악센트)
- Fraunces (세리프 디스플레이) + Inter (본문) + JetBrains Mono (데이터/메타)
- 강조는 색이 아닌 타이포그래피(이탤릭 + 웨이트 + 대비)가 담당
- 모든 구분은 1px hairline — 그림자·글로우 없음

## 로컬 미리보기

```bash
cd haru-hub-landing
python3 -m http.server 8766
# 브라우저에서 http://localhost:8766
```

## 배포 (Cloudflare Workers · Static Assets)

`main` 브랜치에 push → Cloudflare가 자동 빌드·배포.

- **Production**: https://hi.haru-hub.com
- **Worker URL**: https://haru-hub-landing.qudals0617.workers.dev
- **Repo**: https://github.com/AhnByeongMin/haru-hub-landing

## 수정 가이드

- 문구: `index.html` 직접 편집
- 스타일·색·간격: `assets/style.css` 상단의 `:root` 토큰 영역
- 새 섹션 추가 시 기존 `.section-head` 패턴 재사용
