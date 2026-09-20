import { z } from 'zod';

const resourceTypeEnum = z.enum([
  'AMBULANCE',
  'FIRE_VEHICLE',
  'POLICE_VEHICLE',
  'RESCUE_EQUIPMENT',
  'MEDICAL_EQUIPMENT',
  'HAZMAT_UNIT',
  'AIRCRAFT_DRONE',
  'VEHICLE',
  'EQUIPMENT',
  'FIRE_TEAM',
  'POLICE_TEAM',
  'RESCUE_TEAM',
  'HOSPITAL',
  'SHELTER',
  'OTHER',
]);

const resourceStatusEnum = z.enum([
  'AVAILABLE',
  'ASSIGNED',
  'DISPATCHED',
  'EN_ROUTE',
  'ON_SCENE',
  'COMPLETED',
  'RETURNING',
  'BUSY',
  'OFFLINE',
]);

export const createResourceSchema = z.object({
  body: z.object({
    resourceId: z.string().trim().min(2).optional(),
    name: z.string().trim().min(2, 'Resource name is required'),
    type: resourceTypeEnum,
    status: resourceStatusEnum.optional(),
    capacity: z.number().min(0, 'Capacity cannot be negative').optional(),
    capabilities: z.array(z.string().trim()).optional(),
    location: z.object({
      latitude: z.number().min(-90).max(90),
      longitude: z.number().min(-180).max(180),
      address: z.string().trim().min(2, 'Address is required'),
    }),
    metadata: z.record(z.any()).optional(),
  }),
});

export const updateResourceSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2).optional(),
    type: resourceTypeEnum.optional(),
    status: resourceStatusEnum.optional(),
    capacity: z.number().min(0).optional(),
    capabilities: z.array(z.string().trim()).optional(),
    location: z
      .object({
        latitude: z.number().min(-90).max(90),
        longitude: z.number().min(-180).max(180),
        address: z.string().trim().min(2),
      })
      .optional(),
    metadata: z.record(z.any()).optional(),
  }),
});

export const updateResourceStatusSchema = z.object({
  body: z.object({
    status: resourceStatusEnum,
    notes: z.string().trim().optional(),
  }),
});

export const assignResourceSchema = z.object({
  body: z
    .object({
      incidentId: z.string().trim().optional(),
      teamId: z.string().trim().optional(),
      notes: z.string().trim().optional(),
    })
    .refine((data) => Boolean(data.incidentId || data.teamId), {
      message: 'Either incidentId or teamId must be provided for assignment',
    }),
});

export const releaseResourceSchema = z.object({
  body: z
    .object({
      notes: z.string().trim().optional(),
    })
    .optional(),
});

export const nearbyResourcesSchema = z.object({
  query: z.object({
    latitude: z.coerce.number().min(-90).max(90),
    longitude: z.coerce.number().min(-180).max(180),
    radiusMeters: z.coerce.number().positive().default(10000).optional(),
    type: resourceTypeEnum.optional(),
    status: resourceStatusEnum.optional(),
    capability: z.string().trim().optional(),
  }),
});

export const updateResourceLocationSchema = z.object({
  body: z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    status: resourceStatusEnum.optional(),
  }),
});

