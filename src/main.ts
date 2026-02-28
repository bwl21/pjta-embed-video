import { churchtoolsClient } from '@churchtools/churchtools-client';
import { loadVideoConfig, saveVideoConfig } from './utils/video-config-store';
import type { VideoConfig } from './utils/video-config-store';

console.log("MAIN TS GELADEN", window.location.href);

if (import.meta.env.MODE === 'development') {
  import('./utils/reset.css');
}

declare const window: Window &
  typeof globalThis & {
    settings: { base_url?: string };
  };

const baseUrl = window.settings?.base_url ?? import.meta.env.VITE_BASE_URL;
churchtoolsClient.setBaseUrl(baseUrl);

// Dev-Login (optional)
const username = import.meta.env.VITE_USERNAME;
const password = import.meta.env.VITE_PASSWORD;
if (import.meta.env.MODE === 'development' && username && password) {
  await churchtoolsClient.post('/login', { username, password });
}

const KEY = import.meta.env.VITE_KEY;
export { KEY };

type VideoTarget =
  | { type: 'youtube'; id: string }
  | { type: 'vimeo'; id: string };

function getQuery(name: string) {
  return new URLSearchParams(window.location.search).get(name)?.trim() || '';
}

function extractYouTubeId(input: string): string | null {
  if (/^[a-zA-Z0-9_-]{6,}$/.test(input) && !input.includes('http')) return input;

  try {
    const u = new URL(input);
    const v = u.searchParams.get('v');
    if (v) return v;

    if (u.hostname === 'youtu.be') {
      const id = u.pathname.replace('/', '').trim();
      return id || null;
    }

    const m = u.pathname.match(/^\/embed\/([^/]+)/);
    return m?.[1] || null;
  } catch {
    return null;
  }
}

function extractVimeoId(input: string): string | null {
  if (/^\d+$/.test(input) && !input.includes('http')) return input;

  try {
    const u = new URL(input);
    const m = u.pathname.match(/\/video\/(\d+)/) || u.pathname.match(/\/(\d+)/);
    return m?.[1] || null;
  } catch {
    return null;
  }
}

function resolveTarget(raw: string, map: Record<string, string>): VideoTarget | null {
  const candidate = map[raw] || raw;

  const yt = extractYouTubeId(candidate);
  if (yt) return { type: 'youtube', id: yt };

  const vi = extractVimeoId(candidate);
  if (vi) return { type: 'vimeo', id: vi };

  return null;
}

function buildEmbedUrl(t: VideoTarget) {
  if (t.type === 'youtube') {
    return `https://www.youtube.com/embed/${t.id}?autoplay=1&mute=1&playsinline=1&rel=0`;
  }
  return `https://player.vimeo.com/video/${t.id}?autoplay=1&muted=1`;
}

function setDebug(msg: string) {
  const el = document.getElementById('debug');
  if (el) el.textContent = msg;
}

async function main() {
  const iframe = document.getElementById('videoFrame') as HTMLIFrameElement | null;
  if (!iframe) {
    console.error('Kein #videoFrame im HTML gefunden. Bitte füge ein iframe mit id="videoFrame" in index.html ein.');
    return;
  }

  // Lade Standardkonfiguration aus editierbarer JSON (public/video-defaults.json)
  let DEFAULT_CFG: VideoConfig;
  try {
    const defaultsUrl = new URL('video-defaults.json', window.location.href).href;
    const res = await fetch(defaultsUrl);
    if (res.ok) {
      DEFAULT_CFG = (await res.json()) as VideoConfig;
    } else {
      DEFAULT_CFG = {
        praevention: { type: 'vimeo', id: '1153226842', title: 'Präventionsschulung 2026' },
        test1: { type: 'youtube', id: '_MMjRChqNac' },
        test2: { type: 'youtube', id: 'Ay6y4QbhYpM' },
      };
    }
  } catch {
    DEFAULT_CFG = {
      praevention: { type: 'vimeo', id: '1153226842', title: 'Präventionsschulung 2026' },
      test1: { type: 'youtube', id: '_MMjRChqNac' },
      test2: { type: 'youtube', id: 'Ay6y4QbhYpM' },
    };
  }

  // Automatisches Seeding in der Entwicklung (überschreibt nicht in Produktion)
  if (import.meta.env.MODE === 'development') {
    await saveVideoConfig(KEY, DEFAULT_CFG);
  }

  const cfg = await loadVideoConfig(KEY, DEFAULT_CFG);

  const raw = getQuery('url') || getQuery('id');

  if (!raw) {
    setDebug('Benutze ?id=test1 oder ?id=test2 (oder ?id=praevention).');
    iframe.src = 'about:blank';
    return;
  }

  const entry = (cfg as any)[raw];
  let target: VideoTarget | null = null;

  function sanitizeIdCandidate(candidate: string) {
    const s = candidate.trim();
    // Wenn es eine vollständige URL ist, dann übernehmen die extract*-Funktionen
    if (s.includes('http')) return s;

    // Gängiges YouTube-Parameterformat wie "v=ID&..."
    const m = s.match(/[?&]v=([^&]+)/) || s.match(/v=([^&]+)/);
    if (m) return m[1];

    // Falls Parameter enthalten sind (z. B. "ID&list=..."), entferne alles nach '&' oder '?'
    if (s.includes('&') || s.includes('?')) return s.split(/[&?]/)[0];

    return s;
  }

  if (entry) {
    if (typeof entry === 'string') {
      const cand = sanitizeIdCandidate(entry);
      // try resolving as URL or plain id
      const yt = extractYouTubeId(cand);
      if (yt) target = { type: 'youtube', id: yt };
      else {
        const vi = extractVimeoId(cand);
        if (vi) target = { type: 'vimeo', id: vi };
      }
      // last resort: try resolveTarget (handles full URLs)
      if (!target) target = resolveTarget(entry, {});
    } else if (typeof entry === 'object' && entry.type && entry.id) {
      const rawId = String(entry.id);
      const cand = sanitizeIdCandidate(rawId);

      if (entry.type === 'youtube') {
        const yt = extractYouTubeId(cand);
        target = yt ? { type: 'youtube', id: yt } : { type: 'youtube', id: cand };
      } else if (entry.type === 'vimeo') {
        const vi = extractVimeoId(cand);
        target = vi ? { type: 'vimeo', id: vi } : { type: 'vimeo', id: cand };
      }
    }
  } else {
    const cand = sanitizeIdCandidate(raw);
    const yt = extractYouTubeId(cand);
    if (yt) target = { type: 'youtube', id: yt };
    else {
      const vi = extractVimeoId(cand);
      if (vi) target = { type: 'vimeo', id: vi };
      else target = resolveTarget(raw, {});
    }
  }

  if (!target) {
    setDebug(`Konnte nicht auflösen: ${raw}. Bitte Alias/ID in video-defaults.json überprüfen (muss {type,id} sein).`);
    iframe.src = 'about:blank';
    return;
  }

  const src = buildEmbedUrl(target);
  iframe.src = src;

  console.log('iframe src =', src);
}

main().catch((e) => console.error(e));