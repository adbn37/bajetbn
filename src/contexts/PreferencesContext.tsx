import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useAuth } from './AuthContext';
import { localizeDocument } from '../services/i18n';
import { updateUserPreferences, type UserPreferenceUpdate } from '../repositories/userRepository';
import type { Appearance, Language, TextSize } from '../types/models';

interface PreferenceState {
  language: Language;
  appearance: Appearance;
  textSize: TextSize;
  notificationsEnabled: boolean;
  backgroundRemindersEnabled: boolean;
  dueSoonReminders: boolean;
  lateReminders: boolean;
  goalReminders: boolean;
  sharedPaymentNotifications: boolean;
  whatsappRemindersEnabled: boolean;
  browserPushEnabled: boolean;
  reminderDaysBefore: number;
}

interface PreferencesContextValue extends PreferenceState {
  resolvedTheme: 'dark' | 'light';
  setLanguage: (value: Language) => void;
  setAppearance: (value: Appearance) => void;
  setTextSize: (value: TextSize) => void;
  setNotificationPreference: (
    key: 'notificationsEnabled' | 'backgroundRemindersEnabled' | 'dueSoonReminders' | 'lateReminders' | 'goalReminders' | 'sharedPaymentNotifications' | 'whatsappRemindersEnabled' | 'browserPushEnabled',
    value: boolean,
  ) => void;
  setReminderDaysBefore: (value: number) => void;
  savePreferences: (fullName: string) => Promise<void>;
}

const defaultPreferences: PreferenceState = {
  language: 'en',
  appearance: 'dark',
  textSize: 'normal',
  notificationsEnabled: true,
  backgroundRemindersEnabled: true,
  dueSoonReminders: true,
  lateReminders: true,
  goalReminders: true,
  sharedPaymentNotifications: true,
  whatsappRemindersEnabled: true,
  browserPushEnabled: false,
  reminderDaysBefore: 3,
};

const localPreferenceKey = 'bajetbn.preferences.v1';

function readLocalPreferences(): Partial<PreferenceState> {
  try {
    const value = localStorage.getItem(localPreferenceKey);
    return value ? JSON.parse(value) as Partial<PreferenceState> : {};
  } catch {
    return {};
  }
}

function writeLocalPreferences(value: PreferenceState) {
  localStorage.setItem(localPreferenceKey, JSON.stringify(value));
}

function profilePreferences(profile: ReturnType<typeof useAuth>['profile']): PreferenceState {
  return {
    language: profile?.language || defaultPreferences.language,
    appearance: profile?.appearance || defaultPreferences.appearance,
    textSize: profile?.textSize || defaultPreferences.textSize,
    notificationsEnabled: profile?.notificationsEnabled ?? defaultPreferences.notificationsEnabled,
    backgroundRemindersEnabled: profile?.backgroundRemindersEnabled ?? defaultPreferences.backgroundRemindersEnabled,
    dueSoonReminders: profile?.dueSoonReminders ?? defaultPreferences.dueSoonReminders,
    lateReminders: profile?.lateReminders ?? defaultPreferences.lateReminders,
    goalReminders: profile?.goalReminders ?? defaultPreferences.goalReminders,
    sharedPaymentNotifications: profile?.sharedPaymentNotifications ?? defaultPreferences.sharedPaymentNotifications,
    whatsappRemindersEnabled: profile?.whatsappRemindersEnabled ?? defaultPreferences.whatsappRemindersEnabled,
    browserPushEnabled: profile?.browserPushEnabled ?? defaultPreferences.browserPushEnabled,
    reminderDaysBefore: profile?.reminderDaysBefore ?? defaultPreferences.reminderDaysBefore,
  };
}

const PreferencesContext = createContext<PreferencesContextValue | undefined>(undefined);

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const { user, profile, refreshProfile } = useAuth();
  const [preferences, setPreferences] = useState<PreferenceState>(() => ({
    ...defaultPreferences,
    ...readLocalPreferences(),
  }));
  const [systemTheme, setSystemTheme] = useState<'dark' | 'light'>(() =>
    window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark',
  );
  const profileUid = useRef<string | null>(null);

  useEffect(() => {
    if (!profile) return;
    if (profileUid.current === profile.uid && profile.updatedAt === undefined) return;
    profileUid.current = profile.uid;
    const next = profilePreferences(profile);
    setPreferences(next);
    writeLocalPreferences(next);
  }, [profile]);

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: light)');
    const update = () => setSystemTheme(media.matches ? 'light' : 'dark');
    update();
    media.addEventListener?.('change', update);
    return () => media.removeEventListener?.('change', update);
  }, []);

  const resolvedTheme = preferences.appearance === 'system' ? systemTheme : preferences.appearance;

  useEffect(() => {
    document.documentElement.dataset.theme = resolvedTheme;
    document.documentElement.dataset.appearance = preferences.appearance;
    document.documentElement.dataset.textSize = preferences.textSize;
    document.documentElement.lang = preferences.language === 'ms' ? 'ms' : 'en';
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', resolvedTheme === 'dark' ? '#030708' : '#f5f3ee');
    writeLocalPreferences(preferences);
  }, [preferences, resolvedTheme]);

  useEffect(() => {
    let frame = requestAnimationFrame(() => localizeDocument(preferences.language));
    const observer = new MutationObserver((records) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        records.forEach((record) => record.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) localizeDocument(preferences.language, node as Element);
          if (node.nodeType === Node.TEXT_NODE && node.parentElement) localizeDocument(preferences.language, node.parentElement);
        }));
      });
    });
    observer.observe(document.body, { childList: true, subtree: true });
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [preferences.language]);

  function updatePreference<K extends keyof PreferenceState>(key: K, value: PreferenceState[K]) {
    setPreferences((current) => ({ ...current, [key]: value }));
  }

  const value = useMemo<PreferencesContextValue>(() => ({
    ...preferences,
    resolvedTheme,
    setLanguage: (language) => updatePreference('language', language),
    setAppearance: (appearance) => updatePreference('appearance', appearance),
    setTextSize: (textSize) => updatePreference('textSize', textSize),
    setNotificationPreference: (key, enabled) => updatePreference(key, enabled),
    setReminderDaysBefore: (days) => updatePreference('reminderDaysBefore', Math.min(30, Math.max(0, Math.round(days)))),
    savePreferences: async (fullName) => {
      if (!user) throw new Error('Sign in before saving settings.');
      const update: UserPreferenceUpdate = {
        fullName,
        ...preferences,
      };
      await updateUserPreferences(user.uid, update);
      await refreshProfile();
    },
  }), [preferences, resolvedTheme, user, refreshProfile]);

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences() {
  const context = useContext(PreferencesContext);
  if (!context) throw new Error('usePreferences must be used inside PreferencesProvider.');
  return context;
}
