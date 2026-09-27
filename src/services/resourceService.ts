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
import { EmergencyResource, ResourceStatus, UserProfile } from '../types';
import { recordAuditLog } from './auditService';
import { INDIA_RESOURCES } from './demoService';

export function subscribeToResources(callback: (resources: EmergencyResource[]) => void): () => void {
  const path = 'resources';
  return onSnapshot(collection(db, path), (snapshot) => {
    if (snapshot.empty) {
      // Immediate resilient fallback so section is never blank
      const baseline = INDIA_RESOURCES.map(r => ({ ...r, updatedAt: new Date() }));
      callback(baseline);
      // Asynchronously populate Firestore
      INDIA_RESOURCES.forEach(async (res) => {
        try {
          await setDoc(doc(db, 'resources', res.id), { ...res, updatedAt: serverTimestamp() }, { merge: true });
        } catch (_) {}
      });
      return;
    }
    const list: EmergencyResource[] = [];
    snapshot.forEach((doc) => {
      list.push(doc.data() as EmergencyResource);
    });
    list.sort((a, b) => a.name.localeCompare(b.name));
    callback(list);
  }, (error) => {
    // If error, provide baseline so UI never fails
    callback(INDIA_RESOURCES.map(r => ({ ...r, updatedAt: new Date() })));
    handleFirestoreError(error, OperationType.LIST, path);
  });
}

export async function createResource(
  resourceData: Omit<EmergencyResource, 'id' | 'updatedAt'>,
  adminUser?: UserProfile
): Promise<EmergencyResource> {
  const ref = doc(collection(db, 'resources'));
  const id = ref.id;
  const newResource: EmergencyResource = {
    ...resourceData,
    id,
    updatedAt: serverTimestamp()
  };

  try {
    await setDoc(ref, newResource);
    if (adminUser) {
      await recordAuditLog({
        actorId: adminUser.uid,
        actorName: adminUser.name,
        actorRole: 'admin',
        action: 'RESOURCE_CREATED',
        targetType: 'resource',
        targetId: id,
        details: `Enrolled equipment stock: ${newResource.name} (${newResource.category}). Total quantity=${newResource.totalQuantity} ${newResource.unit}.`
      });
    }
    return newResource;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `resources/${id}`);
    throw error;
  }
}

export async function deleteResource(
  resourceId: string,
  adminUser?: UserProfile
): Promise<void> {
  const path = `resources/${resourceId}`;
  try {
    await deleteDoc(doc(db, 'resources', resourceId));
    if (adminUser) {
      await recordAuditLog({
        actorId: adminUser.uid,
        actorName: adminUser.name,
        actorRole: 'admin',
        action: 'RESOURCE_DELETED',
        targetType: 'resource',
        targetId: resourceId,
        details: `Decommissioned emergency equipment resource ${resourceId}.`
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
    throw error;
  }
}

export async function updateResourceStock(
  resourceId: string,
  updates: {
    totalQuantity: number;
    allocatedQuantity: number;
  },
  adminUser: UserProfile
): Promise<void> {
  const path = `resources/${resourceId}`;

  // Validate non-negative
  const total = Math.max(0, Math.floor(updates.totalQuantity));
  const allocated = Math.max(0, Math.min(total, Math.floor(updates.allocatedQuantity)));
  const available = Math.max(0, total - allocated);

  // Status calculation
  let status: ResourceStatus = 'adequate';
  if (total > 0) {
    const ratio = available / total;
    if (ratio < 0.2 || available === 0) status = 'critical';
    else if (ratio < 0.4) status = 'low';
  } else {
    status = 'critical';
  }

  try {
    const ref = doc(db, 'resources', resourceId);
    await updateDoc(ref, {
      totalQuantity: total,
      allocatedQuantity: allocated,
      availableQuantity: available,
      status,
      updatedAt: serverTimestamp()
    });

    await recordAuditLog({
      actorId: adminUser.uid,
      actorName: adminUser.name,
      actorRole: 'admin',
      action: 'RESOURCE_STOCK_UPDATED',
      targetType: 'resource',
      targetId: resourceId,
      details: `Inventory adjusted: Total=${total}, Allocated=${allocated}, Available=${available}, Status=${status}.`
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}
