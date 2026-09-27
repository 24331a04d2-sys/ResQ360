import {
  collection,
  doc,
  setDoc,
  getDocs,
  deleteDoc,
  updateDoc,
  onSnapshot,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/firestoreErrors';
import { Team, TeamStatus, UserProfile } from '../types';
import { recordAuditLog } from './auditService';
import { INDIA_TEAMS } from './demoService';

export function subscribeToTeams(callback: (teams: Team[]) => void): () => void {
  const path = 'teams';
  return onSnapshot(collection(db, path), (snapshot) => {
    if (snapshot.empty) {
      // Immediate resilient fallback so section is never blank
      const baseline = INDIA_TEAMS.map(t => ({ ...t, updatedAt: new Date() }));
      callback(baseline);
      // Asynchronously populate Firestore
      INDIA_TEAMS.forEach(async (team) => {
        try {
          await setDoc(doc(db, 'teams', team.id), { ...team, updatedAt: serverTimestamp() }, { merge: true });
        } catch (_) {}
      });
      return;
    }
    const list: Team[] = [];
    snapshot.forEach((doc) => {
      list.push(doc.data() as Team);
    });
    list.sort((a, b) => a.name.localeCompare(b.name));
    callback(list);
  }, (error) => {
    // If error, provide baseline so UI never fails
    callback(INDIA_TEAMS.map(t => ({ ...t, updatedAt: new Date() })));
    handleFirestoreError(error, OperationType.LIST, path);
  });
}

export async function deleteTeam(
  teamId: string,
  adminUser?: UserProfile
): Promise<void> {
  const path = `teams/${teamId}`;
  try {
    await deleteDoc(doc(db, 'teams', teamId));
    if (adminUser) {
      await recordAuditLog({
        actorId: adminUser.uid,
        actorName: adminUser.name,
        actorRole: 'admin',
        action: 'TEAM_DELETED',
        targetType: 'team',
        targetId: teamId,
        details: `Disbanded response team ${teamId}.`
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
    throw error;
  }
}

export async function updateTeamStatus(
  teamId: string,
  status: TeamStatus,
  incidentId?: string | null,
  incidentCode?: string | null,
  adminUser?: UserProfile
): Promise<void> {
  const path = `teams/${teamId}`;
  try {
    const ref = doc(db, 'teams', teamId);
    await updateDoc(ref, {
      status,
      currentIncidentId: incidentId || null,
      currentIncidentCode: incidentCode || null,
      updatedAt: serverTimestamp()
    });

    if (adminUser) {
      await recordAuditLog({
        actorId: adminUser.uid,
        actorName: adminUser.name,
        actorRole: 'admin',
        action: 'TEAM_STATUS_UPDATED',
        targetType: 'team',
        targetId: teamId,
        details: `Team status set to ${status}. Assigned to: ${incidentCode || 'None'}.`
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function createTeam(
  teamData: Omit<Team, 'id' | 'updatedAt'>,
  adminUser?: UserProfile
): Promise<Team> {
  const teamRef = doc(collection(db, 'teams'));
  const id = teamRef.id;
  const newTeam: Team = {
    ...teamData,
    id,
    updatedAt: serverTimestamp()
  };

  try {
    await setDoc(teamRef, newTeam);
    if (adminUser) {
      await recordAuditLog({
        actorId: adminUser.uid,
        actorName: adminUser.name,
        actorRole: 'admin',
        action: 'TEAM_CREATED',
        targetType: 'team',
        targetId: id,
        details: `Created team: ${newTeam.name} (${newTeam.type}).`
      });
    }
    return newTeam;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `teams/${id}`);
    throw error;
  }
}
