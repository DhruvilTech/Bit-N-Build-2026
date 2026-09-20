import {
  Incident,
  ResponseTeam,
  HospitalResource,
  EquipmentResource,
  IncidentStatus,
  IncidentSeverity,
  IncidentPriority,
  TeamType,
  TeamStatus,
} from '../types';

// Map backend incident status to frontend status
// Map backend incident status to frontend status
export function mapBackendIncidentStatus(backendStatus?: string): IncidentStatus {
  if (!backendStatus) return 'New';
  const s = backendStatus.toUpperCase();
  if (s === 'NEW' || s === 'REPORTED') return 'New';
  if (s === 'ACKNOWLEDGED' || s === 'ANALYZING') return 'Analyzing';
  if (s === 'ASSIGNED') return 'Assigned';
  if (s === 'RESPONDING' || s === 'ON_SCENE') return 'Responding';
  if (s === 'RESOLVED' || s === 'CLOSED') return 'Resolved';
  if (s === 'CANCELLED') return 'Resolved';
  if (s === 'ESCALATED' || s === 'PRIORITIZED') return 'Escalated';
  return 'New';
}

// Map backend incident type to frontend type
export function mapBackendIncidentType(backendType?: string): Incident['type'] {
  if (!backendType) return 'Industrial Fire';
  const t = backendType.toUpperCase();
  if (t === 'FIRE') return 'Industrial Fire';
  if (t === 'ROAD_ACCIDENT') return 'Major Road Accident';
  if (t === 'FLOOD') return 'Flood Alert';
  if (t === 'INDUSTRIAL_ACCIDENT') return 'Chemical Leak';
  if (t === 'MEDICAL_EMERGENCY') return 'Medical Crisis';
  if (t === 'EARTHQUAKE') return 'Earthquake Alert';
  if (t === 'OTHER') return 'General Emergency';
  return backendType;
}

// Map backend team status to frontend status
export function mapBackendTeamStatus(backendStatus?: string): TeamStatus {
  if (!backendStatus) return 'AVAILABLE';
  const s = backendStatus.toUpperCase();
  if (s === 'AVAILABLE') return 'AVAILABLE';
  if (s === 'DISPATCHED') return 'EN_ROUTE';
  if (s === 'ON_SCENE') return 'ON_SCENE';
  if (s === 'RETURNING') return 'EN_ROUTE';
  if (s === 'OFFLINE') return 'OFFLINE';
  return 'AVAILABLE';
}

// Map backend team type to frontend type
export function mapBackendTeamType(backendType?: string): TeamType {
  if (!backendType) return 'Fire';
  const t = backendType.toUpperCase();
  if (t === 'FIRE') return 'Fire';
  if (t === 'MEDICAL') return 'Medical';
  if (t === 'POLICE') return 'Police';
  if (t === 'RESCUE') return 'Rescue';
  if (t === 'HAZMAT') return 'Hazmat';
  return 'Fire';
}

// Adapt backend incident list
export function adaptBackendIncidents(backendList: any[]): Incident[] {
  if (!Array.isArray(backendList)) return [];

  return backendList.map((item, idx) => {
    const id = item.incidentId || item._id || `INC-${idx + 1}`;
    const lat = item.location?.latitude ?? item.location?.geometry?.coordinates?.[1] ?? (28.6289 + (idx * 0.005));
    const lng = item.location?.longitude ?? item.location?.geometry?.coordinates?.[0] ?? (77.2065 + (idx * 0.005));

    return {
      id,
      title: item.title || `Incident #${id}`,
      type: mapBackendIncidentType(item.type),
      rawType: item.type,
      severity: (item.severity?.toUpperCase() || 'MEDIUM') as IncidentSeverity,
      priority: (item.priority?.toUpperCase() || 'P2') as IncidentPriority,
      status: mapBackendIncidentStatus(item.status),
      rawStatus: item.status,
      source: item.source || 'EMERGENCY_CALL',
      reportedBy: item.reportedBy,
      metadata: item.metadata || {},
      resolvedAt: item.resolvedAt,
      location: {
        name: item.location?.address || item.location?.name || 'Metropolitan Emergency Zone',
        zone: item.location?.zone || item.location?.address || 'Metro Alpha Sector',
        lat,
        lng,
      },
      createdAt: item.createdAt ? new Date(item.createdAt).toLocaleTimeString().slice(0, 8) : '12:00:00',
      aiConfidence: item.confidence || item.aiConfidence || 92,
      aiSummary: item.description || 'Emergency incident recorded and routed through dispatch mesh.',
      duplicateReportsCount: item.reports?.length || item.sourceCount || 1,
      sourceCount: item.sourceCount || (Array.isArray(item.reports) ? item.reports.length : 1),
      requiresHumanReview: Boolean(item.aiAnalysis?.requiresHumanReview || item.requiresHumanReview),
      duplicateOf: item.duplicateOf || null,
      reports: Array.isArray(item.reports) && item.reports.length > 0
        ? item.reports.map((r: any, rIdx: number) => ({
            id: r.reportId || `REP-${rIdx + 1}`,
            source: r.source ? `${r.source} Intake` : 'Emergency Call (911)',
            text: r.text || 'Dispatch ticket telemetry received.',
            timestamp: r.reportedAt ? new Date(r.reportedAt).toLocaleTimeString().slice(0, 5) : '12:00',
            reliability: r.reliability || 90,
          }))
        : [
            {
              id: `REP-${id}-1`,
              source: item.source ? `${item.source} Intake` : 'Emergency Call (911)',
              text: item.description || 'Emergency reported via central dispatch.',
              timestamp: '12:00',
              reliability: 95,
            },
          ],
      assignedTeamIds: Array.isArray(item.assignedTeams)
        ? item.assignedTeams.map((t: any) => (typeof t === 'string' ? t : t.teamId || t.name))
        : [],
      timeline: Array.isArray(item.timeline) && item.timeline.length > 0
        ? item.timeline.map((tl: any, tlIdx: number) => ({
            id: tl.timelineId || `TL-${tlIdx + 1}`,
            time: tl.timestamp ? new Date(tl.timestamp).toLocaleTimeString().slice(0, 8) : '12:00:00',
            title: tl.event?.replace(/_/g, ' ') || tl.newStatus || 'Status Milestone',
            description: tl.description || tl.reason || 'Event logged in cryptographic ledger.',
            completed: true,
            event: tl.event,
            reason: tl.reason,
          }))
        : [
            {
              id: `TL-1`,
              time: '12:00:00',
              title: 'Incident Logged',
              description: 'Telemetry verified by dispatch mesh.',
              completed: true,
            },
          ],
      aiAnalysis: item.aiAnalysis
        ? {
            incidentType: item.aiAnalysis.classification?.type || item.aiAnalysis.incidentType || item.type,
            severity: item.aiAnalysis.severity?.level || item.aiAnalysis.severity || item.severity,
            priority: item.aiAnalysis.priority?.level || item.aiAnalysis.priority || item.priority,
            confidence: item.aiAnalysis.classification?.confidence ?? item.aiAnalysis.confidence ?? 0.85,
            signals: item.aiAnalysis.signals || [],
            reasoning: item.aiAnalysis.reasoning || {},
            suggestedCorrection: item.aiAnalysis.suggestedCorrection,
            originalType: item.aiAnalysis.originalType,
            isLowConfidence: Boolean(
              item.aiAnalysis.isLowConfidence ||
              item.aiAnalysis.requiresHumanReview ||
              (item.aiAnalysis.confidence !== undefined && item.aiAnalysis.confidence < 0.70)
            ),
            model: item.aiAnalysis.model,
            version: item.aiAnalysis.version,
            status: item.aiAnalysis.status || 'PENDING',
            error: item.aiAnalysis.error,
            analyzedAt: item.aiAnalysis.analyzedAt,
            requiresHumanReview: Boolean(item.aiAnalysis.requiresHumanReview),
            reviewReason: item.aiAnalysis.reviewReason,
            classification: item.aiAnalysis.classification,
            severityAnalysis: item.aiAnalysis.severityAnalysis,
            priorityAnalysis: item.aiAnalysis.priorityAnalysis,
            locationAnalysis: item.aiAnalysis.locationAnalysis,
            tactical: item.aiAnalysis.tactical,
            duplicate: item.aiAnalysis.duplicate,
            humanReview: item.aiAnalysis.humanReview,
            original: item.aiAnalysis.original,
            final: item.aiAnalysis.final,
            overrides: item.aiAnalysis.overrides || [],
          }
        : undefined,
      delayDetected: false,
      delayMinutes: 0,
    };
  });
}

// Adapt backend team list
export function adaptBackendTeams(backendList: any[]): ResponseTeam[] {
  if (!Array.isArray(backendList)) return [];

  return backendList.map((item, idx) => {
    const id = item.teamId || item._id || `TEAM-${idx + 1}`;
    const lat = item.location?.latitude ?? item.location?.coordinates?.[1] ?? item.location?.geometry?.coordinates?.[1] ?? (28.625 + (idx * 0.005));
    const lng = item.location?.longitude ?? item.location?.coordinates?.[0] ?? item.location?.geometry?.coordinates?.[0] ?? (77.210 + (idx * 0.005));

    const assignedIncId = typeof item.currentAssignment === 'string'
      ? item.currentAssignment
      : item.currentAssignment?.incidentId || undefined;

    return {
      id,
      name: item.name || `Unit ${id}`,
      type: mapBackendTeamType(item.type),
      status: mapBackendTeamStatus(item.status),
      membersCount: Array.isArray(item.members) ? item.members.length : 4,
      vehicleId: item.vehicleId || `VEH-${id}`,
      vehicleName: item.vehicleName || (Array.isArray(item.capabilities) && item.capabilities.length > 0 ? item.capabilities[0].replace(/_/g, ' ') : `${item.type || 'Field'} Rapid Unit`),
      location: {
        name: item.location?.address || 'Sector Patrol Outpost',
        zone: item.location?.zone || item.location?.address || 'Metro Alpha Sector',
        lat,
        lng,
      },
      responseTimeEta: item.status === 'DISPATCHED' || item.status === 'EN_ROUTE' ? 5 : item.status === 'ON_SCENE' ? 0 : 4,
      assignedIncidentId: assignedIncId,
      batteryOrFuelLevel: item.batteryOrFuelLevel ?? item.fuelLevel ?? item.batteryLevel ?? (92 - ((idx * 4) % 20)),
      contactRadioChannel: item.radioChannel || item.contactInfo?.radioFrequency || (item.contactInfo?.phone ? `CH-${item.contactInfo.phone}` : 'TAC-1'),
    };
  });
}

// Adapt backend facility list to hospitals
export function adaptBackendFacilities(backendList: any[]): HospitalResource[] {
  if (!Array.isArray(backendList)) return [];

  return backendList.map((item, idx) => {
    const id = item.facilityId || item._id || `FAC-${idx + 1}`;
    const lat = item.location?.latitude ?? item.location?.coordinates?.[1] ?? item.location?.geometry?.coordinates?.[1] ?? (28.62 + (idx * 0.006));
    const lng = item.location?.longitude ?? item.location?.coordinates?.[0] ?? item.location?.geometry?.coordinates?.[0] ?? (77.20 + (idx * 0.006));

    const totalBeds = item.capacity || 100;
    const availableBeds = item.availableCapacity ?? Math.floor(totalBeds * 0.35);

    const icuDept = Array.isArray(item.departments)
      ? item.departments.find((d: any) => d.name?.toUpperCase().includes('ICU'))
      : null;
    const burnDept = Array.isArray(item.departments)
      ? item.departments.find((d: any) => d.name?.toUpperCase().includes('BURN'))
      : null;

    const availableIcu = icuDept?.availableCapacity !== undefined
      ? icuDept.availableCapacity
      : Math.min(availableBeds, Math.max(1, Math.floor(availableBeds * 0.25)));

    const burnCapacity = burnDept?.capacity !== undefined
      ? burnDept.capacity
      : Array.isArray(item.specializations) && item.specializations.some((s: string) => s.includes('HAZMAT') || s.includes('BURN'))
      ? 24
      : 8;

    const isDiverting = item.status === 'DIVERTING' || item.emergencyStatus === 'DIVERTING' || item.divertStatus === true;

    return {
      id,
      name: item.name || `Medical Center ${id}`,
      zone: item.location?.address || 'Metro Core Zone',
      lat,
      lng,
      totalBeds,
      availableIcuBeds: availableIcu,
      burnUnitCapacity: burnCapacity,
      traumaUnitReady: !isDiverting && item.emergencyStatus !== 'CRITICAL',
      divertStatus: isDiverting,
      oxygenReservesPct: item.metadata?.oxygenReservePct ?? (isDiverting ? 62 : 94),
    };
  });
}

// Adapt backend resources to equipment
export function adaptBackendResources(backendList: any[]): EquipmentResource[] {
  if (!Array.isArray(backendList)) return [];

  return backendList.map((item, idx) => {
    const id = item.resourceId || item._id || `RES-${idx + 1}`;
    let category: EquipmentResource['category'] = 'Fire Apparatus';
    const t = (item.type || '').toUpperCase();
    if (t.includes('FIRE')) category = 'Fire Apparatus';
    else if (t.includes('AMBULANCE') || t.includes('MEDICAL')) category = 'Medical ICU Unit';
    else if (t.includes('POLICE')) category = 'Tactical Police';
    else if (t.includes('DRONE')) category = 'Recon Drone';
    else category = 'Hazmat Neutralizer';

    const statusMap: Record<string, EquipmentResource['status']> = {
      AVAILABLE: 'Available',
      ASSIGNED: 'Deployed',
      BUSY: 'Deployed',
      OFFLINE: 'Maintenance',
    };

    return {
      id,
      name: item.name || `Resource ${id}`,
      category,
      status: statusMap[item.status?.toUpperCase()] || 'Available',
      assignedZone: item.location?.address || 'Station 1 Central',
      capacityMetric: `${item.capacity?.available ?? 1}/${item.capacity?.total ?? 1} Ready`,
    };
  });
}
