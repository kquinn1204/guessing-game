#!/bin/bash
# Script to create Kubernetes secret with Spotify credentials

echo "Creating Spotify credentials secret in music-game-spotify namespace..."

# Get the actual route hostname
ROUTE_HOST=$(oc get route nodejs-route -n music-game-spotify -o jsonpath='{.spec.host}' 2>/dev/null)

if [ -z "$ROUTE_HOST" ]; then
  echo "⚠️  Warning: nodejs-route not found yet. Using placeholder URL."
  echo "You will need to update this secret after routes are created."
  REDIRECT_URI="https://PLACEHOLDER/api/admin/spotify/callback"
else
  REDIRECT_URI="https://${ROUTE_HOST}/api/admin/spotify/callback"
  echo "Using redirect URI: $REDIRECT_URI"
fi

# Delete existing secret if it exists
oc delete secret spotify-credentials -n music-game-spotify 2>/dev/null || true

# Create new secret
oc create secret generic spotify-credentials \
  --from-literal=SPOTIFY_CLIENT_ID='502699049878415ca253b4e1e73f6bd3' \
  --from-literal=SPOTIFY_CLIENT_SECRET='3d5497dfc9cb4a83aa4446f513925336' \
  --from-literal=SPOTIFY_REDIRECT_URI="${REDIRECT_URI}" \
  -n music-game-spotify

echo "✅ Secret created successfully in music-game-spotify namespace!"
echo ""
echo "IMPORTANT: Add this redirect URI to your Spotify app settings:"
echo "👉 ${REDIRECT_URI}"
echo ""
echo "Go to: https://developer.spotify.com/dashboard"
echo "Edit your app → Redirect URIs → Add the URL above"
echo ""
echo "Verify with: oc get secret spotify-credentials -n music-game-spotify"
