# Music Guessing Game with Spotify Integration

## Overview

This music guessing game application features a modern three-tier architecture with Spotify integration:
- **Frontend**: Nginx serving HTML/JavaScript interface with dynamic song loading
- **Backend**: Node.js/Express API with Spotify OAuth, audio management, and leaderboard functionality
- **Database**: MongoDB for storing songs, player statistics, and metadata

### Key Features
- 🎵 **Spotify Integration**: Import song metadata directly from your Spotify playlists
- 🤖 **Hybrid Audio System**:
  - Automatic download of 30-second Spotify preview clips
  - Manual upload option for full songs or songs without previews
- 📊 **Dynamic Song Management**: Game automatically loads available songs from database
- 🎮 **Interactive Gameplay**: Music guessing with real-time feedback
- 🏆 **Leaderboard System**: Track top players with daily, weekly, and all-time rankings
- 🎨 **Album Art Integration**: Beautiful UI with Spotify album artwork
- 👤 **Admin Panel**: Full song management with OAuth authentication

## Quick Start

### For Spotify Integration Deployment

See [WORKFLOW.md](WORKFLOW.md) for complete step-by-step guide.

**Prerequisites:**
- OpenShift cluster
- Spotify Developer account
- Quay.io account (for container images)

**Quick Deploy:**
```bash
./scripts/deploy-spotify.sh
```

This will:
1. Create namespace and resources
2. Deploy MongoDB, Node.js backend, and Nginx frontend
3. Configure routes and ConfigMaps
4. Display admin panel URL and Spotify redirect URI

### Update Spotify App Settings

After deployment, update your Spotify app with the redirect URI shown in the deployment output:

```bash
https://nginx-route-music-game-spotify.apps.YOUR-CLUSTER.openshift.org/api/admin/spotify/callback
```

## Deployment Guide

### 1. Create the Namespace

Create a dedicated namespace for the Spotify integration:

```bash
oc apply -f deployment-spotify/namespace.yaml
```

### 2. Deploy Services

Navigate to the services directory and apply all service definitions:

```bash
cd deployment-spotify/service-files
oc apply -f mongodb-service.yaml
oc apply -f nodejs-service.yaml
oc apply -f feservice.yaml
```

Services created:
- `mongodb-service` - Internal MongoDB access (port 27017)
- `nodejs-service` - Backend API (ClusterIP on port 3000)
- `frontend-html-service` - Frontend service (port 8080)

### 3. Create Routes

Create routes to expose the application:

```bash
cd ../route-files
oc apply -f nodejs-route.yaml
oc apply -f feroute.yaml
```

Routes:
- `nodejs-route` - Backend API with HTTPS
- `nginx-route` - Frontend with HTTPS and edge TLS termination

### 4. Create ConfigMaps and Secrets

#### Backend URL ConfigMap
```bash
oc create configmap backend-config -n music-game-spotify \
  --from-literal=BACKEND_URL=nodejs-service
```

#### Frontend URL ConfigMap
```bash
oc create configmap frontend-url-config -n music-game-spotify \
  --from-literal=FRONTEND_URL=https://$(oc get route nginx-route -n music-game-spotify -o jsonpath='{.spec.host}')
```

#### Allowed Origins ConfigMap
```bash
oc create configmap frontend-config -n music-game-spotify \
  --from-literal=ALLOWED_ORIGINS=https://$(oc get route nginx-route -n music-game-spotify -o jsonpath='{.spec.host}')
```

#### Spotify Credentials Secret
```bash
oc create secret generic spotify-credentials -n music-game-spotify \
  --from-literal=SPOTIFY_CLIENT_ID='your_client_id' \
  --from-literal=SPOTIFY_CLIENT_SECRET='your_client_secret' \
  --from-literal=SPOTIFY_REDIRECT_URI=https://$(oc get route nginx-route -n music-game-spotify -o jsonpath='{.spec.host}')/api/admin/spotify/callback
```

### 5. Deploy Persistent Volumes

Create persistent storage for MongoDB and audio files:

```bash
cd ../pv-files
oc apply -f pvcmongo.yaml
oc apply -f audio-storage-pvc.yaml
```

Storage:
- `mongodb-pvc` - 5Gi for MongoDB data (gp3-csi)
- `audio-storage-pvc` - 5Gi for audio files (gp3-csi, ReadWriteOnce)

### 6. Deploy Application Components

Deploy MongoDB, Node.js backend, and Nginx frontend:

```bash
cd ..
oc apply -f deploybemongo.yaml
oc apply -f nodejs-deployment.yaml
oc apply -f html_deploy_fe.yaml
```

**Important Configuration Notes:**

**MongoDB:**
- Deployment: `mongodb`
- **Replicas: 1** (IMPORTANT: Must be 1 due to ReadWriteOnce PVC to avoid lock conflicts)
- Image: `quay.io/rhn_support_kquinn/be-mongo-db-spotify:latest`
- Persistent storage mounted at `/data/db`
- Note: Do not scale to 2+ replicas - causes `mongod.lock` conflicts

**Node.js Backend:**
- Deployment: `nodejs-app`
- **Replicas: 1** (MUST be 1 - sessions stored in memory, not shared between pods)
- Image: `quay.io/rhn_support_kquinn/middleware-spotify:latest`
- Environment variables:
  - `MONGO_URL`: MongoDB connection string
  - `SPOTIFY_CLIENT_ID`: From secret
  - `SPOTIFY_CLIENT_SECRET`: From secret
  - `SPOTIFY_REDIRECT_URI`: From secret
  - `FRONTEND_URL`: For OAuth redirects (from frontend-url-config ConfigMap)
  - `AUDIO_UPLOAD_DIR`: `/usr/src/app/uploads/audio`
- Audio storage mounted at `/usr/src/app/uploads`
- **Note**: Admin sessions use in-memory storage. Multiple replicas will break authentication due to OAuth callback hitting different pods. For production with multiple replicas, implement shared session storage (Redis/MongoDB).

**Nginx Frontend:**
- Deployment: `nginx-deployment`
- Replicas: 1
- Image: `quay.io/rhn_support_kquinn/fe-spotify-admin:latest`
- Dynamic configuration via envsubst
- **Proxies /api/ requests to internal nodejs-service** (not external route)
- Cookie forwarding for session management

## Application Architecture

### Hybrid Audio System

The application uses a hybrid approach for audio management:

#### Automatic Preview Download
When importing songs from Spotify:
- System checks for available 30-second preview clips
- Automatically downloads previews in the background
- Songs with previews are immediately playable
- Status: 🎵 "Preview (30s)"

#### Manual Upload
For songs without previews or to use full songs:
- Admin can upload MP3 files through the UI
- System automatically links files to song metadata
- Replaces preview clips if desired
- Status: ✓ "Full Song"

#### Dynamic Song Loading
The game frontend:
- Calls `/api/available-songs` on page load
- Receives only songs with `has_audio: true`
- Adapts to any number of available songs
- Uses Spotify album art as backgrounds

### API Endpoints

#### Public Endpoints
- `GET /api/available-songs` - Get all songs with audio for the game
- `POST /submit-guesses` - Submit player guesses
- `GET /leaderboard?filter=[all|daily|weekly]` - Get top 10 players
- `GET /top-player` - Get highest scoring player
- `GET /audio/:filename` - Serve audio files

#### Admin Endpoints (Requires Authentication)
- `GET /api/admin/spotify/login` - Initiate Spotify OAuth
- `GET /api/admin/spotify/callback` - OAuth callback handler
- `GET /api/admin/spotify/logout` - End admin session
- `GET /api/admin/auth-status` - Check authentication status
- `GET /api/admin/spotify/playlists` - Get user's Spotify playlists
- `GET /api/admin/spotify/playlist/:id/tracks` - Get playlist tracks
- `POST /api/admin/spotify/import-playlist` - Import songs (with auto preview download)
- `GET /api/admin/songs` - Get all songs in database
- `PUT /api/admin/songs/:id` - Update song metadata
- `DELETE /api/admin/songs/:id` - Delete song
- `POST /api/admin/upload-audio/:id` - Upload audio file for a song

### Database Schema

#### Songs Collection
```javascript
{
  _id: ObjectId,
  songNumber: Number,
  mp3_filename: String,
  song_name: String,
  artist_name: String,

  // Spotify metadata
  spotify_id: String,
  spotify_preview_url: String,
  spotify_uri: String,
  album_name: String,
  album_art_url: String,
  release_date: String,
  duration_ms: Number,
  popularity: Number,

  // Audio status
  has_audio: Boolean,
  audio_source: String,  // 'spotify_preview', 'manual_upload', or 'none'
  audio_uploaded_at: Date,

  // Metadata
  difficulty: String,
  category: String,
  uploaded_by: String,
  created_at: Date
}
```

#### Players Collection
```javascript
{
  _id: ObjectId,
  playerName: String,
  guesses: Number,
  correctSongGuesses: Number,
  correctArtistGuesses: Number,
  results: Array,
  timestamp: Date
}
```

## Usage Guide

### Admin Workflow

1. **Access Admin Panel**
   ```
   https://nginx-route-music-game-spotify.apps.YOUR-CLUSTER.openshift.org/admin
   ```

2. **Login with Spotify**
   - Click "Login with Spotify"
   - Authorize the application
   - Return to admin panel (authenticated)

3. **Import Songs**
   - Browse your Spotify playlists
   - Select up to 10 tracks
   - Click "Import Selected Songs"
   - System automatically downloads available preview clips
   - See results: "✓ X Spotify previews auto-downloaded (30s clips)"

4. **Upload Full Songs (Optional)**
   - Go to "Manage Songs" tab
   - For songs showing "⚠ No Audio" or to replace previews
   - Click "Upload Audio" or "Replace Audio"
   - Select MP3 file (max 10MB)
   - Upload completes automatically

5. **Manage Songs**
   - View all imported songs
   - Check audio status (Preview/Full Song/No Audio)
   - Replace or delete songs as needed

### Player Workflow

1. **Access Game**
   ```
   https://nginx-route-music-game-spotify.apps.YOUR-CLUSTER.openshift.org/
   ```

2. **Play**
   - Enter your name
   - Click "Play Song"
   - Listen to 30-second clips
   - Enter song and artist guesses
   - Get immediate feedback
   - View final score and leaderboard

## Troubleshooting

### Deployment Issues

#### "ERR_TOO_MANY_REDIRECTS" or redirect loop
**Symptom:** Accessing `/api/admin/spotify/login` causes infinite redirect loop

**Cause:** The `backend-config` ConfigMap is set to external route URL instead of internal service name

**Solution:**
```bash
# Update the ConfigMap to use internal service
oc create configmap backend-config -n music-game-spotify \
  --from-literal=BACKEND_URL=nodejs-service \
  --dry-run=client -o yaml | oc apply -f -

# Restart nginx to pick up the change
oc rollout restart deployment nginx-deployment -n music-game-spotify
```

**Prevention:** The `deploy-spotify.sh` script now sets this correctly by default

#### MongoDB CrashLoopBackOff - "Unable to lock mongod.lock"
**Symptom:** One or more MongoDB pods fail to start with lock file error

**Cause:** Multiple MongoDB replicas trying to use same ReadWriteOnce PVC

**Solution:**
```bash
# Scale MongoDB to exactly 1 replica
oc scale deployment mongodb -n music-game-spotify --replicas=1
```

**Prevention:** The deployment YAML now defaults to 1 replica

#### nodejs-app pods in CreateContainerConfigError
**Symptom:** Pods show "configmap 'frontend-url-config' not found"

**Cause:** Missing ConfigMap that wasn't created by deployment script

**Solution:**
```bash
# Create the missing ConfigMap
NGINX_ROUTE=$(oc get route nginx-route -n music-game-spotify -o jsonpath='{.spec.host}')
oc create configmap frontend-url-config -n music-game-spotify \
  --from-literal=FRONTEND_URL=https://${NGINX_ROUTE} \
  --dry-run=client -o yaml | oc apply -f -
```

**Prevention:** The `deploy-spotify.sh` script now creates this ConfigMap automatically

### Application Issues

#### "INVALID_CLIENT: Invalid redirect URI"
**Solution:** Update Spotify app redirect URI to match your cluster URL:
```
https://nginx-route-music-game-spotify.apps.YOUR-CLUSTER.openshift.org/api/admin/spotify/callback
```

#### "No songs available"
**Solution:** Import songs and ensure they have audio (either preview downloads or manual uploads)

#### Preview download failed
**Reason:** Not all Spotify tracks have preview URLs available
**Solution:** Manually upload MP3 file for that song

#### Session not persisting
**Solution:** Ensure nginx route has TLS configured and cookies are enabled in browser

#### Audio files not persisting after pod restart
**Solution:** Verify PVC is properly mounted and using gp3-csi storage class

## Development

### Building Docker Images

**Backend:**
```bash
cd dockerfiles/middleware-node-js-app
podman build -t quay.io/YOUR_USERNAME/middleware-spotify:latest .
podman push quay.io/YOUR_USERNAME/middleware-spotify:latest
```

**Frontend:**
```bash
cd dockerfiles/fe
podman build -t quay.io/YOUR_USERNAME/fe-spotify-admin:latest .
podman push quay.io/YOUR_USERNAME/fe-spotify-admin:latest
```

**MongoDB:**
```bash
cd dockerfiles/be
podman build -t quay.io/YOUR_USERNAME/be-mongo-db-spotify:latest .
podman push quay.io/YOUR_USERNAME/be-mongo-db-spotify:latest
```

### Testing Locally

Run with Docker Compose or Podman Compose:
```bash
# Set environment variables
export SPOTIFY_CLIENT_ID='your_client_id'
export SPOTIFY_CLIENT_SECRET='your_client_secret'
export SPOTIFY_REDIRECT_URI='http://localhost:3000/api/admin/spotify/callback'

# Start services
docker-compose up
```

## Features Roadmap

- [x] Spotify OAuth integration
- [x] Playlist browsing and import
- [x] Automatic preview clip downloads
- [x] Manual audio upload
- [x] Dynamic song loading
- [x] Admin song management
- [x] Player leaderboards
- [x] Album art integration
- [ ] Bulk audio upload
- [ ] Category/difficulty filtering
- [ ] Multi-round game modes
- [ ] Social sharing
- [ ] Audio preview playback in admin panel

## Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

This project is for educational purposes.

## Support

For issues and questions:
- Check [WORKFLOW.md](WORKFLOW.md) for detailed usage guide
- Review troubleshooting sections
- Check OpenShift logs: `oc logs deployment/nodejs-app -n music-game-spotify`

---

**Note:** This application uses Spotify's preview URLs (30-second clips) which are publicly available. For full songs, you must provide your own legally sourced audio files.
