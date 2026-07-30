# BajetBN v0.10.0 — Language, Theme & Settings Alpha 1

## What this phase adds

- English and Bahasa Melayu selection.
- Beginner-friendly Malay wording across the signed-out and signed-in app.
- Dark, light, and device-default appearance.
- Dark/black appearance remains the default.
- Normal and large text choices.
- Saved profile name and preferences per user.
- BND and Asia/Brunei shown as the standard money and time settings.
- In-app, due-soon, late-bill, shared-payment, and WhatsApp reminder choices.
- Default reminder timing from 0 to 30 days before a due date.
- Mobile-friendly settings sections and clear account controls.

## Important behaviour

- Appearance and text-size changes are previewed immediately.
- Press **Save settings** to store the choices in the signed-in user profile.
- A local copy is kept so the login screen can use the most recent language and appearance.
- Device-default appearance follows the device light/dark setting.
- WhatsApp remains manual: BajetBN prepares the message and the user presses Send.
- Currency remains BND and time zone remains Asia/Brunei in this phase.

## Staging checks

1. Switch between English and Bahasa Melayu on the login screen.
2. Sign in and open `/settings`.
3. Switch dark, light, and device-default appearance.
4. Refresh and confirm the saved appearance returns.
5. Switch normal and large text and confirm mobile screens remain usable.
6. Change reminder choices and save.
7. Sign out and sign back in; confirm the saved settings return.
8. Confirm BND and Asia/Brunei cannot be changed accidentally.
9. Confirm Calendar dates use Brunei-style day/month wording.
10. Confirm hiding WhatsApp reminder buttons works in Calendar.

Production remains blocked until staging is verified.
