# Music Game Spotify Integration - Deployment Guide

This directory contains the deployment configuration for the Music Guessing Game with Spotify integration.

## Quick Deploy

To deploy the complete application with all dependencies:

```bash
./scripts/deploy-complete.sh
```

This script will:
1. Create the namespace
2. Deploy MongoDB with persistent storage
3. Deploy the Node.js backend API
4. Deploy the Nginx frontend
5. Create routes and services
6. **Automatically configure ConfigMaps with the correct route URLs**
7. **Automatically configure Spotify credentials with the correct redirect URI**

## Manual Deployment

If you prefer to deploy components individually:

```bash
# 1. Create namespace
oc apply -f deployment-spotify/namespace.yaml

# 2. Create PVs and PVCs
oc apply -f deployment-spotify/pv-files/

# 3. Deploy MongoDB
oc apply -f deployment-spotify/deploybemongo.yaml

# 4. Deploy services
oc apply -f deployment-spotify/services-files/

# 5. Deploy applications
oc apply -f deployment-spotify/nodejs-deployment.yaml
oc apply -f deployment-spotify/html_deploy_fe.yaml

# 6. Create routes
oc apply -f deployment-spotify/route-files/

# 7. Create ConfigMaps (after routes are created)
FRONTEND_ROUTE=$(oc get route nginx-route -n music-game-spotify -o jsonpath='{.spec.host}')

oc create configmap backend-config \
  --from-literal=BACKEND_URL="nodejs-service:3000" \
  -n music-game-spotify

oc create configmap frontend-config \
  --from-literal=ALLOWED_ORIGINS="https://${FRONTEND_ROUTE}" \
  -n music-game-spotify

oc create configmap frontend-url-config \
  --from-literal=FRONTEND_URL="https://${FRONTEND_ROUTE}" \
  -n music-game-spotify

# 8. Create Spotify credentials
./scripts/create-spotify-secret.sh

# 9. Restart deployments to pick up config
oc rollout restart deployment/nodejs-app -n music-game-spotify
oc rollout restart deployment/nginx-deployment -n music-game-spotify
```

## ConfigMap Values Explained

### Static Values (Never Change)

- **backend-config/BACKEND_URL**: `nodejs-service:3000`
  - This is the internal Kubernetes service name
  - Works the same on any OpenShift cluster
  - Nginx uses this to proxy API requests internally

### Dynamic Values (Cluster-Specific)

These values are automatically populated based on the OpenShift route hostnames:

- **frontend-config/ALLOWED_ORIGINS**: `https://<nginx-route-host>`
  - Used for CORS configuration
  - Must match the actual frontend route URL

- **frontend-url-config/FRONTEND_URL**: `https://<nginx-route-host>`
  - Used by backend for OAuth redirects
  - Must match the actual frontend route URL

- **spotify-credentials/SPOTIFY_REDIRECT_URI**: `https://<nginx-route-host>/api/admin/spotify/callback`
  - OAuth callback URL for Spotify
  - Must be registered in Spotify Developer Dashboard

## Important Notes

### Why Use Internal Service Name?

The nginx frontend proxies to `nodejs-service:3000` (internal) instead of the external route. This prevents redirect loops because:
- External routes use TLS with HTTP→HTTPS redirect
- Internal service-to-service communication uses plain HTTP
- No redirect loops occur

### Scaling Limitations

Both MongoDB and Node.js are currently limited to 1 replica because:
- The PVCs use `ReadWriteOnce` access mode
- Only one pod can mount the volume at a time

To scale beyond 1 replica:
- Use ReadWriteMany storage (requires compatible storage class)
- Or use object storage for audio files instead of PVC

## Accessing the Application

After deployment:

- **Main Game**: `https://<nginx-route>/`
- **Admin Panel**: `https://<nginx-route>/admin`
- **Backend API**: `https://<nodejs-route>/`

Get your routes:
```bash
oc get routes -n music-game-spotify
```

## Spotify Configuration

After deployment, you MUST add the redirect URI to your Spotify app:

1. Go to https://developer.spotify.com/dashboard
2. Open your Spotify app
3. Click "Edit Settings"
4. Add the redirect URI shown in the deployment output
5. Save changes

The redirect URI format is:
```
https://<nginx-route>/api/admin/spotify/callback
```

## Troubleshooting

### Redirect Loop on Frontend
- Ensure backend-config uses internal service: `nodejs-service:3000`
- NOT the external route hostname

### Pods Not Starting
- Check ConfigMaps exist: `oc get configmaps -n music-game-spotify`
- Check secret exists: `oc get secret spotify-credentials -n music-game-spotify`
- View pod logs: `oc logs deployment/nodejs-app -n music-game-spotify`

### Multiple Pods in ContainerCreating
- PVCs are ReadWriteOnce - only 1 pod can mount them
- Scale deployments to 1 replica

## Directory Structure

```
deployment-spotify/
├── namespace.yaml              # Namespace definition
├── deploybemongo.yaml         # MongoDB deployment
├── nodejs-deployment.yaml      # Node.js backend deployment
├── html_deploy_fe.yaml        # Nginx frontend deployment
├── pv-files/                  # Persistent volume configs
│   ├── pvmongo.yaml
│   ├── pvcmongo.yaml
│   └── audio-storage-pvc.yaml
├── services-files/            # Service definitions
│   ├── servicedb.yaml
│   ├── nodejs-service.yaml
│   └── feservice.yaml
├── route-files/               # Route definitions
│   ├── nodejs-route.yaml
│   └── feroute.yaml
└── configmaps/                # ConfigMap templates (for reference)
    ├── backend-config.yaml
    ├── frontend-config.yaml
    └── frontend-url-config.yaml
```

## Cleanup

To remove the entire deployment:

```bash
oc delete namespace music-game-spotify
```
