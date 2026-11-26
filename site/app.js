/* ─── Section icons ─────────────────────────────────────────────────────── */
const SECTION_ICON_PATHS = {
  'book-open': '<path d="M12 7v14"/><path d="M3 18a2 2 0 0 1 2-2h7V5H5a2 2 0 0 0-2 2z"/><path d="M21 18a2 2 0 0 0-2-2h-7V5h7a2 2 0 0 1 2 2z"/>',
  braces: '<path d="M8 3H7a2 2 0 0 0-2 2v3a2 2 0 0 1-2 2 2 2 0 0 1 2 2v3a2 2 0 0 0 2 2h1"/><path d="M16 21h1a2 2 0 0 0 2-2v-3a2 2 0 0 1 2-2 2 2 0 0 1-2-2V9a2 2 0 0 0-2-2h-1"/>',
  cloud: '<path d="M17.5 19H8a5 5 0 1 1 1.1-9.9A7 7 0 0 1 22 12.5 4.5 4.5 0 0 1 17.5 19z"/>',
  'kanban-square': '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M8 7v10"/><path d="M12 7v6"/><path d="M16 7v3"/>',
  'layout-dashboard': '<rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/>',
  network: '<rect x="16" y="16" width="6" height="6" rx="1"/><rect x="2" y="16" width="6" height="6" rx="1"/><rect x="9" y="2" width="6" height="6" rx="1"/><path d="M12 8v4M5 16v-2a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v2"/>',
  package: '<path d="m12 3 8 4.5v9L12 21l-8-4.5v-9z"/><path d="m4 7.5 8 4.5 8-4.5"/><path d="M12 12v9"/>',
  plug: '<path d="M12 22v-5"/><path d="M9 8V2"/><path d="M15 8V2"/><path d="M7 8h10v4a5 5 0 0 1-10 0z"/>',
  puzzle: '<path d="M19 13h-2.5a1.5 1.5 0 0 0 0 3H19v3H5v-3h2.5a1.5 1.5 0 0 0 0-3H5V5h4a2 2 0 1 1 4 0h6z"/>',
  rocket: '<path d="M4.5 16.5c-1.2 1-1.5 3-1.5 3s2-.3 3-1.5"/><path d="M9 15 6 12c2-5 6-8 13-9-1 7-4 11-9 13z"/><path d="M15 9h.01"/>',
  'settings-2': '<path d="M20 7h-9"/><path d="M14 17H4"/><circle cx="7" cy="7" r="3"/><circle cx="17" cy="17" r="3"/>',
  shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
  terminal: '<path d="m4 17 6-6-6-6"/><path d="M12 19h8"/>',
  unplug: '<path d="m19 5 3-3"/><path d="m2 22 3-3"/><path d="M6.3 20.3a2.4 2.4 0 0 0 3.4 0L12 18l-6-6-2.3 2.3a2.4 2.4 0 0 0 0 3.4z"/><path d="M7.5 13.5 10 11"/><path d="M10.5 16.5 13 14"/><path d="m12 6 6 6 2.3-2.3a2.4 2.4 0 0 0 0-3.4l-2.6-2.6a2.4 2.4 0 0 0-3.4 0z"/>',
  wrench: '<path d="M14.7 6.3a4 4 0 0 0-5 5L3 18l3 3 6.7-6.7a4 4 0 0 0 5-5l-2.4 2.4-3-3z"/>',
};

function sectionIconTag(section) {
  const icon = SECTION_ICON_PATHS[section?.icon] || SECTION_ICON_PATHS['book-open'];
  return `<svg class="section-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icon}</svg>`;
}
function renderLucideIcons() {}
function getSectionKind(section) {
  if (section && typeof section === 'object') return section.tier || 'Guides';
  return 'Guides';
}
const TIER_ORDER = ['Learn', 'Administration', 'Reference'];

/* ─── Theme bootstrap (before first paint of body) ──────────────────────── */
(function() {
  const saved = localStorage.getItem('pc-guides-theme') || 'dark';
  if (saved === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
  else document.documentElement.removeAttribute('data-theme');
})();
window.addEventListener('load', () => {
  requestAnimationFrame(() => document.documentElement.classList.add('motion-ready'));
}, { once: true });

/* ─── State ─────────────────────────────────────────────────────────────── */
let navData     = null;
let allPages    = [];
let currentFile = null;
let currentMarkdown = '';
let tocObserver = null;
let tocScrollHandler = null;
let tocResizeHandler = null;
let tocDocumentClickHandler = null;
let tocKeydownHandler = null;
let markdownRendererPromise = null;
const SEO_SITE_NAME = 'Paperclip Docs';
const SEO_DEFAULT_TITLE = 'Paperclip Docs';
const SEO_DEFAULT_DESCRIPTION = 'Guides, references, and walkthroughs for running Paperclip, an AI company operating system for agent teams, governance, budgets, and workflows.';
const SEO_HOME_TITLE = 'Paperclip Docs: Control Plane for AI Agent Teams';
const SEO_HOME_DESCRIPTION = 'Docs for Paperclip, the org chart for AI agents. Install it, hire agents, connect Claude Code, Codex, and OpenCode, and set budgets and approvals.';
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

function ensureMarkdownRenderer() {
  if (window.marked) return Promise.resolve(window.marked);
  if (!markdownRendererPromise) {
    markdownRendererPromise = new Promise((resolve, reject) => {
      const existing = document.querySelector('script[data-markdown-renderer]');
      if (existing) {
        existing.addEventListener('load', () => resolve(window.marked), { once: true });
        existing.addEventListener('error', () => reject(new Error('Markdown renderer failed to load.')), { once: true });
        return;
      }

      const script = document.createElement('script');
      script.src = resolveContentUrl('vendor/marked.min.js');
      script.defer = true;
      script.dataset.markdownRenderer = '';
      script.addEventListener('load', () => {
        if (window.marked) resolve(window.marked);
        else reject(new Error('Markdown renderer failed to initialize.'));
      }, { once: true });
      script.addEventListener('error', () => reject(new Error('Markdown renderer failed to load.')), { once: true });
      document.head.appendChild(script);
    });
  }
  return markdownRendererPromise;
}

async function fetchMarkdown(file) {
  const res = await fetch(resolveContentUrl(file));
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

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

/* ─── Shared markdown link resolution ───────────────────────────────────── */
// The three functions between the DOC-LINK-RESOLVER markers define what a
// relative markdown href means, and they have a twin in site/build-release.mjs
// (normalizeDocPath / docLinkBaseDir / resolveDocLinkTarget, used by
// resolveDocHref). The build rewrites links into canonical routes so crawlers
// index correct bytes; this client resolves the same links again at runtime
// against markdown it fetched itself. When the two disagree, a link looks
// right in the pre-render and breaks on click.
//
// scripts/verify-doc-link-resolution.mjs lifts this block straight out of the
// source and pins both copies to one shared case table.
// DOC-LINK-RESOLVER:BEGIN
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

function docLinkBaseDir(sourceFile) {
  // A document at the docs root has no directory to resolve against. Trimming
  // with a `/`-anchored pattern matched nothing for those files and left the
  // filename in the base, so `connectors.md` + `connectors/access-model.md`
  // resolved to `connectors.mdconnectors/access-model.md` (PAP-18407).
  return typeof sourceFile === 'string' && sourceFile.includes('/')
    ? sourceFile.replace(/\/[^/]*$/, '')
    : '';
}

function resolveDocLinkTarget(docHref, sourceFile) {
  const baseDir = docLinkBaseDir(sourceFile);
  return normalizeDocPath(baseDir ? `${baseDir}/${docHref}` : docHref);
}
// DOC-LINK-RESOLVER:END

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

function isNavPage(node) {
  return Boolean(node && typeof node === 'object' && typeof node.file === 'string');
}

function getNavChildren(node) {
  return Array.isArray(node?.pages) ? node.pages : [];
}

function countNavPages(nodes) {
  return getNavChildren({ pages: nodes }).reduce((count, node) => {
    if (isNavPage(node)) return count + 1;
    return count + countNavPages(getNavChildren(node));
  }, 0);
}

function getFirstNavPage(nodes) {
  for (const node of getNavChildren({ pages: nodes })) {
    if (isNavPage(node)) return node;
    const firstChild = getFirstNavPage(getNavChildren(node));
    if (firstChild) return firstChild;
  }
  return null;
}

function pageTrail(page) {
  return Array.isArray(page?.navTrail) && page.navTrail.length
    ? page.navTrail
    : [page?.sectionTitle, page?.title].filter(Boolean);
}

function pageGroupLabel(page) {
  const trail = pageTrail(page);
  return trail.slice(0, -1).join(' / ') || page?.sectionTitle || '';
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
  return normalized ? `${basePath}/${normalized}/` : `${basePath}/`;
}

function getPageUrl(page) {
  return getRouteUrl(buildRouteValue(page));
}

function getPageHeadingUrl(page, headingId) {
  return `${getPageUrl(page)}#${encodeURIComponent(headingId)}`;
}

function getAbsoluteUrl(path) {
  return new URL(path, window.location.origin).toString();
}

function getAbsolutePageUrl(page) {
  return getAbsoluteUrl(page ? getPageUrl(page) : getRouteUrl(''));
}

function setHeadElement(selector, tagName, attrs) {
  let el = document.head.querySelector(selector);
  if (!el) {
    el = document.createElement(tagName);
    el.dataset.seoManaged = '';
    document.head.appendChild(el);
  }
  for (const [name, value] of Object.entries(attrs)) {
    el.setAttribute(name, value);
  }
  return el;
}

const INDEXABLE_ROBOTS = 'index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1';

// Keep in step with robotsMetaContent() in site/build-release.mjs. A retired
// page's static HTML is noindex; client navigation must not flip it back.
function robotsDirectiveForPage(page) {
  const tokens = String(page?.frontmatter?.robots || '')
    .split(',')
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean);
  if (tokens.includes('noindex')) return 'noindex, follow';
  return INDEXABLE_ROBOTS;
}

function setSeoMetadata({ title, description, url, type = 'website', robots = INDEXABLE_ROBOTS }) {
  const cleanTitle = title || SEO_DEFAULT_TITLE;
  const cleanDescription = description || SEO_DEFAULT_DESCRIPTION;
  const cleanUrl = url || getAbsolutePageUrl(null);
  document.title = cleanTitle;
  setHeadElement('meta[name="description"]', 'meta', { name: 'description', content: cleanDescription });
  setHeadElement('meta[name="robots"]', 'meta', {
    name: 'robots',
    content: robots,
  });
  setHeadElement('link[rel="canonical"]', 'link', { rel: 'canonical', href: cleanUrl });
  setHeadElement('meta[property="og:type"]', 'meta', { property: 'og:type', content: type });
  setHeadElement('meta[property="og:site_name"]', 'meta', { property: 'og:site_name', content: SEO_SITE_NAME });
  setHeadElement('meta[property="og:title"]', 'meta', { property: 'og:title', content: cleanTitle });
  setHeadElement('meta[property="og:description"]', 'meta', { property: 'og:description', content: cleanDescription });
  setHeadElement('meta[property="og:url"]', 'meta', { property: 'og:url', content: cleanUrl });
  setHeadElement('meta[name="twitter:card"]', 'meta', { name: 'twitter:card', content: 'summary' });
  setHeadElement('meta[name="twitter:title"]', 'meta', { name: 'twitter:title', content: cleanTitle });
  setHeadElement('meta[name="twitter:description"]', 'meta', { name: 'twitter:description', content: cleanDescription });
}

function markdownToDescription(md) {
  const plain = stripFrontmatter(md)
    .replace(/```[\s\S]*?```/g, ' ')
    .split(/\n{2,}/)
    .map(block => block.trim())
    .find(block =>
      block &&
      !block.startsWith('#') &&
      !block.startsWith('![') &&
      !block.startsWith('|') &&
      !block.startsWith('---')
    );
  if (!plain) return SEO_DEFAULT_DESCRIPTION;
  return plain
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[*_`>#-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 220);
}

function updateLandingSeo() {
  setSeoMetadata({
    title: SEO_HOME_TITLE,
    description: SEO_HOME_DESCRIPTION,
    url: getAbsolutePageUrl(null),
    type: 'website',
  });
}

/* GA4 page views. The head snippet loads gtag.js with send_page_view: false,
   so nothing is counted until this runs. Call it after the URL and
   document.title have settled: once for the initial route, and once for each
   later document change. Hash-only heading jumps are not document changes.
   The same path is ignored so the first load cannot be counted twice.
   This does not use enhanced measurement history events. That GA4 setting
   listens for pushState/replaceState and would send a second page_view. */
let lastAnalyticsPath = null;
function trackPageView() {
  if (typeof window.gtag !== 'function') return;
  const pagePath = `${location.pathname}${location.search}`;
  if (pagePath === lastAnalyticsPath) return;
  lastAnalyticsPath = pagePath;
  window.gtag('event', 'page_view', {
    page_title: document.title,
    page_path: pagePath,
    page_location: `${location.origin}${pagePath}`,
  });
}

function updatePageSeo(page, md) {
  if (!page) return;
  // Match the server-rendered head exactly. Authored frontmatter wins, so a
  // client-side transition cannot leave a different title or description on
  // screen than the one the crawler was served for the same route.
  const authoredTitle = page.frontmatter?.seo_title?.trim();
  const authoredDescription = page.frontmatter?.seo_description?.trim();
  setSeoMetadata({
    title: `${authoredTitle || page.title} | Paperclip Docs`,
    description: authoredDescription || markdownToDescription(md),
    url: getAbsolutePageUrl(page),
    type: 'article',
    robots: robotsDirectiveForPage(page),
  });
}

function getLegacyRoute() {
  const url = new URL(window.location.href);
  const hash = location.hash.startsWith('#/') ? location.hash.slice(2) : location.hash.slice(1);
  return url.searchParams.get('page') || hash;
}

function getPathRoute() {
  const relativePath = normalizeRouteKey(window.location.pathname.slice(APP_BASE_PATH.length));
  if (!relativePath || relativePath === 'index.html') return '';
  return relativePath.replace(/\/index\.html$/, '');
}

function getCurrentRoute() {
  return getPathRoute() || getLegacyRoute();
}

function getCurrentHeadingRoute() {
  const pathRoute = getPathRoute();
  if (!pathRoute || !location.hash || location.hash.startsWith('#/')) return null;
  return normalizeRouteKey(decodeURIComponent(location.hash.slice(1)));
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

function decorateHeadings(article, file, unlistedPage = null) {
  const page = unlistedPage || allPages.find(candidate => candidate.file === file);
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

// A ```prompt block is text the reader pastes into an agent or assistant. It
// gets a labelled header with an always-visible "Copy prompt" button, rather
// than the hover-only icon code blocks use, so the action is obvious.
function decoratePromptBlock(pre, copySvg, checkSvg) {
  const wrap = document.createElement('div');
  wrap.className = 'prompt-wrap';
  pre.parentNode.insertBefore(wrap, pre);

  const header = document.createElement('div');
  header.className = 'prompt-header';
  const label = document.createElement('span');
  label.className = 'prompt-label';
  label.textContent = 'Prompt';
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'prompt-copy';
  const idle = `${copySvg}<span>Copy prompt</span>`;
  btn.innerHTML = idle;
  btn.addEventListener('click', async () => {
    try {
      await copyText((pre.querySelector('code') || pre).textContent.trim());
      btn.classList.add('is-copied');
      btn.innerHTML = `${checkSvg}<span>Copied</span>`;
      setTimeout(() => {
        btn.classList.remove('is-copied');
        btn.innerHTML = idle;
      }, 1500);
    } catch {}
  });
  header.append(label, btn);
  wrap.append(header, pre);
}

function decorateCodeBlocks(article) {
  const COPY_SVG = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="5" width="9" height="9" rx="1.5"/><path d="M3 11V3a1 1 0 0 1 1-1h7"/></svg>';
  const CHECK_SVG = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m3 8 3.5 3.5L13 5"/></svg>';
  const DOWNLOAD_SVG = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8 2v8"/><path d="M4.5 7 8 10.5 11.5 7"/><path d="M3 13h10"/></svg>';
  article.querySelectorAll('pre').forEach(pre => {
    if (pre.parentElement?.classList.contains('code-wrap')) return;
    if (pre.parentElement?.classList.contains('prompt-wrap')) return;
    if (pre.classList.contains('prompt-block')) {
      decoratePromptBlock(pre, COPY_SVG, CHECK_SVG);
      return;
    }
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

    // Blocks that advertise a downloadable filename (the authoritative skill
    // source) get a Download control beside Copy, sharing its dimensions,
    // styling, and hover/focus visibility (see .code-download in styles.css).
    const downloadable = pre.querySelector('code[data-skill-download]');
    const filename = downloadable?.getAttribute('data-skill-download');
    if (downloadable && filename) {
      const dl = document.createElement('button');
      dl.className = 'code-download';
      dl.type = 'button';
      dl.setAttribute('aria-label', `Download ${filename}`);
      dl.title = `Download ${filename}`;
      dl.innerHTML = DOWNLOAD_SVG;
      dl.addEventListener('click', () => {
        try {
          const blob = new Blob([downloadable.textContent], { type: 'text/markdown' });
          const url = URL.createObjectURL(blob);
          const anchor = document.createElement('a');
          anchor.href = url;
          anchor.download = filename;
          document.body.appendChild(anchor);
          anchor.click();
          anchor.remove();
          setTimeout(() => URL.revokeObjectURL(url), 0);
          dl.classList.add('is-copied');
          dl.innerHTML = CHECK_SVG;
          setTimeout(() => {
            dl.classList.remove('is-copied');
            dl.innerHTML = DOWNLOAD_SVG;
          }, 1200);
        } catch {}
      });
      wrap.appendChild(dl);
    }
  });
}

/* ─── GitHub star count (mirrors paperclip.ing) ────────────────────────── */
(function () {
  const REPO = 'paperclipai/paperclip';
  const TTL_MS = 6 * 60 * 60 * 1000; // 6h
  const CACHE_KEY = 'pc-docs-star-count';
  const els = document.querySelectorAll('[data-star-count]');
  if (!els.length) return;

  function format(n) {
    if (n >= 1000) return (n / 1000).toFixed(n >= 10000 ? 0 : 1).replace(/\.0$/, '') + 'k';
    return String(n);
  }
  function render(text) {
    els.forEach(el => { el.textContent = text; el.hidden = false; });
  }

  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const { count, ts } = JSON.parse(cached);
      if (typeof count === 'number') {
        render(format(count));
        if (Date.now() - ts < TTL_MS) return;
      }
    }
  } catch (_) {}

  const refresh = () => {
    fetch('https://api.github.com/repos/' + REPO, {
      headers: { 'Accept': 'application/vnd.github.v3+json' },
    })
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        if (!data || typeof data.stargazers_count !== 'number') return;
        render(format(data.stargazers_count));
        try { localStorage.setItem(CACHE_KEY, JSON.stringify({ count: data.stargazers_count, ts: Date.now() })); } catch (_) {}
      })
      .catch(() => {});
  };
  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(refresh, { timeout: 3000 });
  } else {
    window.setTimeout(refresh, 1500);
  }
})();

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
    applyScreenshotSource(img, img.dataset.screenshot);
  });
});

/* ─── Mobile drawer ─────────────────────────────────────────────────────── */
function openDrawer() {
  const drawer = document.getElementById('drawer');
  const backdrop = document.getElementById('drawer-backdrop');
  const hamburger = document.getElementById('hamburger');
  drawer.inert = false;
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
  drawer.inert = true;
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
function docsRootUrl() {
  return `${APP_BASE_URL.pathname.replace(/\/$/, '')}/`;
}

function showLanding() {
  const landing = document.getElementById('landing');
  // Interior documents ship without the homepage subtree, so there is no view
  // to swap to — go to the real docs root instead.
  if (!landing) {
    window.location.assign(docsRootUrl());
    return;
  }
  landing.classList.add('is-active');
  document.getElementById('article-view').classList.remove('is-active');
  document.getElementById('breadcrumb').innerHTML = '';
  history.replaceState(null, '', docsRootUrl());
  updateLandingSeo();
  trackPageView();
}
function showArticleView() {
  // Only the docs root ships a homepage subtree, and once it hands off to an
  // article the hero is dropped rather than hidden — otherwise the live DOM
  // would keep a second H1 and the homepage headline on an interior route.
  document.getElementById('landing')?.remove();
  document.getElementById('article-view').classList.add('is-active');
}

/* Delegated nav clicks (logo, sb-back, landing cards, quick-link footer) */
document.addEventListener('click', e => {
  // Home nav (logo, back-to-all-docs)
  const home = e.target.closest('[data-nav="home"]');
  if (home) {
    // Without a homepage subtree on this document, let the anchor's real root
    // href navigate rather than intercepting into a view that does not exist.
    if (!document.getElementById('landing')) return;
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
    const firstPage = getFirstNavPage(section?.pages || []);
    if (firstPage) loadPage(firstPage.file);
    return;
  }
  // Landing quick link -> specific page
  const qlink = e.target.closest('[data-nav-file]');
  if (qlink) {
    e.preventDefault();
    loadPage(qlink.dataset.navFile);
    return;
  }
  const routeLink = e.target.closest('[data-nav="link"]');
  if (routeLink) {
    const route = parseRoute(applyRedirect(routeLink.getAttribute('href')));
    if (route.page) {
      e.preventDefault();
      loadPage(route.page.file, route.headingId);
    }
  }
});

/* ─── Search ────────────────────────────────────────────────────────────── */
let searchIndex      = [];
let searchFocusedIdx = -1;
let searchIndexPromise = null;

async function buildSearchIndex() {
  const tasks = allPages.map(async page => {
    try {
      const md = await fetchMarkdown(page.file);
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
      return { file: page.file, sectionTitle: pageGroupLabel(page), pageTitle: page.title, headings, text };
    } catch { return null; }
  });
  searchIndex = (await Promise.all(tasks)).filter(Boolean);
  return searchIndex;
}

function ensureSearchIndex() {
  if (searchIndex.length) return Promise.resolve(searchIndex);
  if (!searchIndexPromise) searchIndexPromise = buildSearchIndex();
  return searchIndexPromise;
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

function openSearchModal() {
  const modal = document.getElementById('search-modal');
  const input = document.getElementById('search-input');
  if (!modal || !input) return;
  modal.hidden = false;
  document.body.style.overflow = 'hidden';
  ensureSearchIndex().then(() => {
    if (input.value.trim()) renderSearchResults(input.value);
  });
  // focus next tick so modal animates in cleanly
  requestAnimationFrame(() => { input.focus(); input.select(); });
}

function closeSearch() {
  const modal = document.getElementById('search-modal');
  const input = document.getElementById('search-input');
  const box   = document.getElementById('search-results');
  if (input) input.value = '';
  if (box)   box.classList.remove('is-open');
  if (modal) modal.hidden = true;
  document.body.style.overflow = '';
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

  input.addEventListener('input', () => {
    if (searchIndex.length) {
      renderSearchResults(input.value);
      return;
    }
    if (input.value.trim()) {
      box.innerHTML = '<div class="search-empty">Loading search…</div>';
      box.classList.add('is-open');
    } else {
      box.classList.remove('is-open');
    }
    ensureSearchIndex().then(() => {
      if (input.value.trim()) renderSearchResults(input.value);
    });
  });

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

  // Open modal from any navbar trigger button (desktop right + mobile left)
  document.querySelectorAll('.js-search-open').forEach(btn => btn.addEventListener('click', openSearchModal));

  // Click backdrop to close
  const backdrop = document.getElementById('search-modal-backdrop');
  if (backdrop) backdrop.addEventListener('click', closeSearch);

  // ⌘K / Ctrl+K opens; Esc closes (handled in input keydown above)
  document.addEventListener('keydown', e => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      openSearchModal();
    } else if (e.key === 'Escape') {
      const modal = document.getElementById('search-modal');
      if (modal && !modal.hidden) closeSearch();
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
    // Server-rendered documents stay readable without the nav manifest; only
    // report a failure when there is nothing on the page to fall back to.
    // Count this document: init will not reach loadPage or showLanding.
    trackPageView();
    if (document.getElementById('article')?.children.length) return;
    showError('Could not load content.json. Check that the release bundle was uploaded intact and the base path is correct.', e.message);
    return;
  }

  // Optional: load redirect map for moved pages (old → new slug).
  try {
    const rRes = await fetch(resolveContentUrl('redirects.json'));
    if (rRes.ok) redirectMap = await rRes.json();
  } catch { /* no redirects file is fine */ }

  buildFlatList();
  buildLanding();
  buildSidebar();
  buildMobileDrawer();
  initSearch();

  const unlistedArticle = document.querySelector('article[data-unlisted-page]');
  if (unlistedArticle) {
    const page = { file: 'hosted-beta.md', slug: 'hosted-beta', title: 'Hosted beta', sectionTitle: 'Closed beta', navTrail: ['Hosted beta'] };
    currentFile = page.file;
    showArticleView();
    insertMetaRow(unlistedArticle, page);
    decorateHeadings(unlistedArticle, page.file, page);
    buildToc(unlistedArticle, page.file, page);
    hideLoading();
    const heading = getCurrentHeadingRoute();
    if (heading) {
      const target = findHeadingTarget(unlistedArticle, heading);
      if (target) focusHeading(target);
    }
    trackPageView();
    return;
  }

  const pathRoute = getPathRoute();
  const rawRoute = applyRedirect(pathRoute || getLegacyRoute());
  const initialRoute = parseRoute(rawRoute);
  if (initialRoute.page && pathRoute) initialRoute.headingId = getCurrentHeadingRoute();

  if (initialRoute.page) {
    const staticArticle = document.getElementById('article');
    const useStaticArticle = Boolean(pathRoute && staticArticle?.children.length);
    loadPage(initialRoute.page.file, initialRoute.headingId, 'replace', { useStaticArticle });
  } else {
    // Empty or unknown route -> landing
    showLanding();
  }
}

/* ─── Landing cards + quick links ───────────────────────────────────────── */
function buildLanding() {
  const grid = document.getElementById('landing-cards');
  // Interior documents have no homepage subtree at all.
  if (!grid) return;
  // The docs root ships the directory server-rendered from the same manifest.
  // Keep that DOM — the delegated click handlers already wire it up.
  if (grid.dataset.serverRendered === 'true') {
    renderLucideIcons();
    return;
  }
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
      const firstPage = getFirstNavPage(section.pages);
      const pageCount = countNavPages(section.pages);
      const a = document.createElement('a');
      a.className = 'card';
      a.href = firstPage ? getPageUrl(firstPage) : '#';
      a.dataset.navSection = i;
      const desc = section.desc || `${pageCount} page${pageCount === 1 ? '' : 's'} in ${section.title}.`;
      a.innerHTML = `
        <div class="card-icon">${sectionIconTag(section)}</div>
        <div class="card-title">${escapeHtml(section.title)}</div>
        <div class="card-desc">${escapeHtml(desc)}</div>
        <div class="card-meta"><span>${pageCount} page${pageCount === 1 ? '' : 's'}</span><span class="dot"></span><span>${escapeHtml(getSectionKind(section))}</span></div>
      `;
      cardsWrap.appendChild(a);
    });
    grid.appendChild(block);
  });

  renderLucideIcons();
}

function sidebarPagesHTML(nodes, level = 0) {
  return getNavChildren({ pages: nodes }).map(node => {
    if (isNavPage(node)) {
      return `<a class="sb-link" data-file="${escapeAttr(node.file)}" href="${escapeAttr(getPageUrl(node))}">${escapeHtml(node.title)}</a>`;
    }

    const children = getNavChildren(node);
    const pageCount = countNavPages(children);
    if (!children.length) return '';
    return `
      <div class="sb-group" data-open="false" data-depth="${level}">
        <button class="sb-group-btn" type="button">
          <span class="sb-group-title">${escapeHtml(node.title || 'Group')}</span>
          <span class="sb-group-count">${pageCount}</span>
          <svg class="chev" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="m4 2 4 4-4 4"/></svg>
        </button>
        <div class="sb-group-pages">
          ${sidebarPagesHTML(children, level + 1)}
        </div>
      </div>`;
  }).join('');
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
    const sections = byTier.get(tier).map(({ section, si }) => {
      const pageCount = countNavPages(section.pages);
      return `
    <div class="sb-section" data-section-idx="${si}" data-section-title="${escapeAttr(section.title)}" data-open="false">
      <button class="sb-section-btn" type="button">
        <span class="sb-section-icon">${sectionIconTag(section)}</span>
        <span class="sb-section-title">${escapeHtml(section.title)}</span>
        <span class="sb-section-count">${pageCount}</span>
        <svg class="chev" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="m4 2 4 4-4 4"/></svg>
      </button>
      <div class="sb-pages">
        ${sidebarPagesHTML(section.pages)}
      </div>
    </div>`;
    }).join('');
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
    const groupBtn = e.target.closest('.sb-group-btn');
    if (groupBtn) {
      const group = groupBtn.parentElement;
      group.dataset.open = group.dataset.open === 'true' ? 'false' : 'true';
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
  // Interior routes ship the sidebar server-rendered from the same manifest,
  // so crawlers see all of it. Keep that DOM instead of replacing it with
  // byte-identical markup — re-rendering only costs a flash of layout.
  if (container.dataset.serverRendered !== 'true') {
    container.innerHTML = sidebarSectionsHTML();
  }
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

  function visitNodes(nodes, section, groupTrail = []) {
    getNavChildren({ pages: nodes }).forEach(node => {
      if (isNavPage(node)) {
        const baseSlug = normalizeRouteKey(node.slug || derivePageSlug(node.file));
        const seenCount = slugCounts.get(baseSlug) || 0;
        node.slug = seenCount === 0 ? baseSlug : `${baseSlug}-${seenCount + 1}`;
        slugCounts.set(baseSlug, seenCount + 1);
        allPages.push({
          ...node,
          sectionTitle: section.title,
          navTrail: [section.title, ...groupTrail, node.title],
        });
        return;
      }

      const children = getNavChildren(node);
      if (children.length) visitNodes(children, section, [...groupTrail, node.title].filter(Boolean));
    });
  }

  navData.sections.forEach(section => {
    visitNodes(section.pages, section);
  });
}

/* ─── Load page ─────────────────────────────────────────────────────────── */
async function loadPage(file, targetHeading = null, historyMode = 'push', options = {}) {
  imageGallery?.close();
  const page = allPages.find(candidate => candidate.file === file);
  if (document.querySelector('article[data-unlisted-page]') && page) {
    location.assign(targetHeading ? getPageHeadingUrl(page, targetHeading) : getPageUrl(page));
    return;
  }
  currentFile = file;
  showArticleView();
  setActiveState(file);

  let md;
  const article = document.getElementById('article');
  const useStaticArticle = Boolean(options.useStaticArticle && article?.children.length);
  // Server-rendered content is already on screen; only a real client-side
  // transition has anything to wait for.
  if (!useStaticArticle) showLoading();
  if (useStaticArticle) {
    currentMarkdown = '';
  } else {
    try {
      md = await fetchMarkdown(file);
      currentMarkdown = md;
      updatePageSeo(page, md);
      article.innerHTML = await renderMarkdown(md);
    } catch (e) {
      showError(`Could not load: ${file}`, e.message);
      return;
    }
  }
  article.style.display = '';

  // Insert sticky meta-row after the first h1 (before other post-processing so TOC can attach to it).
  insertMetaRow(article, page);

  decorateHeadings(article, file);
  postProcessCallouts(article);
  postProcessTabs(article);
  postProcessImages(article);
  setupImageGallery(article);
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
  trackPageView();
}

const DOCS_REPO_SLUG = 'paperclipai/paperclip-docs';
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
  row.innerHTML = `<span class="chip">${escapeHtml(pageGroupLabel(page))}</span><span class="spacer"></span>`;
  h1.after(row);
  row.appendChild(buildPageActions(page));
}

function buildPageActions(page) {
  const COPY_SVG   = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="5" width="9" height="9" rx="1.5"/><path d="M11 5V3.5A1.5 1.5 0 0 0 9.5 2h-5A1.5 1.5 0 0 0 3 3.5v5A1.5 1.5 0 0 0 4.5 10H6"/></svg>';
  const LINK_SVG   = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M7 9a3 3 0 0 0 4.5.3l2-2a3 3 0 0 0-4.2-4.2l-1 1"/><path d="M9 7a3 3 0 0 0-4.5-.3l-2 2a3 3 0 0 0 4.2 4.2l1-1"/></svg>';
  const CHECK_SVG  = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m3.5 8.5 3 3 6-7"/></svg>';
  const CARET_SVG  = '<svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="m3 4.5 3 3 3-3"/></svg>';
  const MD_SVG     = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="12" height="10" rx="1.5"/><path d="M4.5 10V6l1.5 2L7.5 6v4M10 6v4M10 10l1.5-1.5L13 10"/></svg>';
  const EXT_SVG    = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 3h4v4M13 3 7.5 8.5M12 9v3.5A1.5 1.5 0 0 1 10.5 14h-7A1.5 1.5 0 0 1 2 12.5v-7A1.5 1.5 0 0 1 3.5 4H7"/></svg>';

  const wrap = document.createElement('div');
  wrap.className = 'page-actions';
  wrap.innerHTML = `
    <button type="button" class="pa-btn pa-copy" aria-label="Copy link to this page">
      ${LINK_SVG}<span class="pa-copy-label">Copy Link</span>
    </button>
    <button type="button" class="pa-btn pa-caret" aria-expanded="false" aria-label="More page actions">
      ${CARET_SVG}
    </button>
    <div class="pa-menu" role="menu">
      <button type="button" data-action="copy-page" role="menuitem">${COPY_SVG}<span>Copy Page</span></button>
      <button type="button" data-action="view-md" role="menuitem">${MD_SVG}<span>View as Markdown</span></button>
      <button type="button" data-action="open-claude" role="menuitem">${EXT_SVG}<span>Open in Claude</span></button>
      <button type="button" data-action="open-chatgpt" role="menuitem">${EXT_SVG}<span>Open in ChatGPT</span></button>
    </div>
  `;

  const copyBtn  = wrap.querySelector('.pa-copy');
  const caret    = wrap.querySelector('.pa-caret');
  const menu     = wrap.querySelector('.pa-menu');

  const closeMenu = () => { menu.classList.remove('is-open'); caret.setAttribute('aria-expanded', 'false'); };
  const openMenu  = () => { menu.classList.add('is-open'); caret.setAttribute('aria-expanded', 'true'); };

  const flashCopied = (text) => {
    copyBtn.classList.add('is-copied');
    copyBtn.innerHTML = `${CHECK_SVG}<span class="pa-copy-label">${text}</span>`;
    setTimeout(() => {
      copyBtn.classList.remove('is-copied');
      copyBtn.innerHTML = `${LINK_SVG}<span class="pa-copy-label">Copy Link</span>`;
    }, 1600);
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(location.href);
      flashCopied('Copied');
    } catch (e) {
      console.error('Copy failed', e);
    }
  };

  const copyMarkdown = async () => {
    try {
      const markdown = currentMarkdown || await fetchMarkdown(page.file);
      if (!currentMarkdown) currentMarkdown = markdown;
      await navigator.clipboard.writeText(markdown);
      flashCopied('Page copied');
    } catch (e) {
      console.error('Copy failed', e);
    }
  };

  const mdUrl = () => new URL(resolveContentUrl(page.file), location.href).href;
  const llmPrompt = () => `Read ${location.href} so I can ask questions about it.`;

  copyBtn.addEventListener('click', copyLink);
  caret.addEventListener('click', e => {
    e.stopPropagation();
    menu.classList.contains('is-open') ? closeMenu() : openMenu();
  });
  menu.addEventListener('click', e => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    closeMenu();
    switch (btn.dataset.action) {
      case 'copy-page':    copyMarkdown(); break;
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
  const trail = pageTrail(page);
  bc.innerHTML = trail.map((crumb, index) => {
    const isCurrent = index === trail.length - 1;
    const crumbHtml = `<span${isCurrent ? ' class="crumb-current"' : ''}>${escapeHtml(crumb)}</span>`;
    return index === 0 ? crumbHtml : `<span class="sep">/</span>${crumbHtml}`;
  }).join('');
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
      const isActive = link.dataset.file === file;
      link.classList.toggle('active', isActive);
      if (isActive) {
        for (let parent = link.parentElement; parent; parent = parent.parentElement) {
          if (parent.classList?.contains('sb-section') || parent.classList?.contains('sb-group')) {
            parent.dataset.open = 'true';
          }
        }
      }
    });
  });
}

/* ─── Markdown ──────────────────────────────────────────────────────────── */
function stripFrontmatter(md) {
  // Strip a leading YAML frontmatter block (---\n...\n---\n). The release
  // build strips this server-side, but in dev mode markdown is fetched
  // directly from disk and a leftover `---` would render as a horizontal
  // rule. Keep this tolerant: a malformed block (no closing fence) is left
  // alone so the author can see the broken markdown.
  if (typeof md !== 'string') return md;
  if (!md.startsWith('---\n') && !md.startsWith('---\r\n')) return md;
  const afterOpen = md.indexOf('\n') + 1;
  const rest = md.slice(afterOpen);
  const closeMatch = rest.match(/\r?\n---[ \t]*(\r?\n|$)/);
  if (!closeMatch) return md;
  return rest.slice(closeMatch.index + closeMatch[0].length).replace(/^\r?\n/, '');
}

let skillAwareRenderer = null;
// Mirror of the release build's code renderer (site/build-release.mjs): a fenced
// block tagged `skill-source` renders as a standard markdown code block that also
// advertises a downloadable filename via `data-skill-download`. Every other code
// block is delegated to marked's default renderer, so existing snippets are
// untouched. Keeping this in sync with the build keeps the Download control
// available on SPA navigation as well as on the crawler-visible first render.
function getSkillAwareRenderer(marked) {
  if (skillAwareRenderer) return skillAwareRenderer;
  const renderer = new marked.Renderer();
  const defaultCode = renderer.code.bind(renderer);
  renderer.code = (code, infostring, escaped) => {
    const tokens = String(infostring || '').trim().split(/\s+/);
    if (tokens.includes('skill-source')) {
      return `<pre><code class="language-markdown" data-skill-download="SKILL.md">${escapeHtml(code)}\n</code></pre>\n`;
    }
    if (tokens[0] === 'prompt') {
      return `<pre class="prompt-block"><code class="language-prompt" data-copy-prompt>${escapeHtml(code)}</code></pre>\n`;
    }
    return defaultCode(code, infostring, escaped);
  };
  skillAwareRenderer = renderer;
  return renderer;
}

async function renderMarkdown(md) {
  const renderer = await ensureMarkdownRenderer();
  renderer.setOptions({ gfm: true, breaks: false, renderer: getSkillAwareRenderer(renderer) });
  md = stripFrontmatter(md);
  md = preprocessTabs(md);
  return sanitizeMarkdownHtml(renderer.parse(md));
}

const ALLOWED_MARKDOWN_TAGS = new Set([
  'A', 'BLOCKQUOTE', 'BR', 'BUTTON', 'CODE', 'DEL', 'DETAILS', 'DIV', 'EM',
  'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'HR', 'IMG', 'LI', 'OL', 'P', 'PRE',
  'SPAN', 'STRONG', 'SUMMARY', 'TABLE', 'TBODY', 'TD', 'TH', 'THEAD', 'TR',
  'UL',
]);
const DROP_MARKDOWN_TAGS = new Set([
  'IFRAME', 'MATH', 'META', 'OBJECT', 'SCRIPT', 'STYLE', 'SVG', 'TEMPLATE',
]);
const GLOBAL_MARKDOWN_ATTRS = new Set([
  'aria-label', 'aria-selected', 'class', 'colspan', 'data-panel', 'data-tab',
  'id', 'role', 'rowspan', 'title',
]);
const TAG_MARKDOWN_ATTRS = {
  A: new Set(['href']),
  BUTTON: new Set(['type']),
  DETAILS: new Set(['open']),
  CODE: new Set(['class', 'data-copy-prompt', 'data-skill-download']),
  IMG: new Set(['alt', 'height', 'loading', 'src', 'title', 'width']),
};
const SAFE_URL_PROTOCOLS = new Set(['http:', 'https:', 'mailto:', 'tel:']);
const SAFE_IMAGE_DATA_URL = /^data:image\/(?:gif|jpe?g|png|webp);base64,[a-z0-9+/=]+$/i;

function isSafeUrl(value, { image = false } = {}) {
  const normalized = String(value).replace(/[\u0000-\u001f\u007f\s]+/g, '');
  if (!normalized) return false;
  if (image && SAFE_IMAGE_DATA_URL.test(normalized)) return true;
  if (normalized.startsWith('#')) return true;
  try {
    const parsed = new URL(normalized, window.location.href);
    return SAFE_URL_PROTOCOLS.has(parsed.protocol);
  } catch {
    return false;
  }
}

function sanitizeMarkdownElement(element) {
  if (!ALLOWED_MARKDOWN_TAGS.has(element.tagName)) {
    if (DROP_MARKDOWN_TAGS.has(element.tagName)) {
      element.remove();
      return;
    }
    element.replaceWith(...element.childNodes);
    return;
  }

  for (const attr of [...element.attributes]) {
    const name = attr.name.toLowerCase();
    const allowedForTag = TAG_MARKDOWN_ATTRS[element.tagName]?.has(name);
    if (name.startsWith('on') || (!GLOBAL_MARKDOWN_ATTRS.has(name) && !allowedForTag)) {
      element.removeAttribute(attr.name);
      continue;
    }
    if (name === 'href' && !isSafeUrl(attr.value)) {
      element.removeAttribute(attr.name);
    }
    if (name === 'src' && !isSafeUrl(attr.value, { image: element.tagName === 'IMG' })) {
      element.removeAttribute(attr.name);
    }
  }

  if (element.tagName === 'A' && element.hasAttribute('href')) {
    const href = element.getAttribute('href') || '';
    if (/^(?:[a-z]+:)?\/\//i.test(href)) {
      element.setAttribute('target', '_blank');
      element.setAttribute('rel', 'noopener noreferrer');
    }
  }
  if (element.tagName === 'BUTTON') {
    element.setAttribute('type', 'button');
  }
}

function sanitizeMarkdownHtml(html) {
  const document = new DOMParser().parseFromString(html, 'text/html');
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT);
  const elements = [];
  while (walker.nextNode()) elements.push(walker.currentNode);
  elements.forEach(sanitizeMarkdownElement);
  return document.body.innerHTML;
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
    out += window.marked.parse(m[2].trim());
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

const RESPONSIVE_SCREENSHOT_VARIANTS = new Map([
  ['dashboard/dashboard-overview.png', { width: 2880, height: 1800, variantWidth: 900 }],
]);

function getScreenshotVariantConfig(src) {
  const match = String(src).match(/(?:screenshots|images)\/(?:light|dark)\/(.+)$/);
  if (!match) return null;
  return RESPONSIVE_SCREENSHOT_VARIANTS.get(match[1]) || null;
}

function applyScreenshotSource(img, rawSrc) {
  const resolved = resolveScreenshotSrc(rawSrc);
  if (resolved !== rawSrc) {
    img.dataset.screenshot = rawSrc;
  }
  img.src = resolved;

  const variantConfig = getScreenshotVariantConfig(resolved) || getScreenshotVariantConfig(rawSrc);
  if (!variantConfig) return;

  const optimizedSrc = resolved.replace(/\.png(?:\?.*)?$/i, '-900.webp');
  img.width = variantConfig.width;
  img.height = variantConfig.height;
  img.sizes = '(max-width: 820px) calc(100vw - 48px), 820px';
  img.srcset = `${optimizedSrc} ${variantConfig.variantWidth}w, ${resolved} ${variantConfig.width}w`;
  img.classList.add('responsive-screenshot');
  img.style.aspectRatio = `${variantConfig.width} / ${variantConfig.height}`;
}

function postProcessImages(root) {
  [...root.querySelectorAll('img')].forEach((img, index) => {
    // Remap ../images/ paths to screenshots/{theme}/ and store original for theme swaps
    const rawSrc = img.getAttribute('src') || img.src;
    applyScreenshotSource(img, rawSrc);
    img.decoding = 'async';
    img.loading = index === 0 ? 'eager' : 'lazy';
    img.fetchPriority = index === 0 ? 'high' : 'auto';
    img.addEventListener('error', () => {
      const ph = document.createElement('div');
      ph.className = 'img-placeholder';
      ph.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg><span>Screenshot: <em>${escapeHtml(img.alt || img.src)}</em></span>`;
      img.replaceWith(ph);
    });
  });
}

/* ─── Image gallery ─────────────────────────────────────────────────────────
   Every image in an article opens a full-screen gallery of the page's images:
   arrow keys or buttons step through them, Esc closes, and a Download button
   saves the image at full resolution. The alt text is shown as the caption.
   Images are shown as large as fits but never above their natural size: a
   2880px screenshot on a 2x display tops out at 1440 CSS pixels. */
// `var` so loadPage can close it during the first render, before this runs.
var imageGallery = (() => {
  const ICONS = {
    prev: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>',
    next: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>',
    download: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/></svg>',
  };
  let overlay = null;
  let els = null;
  let items = [];
  let index = 0;
  let returnFocus = null;
  let touchStartX = null;

  function build() {
    overlay = document.createElement('div');
    overlay.className = 'lightbox';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Image gallery');
    overlay.innerHTML = `
      <div class="lightbox-bar">
        <span class="lightbox-counter" aria-live="polite"></span>
        <a class="lightbox-btn lightbox-download" download>${ICONS.download}<span class="lightbox-btn-label">Download</span></a>
        <button type="button" class="lightbox-btn lightbox-close" aria-label="Close gallery">${ICONS.close}</button>
      </div>
      <div class="lightbox-stage">
        <button type="button" class="lightbox-btn lightbox-nav lightbox-prev" aria-label="Previous image">${ICONS.prev}</button>
        <img class="lightbox-img" alt="" decoding="async">
        <button type="button" class="lightbox-btn lightbox-nav lightbox-next" aria-label="Next image">${ICONS.next}</button>
      </div>
      <p class="lightbox-caption"></p>`;
    document.body.appendChild(overlay);
    els = {
      counter: overlay.querySelector('.lightbox-counter'),
      download: overlay.querySelector('.lightbox-download'),
      close: overlay.querySelector('.lightbox-close'),
      stage: overlay.querySelector('.lightbox-stage'),
      img: overlay.querySelector('.lightbox-img'),
      prev: overlay.querySelector('.lightbox-prev'),
      next: overlay.querySelector('.lightbox-next'),
      caption: overlay.querySelector('.lightbox-caption'),
    };
    els.close.addEventListener('click', close);
    els.prev.addEventListener('click', () => step(-1));
    els.next.addEventListener('click', () => step(1));
    // Clicking the backdrop (not the image or a control) closes the gallery.
    els.stage.addEventListener('click', (event) => { if (event.target === els.stage) close(); });
    els.img.addEventListener('load', capSize);
    overlay.addEventListener('keydown', onKeydown);
    els.stage.addEventListener('touchstart', (event) => { touchStartX = event.touches[0]?.clientX ?? null; }, { passive: true });
    els.stage.addEventListener('touchend', (event) => {
      if (touchStartX === null) return;
      const dx = (event.changedTouches[0]?.clientX ?? touchStartX) - touchStartX;
      touchStartX = null;
      if (Math.abs(dx) > 48) step(dx < 0 ? 1 : -1);
    });
  }

  function fullSource(img) {
    // The plain src is the full-resolution file for the current theme; srcset
    // may point the page at a smaller variant.
    return img.getAttribute('src') || img.currentSrc || img.src;
  }

  function capSize() {
    const { img } = els;
    if (!img.naturalWidth) return;
    const source = items[index];
    const dpr = window.devicePixelRatio || 1;
    // Never above natural size on this display, and never smaller than the
    // image already appeared on the page.
    const onPage = source?.isConnected ? source.getBoundingClientRect().width : 0;
    const cap = Math.max(img.naturalWidth / dpr, Math.min(onPage, img.naturalWidth));
    img.style.maxWidth = `min(100%, ${Math.round(cap)}px)`;
  }

  function show(nextIndex) {
    index = (nextIndex + items.length) % items.length;
    const source = items[index];
    const src = fullSource(source);
    const caption = (source.getAttribute('alt') || source.getAttribute('title') || '').trim();
    els.img.style.maxWidth = '';
    els.img.src = src;
    els.img.alt = caption;
    els.caption.textContent = caption;
    els.counter.textContent = items.length > 1 ? `${index + 1} / ${items.length}` : '';
    els.download.href = src;
    els.download.setAttribute('download', decodeURIComponent(src.split(/[?#]/)[0].split('/').pop() || 'image.png'));
    els.download.setAttribute('aria-label', `Download image ${index + 1}`);
    const single = items.length < 2;
    els.prev.hidden = single;
    els.next.hidden = single;
    // Warm the neighbours so arrowing through feels instant.
    if (!single) [index - 1, index + 1].forEach((i) => { new Image().src = fullSource(items[(i + items.length) % items.length]); });
  }

  function step(delta) {
    if (items.length > 1) show(index + delta);
  }

  function onKeydown(event) {
    if (event.key === 'Escape') { event.preventDefault(); close(); }
    else if (event.key === 'ArrowRight') { event.preventDefault(); step(1); }
    else if (event.key === 'ArrowLeft') { event.preventDefault(); step(-1); }
    else if (event.key === 'Tab') {
      // Keep focus inside the dialog while it is open.
      const focusable = [...overlay.querySelectorAll('a[href], button:not([hidden])')];
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  }

  function open(list, start) {
    if (!list.length) return;
    if (!overlay) build();
    items = list;
    returnFocus = document.activeElement;
    show(start);
    overlay.classList.add('is-open');
    document.body.classList.add('lightbox-open');
    els.close.focus({ preventScroll: true });
  }

  function close() {
    if (!overlay?.classList.contains('is-open')) return;
    overlay.classList.remove('is-open');
    document.body.classList.remove('lightbox-open');
    els.img.removeAttribute('src');
    if (returnFocus instanceof HTMLElement) returnFocus.focus({ preventScroll: true });
  }

  return { open, close };
})();

function setupImageGallery(article) {
  const galleryImages = () => [...article.querySelectorAll('img')].filter((img) => img.isConnected && !img.closest('a'));
  galleryImages().forEach((img) => {
    if (img.dataset.gallery) return;
    img.dataset.gallery = 'true';
    img.classList.add('zoomable');
    img.tabIndex = 0;
    img.setAttribute('role', 'button');
    const label = (img.getAttribute('alt') || '').trim();
    img.setAttribute('aria-label', label ? `Open image: ${label}` : 'Open image');
    const openFromHere = () => {
      const list = galleryImages();
      imageGallery.open(list, Math.max(0, list.indexOf(img)));
    };
    img.addEventListener('click', openFromHere);
    img.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openFromHere(); }
    });
  });
}

// The connector catalog is one logical table split across category headings.
// Tagging each of those tables lets CSS give them identical column widths, so
// a reader scanning down the page reads one set of columns rather than eleven
// differently proportioned ones. Detection is by header row, not by page, so
// the rule follows the content if it moves.
const CATALOG_TABLE_HEADINGS = ['connector', 'what you can do', 'connection methods'];
const METHODS_COLUMN = 2;

// Authors write a connector's methods as "A · B". In a narrow column that
// wraps wherever the words run out ("Connect with Paperclip · Your / own OAuth
// app"), which reads as one broken phrase instead of two methods. Giving each
// method its own line is the fix that cannot overflow: nowrap would push a
// long method past the column at intermediate widths.
function splitMethodList(cell) {
  if (cell.children.length > 0 || cell.dataset.methodsSplit === 'true') return;
  const parts = (cell.textContent || '').split('·').map(part => part.trim()).filter(Boolean);
  if (parts.length < 2) return;
  cell.dataset.methodsSplit = 'true';
  cell.textContent = '';
  for (const part of parts) {
    const item = document.createElement('span');
    item.className = 'method-item';
    item.textContent = part;
    cell.appendChild(item);
  }
}

function isCatalogTable(headings) {
  return headings.length === CATALOG_TABLE_HEADINGS.length
    && headings.every((heading, index) => heading === CATALOG_TABLE_HEADINGS[index]);
}

// Below the stacking breakpoint these tables render as blocks, which drops the
// implicit table semantics a browser infers from display: table. Stating the
// roles keeps the structure in the accessibility tree at every width, so the
// visually hidden header row is still what a screen reader announces per cell.
function applyExplicitTableRoles(table) {
  table.setAttribute('role', 'table');
  table.querySelectorAll('thead, tbody, tfoot').forEach(group => group.setAttribute('role', 'rowgroup'));
  table.querySelectorAll('tr').forEach(row => row.setAttribute('role', 'row'));
  table.querySelectorAll('thead th').forEach(cell => cell.setAttribute('role', 'columnheader'));
  table.querySelectorAll('tbody td').forEach(cell => cell.setAttribute('role', 'cell'));
}

function postProcessTables(root) {
  root.querySelectorAll('table').forEach(table => {
    const headingLabels = [...table.querySelectorAll('thead th')]
      .map(cell => (cell.textContent || '').trim());
    if (isCatalogTable(headingLabels.map(label => label.toLowerCase()))) {
      table.classList.add('catalog-table');
      applyExplicitTableRoles(table);
      // Stacked cells lose their column, so each one carries its own label.
      table.querySelectorAll('tbody tr').forEach(row => {
        [...row.children].forEach((cell, index) => {
          if (headingLabels[index]) cell.setAttribute('data-label', headingLabels[index]);
          if (index === METHODS_COLUMN) splitMethodList(cell);
        });
      });
    }

    if (table.parentElement && table.parentElement.classList.contains('table-wrap')) return;
    const wrap = document.createElement('div');
    wrap.className = 'table-wrap';
    if (table.classList.contains('catalog-table')) wrap.classList.add('table-wrap-catalog');
    table.parentNode.insertBefore(wrap, table);
    wrap.appendChild(table);
  });
}

function findPageByRoutePath(routePath) {
  const basePath = APP_BASE_URL.pathname.replace(/\/$/, '');
  if (basePath && !routePath.startsWith(`${basePath}/`) && routePath !== `${basePath}/`) return null;
  const slug = normalizeRouteKey(routePath.slice(basePath.length));
  if (!slug) return null;
  return allPages.find(candidate => candidate.slug === slug) || null;
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

    if (href.startsWith('#')) {
      const page = allPages.find(candidate => candidate.file === currentFile);
      const headingId = normalizeRouteKey(href.slice(1));
      if (page && headingId) {
        a.href = getPageHeadingUrl(page, headingId);
        a.addEventListener('click', e => {
          e.preventDefault();
          const heading = document.getElementById(headingId);
          history.pushState(null, '', getPageHeadingUrl(page, headingId));
          if (heading) focusHeading(heading);
        });
      }
      return;
    }

    const [docHref, headingHref] = href.split('#');

    // Static builds already emit canonical route hrefs. Route them through the
    // client so an in-article link is still a soft transition, not a reload.
    if (docHref && docHref.startsWith('/')) {
      const routePage = findPageByRoutePath(docHref);
      if (routePage) {
        a.addEventListener('click', e => {
          if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
          e.preventDefault();
          loadPage(routePage.file, headingHref || null);
        });
      }
      return;
    }

    // Legacy relative markdown links, still present when the SPA renders
    // markdown it fetched at runtime.
    if (docHref && docHref.endsWith('.md')) {
      const targetFile = resolveDocLinkTarget(docHref, currentFile);
      const targetPage = allPages.find(candidate => candidate.file === targetFile);
      if (targetPage) {
        a.href = headingHref ? getPageHeadingUrl(targetPage, headingHref) : getPageUrl(targetPage);
      }
      a.addEventListener('click', e => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
        e.preventDefault();
        loadPage(targetFile, headingHref || null);
      });
    }
  });
}

/* ─── Table of contents (desktop rail + compact dropdown) ───────────────── */
function resetToc() {
  if (tocObserver) {
    tocObserver.disconnect();
    tocObserver = null;
  }
  if (tocScrollHandler) {
    window.removeEventListener('scroll', tocScrollHandler);
    tocScrollHandler = null;
  }
  if (tocResizeHandler) {
    window.removeEventListener('resize', tocResizeHandler);
    tocResizeHandler = null;
  }
  if (tocDocumentClickHandler) {
    document.removeEventListener('click', tocDocumentClickHandler);
    tocDocumentClickHandler = null;
  }
  if (tocKeydownHandler) {
    document.removeEventListener('keydown', tocKeydownHandler);
    tocKeydownHandler = null;
  }

  document.querySelectorAll('.toc-wrap').forEach(el => el.remove());
  const rail = document.getElementById('toc-rail');
  const railLinks = document.getElementById('toc-rail-links');
  if (railLinks) railLinks.innerHTML = '';
  if (rail) rail.classList.add('is-empty');
}

function headingLabel(heading) {
  const clone = heading.cloneNode(true);
  clone.querySelectorAll('.heading-anchor').forEach(anchor => anchor.remove());
  return clone.textContent.trim();
}

function buildToc(article, file, unlistedPage = null) {
  resetToc();

  const metaRow = article.querySelector('.meta-row');
  const rail = document.getElementById('toc-rail');
  const railLinks = document.getElementById('toc-rail-links');
  if (!metaRow || !rail || !railLinks) return;

  const headings = [...article.querySelectorAll('h2, h3')];
  if (headings.length < 2) return;

  const page = unlistedPage || allPages.find(candidate => candidate.file === file);

  const CHEVRON_SVG = '<svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="m3 4.5 3 3 3-3"/></svg>';
  const TOC_SVG = '<svg class="toc-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 4h10M3 8h7M3 12h9"/></svg>';

  function makeTocLink(heading, onClick) {
    const a = document.createElement('a');
    a.className = `toc-link ${heading.tagName === 'H3' ? 'level-3' : 'level-2'}`;
    a.dataset.headingId = heading.id;
    a.textContent = headingLabel(heading);
    a.href = page ? getPageHeadingUrl(page, heading.id) : `#${heading.id}`;
    a.addEventListener('click', e => {
      e.preventDefault();
      if (page) history.pushState(null, '', getPageHeadingUrl(page, heading.id));
      focusHeading(heading);
      if (onClick) onClick();
    });
    return a;
  }

  const wrap = document.createElement('div');
  wrap.className = 'toc-wrap';
  wrap.innerHTML = `
    <button type="button" class="toc-toggle" aria-expanded="false" aria-controls="toc-panel">
      ${TOC_SVG}
      <span class="toc-label">On this page</span>
      <span class="count">${headings.length}</span>
      ${CHEVRON_SVG}
    </button>
    <nav class="toc-panel" id="toc-panel" aria-label="On this page">
      <div class="toc-panel-label">On this page</div>
    </nav>
  `;
  const panel = wrap.querySelector('.toc-panel');
  const toggle = wrap.querySelector('.toc-toggle');
  const closePanel = () => { panel.classList.remove('is-open'); toggle.setAttribute('aria-expanded', 'false'); };
  const openPanel = () => { panel.classList.add('is-open'); toggle.setAttribute('aria-expanded', 'true'); };

  headings.forEach(h => {
    panel.appendChild(makeTocLink(h, closePanel));
    railLinks.appendChild(makeTocLink(h));
  });
  metaRow.appendChild(wrap);
  rail.classList.remove('is-empty');

  toggle.addEventListener('click', e => {
    e.stopPropagation();
    panel.classList.contains('is-open') ? closePanel() : openPanel();
  });
  tocDocumentClickHandler = e => {
    if (panel.classList.contains('is-open') && !wrap.contains(e.target)) closePanel();
  };
  tocKeydownHandler = e => {
    if (e.key === 'Escape' && panel.classList.contains('is-open')) closePanel();
  };
  document.addEventListener('click', tocDocumentClickHandler);
  document.addEventListener('keydown', tocKeydownHandler);

  const links = [...document.querySelectorAll('.toc-link')];
  const setActiveLink = id => {
    links.forEach(link => link.classList.toggle('active', link.dataset.headingId === id));
  };
  const getActiveHeading = () => {
    const offset = 136;
    const bottomSlack = 4;
    if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - bottomSlack) {
      return headings[headings.length - 1];
    }

    let active = headings[0];
    for (const heading of headings) {
      if (heading.getBoundingClientRect().top <= offset) active = heading;
      else break;
    }
    return active;
  };
  let tocFrame = 0;
  const updateActive = () => {
    tocFrame = 0;
    setActiveLink(getActiveHeading().id);
  };
  const scheduleActiveUpdate = () => {
    if (tocFrame) return;
    tocFrame = window.requestAnimationFrame(updateActive);
  };

  tocScrollHandler = scheduleActiveUpdate;
  tocResizeHandler = scheduleActiveUpdate;
  window.addEventListener('scroll', tocScrollHandler, { passive: true });
  window.addEventListener('resize', tocResizeHandler);
  tocObserver = new IntersectionObserver(scheduleActiveUpdate, {
    rootMargin: '-136px 0px -62% 0px',
    threshold: [0, 1],
  });

  headings.forEach(h => tocObserver.observe(h));
  updateActive();
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
    const link = document.createElement('a');
    link.className = 'page-nav-btn prev';
    link.href = getPageUrl(prev);
    link.innerHTML = `<span class="page-nav-label">← Previous</span><span class="page-nav-title">${escapeHtml(prev.title)}</span>`;
    link.addEventListener('click', e => {
      e.preventDefault();
      loadPage(prev.file);
    });
    nav.appendChild(link);
  } else {
    nav.appendChild(Object.assign(document.createElement('div'), { className: 'page-nav-spacer' }));
  }

  if (next) {
    const link = document.createElement('a');
    link.className = 'page-nav-btn next';
    link.href = getPageUrl(next);
    link.innerHTML = `<span class="page-nav-label">Next →</span><span class="page-nav-title">${escapeHtml(next.title)}</span>`;
    link.addEventListener('click', e => {
      e.preventDefault();
      loadPage(next.file);
    });
    nav.appendChild(link);
  }

  nav.style.display = (prev || next) ? 'flex' : 'none';
}

/* ─── Helpers ───────────────────────────────────────────────────────────── */
/* Runtime status is built on demand so a served document never ships loading or
   error copy it cannot justify. Only real client-side transitions fill it in. */
function renderRuntimeStatus(state, message, detail = '') {
  const mount = document.getElementById('runtime-status');
  if (!mount) return;
  mount.textContent = '';
  mount.dataset.state = state;
  if (state === 'loading') {
    const spinner = document.createElement('div');
    spinner.className = 'spinner';
    mount.appendChild(spinner);
  }
  const messageEl = document.createElement('span');
  messageEl.className = 'runtime-status-message';
  messageEl.textContent = message;
  mount.appendChild(messageEl);
  if (detail) {
    const detailEl = document.createElement('span');
    detailEl.className = 'runtime-status-detail';
    detailEl.textContent = detail;
    mount.appendChild(detailEl);
  }
  mount.hidden = false;
}

function clearRuntimeStatus() {
  const mount = document.getElementById('runtime-status');
  if (!mount) return;
  mount.hidden = true;
  delete mount.dataset.state;
  mount.textContent = '';
}

function showLoading() {
  resetToc();
  renderRuntimeStatus('loading', 'Loading…');
  document.getElementById('article').style.display  = 'none';
  document.getElementById('page-nav').style.display = 'none';
}

function hideLoading() { clearRuntimeStatus(); }

function showError(msg, detail = '') {
  // Error state lives inside article-view; make sure the right view is showing.
  showArticleView();
  resetToc();
  document.getElementById('article').style.display  = 'none';
  document.getElementById('page-nav').style.display = 'none';
  renderRuntimeStatus('error', msg, detail);
}

function escapeHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function escapeAttr(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

window.addEventListener('hashchange', () => {
  if (getPathRoute() && !location.hash.startsWith('#/')) return;
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
  if (route.page && getPathRoute()) route.headingId = getCurrentHeadingRoute();
  if (route.page) {
    loadPage(route.page.file, route.headingId, 'replace');
    return;
  }
  const raw = normalizeRouteKey(decodeURIComponent((getCurrentRoute() || '').trim()));
  if (!raw) showLanding();
});

init();
