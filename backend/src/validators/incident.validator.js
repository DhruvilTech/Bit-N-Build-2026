import { z } from 'zod';

export const createIncidentSchema = z.object({
  body: z.object({
    title: z.string().min(3, 'Title is required and must be at least 3 characters'),
    type: z.enum(
      [
        'FIRE',
        'FLOOD',
        'ROAD_ACCIDENT',
        'INDUSTRIAL_ACCIDENT',
        'MEDICAL_EMERGENCY',
        'EARTHQUAKE',
        'OTHER',
      ],
      { errorMap: () => ({ message: 'Invalid incident type' }) }
    ),
    description: z.string().min(5, 'Description is required and must be at least 5 characters'),
    location: z.object({
      latitude: z
        .number({ required_error: 'Latitude is required' })
        .min(-90, 'Latitude must be between -90 and 90')
        .max(90, 'Latitude must be between -90 and 90'),
      longitude: z
        .number({ required_error: 'Longitude is required' })
        .min(-180, 'Longitude must be between -180 and 180')
        .max(180, 'Longitude must be between -180 and 180'),
      address: z.string().min(2, 'Address is required'),
    }),
    severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
    priority: z.enum(['P1', 'P2', 'P3', 'P4']).optional(),
    source: z
      .enum(['CITIZEN', 'EMERGENCY_CALL', 'SENSOR', 'FIELD_TEAM', 'OPERATOR', 'GOVERNMENT', 'OTHER'])
      .optional(),
    metadata: z.record(z.any()).optional(),
  }),
});

export const updateIncidentSchema = z.object({
  body: z.object({
    title: z.string().min(3).optional(),
    type: z
      .enum(['FIRE', 'FLOOD', 'ROAD_ACCIDENT', 'INDUSTRIAL_ACCIDENT', 'MEDICAL_EMERGENCY', 'EARTHQUAKE', 'OTHER'])
      .optional(),
    description: z.string().min(5).optional(),
    severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
    priority: z.enum(['P1', 'P2', 'P3', 'P4']).optional(),
    metadata: z.record(z.any()).optional(),
  }),
});

export const updateStatusSchema = z.object({
  body: z.object({
    status: z.enum(
      [
        'NEW',
        'ACKNOWLEDGED',
        'ASSIGNED',
        'RESPONDING',
        'ON_SCENE',
        'RESOLVED',
        'CANCELLED',
        'ANALYZING',
        'PRIORITIZED',
        'ESCALATED',
      ],
      { errorMap: () => ({ message: 'Invalid incident status' }) }
    ),
    reason: z.string().optional(),
  }),
});

export const updateLocationSchema = z.object({
  body: z.object({
    latitude: z
      .number({ required_error: 'Latitude is required' })
      .min(-90, 'Latitude must be between -90 and 90')
      .max(90, 'Latitude must be between -90 and 90'),
    longitude: z
      .number({ required_error: 'Longitude is required' })
      .min(-180, 'Longitude must be between -180 and 180')
      .max(180, 'Longitude must be between -180 and 180'),
    address: z.string().min(2, 'Address is required'),
  }),
});
