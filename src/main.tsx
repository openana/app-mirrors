import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router';
import { I18nProvider } from '@/i18n';
import Layout from '@/components/Layout';
import Home from '@/pages/Home';
import Download from '@/pages/Download';
import News from '@/pages/News';
import NewsArticle from '@/pages/NewsArticle';
import About from '@/pages/About';
import Help from '@/pages/Help';

// Local font imports (replaces Google Fonts CDN)
import '@fontsource/material-icons/index.css';
import '@fontsource/source-sans-3/400.css';
import '@fontsource/source-sans-3/700.css';
import '@fontsource/source-sans-3/400-italic.css';
import '@fontsource/source-code-pro/400.css';
import '@fontsource/source-code-pro/700.css';

import '@/styles/index.scss';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <I18nProvider>
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<About />} />
          <Route path="mirrors" element={<Home />} />
          <Route path="download" element={<Download />} />
          <Route path="download/:category" element={<Download />} />
          <Route path="download/:category/:distro" element={<Download />} />
          <Route path="news" element={<News />} />
          <Route path="news/:slug" element={<NewsArticle />} />
          <Route path="help/*" element={<Help />} />

          <Route path="*" element={<div>404</div>} />
        </Route>
      </Routes>
    </BrowserRouter>
    </I18nProvider>
  </StrictMode>,
);