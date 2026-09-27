import {
  collection,
  doc,
  setDoc,
  query,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/firestoreErrors';
import { AuditLogEntry } from '../types';

export async function recordAuditLog(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): Promise<void> {
  const path = 'auditLogs';
  try {
    const logRef = doc(collection(db, 'auditLogs'));
    await setDoc(logRef, {
      ...entry,
      id: logRef.id,
      timestamp: serverTimestamp()
    });
  } catch (error) {
    console.warn('Failed to record audit log:', error);
  }
}

export function subscribeToAuditLogs(callback: (logs: AuditLogEntry[]) => void): () => void {
  const path = 'auditLogs';
  const q = query(collection(db, path), orderBy('timestamp', 'desc'), limit(100));

  return onSnapshot(q, (snapshot) => {
    const list: AuditLogEntry[] = [];
    snapshot.forEach((doc) => {
      list.push({ id: doc.id, ...(doc.data() as any) });
    });
    callback(list);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, path);
  });
}

export function exportIncidentsToCsv(incidents: any[]): void {
  const headers = ['Incident ID', 'Type', 'Severity', 'Score', 'Status', 'Reporter', 'Phone', 'Location', 'Affected', 'Injured', 'Trapped', 'Assigned Team', 'Assigned Responder', 'Reported At', 'Resolved At'];
  
  const rows = incidents.map(inc => [
    inc.incidentId || '',
    inc.type || '',
    inc.severity || '',
    inc.severityScore || '',
    inc.status || '',
    inc.citizenName || '',
    inc.citizenPhone || '',
    `"${(inc.locationAddress || '').replace(/"/g, '""')}"`,
    inc.affectedPeople || 0,
    inc.isAnyoneInjured ? 'Yes' : 'No',
    inc.isAnyoneTrapped ? 'Yes' : 'No',
    inc.assignedTeamName || '',
    inc.assignedResponderName || '',
    inc.createdAt?.toDate ? inc.createdAt.toDate().toISOString() : '',
    inc.resolvedAt?.toDate ? inc.resolvedAt.toDate().toISOString() : ''
  ]);

  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `RESQ360_Incidents_Export_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
