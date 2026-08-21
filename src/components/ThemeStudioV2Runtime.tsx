import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import {
  THEME_STUDIO_V2_EVENT,
  applyThemeStudioV2,
  applyThemeStudioV2WallpaperUrl,
  clearThemeStudioV2,
  loadThemeStudioV2,
  type ThemeStudioV2Settings,
} from "../services/themeStudioV2";
import {
  THEME_STUDIO_V2_SCOPES_EVENT,
  getThemeStudioWallpaperUrl,
  hydrateThemeStudioV2FromCloud,
  loadThemeStudioV2SpaceOverride,
} from "../services/themeStudioV2Persistence";

function spaceIdFromPath(pathname: string) {
  const match = pathname.match(/^\/spaces\/([^/]+)(?:\/|$)/);
  return match ? decodeURIComponent(match[1]) : "";
}

export function ThemeStudioV2Runtime() {
  const { user } = useAuth();
  const location = useLocation();

  useEffect(() => {
    if (!user) {
      clearThemeStudioV2();
      return;
    }

    let disposed = false;
    let wallpaperRequest = 0;

    async function applyEffectiveTheme() {
      if (disposed || !user) return;

      const spaceId = spaceIdFromPath(location.pathname);
      const globalSettings = loadThemeStudioV2(user.uid);
      const override = spaceId
        ? loadThemeStudioV2SpaceOverride(user.uid, spaceId)
        : null;
      const current = override || globalSettings;

      applyThemeStudioV2(current);

      const requestId = ++wallpaperRequest;

      if (!current.wallpaperPath) {
        applyThemeStudioV2WallpaperUrl(null);
        return;
      }

      try {
        const url = await getThemeStudioWallpaperUrl(user.uid, current.wallpaperPath);
        if (!disposed && requestId === wallpaperRequest) {
          applyThemeStudioV2WallpaperUrl(url);
        }
      } catch {
        if (!disposed && requestId === wallpaperRequest) {
          applyThemeStudioV2WallpaperUrl(null);
        }
      }
    }

    void applyEffectiveTheme();

    void hydrateThemeStudioV2FromCloud(user.uid).then(() => {
      if (!disposed) void applyEffectiveTheme();
    });

    const handlePersonalisation = (event: Event) => {
      const detail = (event as CustomEvent<{ uid: string; settings: ThemeStudioV2Settings }>).detail;
      if (!detail || detail.uid !== user.uid) return;
      void applyEffectiveTheme();
    };

    const handleScopes = (event: Event) => {
      const detail = (event as CustomEvent<{ uid: string }>).detail;
      if (!detail || detail.uid !== user.uid) return;
      void applyEffectiveTheme();
    };

    const observer = new MutationObserver(() => {
      void applyEffectiveTheme();
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    window.addEventListener(THEME_STUDIO_V2_EVENT, handlePersonalisation);
    window.addEventListener(THEME_STUDIO_V2_SCOPES_EVENT, handleScopes);

    return () => {
      disposed = true;
      observer.disconnect();
      window.removeEventListener(THEME_STUDIO_V2_EVENT, handlePersonalisation);
      window.removeEventListener(THEME_STUDIO_V2_SCOPES_EVENT, handleScopes);
    };
  }, [user, location.pathname]);

  return null;
}
