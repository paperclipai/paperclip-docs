/* ─── Section icons ─────────────────────────────────────────────────────── */
// Rendered via Lucide (https://lucide.dev). Section names reference any Lucide
// icon by its kebab-case id; `lucide.createIcons()` replaces <i data-lucide>
// placeholders with inline SVG after each nav render.
function sectionIconTag(section) {
  return `<i data-lucide="${escapeAttr(section?.icon || 'book')}"></i>`;
}
function renderLucideIcons() {
  if (typeof lucide !== 'undefined') lucide.createIcons();
}
function getSectionKind(section) {
  if (section && typeof section === 'object') return section.tier || 'Guides';
  return 'Guides';
}
const TIER_ORDER = ['Guides', 'Administration', 'Reference'];

/* ─── Theme bootstrap (before first paint of body) ──────────────────────── */
(function() {
  const saved = localStorage.getItem('pc-guides-theme')
    || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  if (saved === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
  else document.documentElement.removeAttribute('data-theme');
})();

/* ─── State ─────────────────────────────────────────────────────────────── */
let navData     = null;
let allPages    = [];
let currentFile = null;
let currentMarkdown = '';
let tocObserver = null;
const APP_DIR_NAME = 'site';
const APP_BASE_PATH = (() => {
  const marker = `/${APP_DIR_NAME}`;
  const pathname = window.location.pathname;
  const markerIndex = pathname.indexOf(marker);
  if (markerIndex === -1) return '';
  return pathname.slice(0, markerIndex + marker.length);
})();
const APP_BASE_URL = new URL(`${APP_BASE_PATH.replace(/\/$/, '')}/`, window.location.origin);
const APP_SHELL_URL = new URL('index.html', APP_BASE_URL);

/* ─── Screenshot src resolver ───────────────────────────────────────────── */
function resolveScreenshotSrc(src) {
  const theme = document.documentElement.dataset.theme || 'light';
  // New-style: screenshots/light/group/file.png or screenshots/dark/group/file.png
  const newMatch = src.match(/screenshots\/(?:light|dark)\/([^/]+\/[^/]+\.png)$/);
  if (newMatch) return resolveContentUrl(`../docs/user-guides/screenshots/${theme}/${newMatch[1]}`);
  // Legacy-style: images/group/file.png
  const legacyMatch = src.match(/images\/([^/]+\/[^/]+\.png)$/);
  if (legacyMatch) return resolveContentUrl(`../docs/user-guides/screenshots/${theme}/${legacyMatch[1]}`);
  return src;
}

function normalizeDocPath(path) {
  const normalized = [];
  for (const segment of path.split('/')) {
    if (!segment || segment === '.') continue;
    if (segment === '..') {
      if (normalized.length && normalized[normalized.length - 1] !== '..') {
        normalized.pop();
      } else {
        normalized.push('..');
      }
      continue;
    }
    normalized.push(segment);
  }
  return normalized.join('/');
}

function normalizeRouteKey(value) {
  return value.replace(/^\/+/, '').replace(/\/+$/, '');
}

function derivePageSlug(file) {
  const normalized = normalizeDocPath(file).replace(/^(\.\.\/)+/, '');
  const withoutExtension = normalized.replace(/\.md$/, '');
  if (withoutExtension.startsWith('user-guides/guides/')) {
    return withoutExtension.slice('user-guides/guides/'.length);
  }
  return withoutExtension;
}

function resolveContentUrl(path) {
  return new URL(path, APP_SHELL_URL).toString();
}

function buildRouteValue(page, headingId = null) {
  return headingId ? `${page.slug}/${headingId}` : page.slug;
}

function getRouteUrl(routeValue) {
  const normalized = normalizeRouteKey(routeValue);
  const basePath = APP_BASE_URL.pathname.replace(/\/$/, '');
  return normalized ? `${basePath}/#/${normalized}` : `${basePath}/#/`;
}

function getPageUrl(page) {
  return getRouteUrl(buildRouteValue(page));
}

function getPageHeadingUrl(page, headingId) {
  return getRouteUrl(buildRouteValue(page, headingId));
}

function getAbsoluteUrl(path) {
  return new URL(path, window.location.origin).toString();
}

function getLegacyRoute() {
  const url = new URL(window.location.href);
  return url.searchParams.get('page') || location.hash.slice(1);
}

function getPathRoute() {
  const relativePath = normalizeRouteKey(window.location.pathname.slice(APP_BASE_PATH.length));
  if (!relativePath || relativePath === 'index.html') return '';
  return relativePath.replace(/\/index\.html$/, '');
}

function getCurrentRoute() {
  return getPathRoute() || getLegacyRoute();
}

function slugifyHeadingText(text) {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function findPageByRoute(route) {
  const decoded = decodeURIComponent((route || '').trim());
  const normalizedRoute = normalizeRouteKey(decoded);
  if (!normalizedRoute) return null;
  return allPages.find(page =>
    page.slug === normalizedRoute ||
    page.file === decoded ||
    normalizeDocPath(page.file) === normalizeDocPath(decoded)
  ) || null;
}

function parseRoute(route) {
  const decoded = decodeURIComponent((route || '').trim());
  const normalizedRoute = normalizeRouteKey(decoded);
  if (!normalizedRoute) return { page: null, headingId: null };

  const exactPage = findPageByRoute(normalizedRoute);
  if (exactPage) return { page: exactPage, headingId: null };

  const page = [...allPages]
    .sort((a, b) => b.slug.length - a.slug.length)
    .find(candidate => normalizedRoute.startsWith(`${candidate.slug}/`));
  if (!page) return { page: null, headingId: null };

  const headingId = normalizeRouteKey(normalizedRoute.slice(page.slug.length + 1));
  return { page, headingId: headingId || null };
}

function focusHeading(heading) {
  const top = heading.getBoundingClientRect().top + window.scrollY - 128;
  window.scrollTo({ top, behavior: 'smooth' });
  heading.classList.add('heading-highlight');
  heading.addEventListener('animationend', () => heading.classList.remove('heading-highlight'), { once: true });
}

async function copyText(value) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const textarea = document.createElement('textarea');
  textarea.value = value;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'absolute';
  textarea.style.left = '-9999px';
  document.body.appendChild(textarea);
  textarea.select();
  const didCopy = document.execCommand('copy');
  document.body.removeChild(textarea);
  if (!didCopy) throw new Error('Clipboard copy failed');
}

function showCopiedState(anchor) {
  anchor.classList.add('is-copied');
  const previousLabel = anchor.getAttribute('aria-label') || 'Copy section link';
  anchor.setAttribute('aria-label', 'Copied section link');
  window.setTimeout(() => {
    anchor.classList.remove('is-copied');
    anchor.setAttribute('aria-label', previousLabel);
  }, 1200);
}

function findHeadingTarget(article, targetHeading) {
  if (!targetHeading) return null;
  const normalizedTarget = normalizeRouteKey(targetHeading);
  const headings = [...article.querySelectorAll('h1, h2, h3, h4, h5, h6')];
  return (
    headings.find(heading => heading.id === normalizedTarget) ||
    headings.find(heading => heading.textContent.trim().toLowerCase() === targetHeading.toLowerCase()) ||
    null
  );
}

function decorateHeadings(article, file) {
  const page = allPages.find(candidate => candidate.file === file);
  if (!page) return;

  const usedIds = new Set();
  article.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach(heading => {
    const baseId = slugifyHeadingText(heading.textContent) || heading.tagName.toLowerCase();
    let nextId = baseId;
    let suffix = 2;
    while (usedIds.has(nextId)) nextId = `${baseId}-${suffix++}`;
    usedIds.add(nextId);
    heading.id = nextId;

    const anchor = document.createElement('a');
    anchor.className = 'heading-anchor';
    anchor.href = getPageHeadingUrl(page, nextId);
    anchor.setAttribute('aria-label', `Copy link to section ${heading.textContent.trim()}`);
    anchor.setAttribute('title', 'Copy section link');
    anchor.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.07 0l2.83-2.83a5 5 0 0 0-7.07-7.07L11 4"/><path d="M14 11a5 5 0 0 0-7.07 0L4.1 13.83a5 5 0 1 0 7.07 7.07L13 19"/></svg>`;
    anchor.addEventListener('click', async e => {
      e.preventDefault();
      const nextUrl = getPageHeadingUrl(page, nextId);
      history.pushState(null, '', nextUrl);
      focusHeading(heading);
      try {
        await copyText(getAbsoluteUrl(nextUrl));
        showCopiedState(anchor);
      } catch (error) {
        console.error('Failed to copy section link', error);
      }
    });
    heading.appendChild(anchor);
  });
}

function decorateCodeBlocks(article) {
  const COPY_SVG = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="5" width="9" height="9" rx="1.5"/><path d="M3 11V3a1 1 0 0 1 1-1h7"/></svg>';
  const CHECK_SVG = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m3 8 3.5 3.5L13 5"/></svg>';
  article.querySelectorAll('pre').forEach(pre => {
    if (pre.parentElement?.classList.contains('code-wrap')) return;
    const wrap = document.createElement('div');
    wrap.className = 'code-wrap';
    pre.parentNode.insertBefore(wrap, pre);
    wrap.appendChild(pre);

    const btn = document.createElement('button');
    btn.className = 'code-copy';
    btn.type = 'button';
    btn.setAttribute('aria-label', 'Copy code');
    btn.title = 'Copy code';
    btn.innerHTML = COPY_SVG;
    btn.addEventListener('click', async () => {
      try {
        await copyText(pre.innerText);
        btn.classList.add('is-copied');
        btn.innerHTML = CHECK_SVG;
        setTimeout(() => {
          btn.classList.remove('is-copied');
          btn.innerHTML = COPY_SVG;
        }, 1200);
      } catch {}
    });
    wrap.appendChild(btn);
  });
}

/* ─── Theme toggle wiring ───────────────────────────────────────────────── */
document.getElementById('theme-toggle').addEventListener('click', () => {
  const html = document.documentElement;
  const isDark = html.getAttribute('data-theme') === 'dark';
  const next = isDark ? 'light' : 'dark';
  if (next === 'dark') html.setAttribute('data-theme', 'dark');
  else html.removeAttribute('data-theme');
  localStorage.setItem('pc-guides-theme', next);
  // Swap all visible screenshot srcs
  document.querySelectorAll('#article img[data-screenshot]').forEach(img => {
    img.src = resolveScreenshotSrc(img.dataset.screenshot);
  });
});

/* ─── Mobile drawer ─────────────────────────────────────────────────────── */
function openDrawer() {
  const drawer = document.getElementById('drawer');
  const backdrop = document.getElementById('drawer-backdrop');
  const hamburger = document.getElementById('hamburger');
  drawer.classList.add('is-open');
  backdrop.classList.add('is-open');
  drawer.setAttribute('aria-hidden', 'false');
  hamburger.setAttribute('aria-expanded', 'true');
  document.body.style.overflow = 'hidden';
}
function closeDrawer() {
  const drawer = document.getElementById('drawer');
  const backdrop = document.getElementById('drawer-backdrop');
  const hamburger = document.getElementById('hamburger');
  drawer.classList.remove('is-open');
  backdrop.classList.remove('is-open');
  drawer.setAttribute('aria-hidden', 'true');
  hamburger.setAttribute('aria-expanded', 'false');
  document.body.style.overflow = '';
}
document.getElementById('hamburger').addEventListener('click', openDrawer);
document.getElementById('drawer-close').addEventListener('click', closeDrawer);
document.getElementById('drawer-backdrop').addEventListener('click', closeDrawer);
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeDrawer();
});
window.addEventListener('resize', () => {
  if (window.innerWidth > 820 && document.getElementById('drawer').classList.contains('is-open')) closeDrawer();
});

/* ─── Landing <-> article view switching ────────────────────────────────── */
function showLanding() {
  document.getElementById('landing').classList.add('is-active');
  document.getElementById('article-view').classList.remove('is-active');
  document.getElementById('breadcrumb').innerHTML = '';
  const basePath = APP_BASE_URL.pathname.replace(/\/$/, '');
  history.replaceState(null, '', `${basePath}/#/`);
}
function showArticleView() {
  document.getElementById('landing').classList.remove('is-active');
  document.getElementById('article-view').classList.add('is-active');
}

/* Delegated nav clicks (logo, sb-back, landing cards, quick-link footer) */
document.addEventListener('click', e => {
  // Home nav (logo, back-to-all-docs)
  const home = e.target.closest('[data-nav="home"]');
  if (home) {
    e.preventDefault();
    closeDrawer();
    showLanding();
    window.scrollTo({ top: 0 });
    return;
  }
  // Landing card -> first page of section
  const card = e.target.closest('[data-nav-section]');
  if (card) {
    e.preventDefault();
    const section = navData?.sections?.[Number(card.dataset.navSection)];
    if (section?.pages?.length) loadPage(section.pages[0].file);
    return;
  }
  // Landing quick link -> specific page
  const qlink = e.target.closest('[data-nav-file]');
  if (qlink) {
    e.preventDefault();
    loadPage(qlink.dataset.navFile);
    return;
  }
});

/* ─── Search ────────────────────────────────────────────────────────────── */
let searchIndex      = [];
let searchFocusedIdx = -1;

async function buildSearchIndex() {
  const tasks = allPages.map(async page => {
    try {
      const res = await fetch(resolveContentUrl(page.file));
      if (!res.ok) return null;
      const md = await res.text();
      // Extract headings
      const headings = [];
      const hRe = /^#{1,3}\s+(.+)$/gm;
      let m;
      while ((m = hRe.exec(md)) !== null) headings.push(m[1].trim());
      // Strip to plain text for snippet search
      const text = md
        .replace(/^---[\s\S]*?---\n?/, '')
        .replace(/```[\s\S]*?```/g, ' ')
        .replace(/^\s*#{1,6}\s+.+$/gm, '')
        .replace(/[*_`~[\]()#>|]/g, ' ')
        .replace(/https?:\S+/g, '')
        .replace(/\s+/g, ' ')
        .trim();
      return { file: page.file, sectionTitle: page.sectionTitle, pageTitle: page.title, headings, text };
    } catch { return null; }
  });
  searchIndex = (await Promise.all(tasks)).filter(Boolean);
}

function searchGuides(query) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const results = [];
  for (const entry of searchIndex) {
    let score = 0, matchHeading = '', snippet = '';
    if (entry.pageTitle.toLowerCase().includes(q))   score += 100;
    if (entry.sectionTitle.toLowerCase().includes(q)) score += 20;
    for (const h of entry.headings) {
      if (h.toLowerCase().includes(q)) { score += 50; if (!matchHeading) matchHeading = h; break; }
    }
    const textL   = entry.text.toLowerCase();
    const textIdx = textL.indexOf(q);
    if (textIdx !== -1) {
      score += 10;
      const s = Math.max(0, textIdx - 40);
      const e = Math.min(entry.text.length, textIdx + q.length + 70);
      snippet = (s > 0 ? '…' : '') + entry.text.slice(s, e).trim() + (e < entry.text.length ? '…' : '');
    }
    if (score > 0) results.push({ ...entry, score, matchHeading, snippet });
  }
  return results.sort((a, b) => b.score - a.score).slice(0, 8);
}

function highlightMatch(text, query) {
  const q = query.trim();
  if (!q) return escapeHtml(text);
  const idx = text.toLowerCase().indexOf(q.toLowerCase());
  if (idx === -1) return escapeHtml(text);
  return escapeHtml(text.slice(0, idx))
    + `<mark>${escapeHtml(text.slice(idx, idx + q.length))}</mark>`
    + escapeHtml(text.slice(idx + q.length));
}

function renderSearchResults(query) {
  const box = document.getElementById('search-results');
  const kbd = document.getElementById('search-kbd');
  if (!query.trim()) {
    box.classList.remove('is-open');
    if (kbd) kbd.style.display = '';
    searchFocusedIdx = -1;
    return;
  }
  if (kbd) kbd.style.display = 'none';
  searchFocusedIdx = -1;

  const results = searchGuides(query);
  if (results.length === 0) {
    box.innerHTML = `<div class="search-empty">No results for "<strong>${escapeHtml(query)}</strong>"</div>`;
    box.classList.add('is-open');
    return;
  }

  box.innerHTML = results.map((r, i) => {
    const titleHtml = highlightMatch(r.pageTitle, query);
    let metaHtml    = escapeHtml(r.sectionTitle);
    if (r.matchHeading) metaHtml += ` · ${highlightMatch(r.matchHeading, query)}`;
    else if (r.snippet) metaHtml += ` · ${highlightMatch(r.snippet, query)}`;
    return `<div class="search-result" role="option" data-file="${escapeAttr(r.file)}" ${r.matchHeading ? `data-heading="${escapeAttr(r.matchHeading)}"` : ''} data-idx="${i}">
      <div class="search-result-title">${titleHtml}</div>
      <div class="search-result-meta">${metaHtml}</div>
    </div>`;
  }).join('');

  box.querySelectorAll('.search-result').forEach(el => {
    el.addEventListener('mousedown', e => {
      e.preventDefault();
      const heading = el.dataset.heading || null;
      closeSearch();
      loadPage(el.dataset.file, heading);
    });
  });

  box.classList.add('is-open');
}

function closeSearch() {
  const input = document.getElementById('search-input');
  const box   = document.getElementById('search-results');
  const kbd   = document.getElementById('search-kbd');
  if (input) input.value = '';
  if (box)   box.classList.remove('is-open');
  if (kbd)   kbd.style.display = '';
  searchFocusedIdx = -1;
}

function updateSearchFocus(items) {
  items.forEach((el, i) => el.classList.toggle('focused', i === searchFocusedIdx));
  if (searchFocusedIdx >= 0 && items[searchFocusedIdx]) {
    items[searchFocusedIdx].scrollIntoView({ block: 'nearest' });
  }
}

function initSearch() {
  const input = document.getElementById('search-input');
  const box   = document.getElementById('search-results');
  if (!input || !box) return;

  input.addEventListener('input', () => renderSearchResults(input.value));

  input.addEventListener('keydown', e => {
    const items = [...box.querySelectorAll('.search-result')];
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      searchFocusedIdx = Math.min(searchFocusedIdx + 1, items.length - 1);
      updateSearchFocus(items);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      searchFocusedIdx = Math.max(searchFocusedIdx - 1, -1);
      updateSearchFocus(items);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const target = searchFocusedIdx >= 0 ? items[searchFocusedIdx] : items.length === 1 ? items[0] : null;
      if (target) { closeSearch(); loadPage(target.dataset.file, target.dataset.heading || null); }
    } else if (e.key === 'Escape') {
      closeSearch();
      input.blur();
    }
  });

  input.addEventListener('focus', () => { if (input.value.trim()) renderSearchResults(input.value); });
  input.addEventListener('blur',  () => { setTimeout(() => { box.classList.remove('is-open'); searchFocusedIdx = -1; }, 150); });

  // ⌘K / Ctrl+K
  document.addEventListener('keydown', e => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      input.focus();
      input.select();
    }
  });
}

/* ─── Boot ──────────────────────────────────────────────────────────────── */
let redirectMap = {};

function applyRedirect(route) {
  const key = normalizeRouteKey(decodeURIComponent((route || '').trim()));
  if (!key) return route;
  if (Object.prototype.hasOwnProperty.call(redirectMap, key)) {
    return redirectMap[key];
  }
  return route;
}

async function init() {
  try {
    const res = await fetch(resolveContentUrl('content.json'));
    if (!res.ok) throw new Error(`content.json ${res.status}`);
    navData = await res.json();
  } catch (e) {
    showError('Could not load content.json. Check that the release bundle was uploaded intact and the base path is correct.', e.message);
    return;
  }

  // Optional: load redirect map for moved pages (old → new slug).
  try {
    const rRes = await fetch(resolveContentUrl('redirects.json'));
    if (rRes.ok) redirectMap = await rRes.json();
  } catch { /* no redirects file is fine */ }

  buildFlatList();
  document.getElementById('logo').href = getRouteUrl('');
  buildLanding();
  buildSidebar();
  buildMobileDrawer();
  initSearch();
  buildSearchIndex(); // background — no await

  const pathRoute = getPathRoute();
  const rawRoute = applyRedirect(pathRoute || getLegacyRoute());
  const initialRoute = parseRoute(rawRoute);
  const normalizedRaw = normalizeRouteKey(decodeURIComponent((rawRoute || '').trim()));

  if (initialRoute.page) {
    loadPage(initialRoute.page.file, initialRoute.headingId, 'replace');
  } else {
    // Empty or unknown route -> landing
    showLanding();
  }
}

/* ─── Landing cards + quick links ───────────────────────────────────────── */
function buildLanding() {
  const grid = document.getElementById('landing-cards');
  grid.innerHTML = '';

  // Group sections by tier, preserving original indices so data-nav-section still works.
  const byTier = new Map();
  navData.sections.forEach((section, i) => {
    const tier = getSectionKind(section);
    if (!byTier.has(tier)) byTier.set(tier, []);
    byTier.get(tier).push({ section, i });
  });
  const orderedTiers = [
    ...TIER_ORDER.filter(t => byTier.has(t)),
    ...[...byTier.keys()].filter(t => !TIER_ORDER.includes(t)),
  ];

  orderedTiers.forEach(tier => {
    const block = document.createElement('section');
    block.className = 'landing-tier';
    block.dataset.tier = tier;
    const n = byTier.get(tier).length;
    const cols = n <= 3 ? n : (n === 4 ? 2 : 3);
    block.innerHTML = `<h2>${escapeHtml(tier)}</h2><div class="landing-tier-cards" style="--tier-cols:${cols}"></div>`;
    const cardsWrap = block.querySelector('.landing-tier-cards');
    byTier.get(tier).forEach(({ section, i }) => {
      const a = document.createElement('a');
      a.className = 'card';
      a.href = section.pages[0] ? getPageUrl(section.pages[0]) : '#';
      a.dataset.navSection = i;
      const desc = section.desc || `${section.pages.length} page${section.pages.length === 1 ? '' : 's'} in ${section.title}.`;
      a.innerHTML = `
        <div class="card-icon">${sectionIconTag(section)}</div>
        <div class="card-title">${escapeHtml(section.title)}</div>
        <div class="card-desc">${escapeHtml(desc)}</div>
        <div class="card-meta"><span>${section.pages.length} page${section.pages.length === 1 ? '' : 's'}</span><span class="dot"></span><span>${escapeHtml(getSectionKind(section))}</span></div>
      `;
      cardsWrap.appendChild(a);
    });
    grid.appendChild(block);
  });

  const ql = document.getElementById('landing-quicklinks');
  ql.innerHTML = '';
  const candidates = [
    allPages.find(p => /what-is-paperclip/i.test(p.file)),
    allPages.find(p => /installation/i.test(p.file)),
    allPages.find(p => /first-company|your-first-company/i.test(p.file)),
  ].filter(Boolean);
  candidates.forEach(page => {
    const a = document.createElement('a');
    a.href = getPageUrl(page);
    a.dataset.navFile = page.file;
    a.textContent = page.title;
    ql.appendChild(a);
  });

  renderLucideIcons();
}

/* ─── Sidebar (accordion) — used for desktop sidebar AND mobile drawer ──── */
function sidebarSectionsHTML() {
  const byTier = new Map();
  navData.sections.forEach((section, si) => {
    const tier = getSectionKind(section);
    if (!byTier.has(tier)) byTier.set(tier, []);
    byTier.get(tier).push({ section, si });
  });
  const orderedTiers = [
    ...TIER_ORDER.filter(t => byTier.has(t)),
    ...[...byTier.keys()].filter(t => !TIER_ORDER.includes(t)),
  ];

  return orderedTiers.map(tier => {
    const header = `<div class="sb-tier-header">${escapeHtml(tier)}</div>`;
    const sections = byTier.get(tier).map(({ section, si }) => `
    <div class="sb-section" data-section-idx="${si}" data-section-title="${escapeAttr(section.title)}" data-open="false">
      <button class="sb-section-btn" type="button">
        <span class="sb-section-icon">${sectionIconTag(section)}</span>
        <span class="sb-section-title">${escapeHtml(section.title)}</span>
        <span class="sb-section-count">${section.pages.length}</span>
        <svg class="chev" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="m4 2 4 4-4 4"/></svg>
      </button>
      <div class="sb-pages">
        ${section.pages.map(page => `<a class="sb-link" data-file="${escapeAttr(page.file)}" href="${escapeAttr(getPageUrl(page))}">${escapeHtml(page.title)}</a>`).join('')}
      </div>
    </div>`).join('');
    return header + sections;
  }).join('');
}

function wireSidebarContainer(container) {
  container.addEventListener('click', e => {
    const secBtn = e.target.closest('.sb-section-btn');
    if (secBtn) {
      const sec = secBtn.parentElement;
      sec.dataset.open = sec.dataset.open === 'true' ? 'false' : 'true';
      return;
    }
    const link = e.target.closest('.sb-link');
    if (link) {
      e.preventDefault();
      loadPage(link.dataset.file);
      closeDrawer();
    }
  });
}

function buildSidebar() {
  const container = document.getElementById('sb-sections');
  container.innerHTML = sidebarSectionsHTML();
  wireSidebarContainer(container);
  renderLucideIcons();
}

function buildMobileDrawer() {
  const container = document.getElementById('drawer-sections');
  container.innerHTML = sidebarSectionsHTML();
  wireSidebarContainer(container);
  renderLucideIcons();
}

/* ─── Flat list ─────────────────────────────────────────────────────────── */
function buildFlatList() {
  allPages = [];
  const slugCounts = new Map();
  navData.sections.forEach(section => {
    section.pages.forEach(page => {
      const baseSlug = normalizeRouteKey(page.slug || derivePageSlug(page.file));
      const seenCount = slugCounts.get(baseSlug) || 0;
      page.slug = seenCount === 0 ? baseSlug : `${baseSlug}-${seenCount + 1}`;
      slugCounts.set(baseSlug, seenCount + 1);
      allPages.push({
        ...page,
        sectionTitle: section.title,
      });
    });
  });
}

/* ─── Load page ─────────────────────────────────────────────────────────── */
async function loadPage(file, targetHeading = null, historyMode = 'push') {
  const page = allPages.find(candidate => candidate.file === file);
  currentFile = file;
  showArticleView();
  setActiveState(file);
  showLoading();

  let md;
  try {
    const res = await fetch(resolveContentUrl(file));
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    md = await res.text();
    currentMarkdown = md;
  } catch (e) {
    showError(`Could not load: ${file}`, e.message);
    return;
  }

  const html = renderMarkdown(md);
  const article = document.getElementById('article');
  article.innerHTML = html;
  article.style.display = '';

  // Insert sticky meta-row after the first h1 (before other post-processing so TOC can attach to it).
  insertMetaRow(article, page);

  decorateHeadings(article, file);
  postProcessCallouts(article);
  postProcessTabs(article);
  postProcessImages(article);
  postProcessTables(article);
  postProcessInternalLinks(article);
  decorateCodeBlocks(article);
  appendPageFeedback(article, page, file);

  renderPageNav(file);
  buildToc(article, file);
  updateBreadcrumb(page);
  hideLoading();

  let resolvedHeadingId = null;
  if (targetHeading) {
    const match = findHeadingTarget(article, targetHeading);
    if (match) {
      resolvedHeadingId = match.id;
      focusHeading(match);
    } else {
      window.scrollTo(0, 0);
    }
  } else {
    window.scrollTo(0, 0);
  }

  if (page) {
    const nextUrl = resolvedHeadingId ? getPageHeadingUrl(page, resolvedHeadingId) : getPageUrl(page);
    if (historyMode === 'replace') history.replaceState(null, '', nextUrl);
    else if (historyMode === 'push') history.pushState(null, '', nextUrl);
  }
}

const DOCS_REPO_SLUG = 'aronprins/paperclip-docs';
const DOCS_REPO_BRANCH = 'main';

function appendPageFeedback(article, page, file) {
  if (!page || !file) return;
  const repoPath = 'docs/' + normalizeDocPath(file).replace(/^(\.\.\/)+/, '');
  const pageTitle = page.title || (article.querySelector('h1')?.textContent.trim() ?? 'Docs');
  const docsUrl = location.origin + getPageUrl(page);
  const editUrl = `https://github.com/${DOCS_REPO_SLUG}/edit/${DOCS_REPO_BRANCH}/${repoPath}`;
  const issueUrl = `https://github.com/${DOCS_REPO_SLUG}/issues/new?` + new URLSearchParams({
    template: '03-docs-feedback.yml',
    title: `[Docs]: ${pageTitle}`,
    'docs_page': docsUrl,
  }).toString();

  const editIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>';
  const issueIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>';

  const block = document.createElement('div');
  block.className = 'page-feedback';
  block.innerHTML = `
    <span class="pf-label">Help us improve this page</span>
    <span class="pf-actions">
      <a href="${escapeHtml(editUrl)}" target="_blank" rel="noopener">${editIcon}Suggest an edit</a>
      <a href="${escapeHtml(issueUrl)}" target="_blank" rel="noopener">${issueIcon}Report an issue</a>
    </span>
  `;
  article.appendChild(block);
}

function insertMetaRow(article, page) {
  if (!page) return;
  const h1 = article.querySelector('h1');
  if (!h1) return;
  if (article.querySelector('.meta-row')) return;
  const row = document.createElement('div');
  row.className = 'meta-row';
  row.innerHTML = `<span class="chip">${escapeHtml(page.sectionTitle)}</span><span class="spacer"></span>`;
  h1.after(row);
  row.appendChild(buildPageActions(page));
}

function buildPageActions(page) {
  const COPY_SVG   = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="5" width="9" height="9" rx="1.5"/><path d="M11 5V3.5A1.5 1.5 0 0 0 9.5 2h-5A1.5 1.5 0 0 0 3 3.5v5A1.5 1.5 0 0 0 4.5 10H6"/></svg>';
  const CHECK_SVG  = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m3.5 8.5 3 3 6-7"/></svg>';
  const CARET_SVG  = '<svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="m3 4.5 3 3 3-3"/></svg>';
  const MD_SVG     = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="12" height="10" rx="1.5"/><path d="M4.5 10V6l1.5 2L7.5 6v4M10 6v4M10 10l1.5-1.5L13 10"/></svg>';
  const EXT_SVG    = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 3h4v4M13 3 7.5 8.5M12 9v3.5A1.5 1.5 0 0 1 10.5 14h-7A1.5 1.5 0 0 1 2 12.5v-7A1.5 1.5 0 0 1 3.5 4H7"/></svg>';

  const wrap = document.createElement('div');
  wrap.className = 'page-actions';
  wrap.innerHTML = `
    <button type="button" class="pa-btn pa-copy" aria-label="Copy page as Markdown">
      ${COPY_SVG}<span class="pa-copy-label">Copy Page</span>
    </button>
    <button type="button" class="pa-btn pa-caret" aria-expanded="false" aria-label="More page actions">
      ${CARET_SVG}
    </button>
    <div class="pa-menu" role="menu">
      <button type="button" data-action="copy" role="menuitem">${COPY_SVG}<span>Copy Page</span></button>
      <button type="button" data-action="view-md" role="menuitem">${MD_SVG}<span>View as Markdown</span></button>
      <button type="button" data-action="open-claude" role="menuitem">${EXT_SVG}<span>Open in Claude</span></button>
      <button type="button" data-action="open-chatgpt" role="menuitem">${EXT_SVG}<span>Open in ChatGPT</span></button>
    </div>
  `;

  const copyBtn  = wrap.querySelector('.pa-copy');
  const caret    = wrap.querySelector('.pa-caret');
  const menu     = wrap.querySelector('.pa-menu');
  const label    = copyBtn.querySelector('.pa-copy-label');

  const closeMenu = () => { menu.classList.remove('is-open'); caret.setAttribute('aria-expanded', 'false'); };
  const openMenu  = () => { menu.classList.add('is-open'); caret.setAttribute('aria-expanded', 'true'); };

  const flashCopied = () => {
    copyBtn.classList.add('is-copied');
    copyBtn.innerHTML = `${CHECK_SVG}<span class="pa-copy-label">Copied</span>`;
    setTimeout(() => {
      copyBtn.classList.remove('is-copied');
      copyBtn.innerHTML = `${COPY_SVG}<span class="pa-copy-label">Copy Page</span>`;
    }, 1600);
  };

  const copyMarkdown = async () => {
    try {
      await navigator.clipboard.writeText(currentMarkdown || '');
      flashCopied();
    } catch (e) {
      console.error('Copy failed', e);
    }
  };

  const mdUrl = () => new URL(resolveContentUrl(page.file), location.href).href;
  const llmPrompt = () => `Read ${location.href} so I can ask questions about it.`;

  copyBtn.addEventListener('click', copyMarkdown);
  caret.addEventListener('click', e => {
    e.stopPropagation();
    menu.classList.contains('is-open') ? closeMenu() : openMenu();
  });
  menu.addEventListener('click', e => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    closeMenu();
    switch (btn.dataset.action) {
      case 'copy':         copyMarkdown(); break;
      case 'view-md':      window.open(mdUrl(), '_blank', 'noopener'); break;
      case 'open-claude':  window.open(`https://claude.ai/new?q=${encodeURIComponent(llmPrompt())}`, '_blank', 'noopener'); break;
      case 'open-chatgpt': window.open(`https://chatgpt.com/?hints=search&q=${encodeURIComponent(llmPrompt())}`, '_blank', 'noopener'); break;
    }
  });
  document.addEventListener('click', e => {
    if (menu.classList.contains('is-open') && !wrap.contains(e.target)) closeMenu();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && menu.classList.contains('is-open')) closeMenu();
  });

  return wrap;
}

function updateBreadcrumb(page) {
  const bc = document.getElementById('breadcrumb');
  if (!bc) return;
  if (!page) { bc.innerHTML = ''; return; }
  bc.innerHTML = `
    <span>${escapeHtml(page.sectionTitle)}</span>
    <span class="sep">/</span>
    <span class="crumb-current">${escapeHtml(page.title)}</span>
  `;
}

/* ─── Active state ──────────────────────────────────────────────────────── */
function setActiveState(file) {
  const page = allPages.find(p => p.file === file);
  if (!page) return;

  [document.getElementById('sb-sections'), document.getElementById('drawer-sections')].forEach(container => {
    if (!container) return;
    container.querySelectorAll('.sb-section').forEach(sec => {
      const isActive = sec.dataset.sectionTitle === page.sectionTitle;
      if (isActive) sec.dataset.open = 'true';
    });
    container.querySelectorAll('.sb-link').forEach(link => {
      link.classList.toggle('active', link.dataset.file === file);
    });
  });
}

/* ─── Markdown ──────────────────────────────────────────────────────────── */
function renderMarkdown(md) {
  md = preprocessTabs(md);
  marked.setOptions({ gfm: true, breaks: false });
  return marked.parse(md);
}

function renderTabsBlock(labels, body) {
  const names = labels.split(',').map(s => s.trim());
  let out = `<div class="tabs-container">`;
  out += `<div class="tabs-bar">`;
  names.forEach((name, i) => {
    out += `<button class="tab-btn${i === 0 ? ' active' : ''}" data-tab="${escapeAttr(name)}">${escapeHtml(name)}</button>`;
  });
  out += `</div>`;
  const re = /<!-- tab: (.+?) -->([\s\S]*?)(?=<!-- tab:|$)/g;
  let m;
  let idx = 0;
  while ((m = re.exec(body)) !== null) {
    out += `<div class="tab-panel${idx === 0 ? ' active' : ''}" data-panel="${escapeAttr(m[1].trim())}">`;
    out += marked.parse(m[2].trim());
    out += `</div>`;
    idx++;
  }
  return out + `</div>`;
}

function preprocessTabs(md) {
  // Process innermost <!-- tabs: ... --> <!-- /tabs --> blocks first, so
  // nested tab groups resolve correctly. Loops until no more pairs remain.
  const OPEN = '<!-- tabs:';
  const CLOSE = '<!-- /tabs -->';
  const MAX_ITERATIONS = 100;

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const closeIdx = md.indexOf(CLOSE);
    if (closeIdx === -1) break;
    // Find the nearest preceding <!-- tabs: opener (innermost match)
    const openIdx = md.lastIndexOf(OPEN, closeIdx - 1);
    if (openIdx === -1) break;
    const afterOpen = md.indexOf('-->', openIdx);
    if (afterOpen === -1 || afterOpen > closeIdx) break;
    const labels = md.slice(openIdx + OPEN.length, afterOpen).trim();
    const body = md.slice(afterOpen + 3, closeIdx);
    const replacement = renderTabsBlock(labels, body);
    md = md.slice(0, openIdx) + replacement + md.slice(closeIdx + CLOSE.length);
  }
  return md;
}

const CALLOUT_ICONS = {
  note:    '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',
  info:    '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',
  tip:     '<path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/>',
  warning: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
  danger:  '<path d="M12 16h.01"/><path d="M12 8v4"/><path d="M15.312 2a2 2 0 0 1 1.414.586l4.688 4.688A2 2 0 0 1 22 8.688v6.624a2 2 0 0 1-.586 1.414l-4.688 4.688a2 2 0 0 1-1.414.586H8.688a2 2 0 0 1-1.414-.586l-4.688-4.688A2 2 0 0 1 2 15.312V8.688a2 2 0 0 1 .586-1.414l4.688-4.688A2 2 0 0 1 8.688 2z"/>',
};

function buildCalloutIconSvg(type) {
  const inner = CALLOUT_ICONS[type] || CALLOUT_ICONS.info;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;
}

function postProcessCallouts(root) {
  root.querySelectorAll('blockquote').forEach(bq => {
    const firstP = bq.querySelector('p');
    if (!firstP) return;
    const text  = firstP.innerHTML;
    const match = text.match(/^<strong>(Note|Info|Tip|Warning|Danger):<\/strong>\s*/i);
    if (!match) return;
    const type  = match[1].toLowerCase();
    const wrap  = document.createElement('div');
    wrap.className = `callout callout-${type}`;
    const icon = document.createElement('span');
    icon.className = 'callout-icon';
    icon.innerHTML = buildCalloutIconSvg(type);
    const body = document.createElement('div');
    body.className = 'callout-body';
    firstP.innerHTML = `<span class="callout-label">${match[1]}:</span> ` + text.slice(match[0].length);
    body.innerHTML = bq.innerHTML;
    wrap.appendChild(icon);
    wrap.appendChild(body);
    bq.replaceWith(wrap);
  });
}

function postProcessTabs(root) {
  root.querySelectorAll('.tabs-container').forEach(c => {
    // Scope to DIRECT children so nested .tabs-container (e.g. "Get your API key"
    // inside an outer Desktop App/Terminal group) does not get its buttons or
    // panels toggled by the outer group's click handler.
    const btns   = c.querySelectorAll(':scope > .tabs-bar > .tab-btn');
    const panels = c.querySelectorAll(':scope > .tab-panel');
    const isCodeTabs = panels.length > 0 && [...panels].every((panel) => {
      const meaningfulChildren = [...panel.children].filter((child) => {
        if (!(child instanceof HTMLElement)) return false;
        return child.tagName !== 'SCRIPT' && child.tagName !== 'STYLE';
      });
      return meaningfulChildren.length === 1 && meaningfulChildren[0].tagName === 'PRE';
    });

    if (isCodeTabs) c.classList.add('code-tabs');

    btns.forEach(btn => {
      btn.addEventListener('click', () => {
        const name = btn.dataset.tab;
        btns.forEach(b   => b.classList.toggle('active', b === btn));
        panels.forEach(p => p.classList.toggle('active', p.dataset.panel === name));
      });
    });
  });
}

function postProcessImages(root) {
  root.querySelectorAll('img').forEach(img => {
    // Remap ../images/ paths to screenshots/{theme}/ and store original for theme swaps
    const rawSrc = img.getAttribute('src') || img.src;
    const resolved = resolveScreenshotSrc(rawSrc);
    if (resolved !== rawSrc) {
      img.dataset.screenshot = rawSrc; // store original path
      img.src = resolved;
    }
    img.addEventListener('error', () => {
      const ph = document.createElement('div');
      ph.className = 'img-placeholder';
      ph.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg><span>Screenshot: <em>${escapeHtml(img.alt || img.src)}</em></span>`;
      img.replaceWith(ph);
    });
  });
}

function postProcessTables(root) {
  root.querySelectorAll('table').forEach(table => {
    if (table.parentElement && table.parentElement.classList.contains('table-wrap')) return;
    const wrap = document.createElement('div');
    wrap.className = 'table-wrap';
    table.parentNode.insertBefore(wrap, table);
    wrap.appendChild(table);
  });
}

function postProcessInternalLinks(root) {
  root.querySelectorAll('a[href]').forEach(a => {
    const href = a.getAttribute('href');
    if (!href) return;

    // External links → new tab
    if (/^https?:\/\//i.test(href)) {
      const sameOrigin = (() => {
        try { return new URL(href).origin === window.location.origin; }
        catch { return false; }
      })();
      if (!sameOrigin) {
        a.setAttribute('target', '_blank');
        a.setAttribute('rel', 'noopener noreferrer');
      }
      return;
    }

    if (href.startsWith('#')) return;

    const [docHref, headingHref] = href.split('#');
    if (docHref && docHref.endsWith('.md')) {
      a.addEventListener('click', e => {
        e.preventDefault();
        const baseDir = currentFile.replace(/\/[^/]+$/, '/');
        loadPage(normalizeDocPath(baseDir + docHref), headingHref || null);
      });
    }
  });
}

/* ─── Table of contents (pill toggle + floating dropdown) ───────────────── */
function buildToc(article, file) {
  if (tocObserver) { tocObserver.disconnect(); tocObserver = null; }

  const metaRow = article.querySelector('.meta-row');
  if (!metaRow) return;

  // Clear previous (defensive)
  metaRow.querySelector('.toc-wrap')?.remove();

  const headings = [...article.querySelectorAll('h2, h3')];
  if (headings.length < 2) return;

  const page = allPages.find(candidate => candidate.file === file);

  const CHEVRON_SVG = '<svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="m3 4.5 3 3 3-3"/></svg>';
  const TOC_SVG = '<svg class="toc-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 4h10M3 8h7M3 12h9"/></svg>';

  const wrap = document.createElement('div');
  wrap.className = 'toc-wrap';
  wrap.innerHTML = `
    <button type="button" class="toc-toggle" aria-expanded="false" aria-controls="toc-panel" aria-label="On this page">
      ${TOC_SVG}
      <span class="toc-label">On this page</span>
      <span class="count">${headings.length}</span>
      ${CHEVRON_SVG}
    </button>
    <div class="toc-panel" id="toc-panel" role="menu">
      <div class="toc-panel-label">On this page</div>
    </div>
  `;
  const panel = wrap.querySelector('.toc-panel');
  const toggle = wrap.querySelector('.toc-toggle');
  const closePanel = () => { panel.classList.remove('is-open'); toggle.setAttribute('aria-expanded', 'false'); };
  const openPanel = () => { panel.classList.add('is-open'); toggle.setAttribute('aria-expanded', 'true'); };

  headings.forEach(h => {
    const a = document.createElement('a');
    a.className = `toc-link ${h.tagName === 'H3' ? 'level-3' : 'level-2'}`;
    a.dataset.headingId = h.id;
    // Use textContent minus the trailing heading-anchor (the anchor was appended after text, so textContent
    // after decorateHeadings still has the svg text — but textContent on an <a> with svg is empty. Safe to use h.textContent which
    // includes only text nodes and keyboard chars from svg text (none). In practice this works.
    a.textContent = h.textContent.trim();
    a.href = page ? getPageHeadingUrl(page, h.id) : `#${h.id}`;
    a.addEventListener('click', e => {
      e.preventDefault();
      if (page) history.pushState(null, '', getPageHeadingUrl(page, h.id));
      focusHeading(h);
      closePanel();
    });
    panel.appendChild(a);
  });
  metaRow.appendChild(wrap);

  toggle.addEventListener('click', e => {
    e.stopPropagation();
    panel.classList.contains('is-open') ? closePanel() : openPanel();
  });
  document.addEventListener('click', e => {
    if (panel.classList.contains('is-open') && !wrap.contains(e.target)) closePanel();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && panel.classList.contains('is-open')) closePanel();
  });

  const links = panel.querySelectorAll('.toc-link');
  tocObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const id = entry.target.id;
        links.forEach(l => l.classList.toggle('active', l.dataset.headingId === id));
      }
    });
  }, { rootMargin: `-${56 + 40 + 20}px 0px -68% 0px`, threshold: 0 });

  headings.forEach(h => tocObserver.observe(h));
}

/* ─── Prev/next ─────────────────────────────────────────────────────────── */
function renderPageNav(file) {
  const nav = document.getElementById('page-nav');
  const idx = allPages.findIndex(p => p.file === file);
  if (idx === -1) { nav.style.display = 'none'; return; }
  const prev = allPages[idx - 1];
  const next = allPages[idx + 1];
  nav.innerHTML = '';

  if (prev) {
    const btn = document.createElement('button');
    btn.className = 'page-nav-btn prev';
    btn.innerHTML = `<span class="page-nav-label">← Previous</span><span class="page-nav-title">${escapeHtml(prev.title)}</span>`;
    btn.addEventListener('click', () => loadPage(prev.file));
    nav.appendChild(btn);
  } else {
    nav.appendChild(Object.assign(document.createElement('div'), { className: 'page-nav-spacer' }));
  }

  if (next) {
    const btn = document.createElement('button');
    btn.className = 'page-nav-btn next';
    btn.innerHTML = `<span class="page-nav-label">Next →</span><span class="page-nav-title">${escapeHtml(next.title)}</span>`;
    btn.addEventListener('click', () => loadPage(next.file));
    nav.appendChild(btn);
  }

  nav.style.display = (prev || next) ? 'flex' : 'none';
}

/* ─── Helpers ───────────────────────────────────────────────────────────── */
function showLoading() {
  document.getElementById('loading').style.display     = 'flex';
  document.getElementById('error-state').style.display = 'none';
  document.getElementById('article').style.display     = 'none';
  document.getElementById('page-nav').style.display    = 'none';
}

function hideLoading() { document.getElementById('loading').style.display = 'none'; }

function showError(msg, detail = '') {
  // Error state lives inside article-view; make sure the right view is showing.
  showArticleView();
  document.getElementById('loading').style.display     = 'none';
  document.getElementById('article').style.display     = 'none';
  document.getElementById('page-nav').style.display    = 'none';
  document.getElementById('error-state').style.display = 'flex';
  document.getElementById('error-state').querySelector('span').textContent = msg;
  document.getElementById('error-detail').textContent  = detail;
}

function escapeHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function escapeAttr(s) { return String(s).replace(/"/g,'&quot;'); }

window.addEventListener('hashchange', () => {
  const route = parseRoute(applyRedirect(location.hash.slice(1)));
  if (route.page) {
    loadPage(route.page.file, route.headingId, 'replace');
  } else {
    const raw = normalizeRouteKey(decodeURIComponent(location.hash.slice(1).trim()));
    if (!raw) showLanding();
  }
});

window.addEventListener('popstate', () => {
  const route = parseRoute(applyRedirect(getCurrentRoute()));
  if (route.page) {
    loadPage(route.page.file, route.headingId, 'replace');
    return;
  }
  const raw = normalizeRouteKey(decodeURIComponent((getCurrentRoute() || '').trim()));
  if (!raw) showLanding();
});

init();
