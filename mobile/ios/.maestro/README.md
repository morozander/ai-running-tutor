# Maestro E2E flows

Persisted, reusable [Maestro](https://maestro.mobile.dev) flows that drive the app's primary user
journeys on an iOS Simulator (Maestro-for-iOS is simulator-only). `journeys/home.yaml` (launch →
Home → Open details → back) is the reference; it selects by visible text so it needs no extra setup.

## Running

Install Maestro if missing: `curl -Ls https://get.maestro.mobile.dev | bash`; ensure `~/.maestro/bin`
is on `PATH`.

```bash
# build for a booted simulator, install, then run the flow
SIM=$(xcrun simctl list devices booted | grep -oE '[0-9A-F-]{36}' | head -1)
xcodebuild -project ios.xcodeproj -scheme ios -configuration Debug \
  -destination "platform=iOS Simulator,id=$SIM" -derivedDataPath /tmp/iosbuild -skipMacroValidation \
  CODE_SIGNING_ALLOWED=NO build
xcrun simctl install "$SIM" /tmp/iosbuild/Build/Products/Debug-iphonesimulator/ios.app
maestro --device "$SIM" test .maestro/journeys/home.yaml
```

> Build notes: drop `-sdk iphonesimulator` (use `-destination` only) so the TCA macro plugins build
> for the host; `-skipMacroValidation` trusts the SPM macros headlessly.

> Verified green on an iPhone simulator: launch → Home → Open details → back to Home.
