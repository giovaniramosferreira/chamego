import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import CreatorWizard from './pages/CreatorWizard';
import UpsellPage from './pages/UpsellPage';
import EmailStep from './pages/EmailStep';
import CheckoutPage from './pages/CheckoutPage';
import CouplePage from './pages/CouplePage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Funnel Routes */}
        <Route path="/" element={<LandingPage />} />
        
        {/* Creator Steps */}
        <Route path="/classico/criar" element={<CreatorWizard />} />
        <Route path="/classico/criar/miniserie-upsell" element={<UpsellPage />} />
        <Route path="/classico/criar/email" element={<EmailStep />} />
        
        {/* Checkout Steps */}
        <Route path="/criar/checkout" element={<CheckoutPage />} />
        
        {/* Result Couple Pages */}
        <Route path="/p/:slug" element={<CouplePage />} />
        <Route path="/pt/:slug" element={<CouplePage />} />
      </Routes>
    </BrowserRouter>
  );
}
