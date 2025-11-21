# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

This is a containerized music guessing game application designed to run on OpenShift. The application consists of three main components:
- **Frontend**: Nginx serving HTML/JavaScript with music clips
- **Backend**: Node.js/Express API handling game logic
- **Database**: MongoDB storing song metadata and player scores

## Common Deployment Commands

### Initial Setup

Create namespace and configure security:
```bash
oc apply -f namespace-yaml/appns.yaml
oc adm policy add-scc-to-user privileged -z default -n music-game
```

### Deploy Services

```bash
oc apply -f services-files/feservice.yaml        # Frontend service
oc apply -f services-files/servicedb.yaml        # MongoDB service
oc apply -f services-files/nodejs-service.yaml   # Node.js service
```

### Deploy Routes

```bash
oc apply -f route-files/feroute.yaml             # Frontend route
oc apply -f route-files/nodejs-route.yaml        # Backend route
```

### Configure Dynamic URLs (Required)

After routes are created, create ConfigMaps with route URLs:
```bash
oc create configmap backend-config -n music-game --from-literal=BACKEND_URL=$(oc get route nodejs-route -n music-game -o jsonpath='{.spec.host}')
oc create configmap frontend-config -n music-game --from-literal=ALLOWED_ORIGINS=$(oc get route nginx-route -n music-game -o jsonpath='{.spec.host}')
```

### Deploy Storage

```bash
oc apply -f pv-files/pvmongo.yaml                # PVC for MongoDB
oc apply -f pv-files/pvcmongo.yaml               # PV for MongoDB
```

### Deploy Applications

```bash
oc apply -f deployment-files/deploybemongo.yaml      # MongoDB deployment
oc apply -f deployment-files/nodejs-deployment.yaml  # Node.js backend
oc apply -f deployment-files/html_deploy_fe.yaml     # Nginx frontend
```

## Architecture

### Three-Tier Architecture

1. **Frontend (Nginx)**:
   - Serves static HTML/JavaScript game interface
   - Hosts 10 song MP3 clips (song1.mp3 - song10.mp3)
   - Uses `envsubst` to inject BACKEND_URL at runtime from ConfigMap
   - Template files: `index.html.template`, `script.js.template`, `nginx.conf.template`
   - Runs on port 8080 (unprivileged)

2. **Backend (Node.js/Express)**:
   - Provides `/submit-guesses` endpoint to validate player guesses
   - Provides `/leaderboard` endpoint to retrieve top 10 players
   - Provides `/test-db` endpoint to check MongoDB connectivity
   - Uses MongoDB native driver (not Mongoose, despite being in package.json)
   - Connects to MongoDB via internal service: `mongodb://mongodb-service:27017`
   - Runs on port 3000
   - CORS configured to accept all origins

3. **Database (MongoDB 6.0)**:
   - Initialized with `init.js` script containing 10 songs with metadata:
     - `songNumber`, `mp3_filename`, `song_name`, `artist_name`
   - Two collections: `songs` (pre-populated) and `players` (populated at runtime)
   - Persistent storage via PVC mounted at `/data/db`
   - Uses privileged security context with `fsGroup: 1000710000`

### Key Configuration Pattern

The application uses **template substitution** to dynamically configure URLs:
- ConfigMaps store OpenShift route URLs (determined after routes are created)
- Nginx and Node.js deployments reference these ConfigMaps as environment variables
- Frontend uses `envsubst` to replace `${BACKEND_URL}` placeholders in templates at container startup
- This allows the same container images to work across different OpenShift clusters/routes

### Container Images

All images are hosted on Quay.io under `quay.io/rhn_support_kquinn/`:
- `fe_revised_artist_sep_remove_song_select:latest` - Frontend
- `middleware-node-js-app-artists-sep-remove:latest` - Backend
- `be-mongo-db-artist-new:latest` - MongoDB

## Building Container Images

Each component has a Dockerfile in `dockerfiles/`:

```bash
# Build frontend
cd dockerfiles/fe
podman build -t quay.io/rhn_support_kquinn/fe_revised_artist_sep_remove_song_select:latest .
podman push quay.io/rhn_support_kquinn/fe_revised_artist_sep_remove_song_select:latest

# Build backend
cd dockerfiles/middleware-node-js-app
podman build -t quay.io/rhn_support_kquinn/middleware-node-js-app-artists-sep-remove:latest .
podman push quay.io/rhn_support_kquinn/middleware-node-js-app-artists-sep-remove:latest

# Build database
cd dockerfiles/be-mongo-db
podman build -t quay.io/rhn_support_kquinn/be-mongo-db-artist-new:latest .
podman push quay.io/rhn_support_kquinn/be-mongo-db-artist-new:latest
```

## Game Logic Flow

1. Frontend serves 10 music clips and collects player guesses (song name + artist name)
2. Player submits guesses to backend via POST `/submit-guesses` with payload:
   ```json
   {
     "playerName": "string",
     "guesses": [
       {"songFile": "song1", "songGuess": "Beautiful Day", "artistGuess": "U2"},
       ...
     ]
   }
   ```
3. Backend validates each guess against MongoDB `songs` collection
4. Backend updates/creates player record in `players` collection
5. Backend returns score and correct answers to frontend
6. Scoring: 2 points possible per song (1 for song name, 1 for artist)
7. Leaderboard displays top 10 players sorted by total correct (songs + artists)

## Important Notes

- **Security Context**: MongoDB requires privileged security context due to hostPath PV permissions
- **ConfigMap Order**: Routes must exist before creating ConfigMaps (see setup script in `script/scripts.txt`)
- **Template Files**: Never edit `index.html`, `script.js`, or `nginx.conf` directly - edit `.template` files
- **Database Initialization**: MongoDB initializes only on first run via `init.js` (uses Docker entrypoint)
- **Leaderboard**: Excludes test players (playerName: 'Test Player') from results
- **Connection Pooling**: Backend uses MongoDB connection pooling (maxPoolSize: 10, minPoolSize: 2)
- **Retry Logic**: Backend retries MongoDB connection up to 5 times with 2-second delays
