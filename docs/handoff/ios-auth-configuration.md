# iOS Google Sign-In Configuration

On 2026-09-10, the authenticated Firebase account was verified to have access to
`diasporaapp-d9cfc`. No iOS app existed, so Diaspora was registered using the
repository's existing bundle identifier, `com.diaspora.languagelearning`.

- Firebase iOS app: `1:744778448890:ios:ceb0f3089f76df7e192e43`.
- Firebase returned an iOS Google OAuth client for this bundle identifier.
- The local ignored `.env` now contains that client in `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`.
- `app.json` configures the Google Sign-In plugin with the matching reversed client URL scheme.
- Downloaded Firebase configuration is in ignored `outputs/GoogleService-Info.plist`.

`npm run env:check` passed with no missing or placeholder fields.
`npx expo config --type introspect --json` completed successfully. Its generated
iOS Info.plist includes the expected Google callback URL scheme, and the bundle
identifier matches the Firebase registration.

The app continues to use Firebase's JavaScript SDK with the existing web Firebase
configuration. No native Firebase SDK or private service account was added.

Google Sign-In still requires an EAS development build for native testing; Expo Go
does not contain this custom native module. Native sign-in, Apple signing, and a
development build on a physical iPhone have not yet been verified. When building
on another machine or EAS, supply the same public environment values there.

## EAS Development Setup

On 2026-09-13, the project was linked to `@danielasiamah/patois-learn`
(`08a79e9c-971e-4f5a-ad17-c1f1341ef158`). The eight public configuration
variables required by `scripts/lib/public-env-check.cjs` were uploaded to its
project-scoped `development` environment. No private service keys were uploaded.
The development build profile explicitly selects this environment.

Values use EAS sensitive visibility to reduce accidental log exposure, but
`EXPO_PUBLIC_` values remain readable in the app bundle; they are not secrets.
The local `.env` and verification downloads remain ignored by Git.
Preview and production environments have not been configured by this step.

EAS reported no Apple teams associated with this Expo account. Apple account
linking, device registration, signing, and a physical iPhone build remain pending.
