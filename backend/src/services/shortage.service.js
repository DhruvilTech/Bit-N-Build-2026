import { IncidentModel } from '../models/incident.model.js';
import { ResourceModel } from '../models/resource.model.js';
import Notification from '../models/notification.model.js';
import { emitResourceShortage, emitNotificationNew } from '../utils/socket.js';

export class ShortageService {
  /**
   * Determine resource requirements based on active incident type and severity
   */
  static getRequiredResourcesForIncident(incident) {
    const requirements = {};
    const severity = incident.severity || 'MEDIUM';
    const type = incident.type || 'OTHER';

    const addReq = (resType, qty) => {
      requirements[resType] = (requirements[resType] || 0) + qty;
    };

    switch (type) {
      case 'FIRE':
        addReq('FIRE_VEHICLE', severity === 'CRITICAL' ? 3 : severity === 'HIGH' ? 2 : 1);
        addReq('AMBULANCE', severity === 'CRITICAL' ? 2 : 1);
        if (severity === 'CRITICAL') addReq('RESCUE_EQUIPMENT', 1);
        break;

      case 'MEDICAL_EMERGENCY':
        addReq('AMBULANCE', severity === 'CRITICAL' ? 3 : severity === 'HIGH' ? 2 : 1);
        break;

      case 'ROAD_ACCIDENT':
        addReq('AMBULANCE', severity === 'CRITICAL' ? 2 : 1);
        addReq('FIRE_VEHICLE', 1);
        if (severity === 'CRITICAL' || severity === 'HIGH') addReq('RESCUE_EQUIPMENT', 1);
        break;

      case 'INDUSTRIAL_ACCIDENT':
        addReq('HAZMAT_UNIT', 1);
        addReq('AMBULANCE', severity === 'CRITICAL' ? 2 : 1);
        addReq('FIRE_VEHICLE', 1);
        if (severity === 'CRITICAL') addReq('RESCUE_EQUIPMENT', 1);
        break;

      case 'FLOOD':
      case 'EARTHQUAKE':
        addReq('RESCUE_EQUIPMENT', severity === 'CRITICAL' ? 3 : 2);
        addReq('AMBULANCE', severity === 'CRITICAL' ? 3 : 1);
        addReq('FIRE_VEHICLE', 1);
        break;

      default:
        addReq('AMBULANCE', 1);
        break;
    }

    return requirements;
  }

  /**
   * Calculate real-time resource shortages: Demand - Available Supply
   */
  static async calculateResourceShortages() {
    // 1. Fetch active uncontained incidents
    const activeIncidents = await IncidentModel.find({
      status: { $in: ['NEW', 'ANALYZING', 'PRIORITIZED', 'ASSIGNED', 'RESPONDING', 'ON_SCENE', 'ESCALATED'] },
    })
      .select('incidentId title type severity priority status location')
      .lean();

    // 2. Aggregate demand across all active incidents
    const demandByType = {};
    for (const inc of activeIncidents) {
      const reqs = this.getRequiredResourcesForIncident(inc);
      for (const [resType, qty] of Object.entries(reqs)) {
        demandByType[resType] = (demandByType[resType] || 0) + qty;
      }
    }

    // Standard resource types to monitor
    const trackedTypes = [
      'AMBULANCE',
      'FIRE_VEHICLE',
      'RESCUE_EQUIPMENT',
      'HAZMAT_UNIT',
      'POLICE_VEHICLE',
      'VEHICLE',
    ];

    for (const t of trackedTypes) {
      if (!(t in demandByType)) {
        demandByType[t] = 0;
      }
    }

    // 3. Aggregate available supply from ResourceModel
    const availableResources = await ResourceModel.find({
      status: 'AVAILABLE',
    })
      .select('resourceId name type status')
      .lean();

    const supplyByType = {};
    for (const res of availableResources) {
      supplyByType[res.type] = (supplyByType[res.type] || 0) + 1;
    }

    // 4. Calculate deficits and severity
    const shortages = [];
    let totalDemand = 0;
    let totalSupply = 0;
    let criticalShortageCount = 0;

    for (const [resType, required] of Object.entries(demandByType)) {
      const available = supplyByType[resType] || 0;
      const deficit = Math.max(0, required - available);
      totalDemand += required;
      totalSupply += available;

      let severity = 'NORMAL';
      if (deficit >= 3) {
        severity = 'CRITICAL';
        criticalShortageCount++;
      } else if (deficit > 0) {
        severity = 'HIGH';
      }

      shortages.push({
        resourceType: resType,
        required,
        available,
        shortage: deficit,
        severity,
      });
    }

    // Sort: highest shortage first
    shortages.sort((a, b) => b.shortage - a.shortage);

    return {
      shortages,
      criticalCount: criticalShortageCount,
      totalDemand,
      totalSupply,
      activeIncidentsCount: activeIncidents.length,
      evaluatedAt: new Date().toISOString(),
    };
  }

  /**
   * Check shortage thresholds and emit alert with 15-minute deduplication cooldown
   */
  static async checkAndEmitShortageAlerts() {
    const analysis = await this.calculateResourceShortages();
    const criticalShortages = analysis.shortages.filter((s) => s.shortage > 0 && (s.severity === 'CRITICAL' || s.severity === 'HIGH'));

    if (criticalShortages.length === 0) {
      return analysis;
    }

    // Check if an alert was emitted in the last 15 minutes to prevent spam
    const cooldownMs = 15 * 60 * 1000;
    const recentAlert = await Notification.findOne({
      type: 'RESOURCE_SHORTAGE',
      createdAt: { $gte: new Date(Date.now() - cooldownMs) },
    }).lean();

    if (recentAlert) {
      return analysis;
    }

    // Create notification
    const topShortage = criticalShortages[0];
    const alertTitle = `RESOURCE DEFICIT: ${topShortage.resourceType} Shortage Detected`;
    const alertMessage = `${topShortage.shortage} ${topShortage.resourceType}(s) required beyond available operational supply (${topShortage.available} available / ${topShortage.required} required).`;

    const notification = await Notification.create({
      notificationId: `NOTIF-SHORTAGE-${Date.now()}`,
      type: 'RESOURCE_SHORTAGE',
      title: alertTitle,
      message: alertMessage,
      severity: topShortage.severity,
      entityType: 'RESOURCE',
      targetRole: 'ALL',
      metadata: {
        shortages: criticalShortages,
        evaluatedAt: analysis.evaluatedAt,
      },
    });

    // Realtime emission
    emitNotificationNew(notification);
    emitResourceShortage({
      title: alertTitle,
      message: alertMessage,
      severity: topShortage.severity,
      shortages: criticalShortages,
      evaluatedAt: analysis.evaluatedAt,
    });

    return analysis;
  }
}

export default ShortageService;
