#!/bin/bash
# Script to create Kubernetes secret with Spotify credentials

echo "Creating Spotify credentials secret in music-game-spotify namespace..."

# Delete existing secret if it exists
oc delete secret spotify-credentials -n music-game-spotify 2>/dev/null || true

# Create new secret
oc create secret generic spotify-credentials \
  --from-literal=SPOTIFY_CLIENT_ID='502699049878415ca253b4e1e73f6bd3' \
  --from-literal=SPOTIFY_CLIENT_SECRET='3d5497dfc9cb4a83aa4446f513925336' \
  --from-literal=SPOTIFY_REDIRECT_URI='https://nodejs-route-music-game-spotify.apps.ci-ln-l20996b-76ef8.aws-4.ci.openshift.org/api/admin/spotify/callback' \
  -n music-game-spotify

echo "✅ Secret created successfully in music-game-spotify namespace!"
echo ""
echo "Verify with: oc get secret spotify-credentials -n music-game-spotify"
