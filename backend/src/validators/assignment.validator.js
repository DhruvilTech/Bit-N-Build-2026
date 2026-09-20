import { z } from 'zod';

export const createAssignmentsSchema = z.object({
  body: z.object({
    resourceIds: z
      .array(z.string().min(1, 'Resource ID cannot be empty'))
      .min(1, 'At least one resource ID must be specified for assignment'),
    notes: z.string().max(500, 'Notes cannot exceed 500 characters').optional(),
  }),
});

export const createAssignmentSchema = z.object({
  body: z
    .object({
      incidentId: z.string().min(1, 'Incident ID is required'),
      teamId: z.string().optional(),
      resourceId: z.string().optional(),
      notes: z.string().max(500, 'Notes cannot exceed 500 characters').optional(),
    })
    .refine((data) => Boolean(data.teamId || data.resourceId), {
      message: 'Either teamId or resourceId must be provided',
    }),
});

export const cancelAssignmentSchema = z.object({
  params: z
    .object({
      id: z.string().optional(),
    })
    .optional(),
  body: z.object({
    reason: z.string().min(1, 'Reason for cancellation is required'),
    notes: z.string().max(500, 'Notes cannot exceed 500 characters').optional(),
  }),
});

export const updateAssignmentStatusSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Assignment ID is required'),
  }),
  body: z.object({
    status: z.enum(['DISPATCHED', 'EN_ROUTE', 'ARRIVED', 'ON_SCENE', 'COMPLETED', 'CANCELLED'], {
      errorMap: () => ({
        message: 'Status must be one of: DISPATCHED, EN_ROUTE, ARRIVED, ON_SCENE, COMPLETED, CANCELLED',
      }),
    }),
    notes: z.string().max(500, 'Notes cannot exceed 500 characters').optional(),
    timestamp: z
      .string()
      .datetime({ message: 'Timestamp must be a valid ISO 8601 date string' })
      .optional(),
  }),
});

export const releaseAssignmentSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Assignment ID is required'),
  }),
  body: z
    .object({
      notes: z.string().max(500, 'Notes cannot exceed 500 characters').optional(),
    })
    .optional(),
});

export const getRecommendationsSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Incident ID is required'),
  }),
  query: z
    .object({
      strategy: z.enum(['BALANCED', 'FASTEST_ETA', 'CAPABILITY_FIRST']).optional(),
      maxDistanceKm: z.coerce.number().min(1).max(500).optional(),
      limit: z.coerce.number().min(1).max(50).optional(),
      refresh: z.coerce.boolean().optional(),
    })
    .optional(),
});
