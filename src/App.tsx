
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { isDemoMode } from './lib/supabase';
import Home from './pages/Home';
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import Results from './pages/Results';
import AIInsights from './pages/AIInsights';
import Layout from './components/Layout';

// Protected Route Wrapper
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();

  // Demo Mode: Allow access without auth
  if (isDemoMode) {
    return <Layout>{children}</Layout>;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return <Layout>{children}</Layout>;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/auth" element={<Auth />} />

          {/* App Routes wrapped in Layout */}
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/results" element={<ProtectedRoute><Results /></ProtectedRoute>} />
          <Route path="/ai-insights" element={<ProtectedRoute><AIInsights /></ProtectedRoute>} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
