#!/usr/bin/env bash
# Build (and optionally install + launch) the iOS app for one environment.
#
#   scripts/build-ios.sh prod            # today's daily-use app, api.aogimi.com
#   scripts/build-ios.sh dev             # "Aogimi Dev", separate bundle id → its own
#                                        # sandbox, pointed at the hosted dev backend
#   scripts/build-ios.sh dev --install   # …then devicectl install + launch
#
# Why two apps and not a switch: iOS sandboxes by bundle id, so a second id is a
# second AsyncStorage, a second books/ directory, a second Keychain. Dev and prod
# can't see each other's data by construction — no namespacing code, nothing to
# get wrong. The two variants differ ONLY in what this script passes on the
# command line; the Xcode project holds the prod values as its defaults.
#
# The API URL is an EXPO_PUBLIC_* var, which Babel inlines into main.jsbundle at
# build time and Metro caches. Switching variants without clearing that cache
# ships the previous variant's URL, so the cache is cleared on every run.
#
# Signing is the free personal team (see the build notes): each bundle id gets
# its own 7-day profile, renewed by its own rebuild. Two ids use two of the
# team's three per-device app slots.
#
# Overrides (env):
#   AOGIMI_DEVICE        device UDID            (default: the iPhone 16 Plus)
#   AOGIMI_DEV_API_URL   dev backend URL        (default: DEV_API_URL below)

set -euo pipefail

# The hosted dev backend — same shape as prod, its own database. Run new
# migrations here first. (A LAN backend works too: AOGIMI_DEV_API_URL=http://<mac-ip>:3000)
DEV_API_URL="https://aogimi-backend-dev.up.railway.app"

VARIANT="${1:-}"
INSTALL=0
[[ "${2:-}" == "--install" ]] && INSTALL=1

DEVICE="${AOGIMI_DEVICE:-00008140-00123CDA02F0801C}"
APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
IOS_DIR="$APP_DIR/ios"

case "$VARIANT" in
  prod)
    BUNDLE_ID="com.guilhermedias.aogimi"
    DISPLAY_NAME="Aogimi"
    # Prod reads the URL from .env, same as before — nothing exported here.
    API_URL=""
    ;;
  dev)
    BUNDLE_ID="com.guilhermedias.aogimi.dev"
    DISPLAY_NAME="Aogimi Dev"
    API_URL="${AOGIMI_DEV_API_URL:-$DEV_API_URL}"
    if [[ "$API_URL" == *FILL-ME-IN* ]]; then
      echo "error: set DEV_API_URL in this script (or AOGIMI_DEV_API_URL) to the hosted dev backend" >&2
      exit 1
    fi
    export EXPO_PUBLIC_DEV_TOOLS=1
    ;;
  *)
    echo "usage: $0 prod|dev [--install]" >&2
    exit 2
    ;;
esac

echo "▸ variant  $VARIANT"
echo "▸ bundle   $BUNDLE_ID  ($DISPLAY_NAME)"
echo "▸ api      ${API_URL:-<from .env>}"
echo "▸ device   $DEVICE"

# Metro caches the Babel transform that inlined the last EXPO_PUBLIC_API_URL.
find "${TMPDIR:-/tmp}" -maxdepth 1 -name 'metro-*' -exec rm -rf {} + 2>/dev/null || true

# The dev URL goes in via the environment: xcodebuild hands its env to the
# "Bundle React Native code and images" script phase, which runs export:embed.
if [[ -n "$API_URL" ]]; then
  export EXPO_PUBLIC_API_URL="$API_URL"
fi

LOG="$(mktemp -t aogimi-xcodebuild)"
echo "▸ building (log: $LOG)"
(
  cd "$IOS_DIR"
  xcodebuild \
    -workspace Aogimi.xcworkspace -scheme Aogimi -configuration Release \
    -destination "id=$DEVICE" \
    -allowProvisioningUpdates -allowProvisioningDeviceRegistration \
    PRODUCT_BUNDLE_IDENTIFIER="$BUNDLE_ID" \
    APP_DISPLAY_NAME="$DISPLAY_NAME" \
    build
) > "$LOG" 2>&1 || { tail -40 "$LOG"; echo "error: build failed — full log at $LOG" >&2; exit 1; }
grep -q "BUILD SUCCEEDED" "$LOG" || { tail -40 "$LOG"; echo "error: no BUILD SUCCEEDED in log" >&2; exit 1; }

APP="$(ls -d "$HOME"/Library/Developer/Xcode/DerivedData/Aogimi-*/Build/Products/Release-iphoneos/Aogimi.app | head -1)"

# Sanity checks — each has caught a bad install at least once.
echo "▸ bundle   $(stat -f '%Sm' "$APP/main.jsbundle")  $(du -h "$APP/main.jsbundle" | cut -f1)"
echo "▸ profile  expires $(security cms -D -i "$APP/embedded.mobileprovision" | plutil -extract ExpirationDate raw -)"
BUILT_ID="$(plutil -extract CFBundleIdentifier raw -o - "$APP/Info.plist")"
BUILT_NAME="$(plutil -extract CFBundleDisplayName raw -o - "$APP/Info.plist")"
[[ "$BUILT_ID" == "$BUNDLE_ID" ]] || { echo "error: built $BUILT_ID, wanted $BUNDLE_ID" >&2; exit 1; }
[[ "$BUILT_NAME" == "$DISPLAY_NAME" ]] || { echo "error: built name '$BUILT_NAME', wanted '$DISPLAY_NAME'" >&2; exit 1; }
if [[ -n "$API_URL" ]] && ! grep -q "$API_URL" "$APP/main.jsbundle"; then
  echo "error: $API_URL not found in main.jsbundle — stale Metro cache?" >&2; exit 1
fi
codesign --verify --deep --strict "$APP"
echo "▸ signed   ok  →  $BUILT_NAME  ($BUILT_ID)"

if [[ $INSTALL -eq 1 ]]; then
  echo "▸ installing"
  xcrun devicectl device install app --device "$DEVICE" "$APP" | grep -E "App installed|bundleID|rror" || true
  echo "▸ launching"
  xcrun devicectl device process launch --device "$DEVICE" "$BUNDLE_ID" | tail -1
fi
