import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  query,
  where,
  limit,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/firestoreErrors';
import { Incident, Team, Responder, EmergencyResource, UserProfile } from '../types';
import { recordAuditLog } from './auditService';
import { createSystemNotification } from './notificationService';
import { SYSTEM_CITIZEN_CREDENTIALS, SYSTEM_STAFF_CREDENTIALS } from './authService';

export const INDIA_CITIZEN_PROFILES: Array<Omit<UserProfile, 'createdAt' | 'updatedAt' | 'lastActiveAt'>> = [
  {
    uid: 'citizen-rahul_sharma_inresq_in',
    role: 'citizen',
    name: 'Rahul Sharma',
    email: 'rahul.sharma@inresq.in',
    phone: '+91 98201 44521',
    active: true,
    notificationPreferences: {
      criticalAlerts: true,
      statusUpdates: true,
      weatherAdvisories: true
    }
  },
  {
    uid: 'citizen-priya_patel_inresq_in',
    role: 'citizen',
    name: 'Priya Patel',
    email: 'priya.patel@inresq.in',
    phone: '+91 98791 22340',
    active: true,
    notificationPreferences: {
      criticalAlerts: true,
      statusUpdates: true,
      weatherAdvisories: true
    }
  },
  {
    uid: 'citizen-karthik_ramesh_inresq_in',
    role: 'citizen',
    name: 'Karthik Ramesh',
    email: 'karthik.ramesh@inresq.in',
    phone: '+91 98402 77819',
    active: true,
    notificationPreferences: {
      criticalAlerts: true,
      statusUpdates: true,
      weatherAdvisories: true
    }
  },
  {
    uid: 'citizen-ananya_sen_inresq_in',
    role: 'citizen',
    name: 'Ananya Sen',
    email: 'ananya.sen@inresq.in',
    phone: '+91 98310 99450',
    active: true,
    notificationPreferences: {
      criticalAlerts: true,
      statusUpdates: true,
      weatherAdvisories: true
    }
  },
  {
    uid: 'citizen-vikram_malhotra_inresq_in',
    role: 'citizen',
    name: 'Vikram Malhotra',
    email: 'vikram.malhotra@inresq.in',
    phone: '+91 98110 33215',
    active: true,
    notificationPreferences: {
      criticalAlerts: true,
      statusUpdates: true,
      weatherAdvisories: true
    }
  },
  {
    uid: 'citizen-lakshmi_devi_inresq_in',
    role: 'citizen',
    name: 'Lakshmi Devi',
    email: 'lakshmi.devi@inresq.in',
    phone: '+91 98481 66520',
    active: true,
    notificationPreferences: {
      criticalAlerts: true,
      statusUpdates: true,
      weatherAdvisories: true
    }
  }
];

export const INDIA_TEAMS: Array<Omit<Team, 'updatedAt'>> = [
  {
    id: 'team-med-01',
    name: 'Medical Unit 01 (ALS Paramedics)',
    type: 'Advanced Emergency Life Support',
    memberCount: 8,
    status: 'responding',
    currentIncidentId: 'demo-inc-chennai-03',
    currentIncidentCode: 'RESQ-IN-2003',
    contact: '+91 44 2436 1101',
    station: 'Central Trauma Pavilion & AIIMS Regional Staging',
    baseLocation: 'Sector 4 Metro Staging Bay',
    vehicles: '3x Type-C Advanced Life Support Ambulances',
    equipment: 'Automated External Defibrillators, Critical Trauma Surgical Packs, High-Flow O2 Concentrators',
    isDemo: true
  },
  {
    id: 'team-med-02',
    name: 'Medical Unit 02 (Rapid Response)',
    type: 'Rapid Paramedic First Response',
    memberCount: 4,
    status: 'available',
    currentIncidentId: null,
    currentIncidentCode: null,
    contact: '+91 11 2436 1102',
    station: 'Metro Emergency Transit Clinic',
    baseLocation: 'Ring Road Staging Bay',
    vehicles: '2x Rapid Paramedic Interceptor SUVs',
    equipment: 'Portable Vitals Monitors, Specialized Burn Dressings, Splints & Cervical Collars',
    isDemo: true
  },
  {
    id: 'team-fire-01',
    name: 'Fire & Rescue Unit 01 (Heavy Extrication)',
    type: 'Structural Firefighting & Extrication',
    memberCount: 14,
    status: 'dispatched',
    currentIncidentId: 'demo-inc-kolkata-04',
    currentIncidentCode: 'RESQ-IN-2004',
    contact: '+91 33 2436 1103',
    station: 'Central Fire Operations Command Station',
    baseLocation: 'Salt Lake Station 03 Main Yard',
    vehicles: '1x 5000L Multi-Flow Water Foam Tender, 1x Hydraulic Rescue Extrication Van, 1x 42m Aerial Ladder Platform',
    equipment: 'Hydraulic Cutters, Self-Contained Breathing Apparatus (SCBA), Thermal Imaging Infrared Cameras',
    isDemo: true
  },
  {
    id: 'team-fire-02',
    name: 'Fire & Rescue Unit 02 (Industrial Foam Strike)',
    type: 'Industrial & Petrochemical Firefighting',
    memberCount: 12,
    status: 'available',
    currentIncidentId: null,
    currentIncidentCode: null,
    contact: '+91 22 2436 1109',
    station: 'Petrochemical Corridor Fire Hub',
    baseLocation: 'Refinery South Gate Staging',
    vehicles: '2x Heavy Foam Water Monitors, 1x Mobile Chemical Foam Trailer',
    equipment: 'Class-B Alcohol Resistant Foam, High-Flow Deluge Nozzles, Proximity Fire Suits',
    isDemo: true
  },
  {
    id: 'team-disaster-01',
    name: 'Disaster Response Unit 01 (Flood Battalion)',
    type: 'Hydrological & Cyclone Rescue',
    memberCount: 16,
    status: 'dispatched',
    currentIncidentId: 'demo-inc-mumbai-01',
    currentIncidentCode: 'RESQ-IN-2001',
    contact: '+91 22 2436 1104',
    station: 'Civil Defense & Disaster Relief HQ',
    baseLocation: 'River Basin Flood Control Depot',
    vehicles: '3x High-Clearance 4x4 Heavy Amphibious Trucks, 4x Inflatable Zodiac Rescue Boats',
    equipment: 'Submersible Water Dewatering Pumps, Life Vests, Acoustic Depth Probes, High-Intensity Searchlights',
    isDemo: true
  },
  {
    id: 'team-disaster-02',
    name: 'Disaster Response Unit 02 (Coastal Storm Task Force)',
    type: 'Coastal Storm & Landslide Mitigation',
    memberCount: 14,
    status: 'responding',
    currentIncidentId: 'demo-inc-vizag-06',
    currentIncidentCode: 'RESQ-IN-2006',
    contact: '+91 891 2436 1110',
    station: 'SDRF Coastal Regional Base',
    baseLocation: 'Beach Road Emergency Staging Area',
    vehicles: '2x Heavy Earthmoving Loaders, 3x High-Clearance Disaster Support Trucks',
    equipment: 'High-Power Chainsaws, Heavy Shoring Timbers, Mud Dewatering Units, Emergency Rations',
    isDemo: true
  },
  {
    id: 'team-hazmat-01',
    name: 'Hazmat & Chemical Emergency Brigade',
    type: 'Chemical & Hazmat Emergency Force',
    memberCount: 10,
    status: 'dispatched',
    currentIncidentId: 'demo-inc-ahmedabad-02',
    currentIncidentCode: 'RESQ-IN-2002',
    contact: '+91 79 2436 1105',
    station: 'Industrial Chemical Disaster Management Station',
    baseLocation: 'GIDC Industrial Corridor Depot',
    vehicles: '1x Heavy Hazmat Decontamination Truck, 1x Mobile Chemical Analysis Van',
    equipment: 'Level-A Gas-Tight Hazmat Suits, Multi-Gas Vapor Sniffers, Neutralizing Foam Dispensers, Air Scrubber Units',
    isDemo: true
  },
  {
    id: 'team-marine-01',
    name: 'Coastal Marine & Flood Rescue Battalion',
    type: 'Coastal Marine & Flood Rescue',
    memberCount: 12,
    status: 'available',
    currentIncidentId: null,
    currentIncidentCode: null,
    contact: '+91 891 2436 1106',
    station: 'Coast Guard & NDRF Marine Station',
    baseLocation: 'Port Trust Deep Water Pier',
    vehicles: '2x Rigid Inflatable Patrol Boats, 1x Marine Towing Craft',
    equipment: 'Sonar Bottom Scanners, Scuba Diving Suits, High-Power Water Cannons, Emergency Tow Harnesses',
    isDemo: true
  },
  {
    id: 'team-k9-search',
    name: 'K9 Canine Disaster Detection & Rescue Force',
    type: 'Urban Search & Rescue (USAR)',
    memberCount: 8,
    status: 'dispatched',
    currentIncidentId: 'demo-inc-delhi-05',
    currentIncidentCode: 'RESQ-IN-2005',
    contact: '+91 11 2436 1107',
    station: 'National Disaster Search & Rescue Training Center',
    baseLocation: 'Old Delhi Staging Depot',
    vehicles: '2x Air-Conditioned Canine Support Transports',
    equipment: '4x Certified Disaster Sniffer Dogs, Seismic Vibraphone Ground Sensors, Telescopic Search Cameras',
    isDemo: true
  },
  {
    id: 'team-search-01',
    name: 'Urban Search & Rescue (USAR Corps)',
    type: 'Urban Search & Rescue (USAR)',
    memberCount: 12,
    status: 'available',
    currentIncidentId: null,
    currentIncidentCode: null,
    contact: '+91 891 2436 1108',
    station: 'SDRF Tactical Base Camp',
    baseLocation: 'North Ridge Helipad Depot',
    vehicles: '2x Heavy Structural Shoring Transports, 1x Rapid Equipment Hauler',
    equipment: 'Acoustic Listening Devices, Concrete Saws, Hydraulic Jacks, Thermal Drone Reconnaissance Flight Kits',
    isDemo: true
  },
  {
    id: 'team-aero-01',
    name: 'Aeromedical Evacuation & Helitack Unit',
    type: 'Airborne Emergency Life Support',
    memberCount: 6,
    status: 'available',
    currentIncidentId: null,
    currentIncidentCode: null,
    contact: '+91 11 2436 1111',
    station: 'Safdarjung Airport Emergency Air Wing',
    baseLocation: 'Hangar Bay 4 Tactical Apron',
    vehicles: '1x Twin-Engine Critical Care Air Ambulance Helicopter',
    equipment: 'Flight Ventilators, High-Altitude Winch Rescue Harnesses, Portable Defibrillator Units',
    isDemo: true
  },
  {
    id: 'team-telecom-01',
    name: 'Tactical Telecom & Emergency Grid Recovery Team',
    type: 'Emergency Telecommunications & Grid Relief',
    memberCount: 8,
    status: 'available',
    currentIncidentId: null,
    currentIncidentCode: null,
    contact: '+91 11 2436 1112',
    station: 'National Telecom Emergency Command Node',
    baseLocation: 'Central Microwave Tower Depot',
    vehicles: '2x Mobile Satellite Uplink Vans, 1x Diesel Generator Hauler',
    equipment: 'COW (Cell On Wheels) Transceivers, Portable Satellite Terminals, VHF/UHF Field Repeaters',
    isDemo: true
  }
];

export const INDIA_RESPONDERS: Responder[] = [
  {
    responderId: 'resp-kavita-05',
    userId: 'resp-kavita-05',
    name: 'Inspector Kavita Sharma',
    phone: '+91 98480 23405',
    email: 'responder@resq360.ops',
    badgeNumber: 'NDRF-104',
    teamType: 'Hydrological & Cyclone Rescue',
    teamId: 'team-disaster-01',
    availability: 'on_scene',
    currentIncidentId: 'demo-inc-mumbai-01',
    currentIncidentCode: 'RESQ-IN-2001',
    lastActiveAt: serverTimestamp(),
    location: 'Kurla West Embankment, Mumbai',
    isDemo: true
  },
  {
    responderId: 'resp-anand-06',
    userId: 'resp-anand-06',
    name: 'Dr. Anand Verma',
    phone: '+91 98480 23406',
    email: 'paramedic@resq360.ops',
    badgeNumber: 'EMS-402',
    teamType: 'Advanced Emergency Life Support',
    teamId: 'team-med-01',
    availability: 'en_route',
    currentIncidentId: 'demo-inc-chennai-03',
    currentIncidentCode: 'RESQ-IN-2003',
    lastActiveAt: serverTimestamp(),
    location: 'OMR Expressway Toll Plaza, Chennai',
    isDemo: true
  },
  {
    responderId: 'resp-vikram-03',
    userId: 'resp-vikram-03',
    name: 'Chief Fire Officer Vikram Rathore',
    phone: '+91 98480 23403',
    email: 'fire.chief@resq360.ops',
    badgeNumber: 'FIRE-509',
    teamType: 'Structural Firefighting & Extrication',
    teamId: 'team-fire-01',
    availability: 'on_scene',
    currentIncidentId: 'demo-inc-kolkata-04',
    currentIncidentCode: 'RESQ-IN-2004',
    lastActiveAt: serverTimestamp(),
    location: 'Sector V IT Commercial Tower, Kolkata',
    isDemo: true
  },
  {
    responderId: 'resp-sunita-07',
    userId: 'resp-sunita-07',
    name: 'Specialist Sunita Deshmukh',
    phone: '+91 98480 23407',
    email: 'hazmat.lead@resq360.ops',
    badgeNumber: 'HAZ-301',
    teamType: 'Chemical & Hazmat Emergency Force',
    teamId: 'team-hazmat-01',
    availability: 'on_scene',
    currentIncidentId: 'demo-inc-ahmedabad-02',
    currentIncidentCode: 'RESQ-IN-2002',
    lastActiveAt: serverTimestamp(),
    location: 'GIDC Industrial Gate 4, Naroda, Ahmedabad',
    isDemo: true
  },
  {
    responderId: 'resp-rakesh-08',
    userId: 'resp-rakesh-08',
    name: 'Sub-Inspector Rakesh Nair',
    phone: '+91 98480 23408',
    email: 'marine.rescue@resq360.ops',
    badgeNumber: 'MAR-205',
    teamType: 'Coastal Marine & Flood Rescue',
    teamId: 'team-marine-01',
    availability: 'available',
    currentIncidentId: null,
    currentIncidentCode: null,
    lastActiveAt: serverTimestamp(),
    location: 'Port Trust Command Pier, Mumbai',
    isDemo: true
  },
  {
    responderId: 'resp-sunil-04',
    userId: 'resp-sunil-04',
    name: 'Lead Specialist Sunil Rao',
    phone: '+91 98480 23404',
    email: 'usar.specialist@resq360.ops',
    badgeNumber: 'USAR-311',
    teamType: 'Urban Search & Rescue (USAR)',
    teamId: 'team-k9-search',
    availability: 'on_scene',
    currentIncidentId: 'demo-inc-delhi-05',
    currentIncidentCode: 'RESQ-IN-2005',
    lastActiveAt: serverTimestamp(),
    location: 'Daryaganj Heritage Sector, New Delhi',
    isDemo: true
  },
  {
    responderId: 'resp-rajesh-01',
    userId: 'resp-rajesh-01',
    name: 'Officer Rajesh Varma',
    phone: '+91 98480 23401',
    email: 'rajesh.varma@resq360.ops',
    badgeNumber: 'SDRF-704',
    teamType: 'Hydrological & Cyclone Rescue',
    teamId: 'team-disaster-01',
    availability: 'en_route',
    currentIncidentId: 'demo-inc-vizag-06',
    currentIncidentCode: 'RESQ-IN-2006',
    lastActiveAt: serverTimestamp(),
    location: 'MVP Colony Ridge, Visakhapatnam',
    isDemo: true
  },
  {
    responderId: 'resp-ananya-02',
    userId: 'resp-ananya-02',
    name: 'Dr. Ananya Sharma',
    phone: '+91 98480 23402',
    email: 'ananya.sharma@resq360.ops',
    badgeNumber: 'MED-102',
    teamType: 'Advanced Emergency Life Support',
    teamId: 'team-med-01',
    availability: 'available',
    currentIncidentId: null,
    currentIncidentCode: null,
    lastActiveAt: serverTimestamp(),
    location: 'Central Trauma Outpost, Delhi NCR',
    isDemo: true
  },
  {
    responderId: 'resp-arjun-09',
    userId: 'resp-arjun-09',
    name: 'Flight Paramedic Lt. Arjun Kapoor',
    phone: '+91 98480 23409',
    email: 'arjun.aero@resq360.ops',
    badgeNumber: 'AERO-601',
    teamType: 'Airborne Emergency Life Support',
    teamId: 'team-aero-01',
    availability: 'available',
    currentIncidentId: null,
    currentIncidentCode: null,
    lastActiveAt: serverTimestamp(),
    location: 'Safdarjung Airfield Emergency Hangar, New Delhi',
    isDemo: true
  },
  {
    responderId: 'resp-amit-10',
    userId: 'resp-amit-10',
    name: 'Heavy Extrication Tech Amit Joshi',
    phone: '+91 98480 23410',
    email: 'amit.extrication@resq360.ops',
    badgeNumber: 'FIRE-512',
    teamType: 'Structural Firefighting & Extrication',
    teamId: 'team-fire-01',
    availability: 'available',
    currentIncidentId: null,
    currentIncidentCode: null,
    lastActiveAt: serverTimestamp(),
    location: 'Salt Lake Fire Operations Station, Kolkata',
    isDemo: true
  },
  {
    responderId: 'resp-suresh-11',
    userId: 'resp-suresh-11',
    name: 'Tactical Boat Master Suresh Yadav',
    phone: '+91 98480 23411',
    email: 'suresh.marine@resq360.ops',
    badgeNumber: 'MAR-208',
    teamType: 'Coastal Marine & Flood Rescue',
    teamId: 'team-marine-01',
    availability: 'available',
    currentIncidentId: null,
    currentIncidentCode: null,
    lastActiveAt: serverTimestamp(),
    location: 'Visakhapatnam Port Trust Pier 3',
    isDemo: true
  },
  {
    responderId: 'resp-meera-12',
    userId: 'resp-meera-12',
    name: 'Lead Telecom Engineer Meera Nambiar',
    phone: '+91 98480 23412',
    email: 'meera.telecom@resq360.ops',
    badgeNumber: 'COMM-110',
    teamType: 'Emergency Telecommunications & Grid Relief',
    teamId: 'team-telecom-01',
    availability: 'available',
    currentIncidentId: null,
    currentIncidentCode: null,
    lastActiveAt: serverTimestamp(),
    location: 'National Telecom Center, Central Delhi',
    isDemo: true
  }
];

export const INDIA_RESOURCES: Array<Omit<EmergencyResource, 'updatedAt'>> = [
  {
    id: 'res-amb-01',
    name: 'Ambulances',
    category: 'Vehicles',
    totalQuantity: 5,
    allocatedQuantity: 2,
    availableQuantity: 3,
    unit: 'Vehicles',
    status: 'adequate',
    location: 'City Central Staging & Highway Hub',
    isDemo: true
  },
  {
    id: 'res-rec-02',
    name: 'Rescue Vehicles',
    category: 'Vehicles',
    totalQuantity: 4,
    allocatedQuantity: 2,
    availableQuantity: 2,
    unit: 'Vehicles',
    status: 'adequate',
    location: 'Sector 4 Depot',
    isDemo: true
  },
  {
    id: 'res-med-03',
    name: 'Trauma & Medical Kits',
    category: 'Medical',
    totalQuantity: 50,
    allocatedQuantity: 18,
    availableQuantity: 32,
    unit: 'Kits',
    status: 'adequate',
    location: 'District Health Supply Warehouse',
    isDemo: true
  },
  {
    id: 'res-food-04',
    name: 'Emergency Food Packs',
    category: 'Supplies',
    totalQuantity: 200,
    allocatedQuantity: 50,
    availableQuantity: 150,
    unit: 'Packs',
    status: 'adequate',
    location: 'Civil Defense Relief Warehouse',
    isDemo: true
  },
  {
    id: 'res-water-05',
    name: 'Clean Drinking Water Units',
    category: 'Supplies',
    totalQuantity: 300,
    allocatedQuantity: 60,
    availableQuantity: 240,
    unit: 'Units',
    status: 'adequate',
    location: 'Municipal Water Distribution Hub',
    isDemo: true
  },
  {
    id: 'res-shelter-06',
    name: 'Emergency Shelter Capacity',
    category: 'Shelter',
    totalQuantity: 200,
    allocatedQuantity: 80,
    availableQuantity: 120,
    unit: 'Spaces',
    status: 'adequate',
    location: 'Community Stadium Relief Center',
    isDemo: true
  }
];

export const INDIA_INCIDENTS: Incident[] = [
  {
    id: 'demo-inc-mumbai-01',
    incidentId: 'RESQ-IN-2001',
    citizenId: 'citizen-rahul_sharma_inresq_in',
    citizenName: 'Rahul Sharma',
    citizenPhone: '+91 98201 44521',
    type: 'Flood & Inundation',
    description: 'Mithi river tributary overflowed following 180mm torrential downpour. Water reached 5 feet depth near residential chawls and apartment ground floors along LBS Marg. Over 35 residents, including elderly patients and infants, stranded on building terraces. Immediate motorized inflatable boat evacuation urgently required before nightfall.',
    affectedPeople: 38,
    isAnyoneInjured: true,
    isAnyoneTrapped: true,
    isImmediateDanger: true,
    severity: 'CRITICAL',
    severityScore: 94,
    severityFactors: [
      'Rapidly rising floodwater touching residential first-floor balconies',
      'Confirmed trapped families including vulnerable senior citizens and children',
      'High-voltage localized power cables submerged under swirling waters',
      'Strong water currents preventing self-evacuation'
    ],
    aiAssessment: {
      priorityScore: 94,
      priorityLevel: 'CRITICAL',
      reasoning: 'Severe urban flash inundation with 38 stranded persons in rising currents. Immediate watercraft rescue needed to prevent drowning and electrocution.',
      riskFactors: ['Submersion drowning', 'Electric shock hazard', 'Structural wall softening', 'Hypothermia'],
      peopleAtRisk: 38,
      suggestedTeams: ['Disaster Response Unit 01 (Flood Battalion)', 'Medical Unit 01 (ALS Paramedics)'],
      suggestedResources: ['Inflatable Flood Rescue Zodiacs & Motorboats', 'Mobile High-Capacity Clean Drinking Water Units'],
      recommendedActions: ['Deploy 3 Zodiac crafts with outboard motors immediately', 'Shut off local BESU/Adani electrical sub-grid', 'Establish medical triage on Kurla Railway Flyover'],
      safetyPrecautions: ['Do not wade into murky moving water', 'Stay on highest reinforced concrete rooftop', 'Wave bright colored cloth for pilot boat spotting'],
      modelUsed: 'gemini-2.5-flash (Emergency Triage Protocol)',
      timestamp: new Date().toISOString(),
      status: 'completed'
    },
    verifiedByAdmin: true,
    verifiedAt: serverTimestamp(),
    verifiedByUid: 'commander@resq360.ops',
    verifiedByName: 'Command Supervisor Aryan Mehta',
    latitude: 19.0688,
    longitude: 72.8797,
    locationAddress: 'LBS Marg, Kurla West, Mumbai, Maharashtra 400070',
    locationAccuracy: 10,
    status: 'en_route',
    assignedTeamId: 'team-disaster-01',
    assignedTeamName: 'Disaster Response Unit 01 (Flood Battalion)',
    assignedResponderId: 'resp-kavita-05',
    assignedResponderName: 'Inspector Kavita Sharma',
    assignedResponderTeam: 'Hydrological & Cyclone Rescue',
    isGuestReport: false,
    isDemo: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  },
  {
    id: 'demo-inc-ahmedabad-02',
    incidentId: 'RESQ-IN-2002',
    citizenId: 'citizen-priya_patel_inresq_in',
    citizenName: 'Priya Patel',
    citizenPhone: '+91 98791 22340',
    type: 'Hazardous Chemical',
    description: 'Chemical synthesis reactor valve failure at industrial dyestuff manufacturing unit. High-density pungent chlorine and sulfurous gas cloud drifting across adjacent worker colonies and residential society. Over 50 residents experiencing severe eye burning, acute respiratory asphyxiation, and vomiting.',
    affectedPeople: 55,
    isAnyoneInjured: true,
    isAnyoneTrapped: false,
    isImmediateDanger: true,
    severity: 'CRITICAL',
    severityScore: 96,
    severityFactors: [
      'Active airborne toxic chemical plume downwind toward populated neighborhoods',
      'Multiple casualties presenting severe respiratory distress and chemical eye irritation',
      'Combustion and secondary explosion risk inside plant premises'
    ],
    aiAssessment: {
      priorityScore: 96,
      priorityLevel: 'CRITICAL',
      reasoning: 'Acute inhalation hazard and potential chemical toxidrome affecting large civilian population. Immediate exclusion zone isolation and antidotal triage required.',
      riskFactors: ['Toxic pulmonary edema', 'Acute respiratory failure', 'Corrosive chemical burns', 'Secondary chemical reaction'],
      peopleAtRisk: 55,
      suggestedTeams: ['Hazmat & Chemical Emergency Brigade', 'Medical Unit 01 (ALS Paramedics)'],
      suggestedResources: ['Level-A Gas-Tight Chemical Hazmat Suits', 'Mobile High-Capacity Clean Drinking Water Units'],
      recommendedActions: ['Enforce 1.5 km downwind civilian evacuation', 'Deploy misting water curtains to dissolve toxic gas plume', 'Administer humidified oxygen and bronchodilators to affected civilians'],
      safetyPrecautions: ['Cover mouth and nose with damp cloth immediately', 'Evacuate crosswind, never run downwind', 'Seal indoor windows and turn off air conditioning units'],
      modelUsed: 'gemini-2.5-flash (Hazmat Safety Engine)',
      timestamp: new Date().toISOString(),
      status: 'completed'
    },
    verifiedByAdmin: true,
    verifiedAt: serverTimestamp(),
    verifiedByUid: 'commander@resq360.ops',
    verifiedByName: 'Command Supervisor Aryan Mehta',
    latitude: 23.0784,
    longitude: 72.6469,
    locationAddress: 'Phase II, GIDC Industrial Estate, Naroda, Ahmedabad, Gujarat 382330',
    locationAccuracy: 12,
    status: 'assigned',
    assignedTeamId: 'team-hazmat-01',
    assignedTeamName: 'Hazmat & Chemical Emergency Brigade',
    assignedResponderId: 'resp-sunita-07',
    assignedResponderName: 'Specialist Sunita Deshmukh',
    assignedResponderTeam: 'Chemical & Hazmat Emergency Force',
    isGuestReport: false,
    isDemo: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  },
  {
    id: 'demo-inc-chennai-03',
    incidentId: 'RESQ-IN-2003',
    citizenId: 'citizen-karthik_ramesh_inresq_in',
    citizenName: 'Karthik Ramesh',
    citizenPhone: '+91 98402 77819',
    type: 'Vehicle Accident',
    description: 'High-speed chain collision on IT Expressway involving an intercity bus, 3 passenger sedans, and a pressurized liquefied petroleum gas (LPG) bullet tanker. Tanker safety valve ruptured causing high-pressure hissing gas leak. 8 passengers pinned in crushed vehicles; sparks visible from scraping metal.',
    affectedPeople: 22,
    isAnyoneInjured: true,
    isAnyoneTrapped: true,
    isImmediateDanger: true,
    severity: 'HIGH',
    severityScore: 89,
    severityFactors: [
      'Pressurized flammable gas leakage with proximate ignition sources',
      'Mechanical entrapment of 8 conscious victims requiring hydraulic jaws of life',
      'Heavy rush-hour traffic backlog preventing conventional vehicle movement'
    ],
    aiAssessment: {
      priorityScore: 89,
      priorityLevel: 'HIGH',
      reasoning: 'Complex multi-vehicle collision with severe entrapment compounded by volatile flammable gas plume. High BLEVE (Boiling Liquid Expanding Vapor Explosion) risk.',
      riskFactors: ['Vapor cloud explosion', 'Trauma shock from entrapment', 'Mass casualty transit delay'],
      peopleAtRisk: 22,
      suggestedTeams: ['Medical Unit 01 (ALS Paramedics)', 'Fire & Rescue Unit 01 (Heavy Extrication)'],
      suggestedResources: ['Type-C ALS Emergency Ambulances', 'Trauma & Paramedic Advanced First Aid Packs'],
      recommendedActions: ['Establish 300m safety perimeter around gas tanker', 'Deploy foam blanket over fuel and flammable spillage', 'Cut vehicular frame pillars to extricate trapped occupants'],
      safetyPrecautions: ['Extinguish all open flames, cigarettes, and cellphones in vicinity', 'Do not attempt to pull victims forcefully without spinal stabilization'],
      modelUsed: 'gemini-2.5-flash (Accident Assessment)',
      timestamp: new Date().toISOString(),
      status: 'completed'
    },
    verifiedByAdmin: true,
    verifiedAt: serverTimestamp(),
    verifiedByUid: 'commander@resq360.ops',
    verifiedByName: 'Command Supervisor Aryan Mehta',
    latitude: 12.9010,
    longitude: 80.2279,
    locationAddress: 'Old Mahabalipuram Rd (OMR Expressway), Sholinganallur, Chennai, Tamil Nadu 600119',
    locationAccuracy: 8,
    status: 'en_route',
    assignedTeamId: 'team-med-01',
    assignedTeamName: 'Medical Unit 01 (ALS Paramedics)',
    assignedResponderId: 'resp-anand-06',
    assignedResponderName: 'Dr. Anand Verma',
    assignedResponderTeam: 'Advanced Emergency Life Support',
    isGuestReport: false,
    isDemo: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  },
  {
    id: 'demo-inc-kolkata-04',
    incidentId: 'RESQ-IN-2004',
    citizenId: 'citizen-ananya_sen_inresq_in',
    citizenName: 'Ananya Sen',
    citizenPhone: '+91 98310 99450',
    type: 'Fire Outbreak',
    description: 'Electrical transformer explosion triggered a fast-spreading commercial structural fire on the 4th floor server and cafeteria wing of an 11-story IT park building. Thick toxic black acrylic smoke engulfing internal staircases. Approximately 40 tech personnel trapped on 5th floor terrace and office cubicles with fire spreading upward.',
    affectedPeople: 42,
    isAnyoneInjured: true,
    isAnyoneTrapped: true,
    isImmediateDanger: true,
    severity: 'CRITICAL',
    severityScore: 93,
    severityFactors: [
      'Multi-story vertical fire propagation with synthetic acoustic insulation burning',
      'Primary emergency staircase blocked by thick toxic smoke and heat barrier',
      'Confirmed trapped workers signaling from 5th floor exterior window panes'
    ],
    aiAssessment: {
      priorityScore: 93,
      priorityLevel: 'CRITICAL',
      reasoning: 'High-rise structural conflagration with vertical smoke spread trapping civilians on upper floors. Requires immediate aerial ladder evacuation and interior firefighting.',
      riskFactors: ['Cyanide and carbon monoxide smoke inhalation', 'Panic crush at emergency exits', 'Glass blowout trauma'],
      peopleAtRisk: 42,
      suggestedTeams: ['Fire & Rescue Unit 01 (Heavy Extrication)', 'Medical Unit 01 (ALS Paramedics)'],
      suggestedResources: ['Type-C ALS Emergency Ambulances', 'Level-A Gas-Tight Chemical Hazmat Suits'],
      recommendedActions: ['Position 42m aerial hydraulic platform on East frontage', 'Deploy positive-pressure ventilation fans to clear stairwell smoke', 'Set up smoke inhalation resuscitation station in ground courtyard'],
      safetyPrecautions: ['Crawl low under smoke where air is cleaner', 'Place damp clothing under door seams to block smoke ingress', 'Do not utilize standard passenger elevators'],
      modelUsed: 'gemini-2.5-flash (Structural Fire Module)',
      timestamp: new Date().toISOString(),
      status: 'completed'
    },
    verifiedByAdmin: true,
    verifiedAt: serverTimestamp(),
    verifiedByUid: 'commander@resq360.ops',
    verifiedByName: 'Command Supervisor Aryan Mehta',
    latitude: 22.5802,
    longitude: 88.4312,
    locationAddress: 'Sector V, Salt Lake Electronics Complex, Kolkata, West Bengal 700091',
    locationAccuracy: 15,
    status: 'en_route',
    assignedTeamId: 'team-fire-01',
    assignedTeamName: 'Fire & Rescue Unit 01 (Heavy Extrication)',
    assignedResponderId: 'resp-vikram-03',
    assignedResponderName: 'Chief Fire Officer Vikram Rathore',
    assignedResponderTeam: 'Structural Firefighting & Extrication',
    isGuestReport: false,
    isDemo: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  },
  {
    id: 'demo-inc-delhi-05',
    incidentId: 'RESQ-IN-2005',
    citizenId: 'citizen-vikram_malhotra_inresq_in',
    citizenName: 'Vikram Malhotra',
    citizenPhone: '+91 98110 33215',
    type: 'Building Collapse',
    description: 'Catastrophic collapse of a 3-story aged heritage masonry building and shared load-bearing boundary wall following 3 days of torrential rain. Rubble crushed 2 street vendor stalls and a ground-floor retail dispensary. Voices of at least 6 people heard calling out from beneath collapsed timber rafters and brick debris.',
    affectedPeople: 14,
    isAnyoneInjured: true,
    isAnyoneTrapped: true,
    isImmediateDanger: true,
    severity: 'HIGH',
    severityScore: 88,
    severityFactors: [
      'Unstable masonry slabs threatening secondary collapse on responders',
      'Confined live survivors trapped under heavy brickwork and timber debris',
      'Extremely narrow congested lanes restricting large rescue vehicle access'
    ],
    aiAssessment: {
      priorityScore: 88,
      priorityLevel: 'HIGH',
      reasoning: 'Urban Search and Rescue (USAR) operation requiring acoustic sound locators, canine sniffer teams, and manual debris breaching.',
      riskFactors: ['Crush syndrome upon extrication', 'Asphyxiation in void pockets', 'Secondary wall destabilization'],
      peopleAtRisk: 14,
      suggestedTeams: ['K9 Canine Disaster Detection & Rescue Force', 'Urban Search & Rescue (USAR Corps)'],
      suggestedResources: ['Trauma & Paramedic Advanced First Aid Packs', 'Mobile High-Capacity Clean Drinking Water Units'],
      recommendedActions: ['Deploy K9 sniffer units to pin down survivor void locations', 'Erect pneumatic shoring struts to secure adjoining heritage walls', 'Prepare IV alkaline fluid resuscitation for crush injury patients before lifting heavy beams'],
      safetyPrecautions: ['Silence heavy machinery periodically to listen for victim tapping', 'Do not walk on unsupported cantilevered rubble piles'],
      modelUsed: 'gemini-2.5-flash (USAR Triage Engine)',
      timestamp: new Date().toISOString(),
      status: 'completed'
    },
    verifiedByAdmin: true,
    verifiedAt: serverTimestamp(),
    verifiedByUid: 'commander@resq360.ops',
    verifiedByName: 'Command Supervisor Aryan Mehta',
    latitude: 28.6433,
    longitude: 77.2405,
    locationAddress: 'Ansari Road, Daryaganj, Old Delhi, New Delhi 110002',
    locationAccuracy: 10,
    status: 'en_route',
    assignedTeamId: 'team-k9-search',
    assignedTeamName: 'K9 Canine Disaster Detection & Rescue Force',
    assignedResponderId: 'resp-sunil-04',
    assignedResponderName: 'Lead Specialist Sunil Rao',
    assignedResponderTeam: 'Urban Search & Rescue (USAR)',
    isGuestReport: false,
    isDemo: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  },
  {
    id: 'demo-inc-vizag-06',
    incidentId: 'RESQ-IN-2006',
    citizenId: 'citizen-lakshmi_devi_inresq_in',
    citizenName: 'Lakshmi Devi',
    citizenPhone: '+91 98481 66520',
    type: 'Cyclone / Storm',
    description: 'Severe cyclonic storm winds and tidal surge caused landslide mudslide along Kailasagiri foothills into MVP Colony Sector 4. Uprooted giant banyan trees crushed electric transformers, blocking main arterial emergency access road. 25 homes surrounded by debris and deep mudflow.',
    affectedPeople: 30,
    isAnyoneInjured: false,
    isAnyoneTrapped: true,
    isImmediateDanger: false,
    severity: 'MEDIUM',
    severityScore: 68,
    severityFactors: [
      'Arterial coastal road completely blocked by landslide sludge and downed trees',
      'Electrical grid outage with severed high-tension power lines lying across mud',
      'Isolated residential pockets without clean potable drinking water'
    ],
    aiAssessment: {
      priorityScore: 68,
      priorityLevel: 'MEDIUM',
      reasoning: 'Post-cyclone access obstruction with trapped residents in low-lying sector. Heavy earthmoving and road clearance prioritized.',
      riskFactors: ['Electrocution from downed cables', 'Waterborne disease outbreaks', 'Secondary mudslides if rain continues'],
      peopleAtRisk: 30,
      suggestedTeams: ['Disaster Response Unit 01 (Flood Battalion)', 'Urban Search & Rescue (USAR Corps)'],
      suggestedResources: ['Mobile High-Capacity Clean Drinking Water Units', 'High-Calorie Ready-to-Eat Relief Food Rations'],
      recommendedActions: ['Dispatch front-end wheel loaders and power chainsaws', 'Deliver mobile drinking water purification trailer to Sector 4 Community Center'],
      safetyPrecautions: ['Treat all downed wires as live until power utility verifies isolation', 'Avoid hillside slope edges'],
      modelUsed: 'gemini-2.5-flash (Disaster Clearance)',
      timestamp: new Date().toISOString(),
      status: 'completed'
    },
    verifiedByAdmin: true,
    verifiedAt: serverTimestamp(),
    verifiedByUid: 'commander@resq360.ops',
    verifiedByName: 'Command Supervisor Aryan Mehta',
    latitude: 17.7423,
    longitude: 83.3325,
    locationAddress: 'Sector 4, MVP Colony, Visakhapatnam, Andhra Pradesh 530017',
    locationAccuracy: 12,
    status: 'en_route',
    assignedTeamId: 'team-disaster-01',
    assignedTeamName: 'Disaster Response Unit 01 (Flood Battalion)',
    assignedResponderId: 'resp-rajesh-01',
    assignedResponderName: 'Officer Rajesh Varma',
    assignedResponderTeam: 'Hydrological & Cyclone Rescue',
    isGuestReport: false,
    isDemo: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  }
];

export async function ensureIndiaBaselineData(): Promise<void> {
  try {
    // 1. Independently check and seed Response Teams if empty
    try {
      const teamsSnap = await getDocs(query(collection(db, 'teams'), limit(1)));
      if (teamsSnap.empty) {
        console.log('[RESQ360] Seeding Response Teams baseline...');
        for (const t of INDIA_TEAMS) {
          await setDoc(doc(db, 'teams', t.id), {
            ...t,
            updatedAt: serverTimestamp()
          }, { merge: true });
        }
      }
    } catch (teamErr) {
      console.warn('Teams auto-seed notice:', teamErr);
    }

    // 2. Independently check and seed Responders if empty
    try {
      const respSnap = await getDocs(query(collection(db, 'responders'), limit(1)));
      if (respSnap.empty) {
        console.log('[RESQ360] Seeding Responders baseline...');
        for (const r of INDIA_RESPONDERS) {
          await setDoc(doc(db, 'responders', r.responderId), r, { merge: true });
          await setDoc(doc(db, 'profiles', r.responderId), {
            uid: r.responderId,
            role: 'responder',
            name: r.name,
            email: r.email,
            phone: r.phone,
            badgeNumber: r.badgeNumber,
            teamType: r.teamType,
            responderProfileId: r.responderId,
            active: true,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            lastActiveAt: serverTimestamp()
          }, { merge: true });
        }
      }
    } catch (respErr) {
      console.warn('Responders auto-seed notice:', respErr);
    }

    // 3. Independently check and seed Equipment & Logistics Resources if empty
    try {
      const resSnap = await getDocs(query(collection(db, 'resources'), limit(1)));
      if (resSnap.empty) {
        console.log('[RESQ360] Seeding Equipment & Stock baseline...');
        for (const res of INDIA_RESOURCES) {
          await setDoc(doc(db, 'resources', res.id), {
            ...res,
            updatedAt: serverTimestamp()
          }, { merge: true });
        }
      }
    } catch (resErr) {
      console.warn('Resources auto-seed notice:', resErr);
    }

    // 4. Independently check and seed Citizens Profiles if needed
    try {
      const profileCheck = await getDoc(doc(db, 'profiles', 'citizen-rahul_sharma_inresq_in'));
      if (!profileCheck.exists()) {
        for (const c of INDIA_CITIZEN_PROFILES) {
          await setDoc(doc(db, 'profiles', c.uid), {
            ...c,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            lastActiveAt: serverTimestamp()
          }, { merge: true });
        }
      }
    } catch (profErr) {
      console.warn('Citizen profiles auto-seed notice:', profErr);
    }

    // 5. Independently check and seed Incidents if empty
    try {
      const incSnap = await getDocs(query(collection(db, 'incidents'), limit(1)));
      if (incSnap.empty) {
        console.log('[RESQ360] Seeding Incidents baseline...');
        for (const inc of INDIA_INCIDENTS) {
          await setDoc(doc(db, 'incidents', inc.id), inc, { merge: true });

          const historyRef = collection(db, 'incidents', inc.id, 'statusHistory');
          await setDoc(doc(historyRef), {
            status: 'reported',
            timestamp: serverTimestamp(),
            updatedByUid: inc.citizenId,
            updatedByName: inc.citizenName,
            updatedByRole: 'citizen',
            note: `Distress emergency reported from ${inc.locationAddress}.`
          });

          await setDoc(doc(historyRef), {
            status: 'ai_analyzed',
            timestamp: serverTimestamp(),
            updatedByUid: 'system_ai',
            updatedByName: 'AI Triage Engine (Gemini 2.5 Flash)',
            updatedByRole: 'system',
            note: `Triaged as ${inc.severity} priority (Severity score: ${inc.severityScore}/100). Recommended unit: ${inc.aiAssessment?.suggestedTeams?.[0] || 'Emergency Response'}.`
          });

          if (inc.status === 'verified' || inc.status === 'assigned' || inc.status === 'en_route') {
            await setDoc(doc(historyRef), {
              status: 'verified',
              timestamp: serverTimestamp(),
              updatedByUid: inc.verifiedByUid,
              updatedByName: inc.verifiedByName,
              updatedByRole: 'admin',
              note: 'Central Command verified incident distress report.'
            });
          }

          if (inc.status === 'assigned' || inc.status === 'en_route') {
            await setDoc(doc(historyRef), {
              status: 'assigned',
              timestamp: serverTimestamp(),
              updatedByUid: inc.verifiedByUid,
              updatedByName: inc.verifiedByName,
              updatedByRole: 'admin',
              note: `Incident assigned to ${inc.assignedTeamName}.`
            });
          }

          if (inc.status === 'en_route') {
            await setDoc(doc(historyRef), {
              status: 'en_route',
              timestamp: serverTimestamp(),
              updatedByUid: inc.assignedResponderId,
              updatedByName: inc.assignedResponderName,
              updatedByRole: 'responder',
              note: `${inc.assignedResponderName} (${inc.assignedResponderTeam}) dispatched and en route with emergency apparatus.`
            });
          }
        }
      }
    } catch (incErr) {
      console.warn('Incidents auto-seed notice:', incErr);
    }
  } catch (err) {
    console.warn('Initial India baseline auto-seed notice (may already exist or offline):', err);
  }
}

export async function resetOperationalBaseline(adminUser: UserProfile): Promise<void> {
  try {
    // 1. Clear previous demo incidents
    const incSnap = await getDocs(query(collection(db, 'incidents'), where('isDemo', '==', true)));
    for (const d of incSnap.docs) {
      await deleteDoc(d.ref);
    }

    // 2. Clear previous demo teams
    const teamSnap = await getDocs(query(collection(db, 'teams'), where('isDemo', '==', true)));
    for (const d of teamSnap.docs) {
      await deleteDoc(d.ref);
    }

    // 3. Clear previous demo responders
    const respSnap = await getDocs(query(collection(db, 'responders'), where('isDemo', '==', true)));
    for (const d of respSnap.docs) {
      await deleteDoc(d.ref);
    }

    // 4. Clear previous demo resources
    const resSnap = await getDocs(query(collection(db, 'resources'), where('isDemo', '==', true)));
    for (const d of resSnap.docs) {
      await deleteDoc(d.ref);
    }

    // 5. Seed Indian citizen profiles
    for (const c of INDIA_CITIZEN_PROFILES) {
      await setDoc(doc(db, 'profiles', c.uid), {
        ...c,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        lastActiveAt: serverTimestamp()
      }, { merge: true });
    }

    // 6. Seed Teams
    for (const t of INDIA_TEAMS) {
      await setDoc(doc(db, 'teams', t.id), {
        ...t,
        updatedAt: serverTimestamp()
      });
    }

    // 7. Seed Responders
    for (const r of INDIA_RESPONDERS) {
      await setDoc(doc(db, 'responders', r.responderId), r);
      await setDoc(doc(db, 'profiles', r.responderId), {
        uid: r.responderId,
        role: 'responder',
        name: r.name,
        email: r.email,
        phone: r.phone,
        badgeNumber: r.badgeNumber,
        teamType: r.teamType,
        responderProfileId: r.responderId,
        active: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        lastActiveAt: serverTimestamp()
      }, { merge: true });
    }

    // 8. Seed Resources
    for (const res of INDIA_RESOURCES) {
      await setDoc(doc(db, 'resources', res.id), {
        ...res,
        updatedAt: serverTimestamp()
      });
    }

    // 9. Seed Incidents
    for (const inc of INDIA_INCIDENTS) {
      await setDoc(doc(db, 'incidents', inc.id), inc);

      // Add status history
      const historyRef = collection(db, 'incidents', inc.id, 'statusHistory');
      await setDoc(doc(historyRef), {
        status: 'reported',
        timestamp: serverTimestamp(),
        updatedByUid: inc.citizenId,
        updatedByName: inc.citizenName,
        updatedByRole: 'citizen',
        note: `Emergency distress reported by ${inc.citizenName} from ${inc.locationAddress}.`
      });

      await setDoc(doc(historyRef), {
        status: 'ai_analyzed',
        timestamp: serverTimestamp(),
        updatedByUid: 'system_ai',
        updatedByName: 'AI Triage Engine (Gemini 2.5 Flash)',
        updatedByRole: 'system',
        note: `Triaged as ${inc.severity} priority (${inc.severityScore}/100 severity index).`
      });

      if (inc.status === 'verified' || inc.status === 'assigned' || inc.status === 'en_route') {
        await setDoc(doc(historyRef), {
          status: 'verified',
          timestamp: serverTimestamp(),
          updatedByUid: adminUser.uid,
          updatedByName: adminUser.name,
          updatedByRole: 'admin',
          note: 'Emergency confirmed and authorized for tactical dispatch.'
        });
      }

      if (inc.status === 'assigned' || inc.status === 'en_route') {
        await setDoc(doc(historyRef), {
          status: 'assigned',
          timestamp: serverTimestamp(),
          updatedByUid: adminUser.uid,
          updatedByName: adminUser.name,
          updatedByRole: 'admin',
          note: `Assigned to ${inc.assignedTeamName}.`
        });
      }

      if (inc.status === 'en_route') {
        await setDoc(doc(historyRef), {
          status: 'en_route',
          timestamp: serverTimestamp(),
          updatedByUid: inc.assignedResponderId,
          updatedByName: inc.assignedResponderName,
          updatedByRole: 'responder',
          note: `${inc.assignedResponderName} en route with specialized emergency apparatus.`
        });
      }
    }

    // 10. Audit Log
    await recordAuditLog({
      actorId: adminUser.uid,
      actorName: adminUser.name,
      actorRole: 'admin',
      action: 'RESET_DEMO_DATA',
      targetType: 'system',
      targetId: 'baseline',
      details: 'Operational baseline reset executed. Seeded 6 verified Indian city emergencies, 8 tactical response teams, 8 field responders, 6 citizen profiles, and emergency logistics inventory.'
    });

    await createSystemNotification({
      title: 'Operational Baseline Restored',
      message: 'System dataset synchronized with real Indian complaints (Mumbai, Ahmedabad, Chennai, Kolkata, Delhi, Vizag), response teams, and field personnel.',
      type: 'success',
      role: 'admin'
    });

  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'demoData/reset');
    throw error;
  }
}
