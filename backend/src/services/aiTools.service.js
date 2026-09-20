import { z } from 'zod';
import { IncidentModel } from '../models/incident.model.js';
import { ResourceModel } from '../models/resource.model.js';
import { FacilityModel } from '../models/facility.model.js';
import { AssignmentModel } from '../models/assignment.model.js';
import { ShortageService } from './shortage.service.js';
import { recordAuditLog } from './auditLog.service.js';

/**
 * Controlled Tool Registry for EmergenX AI Assistant
 * - All tools are backend-only
 * - Strict schema validation with Zod
 * - Strict RBAC role enforcement
 * - Audit logging on execution
 */
export const TOOL_REGISTRY = {
  getCriticalIncidents: {
    name: 'getCriticalIncidents',
    description: 'Retrieve currently active critical (P1) incidents requiring immediate response.',
    schema: z.object({
      limit: z.number().int().positive().max(50).default(10).optional(),
    }),
    jsonSchema: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Maximum number of incidents to return (default: 10)' },
      },
    },
    roles: ['ADMIN', 'OPERATOR', 'FIELD_COORDINATOR', 'MEDICAL_COORDINATOR'],
    handler: async (args) => {
      const limit = args.limit || 10;
      const incidents = await IncidentModel.find({
        severity: 'CRITICAL',
        status: { $nin: ['RESOLVED', 'CANCELLED'] },
      })
        .select('incidentId title type priority status location createdAt delayDetected')
        .sort({ priority: 1, createdAt: -1 })
        .limit(limit)
        .lean();

      return {
        count: incidents.length,
        incidents: incidents.map((i) => ({
          id: i.incidentId || String(i._id),
          title: i.title,
          type: i.type,
          priority: i.priority,
          status: i.status,
          location: i.location?.address || 'Metro Sector',
          delayed: Boolean(i.delayDetected),
          reportedAt: i.createdAt,
        })),
        source: 'Incident Management Registry',
      };
    },
  },

  getAvailableResources: {
    name: 'getAvailableResources',
    description: 'Retrieve available emergency resources (e.g. ambulances, fire vehicles, rescue teams) ready for dispatch.',
    schema: z.object({
      type: z.string().optional(),
      limit: z.number().int().positive().max(50).default(10).optional(),
    }),
    jsonSchema: {
      type: 'object',
      properties: {
        type: { type: 'string', description: 'Resource type filter (e.g. AMBULANCE, FIRE_VEHICLE, RESCUE_EQUIPMENT)' },
        limit: { type: 'number', description: 'Maximum number of resources to return (default: 10)' },
      },
    },
    roles: ['ADMIN', 'OPERATOR', 'FIELD_COORDINATOR', 'MEDICAL_COORDINATOR'],
    handler: async (args) => {
      const limit = args.limit || 10;
      const query = { status: 'AVAILABLE' };
      if (args.type) {
        query.type = args.type.toUpperCase();
      }

      const resources = await ResourceModel.find(query)
        .select('resourceId name type status location homeLocation')
        .limit(limit)
        .lean();

      return {
        count: resources.length,
        resources: resources.map((r) => ({
          id: r.resourceId,
          name: r.name,
          type: r.type,
          status: r.status,
          location: r.location?.address || 'Staging Depot',
        })),
        source: 'Resource Inventory',
      };
    },
  },

  getDelayedIncidents: {
    name: 'getDelayedIncidents',
    description: 'Retrieve incidents where assigned units are experiencing transit delays or exceeding SLA thresholds.',
    schema: z.object({
      limit: z.number().int().positive().max(50).default(10).optional(),
    }),
    jsonSchema: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Maximum number of delayed incidents to return (default: 10)' },
      },
    },
    roles: ['ADMIN', 'OPERATOR', 'FIELD_COORDINATOR', 'MEDICAL_COORDINATOR'],
    handler: async (args) => {
      const limit = args.limit || 10;
      const delayed = await IncidentModel.find({
        delayDetected: true,
        status: { $nin: ['RESOLVED', 'CANCELLED'] },
      })
        .select('incidentId title type severity delayMinutes location status')
        .limit(limit)
        .lean();

      return {
        count: delayed.length,
        delayedIncidents: delayed.map((d) => ({
          id: d.incidentId || String(d._id),
          title: d.title,
          type: d.type,
          severity: d.severity,
          delayMinutes: d.delayMinutes || 5,
          location: d.location?.address || 'Transit Corridor',
          status: d.status,
        })),
        source: 'Transit Telemetry Monitor',
      };
    },
  },

  getHospitalCapacity: {
    name: 'getHospitalCapacity',
    description: 'Retrieve hospital bed capacity, ICU availability, burn bed availability, and divert statuses.',
    schema: z.object({
      zone: z.string().optional(),
      divertOnly: z.boolean().optional(),
    }),
    jsonSchema: {
      type: 'object',
      properties: {
        zone: { type: 'string', description: 'Filter by geographical zone/address' },
        divertOnly: { type: 'boolean', description: 'Return only hospitals currently on divert status' },
      },
    },
    roles: ['ADMIN', 'OPERATOR', 'FIELD_COORDINATOR', 'MEDICAL_COORDINATOR'],
    handler: async (args) => {
      const query = { type: 'HOSPITAL' };
      if (args.divertOnly) {
        query.status = 'DIVERTING';
      }

      const facilities = await FacilityModel.find(query)
        .select('facilityId name capacity availableCapacity status emergencyStatus departments location specializations')
        .lean();

      const hospitals = facilities.map((f) => {
        const occupied = Math.max(0, (f.capacity || 0) - (f.availableCapacity || 0));
        const occupancyRate = f.capacity ? Math.round((occupied / f.capacity) * 100) : 0;

        // Extract ICU and Burn departments if configured
        const icuDept = (f.departments || []).find((d) => /icu|intensive/i.test(d.name));
        const burnDept = (f.departments || []).find((d) => /burn/i.test(d.name));

        return {
          id: f.facilityId,
          name: f.name,
          totalBeds: f.capacity,
          availableBeds: f.availableCapacity,
          occupiedBeds: occupied,
          occupancyPercentage: occupancyRate,
          divertStatus: f.status === 'DIVERTING',
          emergencyStatus: f.emergencyStatus || 'NORMAL',
          icu: icuDept ? {
            total: icuDept.capacity,
            available: icuDept.availableCapacity,
            occupied: Math.max(0, icuDept.capacity - icuDept.availableCapacity),
          } : null,
          burn: burnDept ? {
            total: burnDept.capacity,
            available: burnDept.availableCapacity,
            occupied: Math.max(0, burnDept.capacity - burnDept.availableCapacity),
          } : null,
          location: f.location?.address || 'Metro Area',
        };
      });

      return {
        count: hospitals.length,
        hospitals,
        totalAvailableBeds: hospitals.reduce((acc, h) => acc + h.availableBeds, 0),
        divertingHospitalsCount: hospitals.filter((h) => h.divertStatus).length,
        source: 'Medical Facilities Registry',
      };
    },
  },

  getResourceShortages: {
    name: 'getResourceShortages',
    description: 'Calculate real-time operational resource shortages (Demand - Available Supply) across active incidents.',
    schema: z.object({}),
    jsonSchema: {
      type: 'object',
      properties: {},
    },
    roles: ['ADMIN', 'OPERATOR', 'FIELD_COORDINATOR', 'MEDICAL_COORDINATOR'],
    handler: async () => {
      const shortages = await ShortageService.calculateResourceShortages();
      return {
        ...shortages,
        source: 'Resource Shortage Intelligence Engine',
      };
    },
  },

  getIncidentSummary: {
    name: 'getIncidentSummary',
    description: 'Retrieve full operational situation summary and details for a specific incident.',
    schema: z.object({
      incidentId: z.string().min(1, 'incidentId is required'),
    }),
    jsonSchema: {
      type: 'object',
      required: ['incidentId'],
      properties: {
        incidentId: { type: 'string', description: 'Unique incident identifier (e.g. INC-1042)' },
      },
    },
    roles: ['ADMIN', 'OPERATOR', 'FIELD_COORDINATOR', 'MEDICAL_COORDINATOR'],
    handler: async (args) => {
      const inc = await IncidentModel.findOne({
        $or: [{ incidentId: args.incidentId }, { _id: args.incidentId.match(/^[0-9a-fA-F]{24}$/) ? args.incidentId : null }],
      }).lean();

      if (!inc) {
        return {
          found: false,
          message: `Incident #${args.incidentId} not found in database.`,
        };
      }

      const assignments = await AssignmentModel.find({ incidentId: inc.incidentId || args.incidentId }).lean();

      return {
        found: true,
        incident: {
          id: inc.incidentId || String(inc._id),
          title: inc.title,
          description: inc.description,
          type: inc.type,
          severity: inc.severity,
          priority: inc.priority,
          status: inc.status,
          location: inc.location?.address || 'Metro Sector',
          reportedAt: inc.createdAt,
          reportsCount: (inc.reports || []).length,
          assignedUnitsCount: assignments.length,
          assignedUnits: assignments.map((a) => ({
            resourceId: a.resourceId,
            name: a.resourceName,
            status: a.status,
            arrivedAt: a.arrivedAt,
          })),
        },
        source: `Incident Record #${args.incidentId}`,
      };
    },
  },

  getActiveIncidents: {
    name: 'getActiveIncidents',
    description: 'Retrieve all non-resolved, non-cancelled active incidents with current statuses.',
    schema: z.object({
      status: z.string().optional(),
      limit: z.number().int().positive().max(50).default(10).optional(),
    }),
    jsonSchema: {
      type: 'object',
      properties: {
        status: { type: 'string', description: 'Optional status filter (e.g. NEW, ASSIGNED, RESPONDING)' },
        limit: { type: 'number', description: 'Maximum number of incidents (default: 10)' },
      },
    },
    roles: ['ADMIN', 'OPERATOR', 'FIELD_COORDINATOR', 'MEDICAL_COORDINATOR'],
    handler: async (args) => {
      const limit = args.limit || 10;
      const query = { status: { $nin: ['RESOLVED', 'CANCELLED'] } };
      if (args.status) {
        query.status = args.status.toUpperCase();
      }

      const incidents = await IncidentModel.find(query)
        .select('incidentId title type severity priority status location createdAt delayDetected')
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();

      return {
        count: incidents.length,
        incidents: incidents.map((i) => ({
          id: i.incidentId || String(i._id),
          title: i.title,
          type: i.type,
          severity: i.severity,
          priority: i.priority,
          status: i.status,
          location: i.location?.address || 'Metro Sector',
          delayed: Boolean(i.delayDetected),
        })),
        source: 'Incident Management Registry',
      };
    },
  },

  getIncidentDetails: {
    name: 'getIncidentDetails',
    description: 'Retrieve deep technical details including coordinates, caller reports, and timeline for an incident.',
    schema: z.object({
      incidentId: z.string().min(1),
    }),
    jsonSchema: {
      type: 'object',
      required: ['incidentId'],
      properties: {
        incidentId: { type: 'string', description: 'Unique incident identifier' },
      },
    },
    roles: ['ADMIN', 'OPERATOR', 'FIELD_COORDINATOR', 'MEDICAL_COORDINATOR'],
    handler: async (args) => {
      const inc = await IncidentModel.findOne({
        $or: [{ incidentId: args.incidentId }, { _id: args.incidentId.match(/^[0-9a-fA-F]{24}$/) ? args.incidentId : null }],
      }).lean();

      if (!inc) {
        return { found: false, message: `Incident #${args.incidentId} not found.` };
      }

      return {
        found: true,
        incident: {
          id: inc.incidentId,
          title: inc.title,
          type: inc.type,
          severity: inc.severity,
          priority: inc.priority,
          status: inc.status,
          coordinates: inc.location?.geometry?.coordinates || [inc.location?.longitude, inc.location?.latitude],
          address: inc.location?.address,
          timeline: inc.timeline || [],
          reports: inc.reports || [],
        },
        source: `Incident Record #${args.incidentId}`,
      };
    },
  },

  getAssignedResources: {
    name: 'getAssignedResources',
    description: 'Retrieve resources and units assigned to a specific incident with their response statuses.',
    schema: z.object({
      incidentId: z.string().min(1),
    }),
    jsonSchema: {
      type: 'object',
      required: ['incidentId'],
      properties: {
        incidentId: { type: 'string', description: 'Incident identifier to check assignments for' },
      },
    },
    roles: ['ADMIN', 'OPERATOR', 'FIELD_COORDINATOR', 'MEDICAL_COORDINATOR'],
    handler: async (args) => {
      const assignments = await AssignmentModel.find({ incidentId: args.incidentId })
        .select('assignmentId resourceId resourceName resourceType status assignedAt enRouteAt arrivedAt completedAt delayMinutes')
        .lean();

      return {
        incidentId: args.incidentId,
        count: assignments.length,
        assignments: assignments.map((a) => ({
          assignmentId: a.assignmentId,
          resourceId: a.resourceId,
          name: a.resourceName,
          type: a.resourceType,
          status: a.status,
          assignedAt: a.assignedAt,
          arrivedAt: a.arrivedAt,
          delayMinutes: a.delayMinutes || 0,
        })),
        source: 'Assignment Registry',
      };
    },
  },

  getResponseMetrics: {
    name: 'getResponseMetrics',
    description: 'Retrieve SLA response time and arrival telemetry for operational performance tracking.',
    schema: z.object({
      incidentId: z.string().optional(),
    }),
    jsonSchema: {
      type: 'object',
      properties: {
        incidentId: { type: 'string', description: 'Optional incident ID to filter metrics' },
      },
    },
    roles: ['ADMIN', 'OPERATOR', 'FIELD_COORDINATOR', 'MEDICAL_COORDINATOR'],
    handler: async (args) => {
      const query = { status: { $in: ['ON_SCENE', 'COMPLETED'] } };
      if (args.incidentId) {
        query.incidentId = args.incidentId;
      }

      const completedAssignments = await AssignmentModel.find(query)
        .select('actualArrivalMinutes responseTimeMinutes delayMinutes incidentId resourceName')
        .limit(50)
        .lean();

      const validTimes = completedAssignments
        .map((a) => a.actualArrivalMinutes || a.responseTimeMinutes)
        .filter((t) => typeof t === 'number' && t > 0);

      const avgResponseTime = validTimes.length > 0
        ? Math.round((validTimes.reduce((a, b) => a + b, 0) / validTimes.length) * 10) / 10
        : null;

      return {
        sampleSize: completedAssignments.length,
        averageResponseTimeMinutes: avgResponseTime,
        targetSlaMinutes: 8.0,
        withinSla: avgResponseTime ? avgResponseTime <= 8.0 : true,
        source: 'Assignment Telemetry Metrics',
      };
    },
  },
};

export class AiToolsService {
  /**
   * Return tool definitions formatted for Mistral function calling, filtered by user role
   */
  static getToolsForRole(role = 'OPERATOR') {
    const userRole = (role || 'OPERATOR').toUpperCase();
    const availableTools = [];

    for (const [toolName, tool] of Object.entries(TOOL_REGISTRY)) {
      if (tool.roles.includes(userRole)) {
        availableTools.push({
          type: 'function',
          function: {
            name: tool.name,
            description: tool.description,
            parameters: tool.jsonSchema,
          },
        });
      }
    }

    return availableTools;
  }

  /**
   * Validate and execute a controlled tool
   */
  static async executeTool(toolName, rawArgs = {}, user = null) {
    const tool = TOOL_REGISTRY[toolName];
    if (!tool) {
      const err = new Error(`Tool '${toolName}' is not registered`);
      err.statusCode = 400;
      throw err;
    }

    // Role check
    const userRole = (user?.role || 'OPERATOR').toUpperCase();
    if (!tool.roles.includes(userRole)) {
      const err = new Error(`Role '${userRole}' is not authorized to execute tool '${toolName}'`);
      err.statusCode = 403;
      throw err;
    }

    // Validate arguments with Zod
    const parseResult = tool.schema.safeParse(rawArgs || {});
    if (!parseResult.success) {
      const err = new Error(`Invalid arguments for tool '${toolName}': ${parseResult.error.message}`);
      err.statusCode = 400;
      throw err;
    }

    const validatedArgs = parseResult.data;

    let result;
    let isSuccess = true;
    let errorMessage = null;

    try {
      result = await tool.handler(validatedArgs);
    } catch (handlerErr) {
      isSuccess = false;
      errorMessage = handlerErr.message;
      throw handlerErr;
    } finally {
      // Audit log
      try {
        await recordAuditLog({
          user,
          action: 'AI_TOOL_EXECUTED',
          entityType: 'AI_TOOL',
          entityId: toolName,
          metadata: {
            toolName,
            arguments: validatedArgs,
            success: isSuccess,
            error: errorMessage,
          },
        });
      } catch (logErr) {
        // non-blocking
      }
    }

    return result;
  }
}

export default AiToolsService;
