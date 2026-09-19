import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { NotificationsDrawer } from './NotificationsDrawer';
import { EmergencySimulatorModal } from '../ui/EmergencySimulatorModal';
import { SplitCursor } from '../ui/SplitCursor';
import { RadarBackground } from '../ui/RadarBackground';
import { CursorGrid } from '../ui/CursorGrid';
import { motion, AnimatePresence } from 'framer-motion';

export const AppLayout: React.FC = () => {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const [mobileOpen, setMobileOpen] = useState<boolean>(false);

  return (
    <div className="relative min-h-screen atmospheric-bg text-slate-900 dark:text-[#F5F7FA] selection:bg-[#2DD4BF]/25 selection:text-teal-700 dark:selection:text-[#5EEAD4] transition-colors duration-200 font-sans">
      {/* Interactive Cursor Grid Background */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <CursorGrid
          cellSize={64}
          color="#2DD4BF"
          radius={160}
          falloff="smooth"
          holdTime={400}
          fadeDuration={800}
          lineWidth={1.2}
          maxOpacity={0.65}
          fillOpacity={0.08}
          gridOpacity={0.03}
          cellRadius={4}
          clickPulse={true}
          pulseSpeed={650}
          globalPointer={true}
        />
      </div>

      {/* Tactical Canvas Radar Background */}
      <RadarBackground opacity={0.2} />

      {/* Split/Magnetic Cursor */}
      <SplitCursor />

      {/* Top Operations Header */}
      <Header onToggleSidebar={() => setMobileOpen(!mobileOpen)} />

      <div className="flex relative z-10">
        {/* Navigation Sidebar */}
        <Sidebar
          isCollapsed={isCollapsed}
          setIsCollapsed={setIsCollapsed}
          mobileOpen={mobileOpen}
          setMobileOpen={setMobileOpen}
        />

        {/* Main Content View Container */}
        <main
          className={`flex-1 min-h-[calc(100vh-4rem)] p-4 sm:p-6 lg:p-8 transition-all duration-300 overflow-x-hidden ${
            isCollapsed ? 'lg:pl-24' : 'lg:pl-72'
          }`}
        >
          <AnimatePresence mode="wait">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="w-full max-w-7xl mx-auto"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Global Modals & Drawers */}
      <EmergencySimulatorModal />
      <NotificationsDrawer />
    </div>
  );
};
