# Learn mobile

Learn has a verified Capacitor 8 foundation for Android and iOS.

## Included

- Native-safe status bar and splash screen behavior
- Phone safe-area and keyboard handling
- Deep-link routing into the existing React application
- A bundled production build in `dist` (no remote `server.url`)
- App identifier: `com.brownglobal.learn`
- Pinned Capacitor dependencies and a lockfile

## Create the native projects

Run these once after the final app icon and signing accounts are ready:

```sh
pnpm install
pnpm run mobile:add:android
pnpm run mobile:add:ios
```

Android can be generated and built on Windows with Android Studio and a supported JDK. iOS signing and App Store builds require macOS, Xcode, and an Apple Developer membership.

## Everyday mobile workflow

```sh
pnpm run mobile:sync
pnpm run mobile:open:android
# On macOS:
pnpm run mobile:open:ios
```

Run `pnpm run mobile:sync` after every web change so the native projects receive the latest verified bundle.

## Supabase and security

Only the public Supabase URL and publishable key belong in the app bundle. Never place a secret key or `service_role` key in Vite variables, Capacitor configuration, or native project files. Database tables exposed to the client must use row-level security policies matching the real ownership model.

## Release checklist

1. Approve the final icon, splash artwork, store name, privacy policy, and screenshots.
2. Generate the Android and iOS platform folders.
3. Configure universal/app links and the matching Supabase auth redirect URLs.
4. Test sign-in, deep links, keyboard layouts, camera/files if used, offline/error states, and payments on real devices.
5. Create signed store builds and complete the privacy/data-safety forms.

