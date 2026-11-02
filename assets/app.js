// hi.haru-hub.com — 실시간 띠·지도 불 켜기·목차 표시·칩/탭·영상 제어 (외부 라이브러리 0)
(() => {
'use strict';
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;

// ── 새 촬영본 교체 표 (docs/CAPTURE-TODO.md) ──
// 도착한 S-id 를 한 줄 추가하면 assets/device/<id>.mp4 + <id>.webp 로 바뀌고 출처 칩도 바뀝니다.
// 예) s5: ['실기기 녹화 · iPhone 15 Pro Max'],  s9: ['맥북 사파리 녹화', 'laptop']
const CAPTURED = {
  s3: ['모바일 화면 녹화 · 크롬'],
  s4: ['모바일 화면 녹화 · 크롬 · 내부 주소 가림'],
};
for (const [id, [chip, frame]] of Object.entries(CAPTURED)) {
  const f = $(`[data-slot="${id}"]`); if (!f) continue;
  f.closest('[hidden]')?.removeAttribute('hidden'); f.hidden = false;
  const dev = $('.dev', f), scr = $('.screen', f);
  if (frame) dev.className = 'dev dev-' + frame;
  scr.className = 'screen';
  scr.innerHTML = `<video data-src="assets/device/${id}.mp4" data-poster="assets/device/${id}.webp" muted playsinline loop preload="none" aria-label="${chip}"></video><button class="vplay" type="button" aria-label="영상 재생"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg></button>`;
  $('.cap-row', f).innerHTML = `<span class="chip src">${chip}</span><button class="vbtn" type="button" aria-pressed="false">정지</button>`;
}

// ── 실시간 (바깥 감시 Worker) ──
const API = 'https://status.haru-hub.com/api/status';
const RETIRED = ['square', 'hub'];
const NAMES = { auth: '통합 로그인', lease: 'haru-lease', cashpulse: 'CashPulse', fmcrm: '상담 CRM 2.0', teamhub: 'TeamHub', ai: 'TeamHub AI', upload: 'TeamHub 업로드' };
const ORDER = Object.keys(NAMES);
const MODE = new URLSearchParams(location.search).get('live'); // 로컬 시험: sample | down | stale | fail
const strip = $('#strip'), sText = $('.strip-text', strip), sLink = $('.strip-link', strip);
const map = $('#map'), lampG = $('#lamps'), svc = $('#svc');
let data = null, mapSeen = false, lit = false, sKey = '';

async function load() {
  if (MODE === 'fail') throw new Error('fail');
  const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 4000);
  try {
    const r = await fetch(MODE ? 'assets/dev/status-sample.json' : API, { cache: 'no-store', mode: 'cors', credentials: 'omit', signal: ctl.signal });
    if (!r.ok) throw new Error(r.status);
    const d = await r.json();
    if (MODE && d && d.targets) {
      d.at = new Date(Date.now() - (MODE === 'stale' ? 30 : 3) * 6e4).toISOString();
      if (MODE === 'down' && d.targets.teamhub) d.targets.teamhub = { up: false, fails: 3, since: new Date(Date.now() - 42 * 6e4).toISOString(), last: { up: false, code: 502, ms: 4000 } };
    }
    return d;
  } finally { clearTimeout(t); }
}

function parse(d) {
  if (!d || typeof d.at !== 'string' || isNaN(Date.parse(d.at)) || !d.targets || typeof d.targets !== 'object') return null;
  const list = [];
  for (const [id, v] of Object.entries(d.targets)) {
    if (RETIRED.includes(id) || !v || typeof v.up !== 'boolean' || !v.last || typeof v.last.ms !== 'number' || !(v.last.ms >= 0)) continue;
    list.push({ id, name: NAMES[id] || id, up: v.up, fails: +v.fails || 0, since: v.since, ms: v.last.ms });
  }
  const rank = id => (ORDER.indexOf(id) + 1) || 99;
  list.sort((a, b) => rank(a.id) - rank(b.id));
  return list.length ? { at: Date.parse(d.at), list } : null;
}

function kst(iso) {
  const t = Date.parse(iso); if (isNaN(t)) return '';
  const p = {}; for (const x of new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(t)) p[x.type] = x.value;
  return `${p.month}월 ${p.day}일 ${p.hour}:${p.minute}`;
}

function setStrip(state, html, link) { // 상태가 바뀔 때만 교체 → aria-live 반복 낭독 없음
  if (sKey === state + html) return;
  sKey = state + html; strip.dataset.state = state; sText.innerHTML = html; sLink.textContent = link;
}

function render() {
  if (!data) {
    setStrip('fail', '바깥 감시기가 5분마다 공개 주소를 확인합니다', '기록 보기 ↗');
    svc.dataset.state = 'fail'; $('#svc-fail').hidden = false; return;
  }
  const min = Math.max(0, Math.round((Date.now() - data.at) / 6e4));
  if (min > 15) {
    setStrip('stale', `바깥 감시 기록이 ${min}분째 갱신되지 않았습니다`, '기록 ↗');
    svc.dataset.state = 'fail'; $('#svc-fail').hidden = false; return;
  }
  svc.dataset.state = 'ok'; $('#svc-fail').hidden = true;
  const L = data.list, n = L.length, up = L.filter(x => x.up), down = L.filter(x => !x.up);
  const ago = min < 1 ? '방금 확인' : `${min}분 전 확인`;
  if (!down.length) {
    const avg = (up.reduce((s, x) => s + x.ms, 0) / up.length / 1000).toFixed(1);
    setStrip('ok', `<b>지금 ${n}/${n} 응답</b> · 평균 ${avg}초 · ${ago}`, '기록 ↗');
  } else {
    const who = down[0].name + (down.length > 1 ? ` 외 ${down.length - 1}곳` : '');
    setStrip('part', `<b>지금 ${up.length}/${n} 응답</b> · ${who} 확인 중 · ${ago}`, '기록 ↗');
  }
  for (const li of $$('li[data-target]', svc)) {
    const x = L.find(t => t.id === li.dataset.target), st = $('.st', li);
    if (!x) { st.removeAttribute('data-s'); st.textContent = '감시 기록 없음'; continue; }
    st.dataset.s = x.up ? 'on' : 'bad';
    st.textContent = x.up ? `응답 중 · ${(x.ms / 1000).toFixed(1)}초` : x.fails >= 2 ? `응답 없음 · ${kst(x.since)}부터` : '확인 중';
  }
  light();
}

// 지도 등불: 보여 줄 대상 하나당 하나 (이름표 순서 고정)
function lamps() {
  const L = data ? data.list : [];
  if (lampG.childElementCount !== L.length) {
    const gap = 22, x0 = 240 - (L.length - 1) * gap / 2;
    lampG.innerHTML = L.map((x, i) => `<circle class="lamp" cx="${x0 + i * gap}" cy="52" r="5" style="--i:${i}"><title></title></circle>`).join('');
  }
  L.forEach((x, i) => {
    const c = lampG.children[i];
    c.dataset.s = x.up ? 'on' : 'bad';
    c.firstChild.textContent = `${x.name} ${x.up ? '응답 중' : '응답 없음'}`;
  });
}
lampG.innerHTML = ORDER.map((_, i) => `<circle class="lamp" cx="${174 + i * 22}" cy="52" r="5" style="--i:${i}"><title></title></circle>`).join('');

function light() { // 유일한 연출: 지도 30% 이상 보임 + 데이터 도착 → 한 번
  const fresh = data && Date.now() - data.at <= 15 * 6e4;
  if (lit) { if (fresh) lamps(); return; }
  if (!fresh || !mapSeen) return;
  lit = true; lamps();
  if (RM) { map.classList.add('lit', 'done'); return; }
  map.classList.add('lit');
  setTimeout(() => map.classList.add('done'), 1500);
}
new IntersectionObserver(es => { if (es.some(e => e.intersectionRatio >= .3)) { mapSeen = true; light(); } }, { threshold: [0, .3] }).observe(map);

async function refresh() {
  try { data = parse(await load()); } catch { data = null; }
  render();
}
refresh();
setInterval(() => { if (document.visibilityState === 'visible') refresh(); }, 120000);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') refresh(); });
addEventListener('pageshow', e => { if (e.persisted) refresh(); });

// ── 상단 막대: 스크롤 선 + 현재 섹션 ──
const bar = $('#bar');
const onScroll = () => bar.classList.toggle('scrolled', scrollY > 0);
addEventListener('scroll', onScroll, { passive: true }); onScroll();
const navLinks = $$('.bar-nav a');
const secs = navLinks.map(a => $(a.getAttribute('href')));
const navIO = new IntersectionObserver(es => {
  for (const e of es) if (e.isIntersecting) navLinks.forEach(a => a.getAttribute('href') === '#' + e.target.id ? a.setAttribute('aria-current', 'true') : a.removeAttribute('aria-current'));
}, { rootMargin: '-30% 0px -69% 0px' });
secs.forEach(s => s && navIO.observe(s));
['top', 'principles', 'games', 'career', 'live', 'contact'].forEach(id => navIO.observe($('#' + id)));

// ── 화면 고르기 칩 ──
for (const g of $$('[data-gallery]')) {
  const img = $('img', g), btns = $$('button[data-img]', g);
  const pre = b => { new Image().src = b.dataset.img; };
  for (const b of btns) {
    b.addEventListener('pointerenter', () => pre(b), { once: true });
    b.addEventListener('focus', () => pre(b), { once: true });
    b.addEventListener('click', () => {
      btns.forEach(x => x.setAttribute('aria-pressed', x === b));
      img.src = b.dataset.img; img.alt = b.dataset.alt;
    });
  }
}

// ── 영상: 가까우면 소스 붙이고, 50% 보이면 재생, 동시 1개 ──
const auto = !RM && !(navigator.connection && navigator.connection.saveData);
let current = null;
function attach(v) {
  if (v.dataset.on) return; v.dataset.on = 1; v.poster = v.dataset.poster || "";
  const s = document.createElement('source'); s.src = v.dataset.src; s.type = 'video/mp4';
  v.appendChild(s); v.muted = true; v.load();
}
function play(v) {
  attach(v);
  if (current && current !== v) current.pause();
  current = v; v.muted = true;
  const p = v.play(); if (p) p.catch(() => sync(v));
}
function sync(v) {
  const box = v.closest('.screen, .screen-frame'), fig = v.closest('figure');
  const vb = fig && $('.vbtn', fig), vp = box && $('.vplay', box);
  if (vp) vp.hidden = !v.paused;
  if (vb) { vb.textContent = v.paused ? '재생' : '정지'; vb.setAttribute('aria-pressed', v.paused); vb.setAttribute('aria-label', v.paused ? '영상 재생' : '영상 정지'); }
}
const near = new IntersectionObserver(es => es.forEach(e => e.isIntersecting && attach(e.target)), { rootMargin: '300px' });
const seen = new IntersectionObserver(es => es.forEach(e => {
  const v = e.target;
  if (e.intersectionRatio >= .5) { if (auto && !v.dataset.user) play(v); }
  else if (!v.paused) v.pause();
}), { threshold: [0, .5] });
for (const v of $$('video[data-src]')) {
  near.observe(v); seen.observe(v);
  v.addEventListener('play', () => sync(v)); v.addEventListener('pause', () => sync(v));
  sync(v);
  const fig = v.closest('figure'), toggle = () => {
    if (v.paused) { delete v.dataset.user; play(v); } else { v.dataset.user = 'off'; v.pause(); }
  };
  $('.vplay', v.parentNode).addEventListener('click', toggle);
  const vb = fig && $('.vbtn', fig); if (vb) vb.addEventListener('click', toggle);
}

// ── 서비스 탭 ──
const tabs = $$('[role="tab"]');
function select(t, focus) {
  for (const x of tabs) {
    const on = x === t, panel = $('#' + x.getAttribute('aria-controls'));
    x.setAttribute('aria-selected', on); x.tabIndex = on ? 0 : -1; panel.hidden = !on;
    if (!on) $$('video', panel).forEach(v => v.pause());
  }
  if (focus) t.focus();
}
tabs.forEach((t, i) => {
  t.addEventListener('click', () => select(t));
  t.addEventListener('keydown', e => {
    const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (d) { e.preventDefault(); select(tabs[(i + d + tabs.length) % tabs.length], true); }
  });
});
})();
