import {
  signInWithPopup,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut as firebaseSignOut,
  User
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp
} from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/firestoreErrors';
import { sanitizeFirestore } from '../lib/sanitizeFirestore';
import { UserProfile, UserRole } from '../types';

export interface SystemStaffCredential {
  email: string;
  password: string;
  role: UserRole;
  name: string;
  badgeId: string;
  agency: string;
}

export interface SystemCitizenCredential {
  email: string;
  password: string;
  name: string;
  city: string;
  state: string;
  phone: string;
  incidentCode: string;
  incidentTitle: string;
}

export const SYSTEM_STAFF_CREDENTIALS: SystemStaffCredential[] = [
  {
    email: 'commander@resq360.ops',
    password: 'Resq360Admin#2026',
    role: 'admin',
    name: 'Command Supervisor Aryan Mehta',
    badgeId: 'CMD-9021',
    agency: 'National Emergency Operations Command'
  },
  {
    email: 'admin@resq360.ops',
    password: 'AdminPassword#2026',
    role: 'admin',
    name: 'Chief Dispatcher Rajesh Varma',
    badgeId: 'OPS-1044',
    agency: 'Integrated Emergency Management HQ'
  },
  {
    email: 'responder@resq360.ops',
    password: 'Responder#2026',
    role: 'responder',
    name: 'Inspector Kavita Sharma',
    badgeId: 'NDRF-104',
    agency: 'Rapid Emergency Response Battalion 4'
  },
  {
    email: 'paramedic@resq360.ops',
    password: 'Medic#2026',
    role: 'responder',
    name: 'Dr. Anand Verma',
    badgeId: 'EMS-402',
    agency: 'Emergency Medical Services Unit'
  },
  {
    email: 'fire.chief@resq360.ops',
    password: 'Fire#2026',
    role: 'responder',
    name: 'Chief Fire Officer Vikram Rathore',
    badgeId: 'FIRE-509',
    agency: 'Structural Firefighting & Extrication Brigade'
  },
  {
    email: 'hazmat.lead@resq360.ops',
    password: 'Hazmat#2026',
    role: 'responder',
    name: 'Specialist Sunita Deshmukh',
    badgeId: 'HAZ-301',
    agency: 'Chemical & Hazmat Emergency Force'
  },
  {
    email: 'marine.rescue@resq360.ops',
    password: 'Marine#2026',
    role: 'responder',
    name: 'Sub-Inspector Rakesh Nair',
    badgeId: 'MAR-205',
    agency: 'Coastal Marine & Flood Rescue Battalion'
  },
  {
    email: 'usar.specialist@resq360.ops',
    password: 'Search#2026',
    role: 'responder',
    name: 'Lead Specialist Sunil Rao',
    badgeId: 'USAR-311',
    agency: 'Urban Search & Rescue (USAR) Corps'
  }
];

export const SYSTEM_CITIZEN_CREDENTIALS: SystemCitizenCredential[] = [
  {
    email: 'rahul.sharma@inresq.in',
    password: 'Citizen#2026',
    name: 'Rahul Sharma',
    city: 'Mumbai',
    state: 'Maharashtra',
    phone: '+91 98201 44521',
    incidentCode: 'RESQ-IN-2001',
    incidentTitle: 'Kurla West Monsoon Embankment Breach'
  },
  {
    email: 'priya.patel@inresq.in',
    password: 'Citizen#2026',
    name: 'Priya Patel',
    city: 'Ahmedabad',
    state: 'Gujarat',
    phone: '+91 98791 22340',
    incidentCode: 'RESQ-IN-2002',
    incidentTitle: 'Naroda Industrial Chemical Vapor Cloud'
  },
  {
    email: 'karthik.ramesh@inresq.in',
    password: 'Citizen#2026',
    name: 'Karthik Ramesh',
    city: 'Chennai',
    state: 'Tamil Nadu',
    phone: '+91 98402 77819',
    incidentCode: 'RESQ-IN-2003',
    incidentTitle: 'OMR Expressway Multi-Vehicle Collision'
  },
  {
    email: 'ananya.sen@inresq.in',
    password: 'Citizen#2026',
    name: 'Ananya Sen',
    city: 'Kolkata',
    state: 'West Bengal',
    phone: '+91 98310 99450',
    incidentCode: 'RESQ-IN-2004',
    incidentTitle: 'Sector V IT Commercial Tower Fire'
  },
  {
    email: 'vikram.malhotra@inresq.in',
    password: 'Citizen#2026',
    name: 'Vikram Malhotra',
    city: 'New Delhi',
    state: 'Delhi NCR',
    phone: '+91 98110 33215',
    incidentCode: 'RESQ-IN-2005',
    incidentTitle: 'Old Delhi Heritage Structural Wall Collapse'
  },
  {
    email: 'lakshmi.devi@inresq.in',
    password: 'Citizen#2026',
    name: 'Lakshmi Devi',
    city: 'Visakhapatnam',
    state: 'Andhra Pradesh',
    phone: '+91 98481 66520',
    incidentCode: 'RESQ-IN-2006',
    incidentTitle: 'MVP Coastal Flash Flood & Landslide'
  }
];

export function registerStaffCredentialLocally(cred: SystemStaffCredential) {
  const idx = SYSTEM_STAFF_CREDENTIALS.findIndex(c => c.email.toLowerCase() === cred.email.toLowerCase());
  if (idx >= 0) {
    SYSTEM_STAFF_CREDENTIALS[idx] = cred;
  } else {
    SYSTEM_STAFF_CREDENTIALS.push(cred);
  }
}

const ADMIN_BOOTSTRAP_EMAILS = [
  '24331a04d2@mvgrce.edu.in',
  'commander@resq360.ops',
  'admin@resq360.ops'
];

export async function loginWithGoogle(): Promise<UserProfile> {
  const provider = new GoogleAuthProvider();
  const userCredential = await signInWithPopup(auth, provider);
  return getOrCreateProfile(userCredential.user);
}

export async function loginWithEmail(email: string, pass: string): Promise<UserProfile> {
  const cleanEmail = email.trim();
  const lowerEmail = cleanEmail.toLowerCase();
  
  const systemStaffAccount = SYSTEM_STAFF_CREDENTIALS.find(
    (acc) => acc.email.toLowerCase() === lowerEmail
  );

  const systemCitizenAccount = SYSTEM_CITIZEN_CREDENTIALS.find(
    (acc) => acc.email.toLowerCase() === lowerEmail
  );

  try {
    const userCredential = await signInWithEmailAndPassword(auth, cleanEmail, pass);
    return await getOrCreateProfile(userCredential.user, systemStaffAccount?.role || (systemCitizenAccount ? 'citizen' : undefined), systemStaffAccount?.name || systemCitizenAccount?.name);
  } catch (err: any) {
    // 1. Handle Predefined Citizen Accounts
    if (systemCitizenAccount) {
      if (pass !== systemCitizenAccount.password) {
        throw new Error(`Invalid password for ${cleanEmail}. Please use the designated citizen password '${systemCitizenAccount.password}'.`);
      }

      const safeId = `citizen-${cleanEmail.replace(/[^a-zA-Z0-9]/g, '_')}`;
      const profileRef = doc(db, 'profiles', safeId);
      try {
        const snap = await getDoc(profileRef);
        if (snap.exists()) {
          const profile = snap.data() as UserProfile;
          localStorage.setItem('resq360_fallback_session', JSON.stringify({ uid: safeId, email: cleanEmail, role: 'citizen', name: profile.name }));
          return profile;
        }
      } catch (_) {}

      const newCitizenProfile: UserProfile = {
        uid: safeId,
        role: 'citizen',
        name: systemCitizenAccount.name,
        email: systemCitizenAccount.email,
        phone: systemCitizenAccount.phone,
        active: true,
        notificationPreferences: {
          criticalAlerts: true,
          statusUpdates: true,
          weatherAdvisories: true
        },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        lastActiveAt: serverTimestamp()
      };

      try {
        await setDoc(profileRef, sanitizeFirestore(newCitizenProfile), { merge: true });
      } catch (_) {}

      localStorage.setItem('resq360_fallback_session', JSON.stringify({ uid: safeId, email: cleanEmail, role: 'citizen', name: systemCitizenAccount.name }));
      return newCitizenProfile;
    }

    // 2. Handle Standard Staff & Admin Accounts
    if (systemStaffAccount) {
      if (systemStaffAccount.password !== pass) {
        throw new Error(`Invalid security key for ${cleanEmail}. Please use the designated staff password.`);
      }

      try {
        const userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, pass);
        return await getOrCreateProfile(userCredential.user, systemStaffAccount.role, systemStaffAccount.name);
      } catch (createErr: any) {
        // Fallback to verified staff profile document if Firebase user already exists or creation restricted
        const safeDocId = `staff-${systemStaffAccount.role}-${systemStaffAccount.email.replace(/[^a-zA-Z0-9]/g, '_')}`;
        const profileRef = doc(db, 'profiles', safeDocId);
        try {
          const snap = await getDoc(profileRef);
          if (snap.exists()) {
            const profile = snap.data() as UserProfile;
            profile.role = systemStaffAccount.role;
            profile.name = systemStaffAccount.name;
            localStorage.setItem('resq360_fallback_session', JSON.stringify({ uid: safeDocId, email: cleanEmail, role: profile.role, name: profile.name }));
            return profile;
          }
        } catch (_) {}

        const profile: UserProfile = {
          uid: safeDocId,
          role: systemStaffAccount.role,
          name: systemStaffAccount.name,
          email: systemStaffAccount.email,
          phone: '+91 11 2436 3260',
          active: true,
          notificationPreferences: {
            criticalAlerts: true,
            statusUpdates: true,
            weatherAdvisories: true
          },
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          lastActiveAt: serverTimestamp()
        };

        try {
          await setDoc(profileRef, profile, { merge: true });
        } catch (_) {}

        localStorage.setItem('resq360_fallback_session', JSON.stringify({ uid: safeDocId, email: cleanEmail, role: systemStaffAccount.role, name: systemStaffAccount.name }));
        return profile;
      }
    }

    // 3. Check if this is an enrolled responder registered by an admin in Firestore
    try {
      const respSnap = await getDoc(doc(db, 'responders', `resp-${cleanEmail.replace(/[^a-zA-Z0-9]/g, '_')}`));
      if (respSnap.exists()) {
        const respData = respSnap.data();
        const expectedPass = respData.password || 'Responder#2026';
        if (pass !== expectedPass) {
          throw new Error(`Invalid operational security key. Expected responder password.`);
        }
        const profileSnap = await getDoc(doc(db, 'profiles', respSnap.id));
        if (profileSnap.exists()) {
          const prof = profileSnap.data() as UserProfile;
          localStorage.setItem('resq360_fallback_session', JSON.stringify({ uid: prof.uid, email: cleanEmail, role: 'responder', name: prof.name }));
          return prof;
        }
      }
    } catch (checkErr: any) {
      if (checkErr.message?.includes('Invalid operational security key')) throw checkErr;
    }

    if (err?.code === 'auth/operation-not-allowed' || err?.code === 'auth/user-not-found' || err?.code === 'auth/invalid-credential') {
      // Check if profile exists in Firestore (for registered citizens or staff)
      const safeId = `citizen-${cleanEmail.replace(/[^a-zA-Z0-9]/g, '_')}`;
      const profileRef = doc(db, 'profiles', safeId);
      try {
        const snap = await getDoc(profileRef);
        if (snap.exists()) {
          const profile = snap.data() as UserProfile;
          localStorage.setItem('resq360_fallback_session', JSON.stringify({ uid: safeId, email: cleanEmail, role: profile.role, name: profile.name }));
          return profile;
        }
      } catch (_) {}
    }
    throw err;
  }
}

export async function registerWithEmail(name: string, email: string, pass: string, role: UserRole = 'citizen'): Promise<UserProfile> {
  const cleanEmail = email.trim();
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, pass);
    return await getOrCreateProfile(userCredential.user, role, name.trim());
  } catch (err: any) {
    if (err?.code === 'auth/operation-not-allowed') {
      // Fallback: Create citizen profile directly in Firestore so user isn't blocked while Email/Password is being toggled in Firebase Console
      const safeId = `citizen-${cleanEmail.replace(/[^a-zA-Z0-9]/g, '_')}`;
      const profileRef = doc(db, 'profiles', safeId);
      const profile: UserProfile = {
        uid: safeId,
        role: role,
        name: name.trim() || 'Citizen',
        email: cleanEmail,
        phone: '',
        active: true,
        notificationPreferences: {
          criticalAlerts: true,
          statusUpdates: true,
          weatherAdvisories: false
        },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        lastActiveAt: serverTimestamp()
      };

      try {
        await setDoc(profileRef, sanitizeFirestore(profile), { merge: true });
      } catch (dbErr) {
        handleFirestoreError(dbErr, OperationType.WRITE, `profiles/${safeId}`);
      }

      localStorage.setItem('resq360_fallback_session', JSON.stringify({ uid: safeId, email: cleanEmail, role, name: name.trim() }));
      return profile;
    }
    throw err;
  }
}

export async function requestPasswordReset(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email.trim());
}

export async function logoutUser(): Promise<void> {
  localStorage.removeItem('resq360_fallback_session');
  try {
    await firebaseSignOut(auth);
  } catch (_) {}
}

export async function getOrCreateProfile(user: User, roleOverride?: UserRole, providedName?: string): Promise<UserProfile> {
  const path = `profiles/${user.uid}`;
  try {
    const profileRef = doc(db, 'profiles', user.uid);
    const snap = await getDoc(profileRef);

    const userEmailLower = user.email?.toLowerCase() || '';
    const isBootstrapAdmin = ADMIN_BOOTSTRAP_EMAILS.some(
      (adminEmail) => adminEmail.toLowerCase() === userEmailLower
    );

    const staffMatch = SYSTEM_STAFF_CREDENTIALS.find(
      (s) => s.email.toLowerCase() === userEmailLower
    );

    const targetRole: UserRole = isBootstrapAdmin
      ? 'admin'
      : staffMatch
      ? staffMatch.role
      : (roleOverride || 'citizen');

    const targetName = providedName || staffMatch?.name || user.displayName || user.email?.split('@')[0] || 'User';

    if (snap.exists()) {
      const data = snap.data() as UserProfile;
      // If user is staff or bootstrap admin, enforce their designated role and metadata
      if (data.role !== targetRole || (staffMatch && data.name !== staffMatch.name)) {
        await updateDoc(profileRef, {
          role: targetRole,
          name: targetName,
          badgeNumber: staffMatch?.badgeId || data.badgeNumber,
          teamType: staffMatch?.agency || data.teamType,
          updatedAt: serverTimestamp(),
          lastActiveAt: serverTimestamp()
        });
        data.role = targetRole;
        data.name = targetName;
        if (staffMatch) {
          data.badgeNumber = staffMatch.badgeId;
          data.teamType = staffMatch.agency;
        }
      } else {
        await updateDoc(profileRef, {
          lastActiveAt: serverTimestamp()
        });
      }
      return data;
    }

    const newProfile: UserProfile = {
      uid: user.uid,
      role: targetRole,
      name: targetName,
      email: user.email || '',
      phone: user.phoneNumber || '+91 11 2436 3260',
      badgeNumber: staffMatch?.badgeId,
      teamType: staffMatch?.agency,
      active: true,
      notificationPreferences: {
        criticalAlerts: true,
        statusUpdates: true,
        weatherAdvisories: true
      },
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastActiveAt: serverTimestamp()
    };

    await setDoc(profileRef, sanitizeFirestore(newProfile));
    return newProfile;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    throw error;
  }
}

export async function updateUserProfile(uid: string, updates: Partial<UserProfile>): Promise<void> {
  const path = `profiles/${uid}`;
  try {
    const profileRef = doc(db, 'profiles', uid);
    await updateDoc(profileRef, sanitizeFirestore({
      ...updates,
      updatedAt: serverTimestamp()
    }));
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function fetchUserProfile(uid: string): Promise<UserProfile | null> {
  const path = `profiles/${uid}`;
  try {
    const profileRef = doc(db, 'profiles', uid);
    const snap = await getDoc(profileRef);
    if (!snap.exists()) return null;
    return snap.data() as UserProfile;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return null;
  }
}
