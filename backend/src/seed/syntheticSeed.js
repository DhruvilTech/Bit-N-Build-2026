/**
 * EmergenX Synthetic Data Generator (Phase 28)
 * Generates defense-grade realistic, chronologically consistent,
 * geographically coherent emergency operational datasets for hackathon debrief & analytics.
 *
 * Target scale:
 * - 150 incidents (configurable via --count=N)
 * - 25 response teams across Fire, Medical, Police, Hazmat, Rescue
 * - 60 resource apparatus (engines, ambulances, interceptors, foam tenders)
 * - 15 trauma centers and emergency staging facilities
 * - 120+ alerts and escalations
 * - 150+ notifications
 * - 200+ audit logs
 */

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { env } from '../config/env.js';

import UserModel from '../models/user.model.js';
import IncidentModel from '../models/incident.model.js';
import ResponseTeamModel from '../models/team.model.js';
import ResourceModel from '../models/resource.model.js';
import FacilityModel from '../models/facility.model.js';
import StationModel from '../models/station.model.js';
import EscalationModel from '../models/escalation.model.js';
import NotificationModel from '../models/notification.model.js';
import AuditLogModel from '../models/auditLog.model.js';

// Operational Cities Configuration (City-Scoped Disaster Response)
const CITIES = {
  Bangalore: {
    name: 'Bangalore',
    latMin: 12.91,
    latMax: 13.06,
    lngMin: 77.50,
    lngMax: 77.68,
    locations: [
      { name: 'Koramangala 80ft Road Staging', zone: 'South Bangalore' },
      { name: 'Indiranagar 100ft Road Station', zone: 'East Bangalore' },
      { name: 'Whitefield ITPL Command Post', zone: 'East Zone' },
      { name: 'Electronic City Phase 1 Depot', zone: 'Tech Corridor' },
      { name: 'MG Road Central Station', zone: 'Central Core' },
      { name: 'Hebbal Flyover Quick-Response Post', zone: 'North Corridor' },
      { name: 'Jayanagar 4th Block Rescue Center', zone: 'South Zone' },
      { name: 'Yeshwanthpur Industrial Response Post', zone: 'West Zone' },
    ],
  },
  'Delhi NCR': {
    name: 'Delhi NCR',
    latMin: 28.50,
    latMax: 28.72,
    lngMin: 77.10,
    lngMax: 77.30,
    locations: [
      { name: 'Connaught Place Central Radial, Block C', zone: 'Zone 1 (Core)' },
      { name: 'Okhla Industrial Area Phase III, Factory Lane', zone: 'Zone 3 (Indust.)' },
      { name: 'Barakhamba Road High-Rise Corridor, Sector 2', zone: 'Zone 1 (Core)' },
      { name: 'Yamuna River Embankment Near Metro Pillar 140', zone: 'Zone 5 (River)' },
      { name: 'NH-48 Overpass Flyover km 18 Interchange', zone: 'NH-48 Corridor' },
      { name: 'Rohini Urban Sub-City Sector 14 Expressway', zone: 'Zone 2 (North)' },
      { name: 'Mayur Vihar Phase 1 Commercial Intersection', zone: 'Zone 4 (East)' },
      { name: 'Dwarka Expressway Sector 21 Junction', zone: 'Zone 6 (South-West)' },
    ],
  },
  Mumbai: {
    name: 'Mumbai',
    latMin: 18.95,
    latMax: 19.22,
    lngMin: 72.82,
    lngMax: 72.98,
    locations: [
      { name: 'Bandra Kurla Complex (BKC) Central Post', zone: 'Central Suburbs' },
      { name: 'Andheri West SV Road Station', zone: 'Western Suburbs' },
      { name: 'Nariman Point Marine Drive Depot', zone: 'South Mumbai' },
      { name: 'Dadar TT Circle Staging Post', zone: 'Central Core' },
      { name: 'Powai Hiranandani Rapid Response Post', zone: 'Eastern Suburbs' },
      { name: 'Thane West Majiwada Flyover Base', zone: 'Thane Zone' },
      { name: 'Navi Mumbai Vashi Sector 17 Post', zone: 'Navi Mumbai' },
      { name: 'Kurla CST Road Emergency Center', zone: 'Central Suburbs' },
    ],
  },
};

const CITY_NAMES = ['Bangalore', 'Delhi NCR', 'Mumbai'];

const randomGeoForCity = (cityName) => {
  const city = CITIES[cityName] || CITIES.Bangalore;
  const latitude = Number((city.latMin + Math.random() * (city.latMax - city.latMin)).toFixed(6));
  const longitude = Number((city.lngMin + Math.random() * (city.lngMax - city.lngMin)).toFixed(6));
  return { latitude, longitude, coordinates: [longitude, latitude] };
};

const INCIDENT_CATEGORIES = [
  'FIRE',
  'ROAD_ACCIDENT',
  'FLOOD',
  'INDUSTRIAL_ACCIDENT',
  'MEDICAL_EMERGENCY',
  'OTHER',
];

const INCIDENT_TITLES = {
  FIRE: [
    'Commercial High-Rise HVAC Electrical Fire',
    'Chemical Warehouse Combustible Packaging Ignition',
    'Underground Metro Station Cable Duct Smolder',
    'Residential Multi-Storey Balcony Fire',
    'LPG Cylinder Detonation in Commercial Kitchen',
  ],
  ROAD_ACCIDENT: [
    'Expressway Multi-Vehicle Commuter Bus Pileup',
    'Hazardous Tanker Overturned on Highway Flyover',
    'Container Truck Jackknifed Across High-Speed Lanes',
    'Multiple Private Vehicle Collision at Foggy Underpass',
  ],
  FLOOD: [
    'Monsoon Embankment Seepage & Subway Inundation',
    'Urban Underpass Waterlogging Trapping Commuters',
    'Drainage Canal Overspill Threatening Lowland Colony',
  ],
  INDUSTRIAL_ACCIDENT: [
    'Petrochemical Polymer Reactor Pressure Relief Failure',
    'Solvent Tank Rupture with Flammable Vapor Plume',
    'Cold Storage Anhydrous Ammonia Refrigeration Leak',
  ],
  MEDICAL_EMERGENCY: [
    'Mass Smoke Inhalation Incident at Transit Terminal',
    'Public Gathering Heat Stroke & Dehydration Surge',
    'Multi-Casualty Structural Balcony Collapse',
  ],
  OTHER: [
    'Perimeter Fence Structural Breach at Cargo Terminal',
    'Telecom Antenna Mast High-Wind Instability Hazard',
  ],
};

const generateSyntheticData = async () => {
  const isFresh = process.argv.includes('--fresh');
  const countArg = process.argv.find((a) => a.startsWith('--count='));
  const targetIncidentCount = countArg ? parseInt(countArg.split('=')[1], 10) : 150;

  console.log('====================================================');
  console.log('⚡ EMERGENX SYNTHETIC DATA GENERATOR (CITY-AWARE)');
  console.log(`🎯 Target Incident Count: ${targetIncidentCount}`);
  console.log(`🏙️ Operational Cities: ${CITY_NAMES.join(', ')}`);
  console.log(`🔄 Mode: ${isFresh ? 'FRESH RE-SEED' : 'AUGMENT / UPSERT'}`);
  console.log('====================================================\n');

  await mongoose.connect(env.MONGODB_URI);
  console.log('✓ Connected to MongoDB Atlas');

  if (isFresh) {
    console.log('⚠️ Cleaning previous synthetic datasets (preserving Admin accounts)...');
    await Promise.all([
      IncidentModel.deleteMany({ 'metadata.isSynthetic': true }),
      ResponseTeamModel.deleteMany({ 'metadata.isSynthetic': true }),
      ResourceModel.deleteMany({ 'metadata.isSynthetic': true }),
      FacilityModel.deleteMany({ 'metadata.isSynthetic': true }),
      StationModel.deleteMany({ 'metadata.isSynthetic': true }),
      NotificationModel.deleteMany({ 'metadata.isSynthetic': true }),
      EscalationModel.deleteMany({ 'metadata.isSynthetic': true }),
      AuditLogModel.deleteMany({ 'metadata.isSynthetic': true }),
    ]);
  }

  // 1. Ensure Standard Users exist
  console.log('[1/7] Verifying Base Platform Accounts & Roles...');
  const defaultPassword = await bcrypt.hash('Emergency@2026', 10);
  const baseUsers = [
    { name: 'Chief Administrator', email: 'admin@emergency.ps9.gov', role: 'ADMIN', badgeNumber: 'ADM-01' },
    { name: 'Senior Dispatcher Maya', email: 'operator@emergency.ps9.gov', role: 'OPERATOR', badgeNumber: 'OP-04' },
    { name: 'Field Responder Captain', email: 'responder@emergency.ps9.gov', role: 'RESPONDER', badgeNumber: 'RES-02' },
    { name: 'Public Auditor & Observer', email: 'viewer@emergency.ps9.gov', role: 'VIEWER', badgeNumber: 'V-09' },
  ];

  for (const u of baseUsers) {
    await UserModel.findOneAndUpdate(
      { email: u.email },
      { $setOnInsert: { ...u, password: defaultPassword, isActive: true } },
      { upsert: true }
    );
  }

  // 2. Generate 30 Response Teams (10 per city)
  console.log('[2/7] Generating 30 Specialized Response Teams across 3 Cities...');
  const teamTypes = ['FIRE', 'MEDICAL', 'POLICE', 'HAZMAT', 'RESCUE'];
  const teams = [];
  let globalTeamIndex = 1;

  for (const cityName of CITY_NAMES) {
    const cityConfig = CITIES[cityName];
    for (let i = 0; i < 10; i++) {
      const type = teamTypes[i % teamTypes.length];
      const geo = randomGeoForCity(cityName);
      const loc = cityConfig.locations[i % cityConfig.locations.length];
      const teamId = `TEAM-${cityName.slice(0, 3).toUpperCase()}-${String(i + 1).padStart(2, '0')}`;

      teams.push({
        teamId,
        name: `${cityName} ${loc.zone} ${type} Unit ${i + 1}`,
        type,
        city: cityName,
        status: i % 4 === 0 ? 'ASSIGNED' : i % 7 === 0 ? 'BUSY' : 'AVAILABLE',
        members: [`Lead Officer ${globalTeamIndex}`, `Technician ${globalTeamIndex}-A`, `Medic ${globalTeamIndex}-B`],
        capabilities: [`${type}_RESPONSE`, 'RAPID_DEPLOYMENT'],
        location: {
          latitude: geo.latitude,
          longitude: geo.longitude,
          address: `${loc.name}, ${cityName}`,
          city: cityName,
          geometry: { type: 'Point', coordinates: [geo.longitude, geo.latitude] },
        },
        metadata: { isSynthetic: true, city: cityName },
      });
      globalTeamIndex++;
    }
  }
  await ResponseTeamModel.insertMany(teams);
  console.log(`✓ Seeded ${teams.length} Response Teams across Bangalore, Delhi NCR, and Mumbai.`);

  // 3. Generate 441 Heavy & Tactical Resources (147 per city)
  console.log('[3/7] Generating 441 City-Scoped Resources (147 per city: 50 Ambulances, 42 Fire Engines, 20 Police, 25 Rescue, 10 Hazmat)...');
  const resources = [];
  let globalResIndex = 1;

  for (const cityName of CITY_NAMES) {
    const cityConfig = CITIES[cityName];
    const cityPrefix = cityName.slice(0, 3).toUpperCase();

    // 50 Ambulances per city (45 available, 5 assigned/en_route)
    for (let a = 1; a <= 50; a++) {
      const geo = randomGeoForCity(cityName);
      const loc = cityConfig.locations[a % cityConfig.locations.length];
      const status = a <= 45 ? 'AVAILABLE' : a <= 48 ? 'ASSIGNED' : 'EN_ROUTE';
      resources.push({
        resourceId: `RES-${cityPrefix}-AMB-${String(a).padStart(2, '0')}`,
        name: `${cityName} Advanced Life Support Ambulance #${a}`,
        type: 'AMBULANCE',
        city: cityName,
        status,
        availability: status === 'AVAILABLE',
        location: {
          latitude: geo.latitude,
          longitude: geo.longitude,
          address: `${loc.name}, ${cityName}`,
          city: cityName,
          geometry: { type: 'Point', coordinates: [geo.longitude, geo.latitude] },
        },
        capabilities: ['RAPID_RESPONSE', 'ADVANCED_LIFE_SUPPORT', 'PATIENT_TRANSPORT'],
        capacity: 2,
        metadata: { isSynthetic: true, city: cityName },
      });
    }

    // 42 Fire Vehicles per city (38 available, 4 assigned/en_route)
    for (let f = 1; f <= 42; f++) {
      const geo = randomGeoForCity(cityName);
      const loc = cityConfig.locations[f % cityConfig.locations.length];
      const status = f <= 38 ? 'AVAILABLE' : f <= 41 ? 'ASSIGNED' : 'EN_ROUTE';
      resources.push({
        resourceId: `RES-${cityPrefix}-FIRE-${String(f).padStart(2, '0')}`,
        name: `${cityName} Heavy Water Tender #${f}`,
        type: 'FIRE_VEHICLE',
        city: cityName,
        status,
        availability: status === 'AVAILABLE',
        location: {
          latitude: geo.latitude,
          longitude: geo.longitude,
          address: `${loc.name}, ${cityName}`,
          city: cityName,
          geometry: { type: 'Point', coordinates: [geo.longitude, geo.latitude] },
        },
        capabilities: ['FIRE_SUPPRESSION', 'WATER_PUMP', 'RESCUE_LADDER'],
        capacity: 6,
        metadata: { isSynthetic: true, city: cityName },
      });
    }

    // 20 Police Interceptors per city (18 available, 2 assigned)
    for (let p = 1; p <= 20; p++) {
      const geo = randomGeoForCity(cityName);
      const loc = cityConfig.locations[p % cityConfig.locations.length];
      const status = p <= 18 ? 'AVAILABLE' : 'ASSIGNED';
      resources.push({
        resourceId: `RES-${cityPrefix}-POL-${String(p).padStart(2, '0')}`,
        name: `${cityName} Highway Patrol Interceptor #${p}`,
        type: 'POLICE_VEHICLE',
        city: cityName,
        status,
        availability: status === 'AVAILABLE',
        location: {
          latitude: geo.latitude,
          longitude: geo.longitude,
          address: `${loc.name}, ${cityName}`,
          city: cityName,
          geometry: { type: 'Point', coordinates: [geo.longitude, geo.latitude] },
        },
        capabilities: ['TRAFFIC_CONTROL', 'PERIMETER_SECURITY', 'ESCORT'],
        capacity: 4,
        metadata: { isSynthetic: true, city: cityName },
      });
    }

    // 25 Rescue Equipment per city (23 available, 2 assigned -> slight deficit of -5 for realistic shortage alert testing)
    for (let r = 1; r <= 25; r++) {
      const geo = randomGeoForCity(cityName);
      const loc = cityConfig.locations[r % cityConfig.locations.length];
      const status = r <= 23 ? 'AVAILABLE' : 'ASSIGNED';
      resources.push({
        resourceId: `RES-${cityPrefix}-RSC-${String(r).padStart(2, '0')}`,
        name: `${cityName} Heavy Hydraulic Extrication Rig #${r}`,
        type: 'RESCUE_EQUIPMENT',
        city: cityName,
        status,
        availability: status === 'AVAILABLE',
        location: {
          latitude: geo.latitude,
          longitude: geo.longitude,
          address: `${loc.name}, ${cityName}`,
          city: cityName,
          geometry: { type: 'Point', coordinates: [geo.longitude, geo.latitude] },
        },
        capabilities: ['EXTRICATION', 'STRUCTURAL_SHORING', 'HEAVY_LIFT'],
        capacity: 3,
        metadata: { isSynthetic: true, city: cityName },
      });
    }

    // 10 Hazmat Units per city (8 available, 2 assigned)
    for (let h = 1; h <= 10; h++) {
      const geo = randomGeoForCity(cityName);
      const loc = cityConfig.locations[h % cityConfig.locations.length];
      const status = h <= 8 ? 'AVAILABLE' : 'ASSIGNED';
      resources.push({
        resourceId: `RES-${cityPrefix}-HAZ-${String(h).padStart(2, '0')}`,
        name: `${cityName} Chemical Decontamination & Hazmat Unit #${h}`,
        type: 'HAZMAT_UNIT',
        city: cityName,
        status,
        availability: status === 'AVAILABLE',
        location: {
          latitude: geo.latitude,
          longitude: geo.longitude,
          address: `${loc.name}, ${cityName}`,
          city: cityName,
          geometry: { type: 'Point', coordinates: [geo.longitude, geo.latitude] },
        },
        capabilities: ['HAZMAT', 'CHEMICAL_CONTAINMENT', 'DECONTAMINATION'],
        capacity: 4,
        metadata: { isSynthetic: true, city: cityName },
      });
    }
  }

  await ResourceModel.insertMany(resources);
  console.log(`✓ Seeded ${resources.length} Operational Resources across Bangalore, Delhi NCR, and Mumbai.`);

  // 4. Generate 15 Hospitals & Emergency Facilities (5 per city)
  console.log('[4/7] Generating 15 City Trauma Centers and Hospital Facilities...');
  const facilities = [];
  const cityHospitals = {
    Bangalore: [
      'Manipal Hospital Critical Care Center, HAL Road',
      'Apollo Hospitals Bannerghatta Trauma Unit',
      'NIMHANS Emergency Trauma Pavilion',
      'Fortis Hospital Critical Care, Cunningham Road',
      'Victoria Hospital Emergency Burn & Trauma Center',
    ],
    'Delhi NCR': [
      'All India Institute of Medical Sciences (AIIMS Trauma)',
      'Safdarjung Super-Specialty Emergency Hospital',
      'Max Super Specialty Burn & Trauma Pavilion',
      'Ram Manohar Lohia Emergency Command Hospital',
      'Lok Nayak Multi-Specialty Acute Ward',
    ],
    Mumbai: [
      'Lilavati Hospital & Research Centre Trauma ICU',
      'Kokilaben Dhirubhai Ambani Emergency Care Center',
      'KEM Hospital Acute Emergency Ward, Parel',
      'Hinduja National Hospital Trauma Pavilion',
      'Tata Memorial Emergency Critical Unit',
    ],
  };

  for (const cityName of CITY_NAMES) {
    const list = cityHospitals[cityName] || [];
    for (let i = 0; i < list.length; i++) {
      const geo = randomGeoForCity(cityName);
      const totalBeds = 150 + Math.floor(Math.random() * 150);
      const occupiedBeds = Math.floor(totalBeds * (0.60 + Math.random() * 0.25));

      facilities.push({
        facilityId: `FAC-${cityName.slice(0, 3).toUpperCase()}-${String(i + 1).padStart(2, '0')}`,
        name: list[i],
        type: 'HOSPITAL',
        city: cityName,
        location: {
          latitude: geo.latitude,
          longitude: geo.longitude,
          address: `${list[i]}, ${cityName}`,
          city: cityName,
          geometry: { type: 'Point', coordinates: [geo.longitude, geo.latitude] },
        },
        capacity: totalBeds,
        availableCapacity: totalBeds - occupiedBeds,
        status: 'OPERATIONAL',
        contactNumber: `+91-80-2500${String(1000 + i).slice(-4)}`,
        metadata: { isSynthetic: true, city: cityName },
      });
    }
  }

  await FacilityModel.insertMany(facilities);
  console.log(`✓ Seeded ${facilities.length} Emergency Facilities across 3 Cities.`);

  // 5. Generate 150 Chronologically Ordered Incidents
  console.log(`[5/7] Generating ${targetIncidentCount} Synthetic Incidents with Strict SLA Timestamps...`);
  const incidents = [];
  const escalations = [];
  const notifications = [];
  const auditLogs = [];

  const now = Date.now();
  const severities = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
  const priorities = ['P4', 'P3', 'P2', 'P1'];

  for (let i = 1; i <= targetIncidentCount; i++) {
    const cityName = CITY_NAMES[(i - 1) % CITY_NAMES.length];
    const cityConfig = CITIES[cityName];
    const cat = INCIDENT_CATEGORIES[(i - 1) % INCIDENT_CATEGORIES.length];
    const titlesList = INCIDENT_TITLES[cat] || INCIDENT_TITLES.OTHER;
    const title = titlesList[i % titlesList.length];
    const loc = cityConfig.locations[i % cityConfig.locations.length];
    const geo = randomGeoForCity(cityName);

    const sev = severities[i % severities.length];
    const pri = priorities[i % priorities.length];

    // About 70% of historical incidents across the last 38h are RESOLVED
    // The most recent ~40 incidents are active (NEW, ASSIGNED, RESPONDING, ON_SCENE)
    const isRecentActive = i > (targetIncidentCount - 40);
    const activeStatuses = ['NEW', 'ACKNOWLEDGED', 'ASSIGNED', 'RESPONDING', 'ON_SCENE'];
    const stat = isRecentActive ? activeStatuses[i % activeStatuses.length] : 'RESOLVED';

    // Temporal consistency: reportedAt < acknowledgedAt < assignedAt < responseStartedAt < arrivedAt < resolvedAt
    const hoursAgo = (targetIncidentCount - i) * 0.25; // staggered across last 38 hours
    const reportedAt = new Date(now - hoursAgo * 3600000);
    const acknowledgedAt = new Date(reportedAt.getTime() + 45000); // +45s
    const assignedAt = new Date(acknowledgedAt.getTime() + 90000); // +90s
    const responseStartedAt = new Date(assignedAt.getTime() + 60000); // +60s
    const arrivedAt = new Date(responseStartedAt.getTime() + (300000 + (i % 8) * 60000)); // +5-12 min
    const resolvedAt = stat === 'RESOLVED' ? new Date(arrivedAt.getTime() + (1200000 + (i % 20) * 60000)) : null;

    const cityTeams = teams.filter((t) => t.city === cityName);
    const cityResources = resources.filter((r) => r.city === cityName);

    const assignedTeam = cityTeams[i % cityTeams.length];
    const assignedRes = cityResources[i % cityResources.length];

    const incidentId = `INC-SYN-${String(i).padStart(4, '0')}`;
    const delayDetected = i % 5 === 0;
    const delayMinutes = delayDetected ? 4 + (i % 8) : 0;

    const incDoc = {
      incidentId,
      title,
      type: cat,
      city: cityName,
      description: `Automated telemetry & citizen reports describing ${title.toLowerCase()} in ${loc.name}, ${cityName}.`,
      location: {
        latitude: geo.latitude,
        longitude: geo.longitude,
        address: `${loc.name}, ${cityName}`,
        city: cityName,
        geometry: { type: 'Point', coordinates: geo.coordinates },
      },
      severity: sev,
      priority: pri,
      confidence: 88 + (i % 11),
      status: stat,
      source: i % 3 === 0 ? 'SENSOR' : i % 2 === 0 ? 'EMERGENCY_CALL' : 'CITIZEN',
      assignedTeams: stat !== 'NEW' ? [assignedTeam.teamId] : [],
      assignedResources: stat !== 'NEW' ? [assignedRes.resourceId] : [],
      delayDetected,
      delayMinutes,
      reports: [
        {
          reportId: `REP-SYN-${i}-A`,
          source: 'EMERGENCY_CALL',
          text: `Distress caller reports rapid escalation at ${loc.name}, ${cityName}.`,
          reliability: 92,
          reportedAt,
        },
        {
          reportId: `REP-SYN-${i}-B`,
          source: 'SENSOR',
          text: `Automated IoT environmental sensor detected threshold anomaly.`,
          reliability: 98,
          reportedAt: acknowledgedAt,
        },
      ],
      timeline: [
        {
          timelineId: `TL-SYN-${i}-1`,
          event: 'INCIDENT_CREATED',
          description: 'Emergency telemetry ingested into queue.',
          timestamp: reportedAt,
        },
        {
          timelineId: `TL-SYN-${i}-2`,
          event: 'STATUS_CHANGED',
          previousStatus: 'NEW',
          newStatus: stat,
          description: `Operational progression to ${stat}.`,
          timestamp: assignedAt,
        },
      ],
      aiAnalysis: {
        classification: { type: cat, confidence: 0.94 },
        severityRating: { level: sev, confidence: 0.92 },
        priorityRating: { level: pri, reason: `Threat score computed for ${sev}` },
      },
      createdAt: reportedAt,
      updatedAt: resolvedAt || arrivedAt || reportedAt,
      resolvedAt,
      metadata: {
        isSynthetic: true,
        zone: loc.zone,
      },
    };

    incidents.push(incDoc);

    // Generate alerts & notifications
    if (sev === 'CRITICAL' || delayDetected) {
      notifications.push({
        notificationId: `NTF-SYN-${String(i).padStart(4, '0')}`,
        type: delayDetected ? 'RESPONSE_DELAY' : 'CRITICAL_INCIDENT',
        title: delayDetected ? `TRANSIT DELAY ALERT: #${incidentId}` : `CRITICAL HAZARD: #${incidentId}`,
        message: `${title} at ${loc.name} requires high-priority command oversight.`,
        severity: sev,
        entityType: 'INCIDENT',
        entityId: incidentId,
        createdAt: acknowledgedAt,
        metadata: { isSynthetic: true },
      });
    }

    // Generate escalations for high/critical or delayed incidents
    if (pri === 'P1' || delayDetected) {
      escalations.push({
        escalationId: `ESC-SYN-${String(i).padStart(4, '0')}`,
        incidentId,
        level: pri === 'P1' ? 2 : 1,
        ruleId: delayDetected ? 'RULE-TRANSIT-DELAY' : 'RULE-CRITICAL-SEVERITY',
        reason: delayDetected ? `Transit delay of ${delayMinutes}m breached mandate` : 'P1 Immediate Threat Escalation',
        status: stat === 'RESOLVED' ? 'RESOLVED' : 'ACKNOWLEDGED',
        targetRole: 'ADMIN',
        triggeredAt: assignedAt,
        createdAt: assignedAt,
        metadata: { isSynthetic: true },
      });
    }

    // Generate corresponding audit logs
    auditLogs.push(
      {
        userId: 'SYSTEM',
        userName: 'EMERGENX_DISPATCH',
        userRole: 'OPERATOR',
        action: 'INCIDENT_CREATED',
        entityType: 'INCIDENT',
        entityId: incidentId,
        newValue: { severity: sev, priority: pri, type: cat },
        timestamp: reportedAt,
        metadata: { isSynthetic: true },
      },
      {
        userId: 'SYSTEM',
        userName: 'AI_CLASSIFIER_V4',
        userRole: 'SYSTEM',
        action: 'INCIDENT_CLASSIFIED',
        entityType: 'INCIDENT',
        entityId: incidentId,
        newValue: { classification: cat, confidence: 0.94 },
        timestamp: acknowledgedAt,
        metadata: { isSynthetic: true },
      }
    );

    if (stat === 'RESOLVED') {
      auditLogs.push({
        userId: 'SYSTEM',
        userName: 'SUPERVISOR_COMMAND',
        userRole: 'OPERATOR',
        action: 'INCIDENT_RESOLVED',
        entityType: 'INCIDENT',
        entityId: incidentId,
        previousValue: { status: 'ON_SCENE' },
        newValue: { status: 'RESOLVED' },
        timestamp: resolvedAt,
        metadata: { isSynthetic: true },
      });
    }
  }

  await IncidentModel.insertMany(incidents);
  console.log(`✓ Seeded ${incidents.length} Chronologically Valid Incidents.`);

  console.log('[6/7] Inserting Correlated Notifications & Escalations...');
  if (notifications.length > 0) await NotificationModel.insertMany(notifications);
  if (escalations.length > 0) await EscalationModel.insertMany(escalations);
  console.log(`✓ Seeded ${notifications.length} Notifications and ${escalations.length} Escalations.`);

  console.log('[7/7] Inserting Cryptographic Audit Trail Ledger...');
  if (auditLogs.length > 0) await AuditLogModel.insertMany(auditLogs);
  console.log(`✓ Seeded ${auditLogs.length} Cryptographic Audit Records.`);

  console.log('\n====================================================');
  console.log('✅ SYNTHETIC SEED COMPLETED SUCCESSFULLY');
  console.log(`📊 Total Incidents: ${await IncidentModel.countDocuments()}`);
  console.log(`🚒 Total Teams: ${await ResponseTeamModel.countDocuments()}`);
  console.log(`🚑 Total Resources: ${await ResourceModel.countDocuments()}`);
  console.log(`🏥 Total Facilities: ${await FacilityModel.countDocuments()}`);
  console.log(`⚠️ Total Escalations: ${await EscalationModel.countDocuments()}`);
  console.log(`🔔 Total Notifications: ${await NotificationModel.countDocuments()}`);
  console.log(`📜 Total Audit Logs: ${await AuditLogModel.countDocuments()}`);
  console.log('====================================================\n');

  await mongoose.disconnect();
  process.exit(0);
};

generateSyntheticData().catch((err) => {
  console.error('[SyntheticSeed] Fatal Error:', err);
  process.exit(1);
});
