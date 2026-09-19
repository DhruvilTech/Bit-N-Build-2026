import { z } from 'zod';

const teamTypeEnum = z.enum(['FIRE', 'MEDICAL', 'POLICE', 'RESCUE', 'DISASTER_RESPONSE', 'HAZMAT']);
const teamStatusEnum = z.enum(['AVAILABLE', 'ASSIGNED', 'EN_ROUTE', 'ON_SCENE', 'BUSY', 'OFFLINE']);

export const createTeamSchema = z.object({
  body: z.object({
    teamId: z.string().trim().min(2).optional(),
    name: z.string().trim().min(2, 'Team name is required'),
    type: teamTypeEnum,
    status: teamStatusEnum.optional(),
    members: z.array(z.string().trim()).optional(),
    vehicleId: z.string().trim().optional(),
    assignedResources: z.array(z.string().trim()).optional(),
    capabilities: z.array(z.string().trim()).optional(),
    location: z.object({
      latitude: z.number().min(-90).max(90),
      longitude: z.number().min(-180).max(180),
      address: z.string().trim().min(2, 'Address is required'),
    }),
    radioChannel: z.string().trim().optional(),
    metadata: z.record(z.any()).optional(),
  }),
});

export const updateTeamSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2).optional(),
    type: teamTypeEnum.optional(),
    status: teamStatusEnum.optional(),
    members: z.array(z.string().trim()).optional(),
    vehicleId: z.string().trim().optional(),
    capabilities: z.array(z.string().trim()).optional(),
    radioChannel: z.string().trim().optional(),
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

export const updateTeamStatusSchema = z.object({
  body: z.object({
    status: teamStatusEnum,
    notes: z.string().trim().optional(),
  }),
});

export const updateTeamLocationSchema = z.object({
  body: z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    address: z.string().trim().min(2).optional(),
  }),
});

export const assignTeamSchema = z.object({
  body: z.object({
    incidentId: z.string().trim().min(1, 'Incident ID is required for team dispatch'),
    notes: z.string().trim().optional(),
  }),
});

export const releaseTeamSchema = z.object({
  body: z
    .object({
      notes: z.string().trim().optional(),
    })
    .optional(),
});

export const teamResourceSchema = z.object({
  body: z.object({
    resourceId: z.string().trim().min(1, 'Resource ID is required'),
  }),
});

export const nearbyTeamsSchema = z.object({
  query: z.object({
    latitude: z.coerce.number().min(-90).max(90),
    longitude: z.coerce.number().min(-180).max(180),
    radiusMeters: z.coerce.number().positive().default(10000).optional(),
    type: teamTypeEnum.optional(),
    status: teamStatusEnum.optional(),
    capability: z.string().trim().optional(),
  }),
});
