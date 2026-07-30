import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth';
import { firebaseConfigured, requireFirebase } from '../services/firebase';
import { getUserProfile } from '../repositories/userRepository';
import type { UserProfile } from '../types/models';

interface AuthContextValue {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  registerWithEmail: (email: string, password: string) => Promise<void>;
  logOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

type CachedProfile = Pick<UserProfile, 'uid' | 'fullName' | 'email' | 'language' | 'currency' | 'timezone' | 'appearance' | 'textSize' | 'notificationsEnabled' | 'dueSoonReminders' | 'lateReminders' | 'sharedPaymentNotifications' | 'whatsappRemindersEnabled' | 'reminderDaysBefore' | 'onboardingCompleted' | 'personalSpaceId'>;

const profileCacheNamespace = import.meta.env.VITE_FIREBASE_PROJECT_ID || import.meta.env.VITE_APP_ENV || 'local';
function profileCacheKey(uid: string) { return `bajetbn.${profileCacheNamespace}.profile.${uid}`; }
function readCachedProfile(uid: string): UserProfile | null {
  try {
    const raw = localStorage.getItem(profileCacheKey(uid));
    return raw ? JSON.parse(raw) as CachedProfile : null;
  } catch { return null; }
}
function writeCachedProfile(profile: UserProfile | null, uid?: string) {
  if (!profile) {
    if (uid) localStorage.removeItem(profileCacheKey(uid));
    return;
  }
  const cached: CachedProfile = {
    uid: profile.uid, fullName: profile.fullName, email: profile.email, language: profile.language,
    currency: profile.currency, timezone: profile.timezone, appearance: profile.appearance,
    textSize: profile.textSize, notificationsEnabled: profile.notificationsEnabled,
    dueSoonReminders: profile.dueSoonReminders, lateReminders: profile.lateReminders,
    sharedPaymentNotifications: profile.sharedPaymentNotifications,
    whatsappRemindersEnabled: profile.whatsappRemindersEnabled,
    reminderDaysBefore: profile.reminderDaysBefore, onboardingCompleted: profile.onboardingCompleted,
    personalSpaceId: profile.personalSpaceId,
  };
  localStorage.setItem(profileCacheKey(profile.uid), JSON.stringify(cached));
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(firebaseConfigured);

  const refreshProfile = async () => {
    if (!user) {
      setProfile(null);
      return;
    }
    const nextProfile = await getUserProfile(user.uid);
    setProfile(nextProfile);
    writeCachedProfile(nextProfile, user.uid);
  };

  useEffect(() => {
    if (!firebaseConfigured) {
      setLoading(false);
      return;
    }
    const { auth } = requireFirebase();
    return onAuthStateChanged(auth, async (nextUser) => {
      setUser(nextUser);
      if (!nextUser) {
        setProfile(null);
        setLoading(false);
        return;
      }
      try {
        const nextProfile = await getUserProfile(nextUser.uid);
        setProfile(nextProfile);
        writeCachedProfile(nextProfile, nextUser.uid);
      } catch (error) {
        if (navigator.onLine) console.error('Unable to load the BajetBN profile.', error);
        setProfile(readCachedProfile(nextUser.uid));
      } finally {
        setLoading(false);
      }
    });
  }, []);

  const value: AuthContextValue = {
    user,
    profile,
    loading,
    refreshProfile,
    signInWithGoogle: async () => {
      const { auth } = requireFirebase();
      await signInWithPopup(auth, new GoogleAuthProvider());
    },
    signInWithEmail: async (email, password) => {
      const { auth } = requireFirebase();
      await signInWithEmailAndPassword(auth, email, password);
    },
    registerWithEmail: async (email, password) => {
      const { auth } = requireFirebase();
      const result = await createUserWithEmailAndPassword(auth, email, password);
      await sendEmailVerification(result.user);
    },
    logOut: async () => {
      const { auth } = requireFirebase();
      if (user) localStorage.removeItem(profileCacheKey(user.uid));
      await signOut(auth);
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider.');
  return context;
}
