# Beta QA Checklist

Use this checklist before inviting each new tester batch.

## Repository Checks

- [ ] `npm run ts` passes.
- [ ] `npx jest --watchAll=false --watchman=false` passes.
- [ ] `npm --prefix mobile run ts` passes if the legacy package has changed.
- [ ] Backend tests pass with the local Python test environment.
- [ ] No unrelated worktrees or temporary files confuse test output.

## Backend Checks

- [ ] `/health` returns `{"status":"ok"}` over HTTPS.
- [ ] `/auth/register` works from a fresh device.
- [ ] `/auth/login` works from a registered device.
- [ ] `/session` rejects missing/invalid auth.
- [ ] `/session` creates a LiveKit room and returns `room_name`, `token`, and `livekit_url`.
- [ ] Bot joins the room once per session.
- [ ] Bot crashes are logged with room name.
- [ ] Rate limits are acceptable for small beta usage.

## Voice Pipeline Checks

- [ ] Deepgram receives user speech.
- [ ] User transcript is published to the app.
- [ ] Claude responds in European Portuguese.
- [ ] Corrections use the expected format.
- [ ] Tutor transcript is published to the app.
- [ ] ElevenLabs voice is Portugal/European Portuguese.
- [ ] Tutor audio is heard on device.
- [ ] Interruptions or rapid turns do not trigger repeated Anthropic 429 errors.

## Mobile Checks

- [ ] App launches cleanly on iPhone.
- [ ] App launches cleanly on Android.
- [ ] Registration works.
- [ ] Login works after closing and reopening the app.
- [ ] Level selection persists.
- [ ] Topic selection is sent to backend.
- [ ] Voice selection persists.
- [ ] Voice preview works or fails gracefully.
- [ ] Microphone permission prompt is understandable.
- [ ] Session screen shows connecting, active, error, and ended states.
- [ ] Mute button changes actual microphone state.
- [ ] Transcript displays user and tutor messages.
- [ ] Grammar corrections are shown once, not duplicated.
- [ ] Session history is saved after a real session.
- [ ] Clearing history works.

## Device Scenarios

- [ ] Wi-Fi.
- [ ] Mobile data.
- [ ] Headphones.
- [ ] Speaker.
- [ ] Phone locked briefly during or after session.
- [ ] App backgrounded and reopened.
- [ ] Poor network or backend unavailable.
- [ ] Microphone permission denied.

## Beta Exit Criteria

Do not expand the beta until:

- [ ] At least 5 real sessions have completed successfully.
- [ ] No blocker prevents a non-technical tester from starting a session.
- [ ] Median perceived tutor response delay feels acceptable.
- [ ] At least 3 testers say they would try another session.
- [ ] Known failures are documented with reproduction notes.

## Known Non-goals for This Stage

- App Store approval.
- Google Play production release.
- Paid subscriptions.
- Marketing website.
- Multi-language launch.
- Perfect analytics.

