# BajetBN v0.11.17 ? Login Theme Presets Alpha 1

## Purpose

BajetBN now lets a person choose the app look before signing in and keeps the same choice after sign-in.

## Included themes

1. System Default
2. Black
3. Light
4. Pink & White
5. Black & Pink
6. Midnight Teal
7. Navy Blue
8. Forest Green
9. Royal Purple
10. Sand & Cream
11. Slate Grey
12. Ocean Blue
13. High Contrast

## Guest behaviour

- The chooser is available in the signed-out Auth layout.
- Selecting a theme changes the page immediately.
- The guest choice is stored locally.
- Reloading the login page keeps the selected choice.
- System Default follows the current device light/dark preference.

## Guest choice sync

When a guest intentionally selects a theme and then signs in, BajetBN saves that selected appearance to the signed-in user profile. This allows the same theme to follow the account on another device after profile settings are loaded.

## Existing users

The historical `dark` appearance value remains accepted for compatibility and is displayed as the Black preset. Existing profiles do not require a destructive migration.

## Settings

The same shared ThemeChooser component is used in Settings. A signed-in user can preview changes immediately and save them with the existing Save settings action.

## Shared design tokens

Every preset supplies the same token names for:

- page background;
- cards and surfaces;
- borders;
- primary and secondary text;
- accent colours;
- warning/error colours;
- navigation chrome;
- input surfaces;
- hover state;
- focus state;
- shadows.

Pages do not use separate theme-specific layouts.

## Accessibility

- Theme choices use radio semantics and selected state.
- Keyboard focus remains clearly visible.
- High Contrast uses white text and borders on black with a yellow focus/accent colour.
- Existing large-text support remains unchanged.

## Staging gate

The staging verification matrix passed. This scope item is now `complete`.
