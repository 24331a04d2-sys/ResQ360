import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  updateDoc,
  query,
  where,
  onSnapshot,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/firestoreErrors';
import { Responder, ResponderAvailability, UserProfile } from '../types';
import { recordAuditLog } from './auditService';
import { registerStaffCredentialLocally } from './authService';
import { INDIA_RESPONDERS } from './demoService';

export function subscribeToResponders(callback: (responders: Responder[]) => void): () => void {
  const path = 'responders';
  return onSnapshot(collection(db, path), (snapshot) => {
    if (snapshot.empty) {
      // Immediate resilient fallback so section is never blank
      const baseline = INDIA_RESPONDERS.map(r => ({ ...r, lastActiveAt: new Date() }));
      callback(baseline);
      // Asynchronously populate Firestore
      INDIA_RESPONDERS.forEach(async (r) => {
        try {
          await setDoc(doc(db, 'responders', r.responderId), r, { merge: true });
        } catch (_) {}
      });
      return;
    }
    const list: Responder[] = [];
    snapshot.forEach((doc) => {
      list.push(doc.data() as Responder);
    });
    list.sort((a, b) => a.name.localeCompare(b.name));
    callback(list);
  }, (error) => {
    // If error, provide baseline so UI never fails
    callback(INDIA_RESPONDERS.map(r => ({ ...r, lastActiveAt: new Date() })));
    handleFirestoreError(error, OperationType.LIST, path);
  });
}

export async function deleteResponder(
  responderId: string,
  adminUser?: UserProfile
): Promise<void> {
  const path = `responders/${responderId}`;
  try {
    await deleteDoc(doc(db, 'responders', responderId));
    try {
      await deleteDoc(doc(db, 'profiles', responderId));
    } catch (_) {}

    if (adminUser) {
      await recordAuditLog({
        actorId: adminUser.uid,
        actorName: adminUser.name,
        actorRole: 'admin',
        action: 'RESPONDER_DELETED',
        targetType: 'responder',
        targetId: responderId,
        details: `De-registered responder profile ${responderId}.`
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
    throw error;
  }
}

export async function getResponderByUserId(userId: string): Promise<Responder | null> {
  const path = 'responders';
  try {
    const q = query(collection(db, 'responders'), where('userId', '==', userId));
    const snap = await getDocs(q);
    if (snap.empty) return null;
    return snap.docs[0].data() as Responder;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return null;
  }
}

export async function updateResponderAvailability(
  responderId: string,
  availability: ResponderAvailability,
  incidentId?: string | null,
  incidentCode?: string | null
): Promise<void> {
  const path = `responders/${responderId}`;
  try {
    const ref = doc(db, 'responders', responderId);
    await updateDoc(ref, {
      availability,
      currentIncidentId: incidentId !== undefined ? incidentId : null,
      currentIncidentCode: incidentCode !== undefined ? incidentCode : null,
      lastActiveAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function registerResponder(
  input: {
    name: string;
    phone: string;
    email: string;
    badgeNumber: string;
    teamType: string;
    teamId?: string;
    password?: string;
  },
  adminUser: UserProfile
): Promise<Responder> {
  const cleanEmail = input.email.trim().toLowerCase();
  const responderId = `resp-${cleanEmail.replace(/[^a-zA-Z0-9]/g, '_')}`;
  const responderRef = doc(db, 'responders', responderId);
  const chosenPassword = input.password?.trim() || 'Responder#2026';

  const newResponder: Responder & { password?: string } = {
    responderId,
    userId: responderId, // Linked or synthetic user id
    name: input.name.trim(),
    phone: input.phone.trim(),
    email: cleanEmail,
    badgeNumber: input.badgeNumber.trim().toUpperCase(),
    teamType: input.teamType,
    teamId: input.teamId || null,
    availability: 'available',
    currentIncidentId: null,
    currentIncidentCode: null,
    lastActiveAt: serverTimestamp(),
    location: 'Central Dispatch Staging',
    password: chosenPassword,
    isDemo: false
  };

  try {
    await setDoc(responderRef, newResponder);

    // Also create matching profile in `profiles`
    const profileRef = doc(db, 'profiles', responderId);
    await setDoc(profileRef, {
      uid: responderId,
      role: 'responder',
      name: newResponder.name,
      email: newResponder.email,
      phone: newResponder.phone,
      badgeNumber: newResponder.badgeNumber,
      teamType: newResponder.teamType,
      responderProfileId: responderId,
      active: true,
      notificationPreferences: {
        criticalAlerts: true,
        statusUpdates: true,
        weatherAdvisories: true
      },
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastActiveAt: serverTimestamp()
    }, { merge: true });

    // Register into memory credential lookup
    registerStaffCredentialLocally({
      email: cleanEmail,
      password: chosenPassword,
      role: 'responder',
      name: newResponder.name,
      badgeId: newResponder.badgeNumber,
      agency: newResponder.teamType
    });

    await recordAuditLog({
      actorId: adminUser.uid,
      actorName: adminUser.name,
      actorRole: 'admin',
      action: 'RESPONDER_CREATED',
      targetType: 'responder',
      targetId: responderId,
      targetCode: newResponder.badgeNumber,
      details: `Registered field responder ${newResponder.name} with badge ${newResponder.badgeNumber} in ${newResponder.teamType}.`
    });

    return newResponder;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `responders/${responderId}`);
    throw error;
  }
}
