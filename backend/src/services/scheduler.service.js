import { env } from '../config/env.js';
import { scanActiveAssignmentsForDelays } from './delay.service.js';
import {
  evaluateUnassignedCriticalAlerts,
  evaluateEscalationRequiredAlerts,
} from './alert.service.js';

let schedulerInterval = null;
let isExecuting = false;

const schedulerStats = {
  lastRunAt: null,
  lastSuccessAt: null,
  lastFailureAt: null,
  lastError: null,
  runCount: 0,
  consecutiveFailures: 0,
};

/**
 * Execute one centralized scheduler tick
 */
export const runSchedulerTick = async () => {
  if (isExecuting) return; // Prevent overlapping execution cycles
  isExecuting = true;
  const now = new Date();
  schedulerStats.lastRunAt = now;
  schedulerStats.runCount += 1;

  try {
    // 1. Scan and process delayed assignments (Phase 14 SLA Engine)
    await scanActiveAssignmentsForDelays(now);

    // 2. Evaluate unassigned P1 critical incident alerts (Phase 15 Alert Rule 4)
    await evaluateUnassignedCriticalAlerts();

    // 3. Evaluate P1 escalation alerts (Phase 15 Alert Rule 5)
    await evaluateEscalationRequiredAlerts();

    schedulerStats.lastSuccessAt = new Date();
    schedulerStats.consecutiveFailures = 0;
    schedulerStats.lastError = null;
  } catch (error) {
    schedulerStats.lastFailureAt = new Date();
    schedulerStats.lastError = error.message;
    schedulerStats.consecutiveFailures += 1;
    console.error('[Scheduler] Error during scheduled maintenance cycle:', error.message);
  } finally {
    isExecuting = false;
  }
};

const schedulerStartTime = Date.now();

/**
 * Get current health and runtime status of background scheduler (Phase 31)
 */
export const getSchedulerHealth = () => {
  const isRunning = Boolean(schedulerInterval);
  let status = 'healthy';
  if (schedulerStats.consecutiveFailures > 2) {
    status = 'unhealthy';
  } else if (schedulerStats.consecutiveFailures > 0) {
    status = 'degraded';
  }

  return {
    status,
    running: isRunning,
    isExecuting,
    uptime: Math.floor((Date.now() - schedulerStartTime) / 1000),
    timestamp: new Date().toISOString(),
    intervalMs: env.SLA_CHECK_INTERVAL_MS || 30000,
    lastRunAt: schedulerStats.lastRunAt ? schedulerStats.lastRunAt.toISOString() : null,
    lastSuccessAt: schedulerStats.lastSuccessAt ? schedulerStats.lastSuccessAt.toISOString() : null,
    lastFailureAt: schedulerStats.lastFailureAt ? schedulerStats.lastFailureAt.toISOString() : null,
    lastError: schedulerStats.lastError,
    runCount: schedulerStats.runCount,
    consecutiveFailures: schedulerStats.consecutiveFailures,
  };
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

