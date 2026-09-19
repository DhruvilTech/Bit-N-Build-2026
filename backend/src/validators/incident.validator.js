import { z } from 'zod';

export const createIncidentSchema = z.object({
  body: z.object({
    title: z.string().min(3, 'Title is required'),
    type: z.enum([
      'FIRE',
      'FLOOD',
      'ROAD_ACCIDENT',
      'INDUSTRIAL_ACCIDENT',
      'MEDICAL_EMERGENCY',
      'EARTHQUAKE',
      'OTHER',
    ]),
    description: z.string().min(5, 'Description is required'),
    location: z.object({
      latitude: z.number().min(-90).max(90),
      longitude: z.number().min(-180).max(180),
      address: z.string().min(2, 'Address is required'),
    }),
    severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
    priority: z.enum(['P1', 'P2', 'P3', 'P4']).optional(),
    source: z
      .enum(['CITIZEN', 'SENSOR', 'EMERGENCY_CALL', 'FIELD_TEAM', 'GOVERNMENT', 'SYSTEM'])
      .optional(),
  }),
});
