import { z } from 'zod';

export const alertTypeEnum = z.enum([
  'CRITICAL_INCIDENT',
  'RESPONSE_DELAY',
  'RESOURCE_SHORTAGE',
  'UNASSIGNED_CRITICAL',
  'ESCALATION_REQUIRED',
]);

export const alertStatusEnum = z.enum(['ACTIVE', 'ACKNOWLEDGED', 'RESOLVED']);

export const alertSeverityEnum = z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL', 'WARNING']);

export const acknowledgeAlertSchema = z.object({
  body: z
    .object({
      note: z.string().trim().optional(),
    })
    .optional(),
});

export const resolveAlertSchema = z.object({
  body: z
    .object({
      resolution: z.string().trim().optional(),
      note: z.string().trim().optional(),
    })
    .optional(),
});

export const queryAlertSchema = z.object({
  query: z
    .object({
      status: z.string().optional(),
      type: z.string().optional(),
      severity: z.string().optional(),
      incidentId: z.string().optional(),
      assignmentId: z.string().optional(),
      page: z.string().optional(),
      limit: z.string().optional(),
    })
    .optional(),
});
