# FindMyCP

FindMyCP is an Expo development-build app. GPS fixes are recorded to SQLite on
the phone; a signed-in device uploads pending rows to Supabase when connectivity
returns. A Supabase service-role key is never used in the mobile app.

## Set up

1. Install Node.js, Android Studio, the Android SDK, and a compatible JDK. Open
   this folder in VS Code.
2. Install dependencies:

   ```powershell
   npm install
   ```

3. In the Supabase dashboard, create a project, open **SQL Editor**, and run
   [`supabase/schema.sql`](./supabase/schema.sql).
4. Copy `.env.example` to `.env` in PowerShell with
   `Copy-Item .env.example .env`. Set `EXPO_PUBLIC_SUPABASE_URL` and
   `EXPO_PUBLIC_SUPABASE_ANON_KEY` using the project's URL and publishable
   (or legacy anon) key. Never put a service-role key in the app.
5. To display Google map tiles on Android, enable Maps SDK for Android in
   Google Cloud and set `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY`. Without it, the app
   still records and displays coordinates; the map tile view shows a setup
   message instead.
6. Create a development build. Background location is not supported in Expo
   Go. For a local Android build:

   ```powershell
   npx expo run:android
   npx expo start
   ```

   A compatible JDK, Android SDK, and connected device or configured emulator
   are required. For cloud builds, install no global tooling: sign in with
   `npx eas-cli@latest login`, initialize the EAS project with
   `npx eas-cli@latest init`, and add the three `EXPO_PUBLIC_...` variables to
   the matching **development**, **preview**, or **production** EAS environment.
   Then create an installable APK with
   `npx eas-cli@latest build --profile preview --platform android`. The
   development APK is built with
   `npx eas-cli@latest build --profile development --platform android`.
   Production builds use Android App Bundle format.

## Verify

```powershell
npx tsc --noEmit
npx expo lint
npx expo-doctor
```

On an Android device, sign in while online, grant location and notification
permissions when starting tracking, then disable Wi-Fi and mobile data. Wait
for GPS fixes and confirm **Offline sync** and **Location history** show local
records. Restore internet and confirm pending records become uploaded. Repeat
with the screen locked and app backgrounded. Android force-stop, device
shutdown, and manufacturer battery controls can stop background tracking;
restart tracking after such restrictions.

## Current behavior

- The default recording interval is one minute; available choices are 10, 30,
  60, 300, and 900 seconds.
- The location task writes directly to SQLite, independently of network
  connectivity. Pending records are retained until Supabase confirms an
  idempotent upsert.
- Sign-in is required for cloud backup and remote viewing, not for local GPS
  recording.
- Background recording requires a native development/production build and the
  user-granted location permissions. Location collection is visible in the
  system foreground-service notification while active.
