import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { EmergencyProvider } from './context/EmergencyContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { AppLayout } from './components/layout/AppLayout';

import { Landing } from './pages/Landing';
import { Login } from './pages/Login';
import { Signup } from './pages/Signup';
import { Unauthorized } from './pages/Unauthorized';
import { Dashboard } from './pages/Dashboard';
import { Incidents } from './pages/Incidents';
import { IncidentDetails } from './pages/IncidentDetails';
import { LiveMap } from './pages/LiveMap';
import { Resources } from './pages/Resources';
import { Teams } from './pages/Teams';
import { Alerts } from './pages/Alerts';
import { AIAssistant } from './pages/AIAssistant';
import { Analytics } from './pages/Analytics';
import { Notifications } from './pages/Notifications';
import { Settings } from './pages/Settings';
import { ComponentLibrary } from './pages/ComponentLibrary';

export function App() {
  return (
    <AuthProvider>
      <EmergencyProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Intro Experience */}
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/signup/:roleParam" element={<Signup />} />
            <Route path="/unauthorized" element={<Unauthorized />} />

            {/* Protected Main Application Shell */}
            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                <Route path="/command-center" element={<Dashboard />} />
                <Route path="/incidents" element={<Incidents />} />
                <Route path="/incidents/:id" element={<IncidentDetails />} />
                <Route path="/map" element={<LiveMap />} />
                <Route path="/resources" element={<Resources />} />
                <Route path="/teams" element={<Teams />} />
                <Route path="/alerts" element={<Alerts />} />
                <Route path="/assistant" element={<AIAssistant />} />
                <Route path="/analytics" element={<Analytics />} />
                <Route path="/notifications" element={<Notifications />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/components" element={<ComponentLibrary />} />
              </Route>
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/command-center" replace />} />
          </Routes>
        </BrowserRouter>
      </EmergencyProvider>
    </AuthProvider>
  );
}

export default App;
