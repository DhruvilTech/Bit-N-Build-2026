import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { EmergencyProvider } from './context/EmergencyContext';
import { AppLayout } from './components/layout/AppLayout';

import { Landing } from './pages/Landing';
import { Login } from './pages/Login';
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

export function App() {
  return (
    <EmergencyProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Intro Experience */}
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />

          {/* Main Application Shell */}
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
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/command-center" replace />} />
        </Routes>
      </BrowserRouter>
    </EmergencyProvider>
  );
}

export default App;
