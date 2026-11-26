import {createRoot} from 'react-dom/client';
import { Analytics } from '@vercel/analytics/react';
import App from './App.tsx';
import './index.css';

const contohCari = import.meta.env.DEV
  && new URLSearchParams(window.location.search).get('contoh-cari') === '1';

if (contohCari) {
  import('./dev/searchHarness').then((mod) => mod.renderSearchHarness());
} else {
  createRoot(document.getElementById('root')!).render(
    <>
      <App />
      <Analytics />
    </>
  );
}
