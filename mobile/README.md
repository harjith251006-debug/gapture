# Gapture — Mobile shell

A **thin WebView wrapper** around the deployed Next.js web app. Per HLSA §6
Layer 10 and PRD §8–§14, the mobile app has **no independent data layer and
no native regulatory-processing logic** — it loads the same URL, hits the
same APIs, uses the same Supabase session as a mobile browser would.

## Why a bare native WebView (not Capacitor/Cordova/React Native)

Architecture Decision (Phase 15, task 1). The wrapper needs to do exactly
five things — load a URL, persist the auth cookie, bridge the microphone
permission, send external links to the browser, and show an offline screen.
A per-platform native `WebView` / `WKWebView` does all of that in ~150 lines
with zero JS build tooling, zero plugin abstraction, and fully readable
permission code. Capacitor would add a Node build step and a plugin layer for
no benefit at this scope. If a second consumer of native code ever appears,
revisit.

Android is the first (and, for MVP, only) target — largest platform share in
the BRD's market. `mobile/ios/` would be the same pattern with `WKWebView` +
`WKUIDelegate` (permission) — not built yet.

## `android/`

Open `mobile/android/` in Android Studio (Giraffe+), or build from the CLI.

### Point it at your deployment

The target URL is `BuildConfig.APP_URL`, set from the Gradle property
`gapture.appUrl`. Put it in `mobile/android/local.properties` (gitignored):

```
gapture.appUrl=https://your-gapture-deployment.example.com
```

or pass `-Pgapture.appUrl=https://…` on the Gradle command line. With no
value set the app shows a configuration screen instead of loading anything.

> The Supabase session cookie is `Secure` in production, so the URL **must be
> HTTPS**. For local testing against `next dev`, use an HTTPS tunnel
> (`cloudflared tunnel`, `ngrok http 3000`) — plain `http://10.0.2.2:3000`
> will not hold the session. A dev-only cleartext exception for
> `10.0.2.2` is in `network_security_config.xml` but the cookie still
> won't persist without HTTPS.

### Build / run

```
cd mobile/android
./gradlew assembleDebug            # -> app/build/outputs/apk/debug/app-debug.apk
./gradlew installDebug             # to a connected device / running emulator
```

## What the shell handles (Phase 15 tasks 3–6)

| Concern | Where |
|---|---|
| Auth/session persistence | `CookieManager` (`setAcceptCookie`, `setAcceptThirdPartyCookies`, `flush()` on pause) — the app's `SameSite=Lax` cookie survives across launches |
| Microphone (voice Q&A) | `WebChromeClient.onPermissionRequest` grants `RESOURCE_AUDIO_CAPTURE` after the OS `RECORD_AUDIO` runtime permission is held; audio playback needs no gesture (`setMediaPlaybackRequiresUserGesture(false)`) |
| File upload (policy upload) | `WebChromeClient.onShowFileChooser` → system document picker |
| External links | `WebViewClient.shouldOverrideUrlLoading` — same host stays in the WebView; anything else (incl. a signed Storage URL, `mailto:`, `tel:`) opens in the default browser/app, never trapped |
| Offline / load failure | `onReceivedError` on the main frame shows a native error screen with Retry — distinct from the web app's own in-page error states (PRD §12) |
| Back navigation | hardware back = `webView.goBack()` while history exists |

## Authentication inside the WebView

- **Email / password + email-confirmation links work unchanged** — the
  `/auth/callback` route is same-host, so it stays in the WebView and the
  session cookie is set where the app runs.
- **"Continue with Google" needs work.** Google blocks OAuth in an embedded
  WebView (`disallowed_useragent`), and if the shell sends it to the system
  browser the session lands in the *browser*, not the WebView. The fix is a
  PKCE flow with a deep-link redirect (`ai.gapture.mobile://auth/callback`)
  that the shell intercepts and completes in the WebView. **Not built yet** —
  deferred to the on-device verification pass, since it can't be tested
  without a device + a deployed URL. Until then, use email/password on mobile.

## What is NOT here (explicit non-goals)

- No offline caching / local database.
- No native screens beyond the WebView + the two fallback screens (config, error).
- No native regulatory-processing, OCR, NLP, or notification logic.
- No debug bridge (`setWebContentsDebuggingEnabled`) in release builds.

## Deferred verification

Phase 15's DoD ("full golden path on a real device/emulator", "microphone
permission flow inside the WebView") **requires an Android device/emulator +
Android Studio**, which the build environment for this project does not have.
The shell code implements every task 3–6 concern; the web app's
WebView-relevant behaviour (responsive layout, `SameSite=Lax` session cookie,
`getUserMedia`-based capture, `<input type=file>` upload) was verified against
`next dev`. Running the APK on a device is the remaining step.
