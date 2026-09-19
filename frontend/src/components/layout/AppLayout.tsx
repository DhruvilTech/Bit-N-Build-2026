import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { NotificationsDrawer } from './NotificationsDrawer';
import { EmergencySimulatorModal } from '../ui/EmergencySimulatorModal';
import { SplitCursor } from '../ui/SplitCursor';
import { RadarBackground } from '../ui/RadarBackground';
import { motion, AnimatePresence } from 'framer-motion';

export const AppLayout: React.FC = () => {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const [mobileOpen, setMobileOpen] = useState<boolean>(false);

  return (
    <div className="relative min-h-screen bg-slate-50 text-slate-900 dark:bg-[#060911] dark:text-slate-100 selection:bg-cyan-500/25 selection:text-cyan-800 dark:selection:text-cyan-300 transition-colors duration-200 font-sans">
      {/* Tactical Canvas Radar Background */}
      <RadarBackground opacity={0.35} />

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
            isCollapsed ? 'lg:pl-24' : 'lg:pl-68'
          }`}
        >
          <AnimatePresence mode="wait">
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
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
