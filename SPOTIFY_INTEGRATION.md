# Spotify Integration - Development Plan

## Overview

This document outlines the Spotify integration for the Music Guessing Game, designed for enterprise team-building with the ability to import playlists from Spotify.

## Architecture - Option A: Separate Namespace

We're using **Option A** - deploying Spotify integration in a completely separate namespace to keep the working Phase 1 deployment safe and untouched.

### Namespaces

| Namespace | Purpose | Status | Container Images |
|-----------|---------|--------|------------------|
| `music-game` | Phase 1 - Working Production | ✅ Deployed | `middleware-js-artists-sep-remove-leader:phase1`<br>`fe_sep_remove_song_select_leader:phase1`<br>`be-mongo-db-artist-new:latest` |
| `music-game-spotify` | Spotify Integration - Testing | 🚧 In Development | `middleware-js-artists-spotify-int:latest`<br>`fe-spotify-admin:latest`<br>`be-mongo-db-artist-new:latest` |

## New Container Images

### Backend - `middleware-js-artists-spotify-int:latest`
**Features:**
- All Phase 1 improvements (fuzzy matching, leaderboards, etc.)
- Spotify OAuth authentication
- Playlist browsing API
- Song metadata import from Spotify
- Audio file upload endpoint
- Admin authentication

**New Dependencies:**
- `spotify-web-api-node` - Spotify API wrapper
- `multer` - File uploads
- `dotenv` - Environment configuration

### Frontend - `fe-spotify-admin:latest`
**Features:**
- All Phase 1 UI improvements
- Admin panel UI
- Spotify login button
- Playlist browser
- Song import wizard
- Audio upload interface

## Deployment Strategy

### Phase 1 (Working) - music-game namespace
```
✅ Stays untouched
✅ Continues to work as-is
✅ Production-ready
```

### Spotify Integration - music-game-spotify namespace
```
🚧 Development/Testing environment
🚧 Can be deleted/redeployed safely
🚧 No impact on Phase 1
```

## Implementation Plan

### ✅ Completed
1. Created `spotify-integration` git branch
2. Set up Spotify Developer app
3. Got Spotify API credentials
4. Added HTTPS/TLS to routes
5. Created separate namespace structure
6. Updated deployment manifests for new namespace
7. Created new container image names
8. Created deployment automation scripts

### 🚧 In Progress
9. Implement Spotify OAuth backend flow
10. Create admin panel UI

### 📋 TODO
11. Build playlist browsing functionality
12. Add audio upload system
13. Update database schema for Spotify metadata
14. Build and push container images
15. Deploy to music-game-spotify namespace
16. Test full workflow

## Spotify API Configuration

### Credentials
- **Client ID**: `502699049878415ca253b4e1e73f6bd3`
- **Client Secret**: `3d5497dfc9cb4a83aa4446f513925336` (stored in Kubernetes secret)

### Redirect URIs (in Spotify App Settings)
```
http://127.0.0.1:3000/api/admin/spotify/callback
https://nodejs-route-music-game-spotify.apps.ci-ln-l20996b-76ef8.aws-4.ci.openshift.org/api/admin/spotify/callback
```

### Scopes Required
- `user-read-private` - Access user profile
- `user-read-email` - Access user email
- `playlist-read-private` - Read private playlists
- `playlist-read-collaborative` - Read collaborative playlists

## Deployment Commands

### Deploy Spotify Integration
```bash
# When cluster is online, run:
./scripts/deploy-spotify.sh
```

This will:
1. Create `music-game-spotify` namespace
2. Deploy all services
3. Create routes
4. Create ConfigMaps
5. Create Spotify credentials secret
6. Deploy MongoDB, backend, frontend

### Manual Deployment Steps
```bash
# 1. Create namespace
oc apply -f deployment-spotify/namespace.yaml

# 2. Create Spotify secret
./scripts/create-spotify-secret.sh

# 3. Deploy all components
oc apply -f deployment-spotify/services-files/
oc apply -f deployment-spotify/route-files/
oc apply -f deployment-spotify/pv-files/
oc apply -f deployment-spotify/deploybemongo.yaml
oc apply -f deployment-spotify/nodejs-deployment.yaml
oc apply -f deployment-spotify/html_deploy_fe.yaml
```

## Admin Workflow (Once Implemented)

1. **Admin logs in with Spotify**
   - Navigate to `/admin`
   - Click "Login with Spotify"
   - OAuth redirects to Spotify
   - Authorize app
   - Redirect back with access token

2. **Browse playlists**
   - View user's Spotify playlists
   - Search Spotify catalog
   - Preview songs

3. **Import songs**
   - Select playlist
   - Choose songs (up to 10)
   - Import metadata (title, artist, album, art)

4. **Upload audio clips**
   - For each song, upload 30-second MP3 clip
   - Or use Spotify preview if available (deprecated)

5. **Create game**
   - Assign to category/team
   - Set difficulty
   - Schedule challenge
   - Notify players

## API Endpoints (To Be Implemented)

### Admin Authentication
```
GET  /api/admin/spotify/login
GET  /api/admin/spotify/callback
GET  /api/admin/spotify/logout
```

### Playlist Management
```
GET  /api/admin/spotify/playlists
GET  /api/admin/spotify/playlist/:id/tracks
POST /api/admin/spotify/import-playlist
```

### Song Management
```
POST /api/admin/upload-audio
GET  /api/admin/songs
PUT  /api/admin/songs/:id
DELETE /api/admin/songs/:id
```

### Game Management
```
POST /api/admin/create-challenge
GET  /api/admin/challenges
POST /api/admin/challenges/:id/notify-team
```

## Database Schema Updates

### Songs Collection (Enhanced)
```javascript
{
  songNumber: 1,
  mp3_filename: 'song1.mp3',
  song_name: 'Born to Run',
  artist_name: 'Bruce Springsteen',

  // New Spotify metadata
  spotify_id: '4RiGHUVnNJN3TLjZ7ZLlWo',
  spotify_preview_url: null,
  album_name: 'Born to Run',
  album_art_url: 'https://i.scdn.co/image/...',
  release_year: 1975,
  genres: ['rock', 'classic rock'],
  duration_ms: 270000,
  popularity: 78,

  // Game metadata
  difficulty: 'medium',
  category: 'team-building-pack-1',
  uploaded_by: 'admin@company.com',
  created_at: Date
}
```

## Security

### Credentials Storage
- ✅ Spotify credentials stored in Kubernetes secrets
- ✅ Never committed to git
- ✅ Injected as environment variables

### .gitignore Rules
- ✅ `.env*` files ignored
- ✅ `.env.spotify` ignored
- ✅ Only `.env.example` templates committed

## Testing

### Local Testing
```bash
export SPOTIFY_CLIENT_ID='502699049878415ca253b4e1e73f6bd3'
export SPOTIFY_CLIENT_SECRET='3d5497dfc9cb4a83aa4446f513925336'
export SPOTIFY_REDIRECT_URI='http://127.0.0.1:3000/api/admin/spotify/callback'

cd dockerfiles/middleware-node-js-app
npm install
node app.js
```

### Cluster Testing
```bash
# Deploy to music-game-spotify namespace
./scripts/deploy-spotify.sh

# Access admin panel
https://nodejs-route-music-game-spotify.apps.ci-ln-l20996b-76ef8.aws-4.ci.openshift.org/admin
```

## Rollback Strategy

If Spotify integration has issues:

1. **Phase 1 is unaffected** - `music-game` namespace continues working
2. **Delete Spotify namespace**: `oc delete namespace music-game-spotify`
3. **Restart development** on `spotify-integration` branch
4. **No impact** to production users

## Next Steps

1. ✅ Complete infrastructure setup
2. 🚧 Implement Spotify OAuth backend
3. 📋 Build admin panel UI
4. 📋 Add playlist browsing
5. 📋 Add audio upload
6. 📋 Test full workflow
7. 📋 Merge to main when stable
