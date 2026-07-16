# Falando Portugues

Private MVP for practising spoken European Portuguese with a real-time AI tutor.

## Current Target

The current target is a stable private MVP, not an App Store release.

- Run the backend on the VPS.
- Use a free temporary `nip.io` HTTPS address until buying a domain is worthwhile.
- Use Expo/dev builds for mobile testing.
- Keep paid platform commitments low until the voice experience is validated.

The active app is the Expo project at the repository root. The `mobile/` folder is kept as a separate legacy/reference package and has its own scripts.

## Local Checks

```bash
npm run ts
npm test -- --watchAll=false
npm run ts:mobile
npm run test:mobile
```

Backend tests require a fresh local Python environment. The checked-in virtualenv folders are ignored and should be treated as disposable local artifacts.

## VPS MVP Deployment

1. Copy `backend/.env.example` to `backend/.env` on the VPS.
2. Fill the API keys and LiveKit settings.
3. Set `APP_TOKEN` to a random value and mirror it in the app as `EXPO_PUBLIC_APP_TOKEN`.
4. Set `EXPO_PUBLIC_BACKEND_URL` to `https://37-27-196-137.nip.io` while testing without a paid domain.
5. Start the backend with Docker Compose:

```bash
docker compose up -d --build
```

The VPS uses Caddy and `nip.io` as a free temporary DNS name, so iOS can use HTTPS without buying a domain yet. Before a wider beta, replace this with a domain you own.

## Provisional Production Notes

This MVP intentionally keeps platform costs low while validating the product.

- Backend URL is provisional: `https://37-27-196-137.nip.io`.
- Replace the `nip.io` address with a purchased domain before a broader beta or public launch.
- Caddy is already in place on the VPS, so swapping to a real domain should mainly require updating `Caddyfile`, DNS, and `EXPO_PUBLIC_BACKEND_URL`.
- Mobile distribution remains provisional until developer credentials are purchased/configured, especially Google Play Developer credentials for Android release builds.
- Expo/dev builds are the intended testing path until those developer accounts and signing credentials are ready.

## Private Beta

The current product phase is a controlled private beta with known testers, not commercialization.

Use these docs to run the beta:

- `docs/beta/private-beta-guide.md` — tester profile, testing flow, and feedback questions.
- `docs/beta/qa-checklist.md` — technical checklist before inviting each tester batch.
- `docs/beta/multilanguage-roadmap.md` — plan for French, Italian, and English without forking the app too early.
