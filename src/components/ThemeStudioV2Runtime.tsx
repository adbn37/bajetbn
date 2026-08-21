import { useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import {
  THEME_STUDIO_V2_EVENT,
  applyThemeStudioV2,
  clearThemeStudioV2,
  loadThemeStudioV2,
  type ThemeStudioV2Settings,
} from "../services/themeStudioV2";

export function ThemeStudioV2Runtime() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      clearThemeStudioV2();
      return;
    }

    let current = loadThemeStudioV2(user.uid);
    applyThemeStudioV2(current);

    const handleChange = (event: Event) => {
      const detail = (event as CustomEvent<{ uid: string; settings: ThemeStudioV2Settings }>).detail;
      if (!detail || detail.uid !== user.uid) return;
      current = detail.settings;
      applyThemeStudioV2(current);
    };

    const observer = new MutationObserver(() => applyThemeStudioV2(current));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    window.addEventListener(THEME_STUDIO_V2_EVENT, handleChange);

    return () => {
      observer.disconnect();
      window.removeEventListener(THEME_STUDIO_V2_EVENT, handleChange);
    };
  }, [user]);

  return null;
}
