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
export function mapBackendIncidentStatus(backendStatus?: string): IncidentStatus {
  if (!backendStatus) return 'New';
  const s = backendStatus.toUpperCase();
  if (s === 'REPORTED') return 'New';
  if (s === 'ASSIGNED') return 'Assigned';
  if (s === 'IN_PROGRESS') return 'Responding';
  if (s === 'RESOLVED') return 'Resolved';
  if (s === 'CLOSED') return 'Resolved';
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
  return 'Industrial Fire';
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
    const lat = item.location?.latitude ?? item.location?.coordinates?.[1] ?? (40.7128 + (idx * 0.005));
    const lng = item.location?.longitude ?? item.location?.coordinates?.[0] ?? (-74.006 + (idx * 0.005));

    return {
      id,
      title: item.title || `Incident ${id}`,
      type: mapBackendIncidentType(item.type),
      severity: (item.severity?.toUpperCase() || 'MEDIUM') as IncidentSeverity,
      priority: (item.priority?.toUpperCase() || 'P2') as IncidentPriority,
      status: mapBackendIncidentStatus(item.status),
      location: {
        name: item.location?.address || item.location?.name || 'Metropolitan Sector',
        zone: item.location?.zone || item.location?.address || 'Metro Sector Alpha',
        lat,
        lng,
      },
      createdAt: item.createdAt ? new Date(item.createdAt).toLocaleTimeString().slice(0, 8) : '12:00:00',
      aiConfidence: item.aiConfidence || 92,
      aiSummary: item.description || 'Emergency incident recorded and routed through dispatch mesh.',
      duplicateReportsCount: item.reports?.length || 1,
      reports: Array.isArray(item.reports) && item.reports.length > 0
        ? item.reports.map((r: any, rIdx: number) => ({
            id: r.reportId || `REP-${rIdx + 1}`,
            source: 'Emergency Call (911)',
            text: r.text || 'Dispatch ticket telemetry received.',
            timestamp: r.reportedAt ? new Date(r.reportedAt).toLocaleTimeString().slice(0, 5) : '12:00',
            reliability: r.reliability || 90,
          }))
        : [
            {
              id: `REP-${id}-1`,
              source: 'Emergency Call (911)',
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
            id: `TL-${tlIdx + 1}`,
            time: tl.timestamp ? new Date(tl.timestamp).toLocaleTimeString().slice(0, 8) : '12:00:00',
            title: tl.status || 'Status Updated',
            description: tl.note || 'Event recorded in system ledger.',
            completed: true,
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
    const lat = item.location?.latitude ?? item.location?.coordinates?.[1] ?? (40.715 + (idx * 0.004));
    const lng = item.location?.longitude ?? item.location?.coordinates?.[0] ?? (-74.002 + (idx * 0.004));

    return {
      id,
      name: item.name || `Unit ${id}`,
      type: mapBackendTeamType(item.type),
      status: mapBackendTeamStatus(item.status),
      membersCount: Array.isArray(item.members) ? item.members.length : 4,
      vehicleId: item.vehicleId || `VEH-${id}`,
      vehicleName: item.vehicleName || `${item.type || 'Field'} Rapid Unit`,
      location: {
        name: item.location?.address || 'Sector Patrol',
        zone: item.location?.zone || 'Zone Alpha',
        lat,
        lng,
      },
      responseTimeEta: item.status === 'DISPATCHED' ? 6 : item.status === 'ON_SCENE' ? 0 : 4,
      assignedIncidentId: item.currentAssignment?.incidentId,
      batteryOrFuelLevel: item.batteryOrFuelLevel || 88,
      contactRadioChannel: item.contactInfo?.radioFrequency || 'TAC-1',
    };
  });
}

// Adapt backend facility list to hospitals
export function adaptBackendFacilities(backendList: any[]): HospitalResource[] {
  if (!Array.isArray(backendList)) return [];

  return backendList.map((item, idx) => {
    const id = item.facilityId || item._id || `FAC-${idx + 1}`;
    const lat = item.location?.latitude ?? item.location?.coordinates?.[1] ?? (40.72 + (idx * 0.005));
    const lng = item.location?.longitude ?? item.location?.coordinates?.[0] ?? (-74.01 + (idx * 0.005));

    const totalBeds = item.capacity || 100;
    const availableBeds = item.availableCapacity ?? Math.floor(totalBeds * 0.35);

    return {
      id,
      name: item.name || `Medical Center ${id}`,
      zone: item.location?.address || 'Metro Core Zone',
      lat,
      lng,
      totalBeds,
      availableIcuBeds: Math.min(availableBeds, Math.max(2, Math.floor(availableBeds * 0.2))),
      burnUnitCapacity: 12,
      traumaUnitReady: item.emergencyStatus !== 'CRITICAL',
      divertStatus: item.emergencyStatus === 'DIVERTING' || item.divertStatus === true,
      oxygenReservesPct: 92,
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
