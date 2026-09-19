import { z } from 'zod';

const facilityTypeEnum = z.enum(['HOSPITAL', 'SHELTER', 'EMERGENCY_CENTER']);
const facilityStatusEnum = z.enum([
  'OPERATIONAL',
  'DIVERTING',
  'AT_CAPACITY',
  'LIMITED_SERVICE',
  'OFFLINE',
]);
const emergencyStatusEnum = z.enum(['NORMAL', 'BUSY', 'SURGE', 'CRITICAL', 'EVACUATING']);

export const createFacilitySchema = z.object({
  body: z
    .object({
      facilityId: z.string().trim().min(2).optional(),
      name: z.string().trim().min(2, 'Facility name is required'),
      type: facilityTypeEnum,
      capacity: z.number().min(0, 'Capacity cannot be negative'),
      availableCapacity: z.number().min(0, 'Available capacity cannot be negative'),
      specializations: z.array(z.string().trim()).optional(),
      status: facilityStatusEnum.optional(),
      emergencyStatus: emergencyStatusEnum.optional(),
      contactNumber: z.string().trim().optional(),
      operationalHours: z.string().trim().optional(),
      location: z.object({
        latitude: z.number().min(-90).max(90),
        longitude: z.number().min(-180).max(180),
        address: z.string().trim().min(2, 'Address is required'),
      }),
      departments: z
        .array(
          z.object({
            name: z.string().trim().min(1),
            capacity: z.number().min(0).optional(),
            availableCapacity: z.number().min(0).optional(),
            status: z.enum(['OPERATIONAL', 'FULL', 'DIVERTING', 'CLOSED']).optional(),
          })
        )
        .optional(),
      metadata: z.record(z.any()).optional(),
    })
    .refine((data) => data.availableCapacity <= data.capacity, {
      message: 'Available capacity cannot exceed total capacity',
      path: ['availableCapacity'],
    }),
});

export const updateFacilitySchema = z.object({
  body: z
    .object({
      name: z.string().trim().min(2).optional(),
      type: facilityTypeEnum.optional(),
      capacity: z.number().min(0).optional(),
      availableCapacity: z.number().min(0).optional(),
      specializations: z.array(z.string().trim()).optional(),
      status: facilityStatusEnum.optional(),
      emergencyStatus: emergencyStatusEnum.optional(),
      contactNumber: z.string().trim().optional(),
      operationalHours: z.string().trim().optional(),
      location: z
        .object({
          latitude: z.number().min(-90).max(90),
          longitude: z.number().min(-180).max(180),
          address: z.string().trim().min(2),
        })
        .optional(),
      departments: z
        .array(
          z.object({
            name: z.string().trim().min(1),
            capacity: z.number().min(0).optional(),
            availableCapacity: z.number().min(0).optional(),
            status: z.enum(['OPERATIONAL', 'FULL', 'DIVERTING', 'CLOSED']).optional(),
          })
        )
        .optional(),
      metadata: z.record(z.any()).optional(),
    })
    .refine(
      (data) => {
        if (data.capacity !== undefined && data.availableCapacity !== undefined) {
          return data.availableCapacity <= data.capacity;
        }
        return true;
      },
      {
        message: 'Available capacity cannot exceed total capacity',
        path: ['availableCapacity'],
      }
    ),
});

export const updateFacilityCapacitySchema = z.object({
  body: z
    .object({
      availableCapacity: z.number().optional(),
      delta: z.number().int().optional(),
      capacity: z.number().min(0).optional(),
    })
    .refine(
      (data) =>
        data.availableCapacity !== undefined ||
        data.delta !== undefined ||
        data.capacity !== undefined,
      {
        message: 'Either availableCapacity, delta, or capacity must be provided',
      }
    ),
});

export const updateFacilityEmergencyStatusSchema = z.object({
  body: z.object({
    emergencyStatus: emergencyStatusEnum,
    status: facilityStatusEnum.optional(),
    notes: z.string().trim().optional(),
  }),
});

export const nearbyFacilitiesSchema = z.object({
  query: z.object({
    latitude: z.coerce.number().min(-90).max(90),
    longitude: z.coerce.number().min(-180).max(180),
    radiusMeters: z.coerce.number().positive().default(15000).optional(),
    type: facilityTypeEnum.optional(),
    specialization: z.string().trim().optional(),
    minAvailableCapacity: z.coerce.number().min(0).optional(),
    emergencyStatus: emergencyStatusEnum.optional(),
    status: facilityStatusEnum.optional(),
  }),
});
