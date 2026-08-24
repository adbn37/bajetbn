import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import {
  EmailAuthProvider,
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';
import { firebaseConfigured, requireFirebase } from '../services/firebase';
import { BAJETBN_SUBSCRIPTION_ADMIN_EMAIL } from '../config/subscription';
import { getUserProfile, subscribeToUserProfile } from '../repositories/userRepository';
import type { UserProfile } from '../types/models';

interface AuthContextValue {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  registerWithEmail: (email: string, password: string) => Promise<void>;
  reauthenticateForSensitiveAction: (password?: string) => Promise<void>;
  logOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

type CachedProfile = Pick<UserProfile, 'uid' | 'fullName' | 'email' | 'platformRole' | 'subscriptionPlan' | 'subscriptionStatus' | 'subscriptionStartedAt' | 'subscriptionExpiresAt' | 'subscriptionSource' | 'language' | 'currency' | 'timezone' | 'appearance' | 'textSize' | 'notificationsEnabled' | 'backgroundRemindersEnabled' | 'dueSoonReminders' | 'lateReminders' | 'goalReminders' | 'sharedPaymentNotifications' | 'whatsappRemindersEnabled' | 'browserPushEnabled' | 'reminderDaysBefore' | 'onboardingCompleted' | 'personalSpaceId'>;

const profileCacheNamespace = import.meta.env.VITE_FIREBASE_PROJECT_ID || import.meta.env.VITE_APP_ENV || 'local';
function profileCacheKey(uid: string) { return `bajetbn.${profileCacheNamespace}.profile.${uid}`; }

interface RegistrationEligibilityResult {
  allowed: boolean;
  existingAccount: boolean;
  freshStart: boolean;
  reason: 'cooldown' | 'manual_review' | 'already_re_registered' | null;
  reRegistrationAllowedAt: string | null;
  cooldownDays: number;
  message: string | null;
}

async function enforceRegistrationEligibilityForCurrentUser(): Promise<RegistrationEligibilityResult> {
  const { auth, functions } = requireFirebase();
  if (!auth.currentUser) throw new Error('Please sign in again.');
  const callable = httpsCallable(functions, 'enforceRegistrationEligibility');
  try {
    const result = await callable();
    return result.data as RegistrationEligibilityResult;
  } catch (error) {
    await signOut(auth).catch(() => undefined);
    throw error;
  }
}
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
    uid: profile.uid,
    fullName: profile.fullName,
    email: profile.email,
    platformRole: profile.platformRole,
    subscriptionPlan: profile.subscriptionPlan,
    subscriptionStatus: profile.subscriptionStatus,
    subscriptionStartedAt: profile.subscriptionStartedAt,
    subscriptionExpiresAt: profile.subscriptionExpiresAt,
    subscriptionSource: profile.subscriptionSource,
    language: profile.language,
    currency: profile.currency, timezone: profile.timezone, appearance: profile.appearance,
    textSize: profile.textSize, notificationsEnabled: profile.notificationsEnabled,
    backgroundRemindersEnabled: profile.backgroundRemindersEnabled,
    dueSoonReminders: profile.dueSoonReminders, lateReminders: profile.lateReminders,
    goalReminders: profile.goalReminders, sharedPaymentNotifications: profile.sharedPaymentNotifications,
    whatsappRemindersEnabled: profile.whatsappRemindersEnabled, browserPushEnabled: profile.browserPushEnabled,
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
        if (
          nextUser.email?.trim().toLowerCase()
          === BAJETBN_SUBSCRIPTION_ADMIN_EMAIL
        ) {
          const callable = httpsCallable(
            requireFirebase().functions,
            'ensureMyPlatformAdmin',
          );

          const result = await callable();

          const adminResult = result.data as {
            platformAdmin?: boolean;
            refreshToken?: boolean;
          };

          if (
            adminResult.platformAdmin
            && adminResult.refreshToken
          ) {
            await nextUser.getIdToken(true);
          }
        }

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

  // Live subscription/profile refresh.
  // This lets an already signed-in customer receive
  // Plus activation without signing out or reloading.
  useEffect(() => {
    if (
      !firebaseConfigured
      || !user
    ) {
      return undefined;
    }

    return subscribeToUserProfile(
      user.uid,
      (nextProfile) => {
        setProfile(nextProfile);
        writeCachedProfile(
          nextProfile,
          user.uid,
        );
      },
      (nextError) => {
        if (navigator.onLine) {
          console.error(
            'Unable to refresh the BajetBN profile.',
            nextError,
          );
        }
      },
    );
  }, [user?.uid]);

  // Re-render at the exact paid-plan expiry boundary.
  // No backend mutation is required: entitlements evaluate
  // the expiry timestamp against the current time.
  useEffect(() => {
    const expiry =
      profile?.subscriptionExpiresAt;

    if (
      profile?.subscriptionPlan !== 'plus'
      || profile.subscriptionStatus !== 'active'
      || !expiry
    ) {
      return undefined;
    }

    const expiryMillis =
      expiry.toMillis();

    let cancelled = false;
    let timer:
      | number
      | undefined;

    const schedule = () => {
      if (cancelled) return;

      const remaining =
        expiryMillis - Date.now();

      if (remaining <= 0) {
        setProfile((current) =>
          current
            ? { ...current }
            : current,
        );
        return;
      }

      const wait =
        Math.min(
          remaining + 250,
          2_000_000_000,
        );

      timer =
        window.setTimeout(
          schedule,
          wait,
        );
    };

    schedule();

    return () => {
      cancelled = true;

      if (timer !== undefined) {
        window.clearTimeout(timer);
      }
    };
  }, [
    profile?.subscriptionPlan,
    profile?.subscriptionStatus,
    profile?.subscriptionExpiresAt,
  ]);

  const value: AuthContextValue = {
    user,
    profile,
    loading,
    refreshProfile,
    signInWithGoogle: async () => {
      const { auth } = requireFirebase();
      await signInWithPopup(auth, new GoogleAuthProvider());
      await enforceRegistrationEligibilityForCurrentUser();
    },
    signInWithEmail: async (email, password) => {
      const { auth } = requireFirebase();
      await signInWithEmailAndPassword(auth, email, password);
      await enforceRegistrationEligibilityForCurrentUser();
    },
    registerWithEmail: async (email, password) => {
      const { auth } = requireFirebase();
      const result = await createUserWithEmailAndPassword(auth, email, password);
      await enforceRegistrationEligibilityForCurrentUser();
      await sendEmailVerification(result.user);
    },
    reauthenticateForSensitiveAction: async (password) => {
      if (!user) throw new Error('Please sign in again.');
      const providers = new Set(user.providerData.map((item) => item.providerId));
      if (providers.has('password')) {
        if (!user.email) throw new Error('This account does not have an email address.');
        if (!password) throw new Error('Enter your current password.');
        await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, password));
      } else if (providers.has('google.com')) {
        await reauthenticateWithPopup(user, new GoogleAuthProvider());
      } else {
        throw new Error('This sign-in method cannot be confirmed here. Sign out, sign in again, then retry.');
      }
      await user.getIdToken(true);
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
