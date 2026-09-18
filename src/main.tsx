import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router';
import Layout from '@/components/Layout';
import Home from '@/pages/Home';
import Download from '@/pages/Download';
import News from '@/pages/News';
import NewsArticle from '@/pages/NewsArticle';
import '@/styles/index.scss';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="download" element={<Download />} />
          <Route path="download/:category" element={<Download />} />
          <Route path="download/:category/:distro" element={<Download />} />
          <Route path="news" element={<News />} />
          <Route path="news/:slug" element={<NewsArticle />} />
          <Route path="help/*" element={<div>Help</div>} />
          <Route path="about" element={<div>About</div>} />
          <Route path="*" element={<div>404</div>} />
        </Route>
      </Routes>
    </BrowserRouter>
  </StrictMode>,
);