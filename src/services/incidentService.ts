import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  runTransaction,
  serverTimestamp
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/firestoreErrors';
import { sanitizeFirestore } from '../lib/sanitizeFirestore';
import { requestAiTriage } from './api';
import { recordAuditLog } from './auditService';
import { createSystemNotification } from './notificationService';
import {
  Incident,
  IncidentStatus,
  SeverityLevel,
  StatusHistoryItem,
  EmergencyType,
  UserProfile
} from '../types';

export interface CreateIncidentInput {
  citizenId?: string;
  citizenName?: string;
  citizenPhone?: string;
  type: EmergencyType;
  description: string;
  affectedPeople: number;
  isAnyoneInjured: boolean;
  isAnyoneTrapped: boolean;
  isImmediateDanger: boolean;
  latitude: number;
  longitude: number;
  locationAddress: string;
  locationAccuracy?: number;
  isGuestReport?: boolean;
}

// Atomic generation of human-readable incident code (e.g. RESQ-1047)
export async function getNextIncidentCode(): Promise<string> {
  const counterRef = doc(db, 'system', 'counters');
  try {
    const nextCode = await runTransaction(db, async (transaction) => {
      const counterDoc = await transaction.get(counterRef);
      let currentSeq = 1047;
      if (counterDoc.exists()) {
        const val = counterDoc.data()?.incidentSequence;
        if (typeof val === 'number') {
          currentSeq = val + 1;
        }
      }
      transaction.set(counterRef, {
        incidentSequence: currentSeq,
        updatedAt: serverTimestamp()
      }, { merge: true });
      return `RESQ-${currentSeq}`;
    });
    return nextCode;
  } catch (err) {
    console.warn('Counter transaction failed, using fallback sequence:', err);
    return `RESQ-${Math.floor(1000 + Math.random() * 9000)}`;
  }
}

// Upload incident evidence to Firebase Storage safely
export async function uploadIncidentPhoto(incidentCode: string, file: File): Promise<{ storagePath: string; downloadUrl: string } | null> {
  // Client-side validation: Max 5MB and standard image types
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('Photo must be smaller than 5 MB.');
  }
  const allowed = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowed.includes(file.type)) {
    throw new Error('Only JPEG, PNG, or WebP images are supported.');
  }

  try {
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `incidentEvidence/${incidentCode}/${Date.now()}_${sanitizedName}`;
    const storageRef = ref(storage, storagePath);

    await uploadBytes(storageRef, file, {
      contentType: file.type
    });

    const downloadUrl = await getDownloadURL(storageRef);
    return { storagePath, downloadUrl };
  } catch (error) {
    console.warn('Photo upload to Firebase Storage failed:', error);
    return null;
  }
}

// Create incident with atomic sequence, AI triage, status history, and notifications
export async function createIncident(
  input: CreateIncidentInput,
  photoFile?: File | null
): Promise<{ id: string; incidentId: string; incident: Incident; guestAccessToken?: string }> {
  const incidentDocRef = doc(collection(db, 'incidents'));
  const docId = incidentDocRef.id;
  const humanCode = await getNextIncidentCode();

  let photoStoragePath: string | undefined;
  let photoMetadata: any = undefined;

  if (photoFile) {
    try {
      const uploadResult = await uploadIncidentPhoto(humanCode, photoFile);
      if (uploadResult) {
        photoStoragePath = uploadResult.downloadUrl;
        photoMetadata = {
          storagePath: uploadResult.storagePath,
          size: photoFile.size,
          contentType: photoFile.type,
          uploadedAt: new Date().toISOString()
        };
      }
    } catch (err: any) {
      console.warn('Could not upload photo, continuing incident submission:', err?.message);
    }
  }

  // Generate opaque guest access token if guest
  const guestAccessToken = input.isGuestReport
    ? `${humanCode}-${Math.random().toString(36).substring(2, 10)}`
    : undefined;

  // Run AI triage (with guaranteed deterministic fallback if Gemini or network fails)
  const aiResult = await requestAiTriage({
    type: input.type,
    description: input.description,
    affectedPeople: input.affectedPeople,
    isAnyoneInjured: input.isAnyoneInjured,
    isAnyoneTrapped: input.isAnyoneTrapped,
    isImmediateDanger: input.isImmediateDanger,
    locationAddress: input.locationAddress
  });

  const incidentData: Incident = {
    id: docId,
    incidentId: humanCode,
    citizenId: input.citizenId || 'guest',
    citizenName: input.citizenName || (input.isGuestReport ? 'Guest Caller' : 'Citizen'),
    citizenPhone: input.citizenPhone || '',
    type: input.type,
    description: input.description,
    affectedPeople: input.affectedPeople,
    isAnyoneInjured: input.isAnyoneInjured,
    isAnyoneTrapped: input.isAnyoneTrapped,
    isImmediateDanger: input.isImmediateDanger,
    severity: aiResult.priorityLevel,
    severityScore: aiResult.priorityScore,
    severityFactors: aiResult.riskFactors || [],
    aiAssessment: aiResult,
    verifiedByAdmin: false,
    latitude: input.latitude,
    longitude: input.longitude,
    locationAddress: input.locationAddress,
    locationAccuracy: typeof input.locationAccuracy === 'number' ? input.locationAccuracy : null,
    photoStoragePath: photoStoragePath || null,
    photoMetadata: photoMetadata || null,
    status: 'ai_analyzed',
    isGuestReport: !!input.isGuestReport,
    guestAccessTokenHash: guestAccessToken || null,
    isDemo: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };

  try {
    await setDoc(incidentDocRef, sanitizeFirestore(incidentData));

    // Initial Status History Items
    const historyRef = collection(db, 'incidents', docId, 'statusHistory');

    await setDoc(doc(historyRef), {
      status: 'reported',
      timestamp: serverTimestamp(),
      updatedByUid: input.citizenId || 'guest',
      updatedByName: input.citizenName || 'Reporter',
      updatedByRole: input.isGuestReport ? 'guest' : 'citizen',
      note: 'Emergency distress call received by RESQ360 Dispatch.'
    });

    await setDoc(doc(historyRef), {
      status: 'ai_analyzed',
      timestamp: serverTimestamp(),
      updatedByUid: 'system_ai',
      updatedByName: 'AI Triage Engine',
      updatedByRole: 'system',
      note: `Triaged as ${aiResult.priorityLevel} priority (Score ${aiResult.priorityScore}/100). Recommended ${aiResult.suggestedTeams.join(', ') || 'Units'}.`
    });

    // Notify command operators
    await createSystemNotification({
      title: `Emergency Reported: ${humanCode} (${input.type})`,
      message: `Priority: ${aiResult.priorityLevel}. Location: ${input.locationAddress}. Casualties: ${input.isAnyoneInjured ? 'Yes' : 'No'}.`,
      type: aiResult.priorityLevel === 'CRITICAL' ? 'critical' : 'warning',
      role: 'admin',
      relatedIncidentId: docId,
      relatedIncidentCode: humanCode
    });

    // Audit log
    await recordAuditLog({
      actorId: input.citizenId || 'guest',
      actorName: input.citizenName || 'Reporter',
      actorRole: input.isGuestReport ? 'guest' : 'citizen',
      action: 'INCIDENT_CREATED',
      targetType: 'incident',
      targetId: docId,
      targetCode: humanCode,
      details: `${input.type} reported at ${input.locationAddress}. Initial priority: ${aiResult.priorityLevel}.`
    });

    return {
      id: docId,
      incidentId: humanCode,
      incident: incidentData,
      guestAccessToken
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `incidents/${docId}`);
    throw error;
  }
}

// Verify Incident by Admin
export async function verifyIncident(incidentId: string, adminUser: UserProfile): Promise<void> {
  const path = `incidents/${incidentId}`;
  try {
    const incRef = doc(db, 'incidents', incidentId);
    const snap = await getDoc(incRef);
    if (!snap.exists()) throw new Error('Incident not found');
    const inc = snap.data() as Incident;

    await updateDoc(incRef, {
      status: 'verified',
      verifiedByAdmin: true,
      verifiedAt: serverTimestamp(),
      verifiedByUid: adminUser.uid,
      verifiedByName: adminUser.name,
      updatedAt: serverTimestamp()
    });

    const historyRef = collection(db, 'incidents', incidentId, 'statusHistory');
    await setDoc(doc(historyRef), {
      status: 'verified',
      timestamp: serverTimestamp(),
      updatedByUid: adminUser.uid,
      updatedByName: adminUser.name,
      updatedByRole: 'admin',
      note: 'Verified by Emergency Dispatch Supervisor. Ready for team assignment.'
    });

    await recordAuditLog({
      actorId: adminUser.uid,
      actorName: adminUser.name,
      actorRole: 'admin',
      action: 'INCIDENT_VERIFIED',
      targetType: 'incident',
      targetId: incidentId,
      targetCode: inc.incidentId,
      previousValue: inc.status,
      newValue: 'verified',
      details: `Incident verified by ${adminUser.name}.`
    });

    await createSystemNotification({
      title: `Incident Verified: ${inc.incidentId}`,
      message: `Supervisor verified emergency. Awaiting unit dispatch.`,
      type: 'info',
      role: 'responder',
      relatedIncidentId: incidentId,
      relatedIncidentCode: inc.incidentId
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
    throw error;
  }
}

// Assign Incident to Team & Responder
export async function assignIncident(
  incidentId: string,
  assignment: {
    teamId?: string;
    teamName?: string;
    responderId?: string;
    responderName?: string;
    responderTeam?: string;
  },
  adminUser: UserProfile
): Promise<void> {
  const path = `incidents/${incidentId}`;
  try {
    const incRef = doc(db, 'incidents', incidentId);
    const snap = await getDoc(incRef);
    if (!snap.exists()) throw new Error('Incident not found');
    const inc = snap.data() as Incident;

    await updateDoc(incRef, {
      status: 'assigned',
      assignedTeamId: assignment.teamId || null,
      assignedTeamName: assignment.teamName || null,
      assignedResponderId: assignment.responderId || null,
      assignedResponderName: assignment.responderName || null,
      assignedResponderTeam: assignment.responderTeam || null,
      updatedAt: serverTimestamp()
    });

    // Update Team readiness status if assigned
    if (assignment.teamId) {
      const teamRef = doc(db, 'teams', assignment.teamId);
      await updateDoc(teamRef, {
        status: 'dispatched',
        currentIncidentId: incidentId,
        currentIncidentCode: inc.incidentId,
        updatedAt: serverTimestamp()
      }).catch((e) => console.warn('Team status update error:', e));
    }

    // Update Responder availability status if assigned
    if (assignment.responderId) {
      const responderRef = doc(db, 'responders', assignment.responderId);
      await updateDoc(responderRef, {
        availability: 'assigned',
        currentIncidentId: incidentId,
        currentIncidentCode: inc.incidentId,
        lastActiveAt: serverTimestamp()
      }).catch((e) => console.warn('Responder status update error:', e));
    }

    const historyRef = collection(db, 'incidents', incidentId, 'statusHistory');
    await setDoc(doc(historyRef), {
      status: 'assigned',
      timestamp: serverTimestamp(),
      updatedByUid: adminUser.uid,
      updatedByName: adminUser.name,
      updatedByRole: 'admin',
      note: `Assigned to ${assignment.teamName || 'Team'} ${assignment.responderName ? `(Responder: ${assignment.responderName})` : ''}.`
    });

    await recordAuditLog({
      actorId: adminUser.uid,
      actorName: adminUser.name,
      actorRole: 'admin',
      action: 'INCIDENT_ASSIGNED',
      targetType: 'incident',
      targetId: incidentId,
      targetCode: inc.incidentId,
      previousValue: inc.status,
      newValue: 'assigned',
      details: `Assigned to Team: ${assignment.teamName || 'None'}, Responder: ${assignment.responderName || 'None'}.`
    });

    if (assignment.responderId) {
      await createSystemNotification({
        userId: assignment.responderId,
        role: 'responder',
        title: `New Assignment: ${inc.incidentId} (${inc.type})`,
        message: `You have been deployed to ${inc.locationAddress}. Life hazard: ${inc.severity}.`,
        type: 'critical',
        relatedIncidentId: incidentId,
        relatedIncidentCode: inc.incidentId
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
    throw error;
  }
}

// Update incident progression (En Route, Arrived, Resolved, Cancelled, etc.)
export async function updateIncidentStatus(
  incidentId: string,
  newStatus: IncidentStatus,
  user: { uid: string; name: string; role: string },
  note?: string
): Promise<void> {
  const path = `incidents/${incidentId}`;
  try {
    const incRef = doc(db, 'incidents', incidentId);
    const snap = await getDoc(incRef);
    if (!snap.exists()) throw new Error('Incident not found');
    const inc = snap.data() as Incident;

    const updates: Partial<Incident> = {
      status: newStatus,
      updatedAt: serverTimestamp()
    };

    if (newStatus === 'resolved') {
      updates.resolvedAt = serverTimestamp();
    }

    await updateDoc(incRef, sanitizeFirestore(updates));

    // Synchronize responder & team availability based on status
    if (inc.assignedResponderId) {
      const respRef = doc(db, 'responders', inc.assignedResponderId);
      let newAvailability: any = null;
      if (newStatus === 'en_route') newAvailability = 'en_route';
      else if (newStatus === 'arrived') newAvailability = 'on_scene';
      else if (newStatus === 'resolved' || newStatus === 'cancelled') newAvailability = 'available';

      if (newAvailability) {
        await updateDoc(respRef, {
          availability: newAvailability,
          currentIncidentId: newStatus === 'resolved' || newStatus === 'cancelled' ? null : incidentId,
          currentIncidentCode: newStatus === 'resolved' || newStatus === 'cancelled' ? null : inc.incidentId,
          lastActiveAt: serverTimestamp()
        }).catch((e) => console.warn('Responder sync error:', e));
      }
    }

    if (inc.assignedTeamId && (newStatus === 'resolved' || newStatus === 'cancelled')) {
      const teamRef = doc(db, 'teams', inc.assignedTeamId);
      await updateDoc(teamRef, {
        status: 'available',
        currentIncidentId: null,
        currentIncidentCode: null,
        updatedAt: serverTimestamp()
      }).catch((e) => console.warn('Team sync error:', e));
    }

    const historyRef = collection(db, 'incidents', incidentId, 'statusHistory');
    await setDoc(doc(historyRef), {
      status: newStatus,
      timestamp: serverTimestamp(),
      updatedByUid: user.uid,
      updatedByName: user.name,
      updatedByRole: user.role,
      note: note || `Status progressed to ${newStatus.toUpperCase().replace('_', ' ')}.`
    });

    await recordAuditLog({
      actorId: user.uid,
      actorName: user.name,
      actorRole: user.role,
      action: 'INCIDENT_STATUS_CHANGED',
      targetType: 'incident',
      targetId: incidentId,
      targetCode: inc.incidentId,
      previousValue: inc.status,
      newValue: newStatus,
      details: note || `Status transitioned to ${newStatus}.`
    });

    // Notify citizen if registered
    if (inc.citizenId && inc.citizenId !== 'guest') {
      await createSystemNotification({
        userId: inc.citizenId,
        role: 'citizen',
        title: `Incident ${inc.incidentId} Update: ${newStatus.toUpperCase().replace('_', ' ')}`,
        message: `Field response status is now: ${newStatus.toUpperCase().replace('_', ' ')}.`,
        type: newStatus === 'resolved' ? 'success' : 'info',
        relatedIncidentId: incidentId,
        relatedIncidentCode: inc.incidentId
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
    throw error;
  }
}

// Re-Run AI Triage
export async function reRunAiTriage(incidentId: string, adminUser: UserProfile): Promise<Incident> {
  const path = `incidents/${incidentId}`;
  try {
    const incRef = doc(db, 'incidents', incidentId);
    const snap = await getDoc(incRef);
    if (!snap.exists()) throw new Error('Incident not found');
    const inc = snap.data() as Incident;

    const newAssessment = await requestAiTriage({
      type: inc.type,
      description: inc.description,
      affectedPeople: inc.affectedPeople,
      isAnyoneInjured: inc.isAnyoneInjured,
      isAnyoneTrapped: inc.isAnyoneTrapped,
      isImmediateDanger: inc.isImmediateDanger,
      locationAddress: inc.locationAddress
    });

    await updateDoc(incRef, {
      aiAssessment: newAssessment,
      severity: newAssessment.priorityLevel,
      severityScore: newAssessment.priorityScore,
      severityFactors: newAssessment.riskFactors,
      updatedAt: serverTimestamp()
    });

    await recordAuditLog({
      actorId: adminUser.uid,
      actorName: adminUser.name,
      actorRole: 'admin',
      action: 'AI_TRIAGE_RERUN',
      targetType: 'incident',
      targetId: incidentId,
      targetCode: inc.incidentId,
      details: `Re-ran AI Triage. New priority: ${newAssessment.priorityLevel} (Score: ${newAssessment.priorityScore}). Model: ${newAssessment.modelUsed}.`
    });

    return {
      ...inc,
      aiAssessment: newAssessment,
      severity: newAssessment.priorityLevel,
      severityScore: newAssessment.priorityScore,
      severityFactors: newAssessment.riskFactors
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
    throw error;
  }
}

// Realtime subscription for all incidents (Admin view)
export function subscribeToAllIncidents(callback: (incidents: Incident[]) => void): () => void {
  const q = query(collection(db, 'incidents'), orderBy('createdAt', 'desc'), limit(100));
  return onSnapshot(q, (snapshot) => {
    const list: Incident[] = [];
    snapshot.forEach((doc) => {
      list.push(doc.data() as Incident);
    });
    callback(list);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, 'incidents');
  });
}

// Realtime subscription for citizen's own incidents
export function subscribeToCitizenIncidents(citizenId: string, callback: (incidents: Incident[]) => void): () => void {
  const q = query(
    collection(db, 'incidents'),
    where('citizenId', '==', citizenId),
    limit(50)
  );
  return onSnapshot(q, (snapshot) => {
    const list: Incident[] = [];
    snapshot.forEach((doc) => {
      list.push(doc.data() as Incident);
    });
    // Sort client-side by date if composite index is pending
    list.sort((a, b) => {
      const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
      const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
      return timeB - timeA;
    });
    callback(list);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, `incidents?citizenId=${citizenId}`);
  });
}

// Realtime subscription for a single incident
export function subscribeToIncident(incidentId: string, callback: (incident: Incident | null) => void): () => void {
  return onSnapshot(doc(db, 'incidents', incidentId), (docSnap) => {
    if (!docSnap.exists()) {
      callback(null);
    } else {
      callback(docSnap.data() as Incident);
    }
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, `incidents/${incidentId}`);
  });
}

// Realtime subscription for status history
export function subscribeToStatusHistory(incidentId: string, callback: (history: StatusHistoryItem[]) => void): () => void {
  const q = collection(db, 'incidents', incidentId, 'statusHistory');
  return onSnapshot(q, (snapshot) => {
    const items: StatusHistoryItem[] = [];
    snapshot.forEach((doc) => {
      items.push({ id: doc.id, ...(doc.data() as any) });
    });
    items.sort((a, b) => {
      const timeA = a.timestamp?.toMillis ? a.timestamp.toMillis() : (a.timestamp ? new Date(a.timestamp).getTime() : 0);
      const timeB = b.timestamp?.toMillis ? b.timestamp.toMillis() : (b.timestamp ? new Date(b.timestamp).getTime() : 0);
      return timeA - timeB;
    });
    callback(items);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, `incidents/${incidentId}/statusHistory`);
  });
}

// Lookup incident by incidentCode (e.g. "RESQ-1047")
export async function findIncidentByCode(code: string): Promise<Incident | null> {
  const path = 'incidents';
  try {
    const q = query(collection(db, 'incidents'), where('incidentId', '==', code.trim().toUpperCase()), limit(1));
    const snap = await getDocs(q);
    if (snap.empty) return null;
    return snap.docs[0].data() as Incident;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return null;
  }
}
