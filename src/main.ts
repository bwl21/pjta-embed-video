import type { Person } from './utils/ct-types';
import { churchtoolsClient } from '@churchtools/churchtools-client';

// only import reset.css in development mode to keep the production bundle small and to simulate CT environment
if (import.meta.env.MODE === 'development') {
    import('./utils/reset.css');
}

declare const window: Window &
    typeof globalThis & {
        settings: {
            base_url?: string;
        };
    };

const baseUrl = window.settings?.base_url ?? import.meta.env.VITE_BASE_URL;
churchtoolsClient.setBaseUrl(baseUrl);

const username = import.meta.env.VITE_USERNAME;
const password = import.meta.env.VITE_PASSWORD;
if (import.meta.env.MODE === 'development' && username && password) {
    await churchtoolsClient.post('/login', { username, password });
}

const KEY = import.meta.env.VITE_KEY;
export { KEY };

// Vimeo Video ID constant
const VIMEO_VIDEO_ID = '76979871';

const user = await churchtoolsClient.get<Person>(`/whoami`);

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <div style="display: flex; flex-direction: column; place-content: center; place-items: center; height: 100vh; padding: 20px;">
    <h1 style="margin-bottom: 20px;">Welcome ${[user.firstName, user.lastName].join(' ')}</h1>
    <div style="position: relative; width: 100%; max-width: 800px; padding-bottom: 56.25%; height: 0;">
      <iframe 
        src="https://player.vimeo.com/video/${VIMEO_VIDEO_ID}" 
        style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;" 
        frameborder="0" 
        allow="autoplay; fullscreen; picture-in-picture" 
        allowfullscreen
        title="Vimeo Video Player">
      </iframe>
    </div>
  </div>
`;
