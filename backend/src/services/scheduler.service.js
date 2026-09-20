import { env } from '../config/env.js';
import { scanActiveAssignmentsForDelays } from './delay.service.js';
import {
  evaluateUnassignedCriticalAlerts,
  evaluateEscalationRequiredAlerts,
} from './alert.service.js';

let schedulerInterval = null;
let isExecuting = false;

/**
 * Execute one centralized scheduler tick
 */
export const runSchedulerTick = async () => {
  if (isExecuting) return; // Prevent overlapping execution cycles
  isExecuting = true;

  try {
    const now = new Date();

    // 1. Scan and process delayed assignments (Phase 14 SLA Engine)
    await scanActiveAssignmentsForDelays(now);

    // 2. Evaluate unassigned P1 critical incident alerts (Phase 15 Alert Rule 4)
    await evaluateUnassignedCriticalAlerts();

    // 3. Evaluate P1 escalation alerts (Phase 15 Alert Rule 5)
    await evaluateEscalationRequiredAlerts();
  } catch (error) {
    console.error('[Scheduler] Error during scheduled maintenance cycle:', error.message);
  } finally {
    isExecuting = false;
  }
};

/**
 * Start the centralized background scheduler
 */
export const startScheduler = (intervalMs = null) => {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
  }

  const interval = intervalMs || env.SLA_CHECK_INTERVAL_MS || 30000;
  console.log(`[Scheduler] Centralized SLA & Alert Engine scheduler started (Cycle: ${interval}ms)`);

  schedulerInterval = setInterval(() => {
    runSchedulerTick();
  }, interval);

  return schedulerInterval;
};

/**
 * Stop the centralized background scheduler
 */
export const stopScheduler = () => {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    console.log('[Scheduler] Centralized scheduler stopped.');
  }
};
