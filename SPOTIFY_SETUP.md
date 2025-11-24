# Spotify Integration Setup Guide

This guide walks you through setting up Spotify API integration for the music guessing game admin panel.

## Prerequisites

- Spotify account (free or premium)
- Access to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
- OpenShift cluster with HTTPS-enabled routes

## Step 1: Create Spotify Developer App

1. Navigate to https://developer.spotify.com/dashboard
2. Log in with your Spotify credentials
3. Click **"Create an App"**
4. Fill in the application details:
   - **App Name**: `Music Guessing Game Admin`
   - **App Description**: `Admin panel for team-building music quiz game`
   - **Website**: (optional) Your company website
   - **Redirect URIs**: Add BOTH of these:
     ```
     http://127.0.0.1:3000/api/admin/spotify/callback
     https://nodejs-route-music-game.apps.ci-ln-l20996b-76ef8.aws-4.ci.openshift.org/api/admin/spotify/callback
     ```
5. Check **"I understand and agree with Spotify's Developer Terms of Service and Design Guidelines"**
6. Click **"Save"**

## Step 2: Get Your Credentials

After creating the app:

1. You'll see your **Client ID** displayed
2. Click **"Show Client Secret"** to reveal your **Client Secret**
3. **IMPORTANT**: Copy both values - you'll need them in the next step

Example:
```
Client ID: abc123def456ghi789jkl012mno345pq
Client Secret: rst678uvw901xyz234abc567def890ghi
```

## Step 3: Store Credentials in OpenShift

We'll create a Kubernetes Secret to securely store these credentials:

```bash
# Create a secret with your Spotify credentials
oc create secret generic spotify-credentials \
  --from-literal=SPOTIFY_CLIENT_ID='your_client_id_here' \
  --from-literal=SPOTIFY_CLIENT_SECRET='your_client_secret_here' \
  --from-literal=SPOTIFY_REDIRECT_URI='https://nodejs-route-music-game.apps.ci-ln-l20996b-76ef8.aws-4.ci.openshift.org/api/admin/spotify/callback' \
  -n music-game
```

**Replace** `your_client_id_here` and `your_client_secret_here` with your actual values!

## Step 4: Verify Route Has HTTPS

The nodejs route should now have HTTPS enabled:

```bash
# Check the route
oc get route nodejs-route -n music-game

# You should see something like:
# NAME           HOST/PORT
# nodejs-route   nodejs-route-music-game.apps...   nodejs-service   3000   edge/Redirect   None
```

The `edge/Redirect` confirms HTTPS is enabled.

## Step 5: Update Deployment to Use Secrets

The backend deployment will be updated to inject these environment variables from the secret.

This will be handled automatically when you deploy the updated code.

## Security Notes

### ✅ DO:
- Keep your Client Secret private
- Use Kubernetes Secrets for credentials
- Never commit credentials to git
- Rotate credentials if exposed

### ❌ DON'T:
- Share your Client Secret publicly
- Commit `.env` files with real credentials
- Use HTTP for production redirect URIs
- Store credentials in code

## Spotify API Scopes Required

For playlist browsing and metadata import, we need these scopes:

- `user-read-private` - Access user profile
- `user-read-email` - Access user email
- `playlist-read-private` - Read user's private playlists
- `playlist-read-collaborative` - Read collaborative playlists

These will be requested during the OAuth flow.

## Testing Locally

For local development:

1. Set environment variables:
   ```bash
   export SPOTIFY_CLIENT_ID='your_client_id'
   export SPOTIFY_CLIENT_SECRET='your_client_secret'
   export SPOTIFY_REDIRECT_URI='http://127.0.0.1:3000/api/admin/spotify/callback'
   ```

2. Run the backend:
   ```bash
   cd dockerfiles/middleware-node-js-app
   npm install
   node app.js
   ```

3. Navigate to:
   ```
   http://127.0.0.1:3000/admin
   ```

## Troubleshooting

### "Invalid redirect URI" Error
- Make sure you added the exact redirect URI to your Spotify app settings
- Check for typos in the URL
- Ensure you're using HTTPS for production
- For local dev, use `127.0.0.1` not `localhost`

### "Invalid client" Error
- Verify your Client ID and Client Secret are correct
- Check that the secret is properly created in OpenShift
- Ensure environment variables are injected into the pod

### HTTPS Not Working
- Verify the route has TLS configuration: `oc get route nodejs-route -o yaml`
- Check OpenShift router certificate
- Try accessing the HTTPS URL directly in browser

## Next Steps

Once Spotify is configured:

1. Admin logs in via Spotify OAuth
2. Browse and select playlists
3. Import song metadata
4. Upload 30-second audio clips
5. Songs become available in the game

See [ADMIN_GUIDE.md](./ADMIN_GUIDE.md) for full admin panel usage.
