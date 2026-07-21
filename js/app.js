/* Квартирник у Маши Боруха — движок событий.
   Один источник правды: data/events.json. Страницы собираются из него.
   Ничего не нужно править вручную в HTML — только JSON. */

async function loadData() {
  const res = await fetch('data/events.json', { cache: 'no-store' });
  return res.json();
}

function isUpcoming(ev) {
  if (ev.status === 'upcoming') return true;
  if (ev.status === 'past') return false;
  return new Date(ev.date) >= new Date(new Date().toDateString());
}

function byDateDesc(a, b) { return new Date(b.date) - new Date(a.date); }

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"]/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

function photoGrid(photos) {
  if (!photos || !photos.length) return '';
  return `<div class="photo-grid reveal">${photos.map(p =>
    `<img src="${esc(p)}" alt="" loading="lazy">`).join('')}</div>`;
}

function songsBlock(songs) {
  if (!songs || !songs.length) return '';
  const items = songs.map((s, i) =>
    `<li><span class="pl-num">${String(i + 1).padStart(2, '0')}</span><span>${esc(s)}</span></li>`).join('');
  return `<section class="section"><p class="section__label reveal">Что играли</p>
    <ul class="playlist-ul reveal">${items}</ul></section>`;
}

function driveBtn(url) {
  if (!url) return '';
  return `<a href="${esc(url)}" class="btn btn-outline" target="_blank" rel="noopener">📁 Все фото, видео и аудио на Google Диске →</a>`;
}

/* ── Страница ОДНОГО события: работает и для будущего, и для прошедшего ──
   Будущее событие показывает статус/регистрацию; когда оно проходит и в JSON
   появляются фото/песни/ссылка на Диск — та же страница становится архивной. */
function renderEvent(ev, mount) {
  const upcoming = isUpcoming(ev);
  const title = ev.title
    ? `<h1 class="page-title reveal d1">${esc(ev.title)}</h1>`
    : `<h1 class="page-title reveal d1">Квартирник<br><em>${esc(ev.date_label || ev.date)}</em></h1>`;

  let meta = `
    <div class="event-meta-row"><span class="event-meta-label">Дата</span><span class="event-meta-val">${esc(ev.date_label || ev.date)}</span></div>
    <div class="event-meta-row"><span class="event-meta-label">Место</span><span class="event-meta-val">${esc(ev.place)}${ev.place_note ? ' — ' + esc(ev.place_note) : ''}</span></div>`;
  if (ev.entry) meta += `<div class="event-meta-row"><span class="event-meta-label">Вход</span><span class="event-meta-val">${esc(ev.entry)}</span></div>`;

  let actions = '';
  if (upcoming) {
    actions = ev.register_url
      ? `<a href="${esc(ev.register_url)}" class="btn btn-dark" target="_blank" rel="noopener">Записаться</a>`
      : `<a href="#" class="btn btn-dark" style="opacity:.45;pointer-events:none">Регистрация пока закрыта</a>`;
    actions += `<a href="rules.html" class="btn btn-outline">Как добраться →</a>`;
  } else {
    actions = driveBtn(ev.gdrive) || `<a href="archive.html" class="btn btn-outline">← Все квартирники</a>`;
  }

  mount.innerHTML = `
    <div class="page-head wrap">
      <p class="section__label reveal">${upcoming ? 'Следующее мероприятие' : 'Прошедший квартирник'}</p>
      ${title}
    </div>
    <div class="wrap">
      <div class="event-date-block reveal">
        <div class="event-meta">${meta}</div>
        <div style="margin-top:2rem;display:flex;gap:1rem;flex-wrap:wrap">${actions}</div>
      </div>
    </div>
    ${ev.cover ? `<div class="event-photo reveal"><img src="${esc(ev.cover)}" alt="" loading="lazy"></div>` : ''}
    <div class="wrap">
      ${songsBlock(ev.songs)}
      ${ev.photos && ev.photos.length ? `<section class="section"><p class="section__label reveal">Фотографии</p>${photoGrid(ev.photos)}</section>` : ''}
      ${!upcoming && ev.gdrive ? `<div class="wrap" style="padding:0;margin-top:1rem">${driveBtn(ev.gdrive)}</div>` : ''}
    </div>`;
  initReveal();
}

/* ── Страница "Следующее событие" (events.html) ── */
async function renderNext(mount) {
  const data = await loadData();
  const up = data.events.filter(isUpcoming).sort((a, b) => new Date(a.date) - new Date(b.date))[0];
  if (!up) {
    mount.innerHTML = `<div class="page-head wrap"><p class="section__label">Событие</p>
      <h1 class="page-title">Дата ещё<br><em>не назначена</em></h1>
      <p class="page-sub">Следите за анонсом в Telegram. А пока — <a href="archive.html" style="border-bottom:1px solid">загляните в архив</a>.</p></div>`;
    return;
  }
  renderEvent(up, mount);
}

/* ── Страница одного события по ссылке event.html?id=slug ── */
async function renderEventById(mount) {
  const data = await loadData();
  const id = new URLSearchParams(location.search).get('id');
  const ev = data.events.find(e => e.slug === id) || data.events[0];
  document.title = (ev.title || ev.date_label || 'Событие') + ' · Квартирник у Маши Боруха';
  renderEvent(ev, mount);
}

/* ── Архив: список всех прошедших ── */
async function renderArchive(mount) {
  const data = await loadData();
  const past = data.events.filter(e => !isUpcoming(e)).sort(byDateDesc);
  mount.innerHTML = past.map((ev, i) => `
    <article class="archive-entry">
      <a href="event.html?id=${encodeURIComponent(ev.slug)}" class="archive-header reveal">
        <div class="archive-num">${String(past.length - i).padStart(2, '0')}</div>
        <div class="archive-info">
          <p class="archive-date">${esc(ev.date_label || ev.date)}</p>
          ${ev.title ? `<h2 class="archive-title">${esc(ev.title)}</h2>` : ''}
          <p class="archive-loc">${esc(ev.place)}</p>
        </div>
      </a>
      ${photoGrid((ev.photos || []).slice(0, 3))}
      <div class="wrap" style="padding:.5rem 0 0">
        <a href="event.html?id=${encodeURIComponent(ev.slug)}" class="archive-more">Открыть событие →</a>
      </div>
    </article>`).join('');
  initReveal();
}

/* ── Общие мелочи: навигация + анимация появления ── */
function initNav() {
  const nav = document.getElementById('nav');
  const toggle = document.getElementById('navToggle');
  const links = document.getElementById('navLinks');
  if (nav) window.addEventListener('scroll', () => nav.classList.toggle('scrolled', window.scrollY > 40), { passive: true });
  if (toggle) toggle.addEventListener('click', () => { toggle.classList.toggle('open'); links.classList.toggle('open'); });
}
function initReveal() {
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target); }
  }), { threshold: .08 });
  document.querySelectorAll('.reveal:not(.visible)').forEach(el => io.observe(el));
}
document.addEventListener('DOMContentLoaded', initNav);
