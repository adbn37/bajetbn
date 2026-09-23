import {
  getApp,
  getApps,
  initializeApp,
  type FirebaseApp,
} from 'firebase/app';
import {
  browserSessionPersistence,
  getAuth,
  type Auth,
} from 'firebase/auth';
import {
  getFirestore,
  type Firestore,
} from 'firebase/firestore';
import {
  getFunctions,
  type Functions,
} from 'firebase/functions';

/*
 * ADBN TECH is a separate Firebase project and a separate Google account.
 * This secondary Firebase app never replaces BajetBN's primary auth session.
 *
 * Firebase web configuration is public client metadata. Access to ADBN data is
 * still enforced by ADBN Firebase Authentication and its Firestore rules.
 */
const adbnTechConfig = {
  apiKey: 'AIzaSyAzf5Xu3lIiISymERDWhMVEXCTs4PkUHWo',
  authDomain: 'adbntech-cd466.firebaseapp.com',
  projectId: 'adbntech-cd466',
  storageBucket: 'adbntech-cd466.firebasestorage.app',
  messagingSenderId: '1076035159265',
  appId: '1:1076035159265:web:51d9e7dc6fd476ee6723a0',
};

const appName = 'adbn-tech-readonly';

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let functions: Functions | null = null;

export function requireAdbnTechFirebase() {
  if (!app) {
    app = getApps().find((item) => item.name === appName)
      || initializeApp(adbnTechConfig, appName);
  }

  auth ||= getAuth(app);
  db ||= getFirestore(app);
  functions ||= getFunctions(
    app,
    'asia-southeast1',
  );

  return {
    app,
    auth,
    db,
    functions,
  };
}

export async function prepareAdbnTechSessionAuth() {
  const { auth: secondaryAuth } = requireAdbnTechFirebase();
  await secondaryAuth.setPersistence(browserSessionPersistence);
  return secondaryAuth;
}
