
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import CreatorWizard from './pages/CreatorWizard';
import CheckoutPage from './pages/CheckoutPage';
import CouplePage from './pages/CouplePage';
import MinhasPaginas from './pages/MinhasPaginas';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/criar" element={<CreatorWizard />} />
        <Route path="/classico/criar" element={<Navigate to="/criar" replace />} />
        <Route path="/criar/checkout" element={<CheckoutPage />} />
        <Route path="/p/:slug" element={<CouplePage />} />
        <Route path="/minhas-paginas" element={<MinhasPaginas />} />
      </Routes>
    </BrowserRouter>
  );
}
