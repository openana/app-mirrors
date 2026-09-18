import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router';
import Layout from '@/components/Layout';
import '@/styles/index.scss';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<div>Home</div>} />
          <Route path="download" element={<div>Downloads</div>} />
          <Route path="download/:category" element={<div>Downloads</div>} />
          <Route path="download/:category/:distro" element={<div>Downloads</div>} />
          <Route path="news" element={<div>News</div>} />
          <Route path="news/:slug" element={<div>News Article</div>} />
          <Route path="help/*" element={<div>Help</div>} />
          <Route path="about" element={<div>About</div>} />
          <Route path="*" element={<div>404</div>} />
        </Route>
      </Routes>
    </BrowserRouter>
  </StrictMode>,
);