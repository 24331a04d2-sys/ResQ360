import { EmergencyType, SeverityLevel, AiAssessment } from '../types';

export interface IncidentTriageInput {
  type: EmergencyType;
  description: string;
  affectedPeople: number;
  isAnyoneInjured: boolean;
  isAnyoneTrapped: boolean;
  isImmediateDanger: boolean;
  locationAddress?: string;
}

export function runDeterministicTriage(input: IncidentTriageInput): AiAssessment {
  let score = 20; // baseline
  const factors: string[] = [];
  const suggestedTeams: string[] = [];
  const suggestedResources: string[] = [];
  const recommendedActions: string[] = [];
  const safetyPrecautions: string[] = [];

  // Category Weights
  switch (input.type) {
    case 'Fire Outbreak':
      score += 35;
      factors.push('Active fire hazard with rapid spread potential');
      suggestedTeams.push('Fire & Rescue Unit 01');
      suggestedResources.push('Rescue Vehicles', 'Fire Suppression Foam');
      safetyPrecautions.push('Evacuate upwind of smoke plume', 'Do not use elevators', 'Stay low under smoke');
      recommendedActions.push('Dispatch nearest Fire Battalion', 'Notify regional water utility for hydrant pressure');
      break;

    case 'Building Collapse':
    case 'Earthquake Impact':
      score += 40;
      factors.push('Structural failure hazard with trapped victim probability');
      suggestedTeams.push('Search & Rescue Unit 01', 'Medical Unit 01');
      suggestedResources.push('Rescue Vehicles', 'Heavy Lifting Gear', 'Trauma & Medical Kits');
      safetyPrecautions.push('Keep clear of compromised perimeters', 'Watch for live electrical cables');
      recommendedActions.push('Mobilize structural collapse USAR team', 'Establish secondary collapse observation zone');
      break;

    case 'Flood & Inundation':
    case 'Cyclone / Storm':
      score += 30;
      factors.push('Hydrological disaster with rising water and displacement');
      suggestedTeams.push('Disaster Response Unit 01');
      suggestedResources.push('Inflatable Rescue Boats', 'Clean Drinking Water Units', 'Emergency Shelter Capacity');
      safetyPrecautions.push('Move to higher ground immediately', 'Avoid walking or driving through moving water');
      recommendedActions.push('Deploy inflatable watercraft', 'Coordinate high-ground evacuation shelter routing');
      break;

    case 'Medical Emergency':
      score += 30;
      factors.push('Critical health event requiring vital stabilization');
      suggestedTeams.push('Medical Unit 01');
      suggestedResources.push('Ambulances', 'Trauma & Medical Kits', 'Defibrillator Unit');
      safetyPrecautions.push('Ensure airway is clear if trained', 'Do not move neck/spine if trauma suspected');
      recommendedActions.push('Dispatch ALS (Advanced Life Support) ambulance', 'Pre-alert trauma reception bay');
      break;

    case 'Vehicle Accident':
      score += 25;
      factors.push('Road traffic incident with collision trauma risk');
      suggestedTeams.push('Medical Unit 01', 'Fire & Rescue Unit 01');
      suggestedResources.push('Ambulances', 'Hydraulic Extrication Tools');
      safetyPrecautions.push('Turn off engine ignitions', 'Set emergency hazard flares/reflectors');
      recommendedActions.push('Dispatch extrication tender and paramedic crew');
      break;

    case 'Landslide / Mudflow':
      score += 35;
      factors.push('Mass ground movement and road obstruction');
      suggestedTeams.push('Disaster Response Unit 01', 'Search & Rescue Unit 01');
      suggestedResources.push('Rescue Vehicles', 'Earthmoving Clearing Equipment');
      safetyPrecautions.push('Evacuate path of slope debris', 'Monitor for sudden creek swelling or mud surges');
      recommendedActions.push('Halt traffic along transit artery', 'Deploy canine/acoustic detection units');
      break;

    case 'Hazardous Chemical':
      score += 35;
      factors.push('Toxic vapor or caustic exposure threat');
      suggestedTeams.push('Fire & Rescue Unit 01');
      suggestedResources.push('Hazmat Containment Suits', 'Atmospheric Gas Monitors');
      safetyPrecautions.push('Isolate perimeter minimum 300 meters', 'Avoid breathing vapors or touching liquid');
      recommendedActions.push('Identify UN chemical number', 'Establish hot/warm/cold decontamination corridors');
      break;

    case 'Missing Person':
      score += 20;
      factors.push('Vulnerable individual unaccounted for');
      suggestedTeams.push('Search & Rescue Unit 01');
      suggestedResources.push('Thermal Vision Drones', 'Search & Rescue Unit 01');
      safetyPrecautions.push('Preserve scent articles at last known location', 'Verify recent phone cell pings');
      recommendedActions.push('Establish search baseline sector', 'Broadcast alert to perimeter patrol units');
      break;

    case 'Water Contamination':
      score += 20;
      factors.push('Public health environmental hazard');
      suggestedTeams.push('Disaster Response Unit 01');
      suggestedResources.push('Clean Drinking Water Units', 'Water Quality Test Kits');
      safetyPrecautions.push('Do not consume tap water', 'Distribute bottled supply to infants and elderly');
      recommendedActions.push('Shut downstream water mains', 'Deploy mobile water purification bowsers');
      break;

    default:
      score += 15;
      factors.push('Unclassified municipal emergency requiring evaluation');
      suggestedTeams.push('Disaster Response Unit 01');
      suggestedResources.push('Rescue Vehicles');
      safetyPrecautions.push('Remain at safe distance', 'Maintain open phone line for dispatcher');
      recommendedActions.push('Dispatch field patrol for visual reconnaissance');
      break;
  }

  // Critical Life-Safety Multipliers
  if (input.isImmediateDanger) {
    score += 25;
    factors.push('Caller reported immediate life-threatening danger');
  }

  if (input.isAnyoneTrapped) {
    score += 25;
    factors.push('Victims confirmed trapped within hazard zone');
    if (!suggestedTeams.includes('Search & Rescue Unit 01')) {
      suggestedTeams.unshift('Search & Rescue Unit 01');
    }
  }

  if (input.isAnyoneInjured) {
    score += 20;
    factors.push('Physical casualties requiring paramedic stabilization');
    if (!suggestedTeams.includes('Medical Unit 01')) {
      suggestedTeams.unshift('Medical Unit 01');
    }
    if (!suggestedResources.includes('Ambulances')) {
      suggestedResources.unshift('Ambulances');
    }
  }

  // Scale by affected population
  if (input.affectedPeople >= 50) {
    score += 25;
    factors.push(`Mass casualty scale: estimated ${input.affectedPeople}+ affected`);
  } else if (input.affectedPeople >= 10) {
    score += 15;
    factors.push(`Multi-person incident: ${input.affectedPeople} persons exposed`);
  } else if (input.affectedPeople > 2) {
    score += 5;
    factors.push(`Multiple individuals involved: ${input.affectedPeople} persons`);
  }

  // Textual Keyword Scanning in Description
  const lowerDesc = (input.description || '').toLowerCase();
  const criticalTerms = ['unconscious', 'severe bleeding', 'explosion', 'electric shock', 'child', 'infant', 'drowning', 'cardiac', 'burning'];
  for (const term of criticalTerms) {
    if (lowerDesc.includes(term)) {
      score += 10;
      factors.push(`Critical keyword detected: "${term}"`);
      break;
    }
  }

  // Clamp score
  const finalScore = Math.min(100, Math.max(10, score));

  // Determine Priority Level
  let level: SeverityLevel = 'LOW';
  if (finalScore >= 75) {
    level = 'CRITICAL';
  } else if (finalScore >= 50) {
    level = 'HIGH';
  } else if (finalScore >= 25) {
    level = 'MEDIUM';
  }

  // Fill default fallbacks if empty
  if (recommendedActions.length === 0) {
    recommendedActions.push('Verify incident coordinates and contact reporter', 'Stage first responders at staging area');
  }
  if (safetyPrecautions.length === 0) {
    safetyPrecautions.push('Keep clear of hazards', 'Keep phone line open for dispatch verification');
  }

  return {
    priorityScore: finalScore,
    priorityLevel: level,
    reasoning: `Rule-based triage calculated a priority score of ${finalScore}/100 for ${input.type}. Assessment triggered ${factors.length} life-safety indicators.`,
    riskFactors: factors,
    peopleAtRisk: Math.max(1, input.affectedPeople || 1),
    suggestedTeams: Array.from(new Set(suggestedTeams)),
    suggestedResources: Array.from(new Set(suggestedResources)),
    recommendedActions,
    safetyPrecautions,
    modelUsed: 'Deterministic Triage Engine v2.4 (Safety Baseline)',
    timestamp: new Date().toISOString(),
    status: 'fallback'
  };
}
