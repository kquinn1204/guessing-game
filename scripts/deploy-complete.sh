#!/bin/bash
# Complete deployment script for Music Game with Spotify integration

set -e  # Exit on error

NAMESPACE="music-game-spotify"

echo "========================================="
echo "Music Game Spotify - Complete Deployment"
echo "========================================="
echo ""

# Step 1: Create namespace
echo "1. Creating namespace..."
oc apply -f deployment-spotify/namespace.yaml

# Step 2: Create PVs and PVCs
echo "2. Creating persistent volumes..."
oc apply -f deployment-spotify/pv-files/

# Step 3: Deploy MongoDB
echo "3. Deploying MongoDB..."
oc apply -f deployment-spotify/deploybemongo.yaml

# Step 4: Deploy services
echo "4. Creating services..."
oc apply -f deployment-spotify/services-files/

# Step 5: Deploy applications (without waiting for them to be ready yet)
echo "5. Deploying applications..."
oc apply -f deployment-spotify/nodejs-deployment.yaml
oc apply -f deployment-spotify/html_deploy_fe.yaml

# Step 6: Create routes
echo "6. Creating routes..."
oc apply -f deployment-spotify/route-files/

# Step 7: Wait for routes to be ready
echo "7. Waiting for routes to be created..."
sleep 5

# Step 8: Get route hostnames
FRONTEND_ROUTE=$(oc get route nginx-route -n $NAMESPACE -o jsonpath='{.spec.host}' 2>/dev/null)
BACKEND_ROUTE=$(oc get route nodejs-route -n $NAMESPACE -o jsonpath='{.spec.host}' 2>/dev/null)

if [ -z "$FRONTEND_ROUTE" ] || [ -z "$BACKEND_ROUTE" ]; then
  echo "❌ Error: Routes not created properly"
  exit 1
fi

echo "   Frontend route: https://${FRONTEND_ROUTE}"
echo "   Backend route: https://${BACKEND_ROUTE}"

# Step 9: Create ConfigMaps with actual route values
echo "8. Creating ConfigMaps..."

# Delete existing ConfigMaps if they exist
oc delete configmap backend-config frontend-config frontend-url-config -n $NAMESPACE 2>/dev/null || true

# backend-config: Internal service name (always the same)
# Note: Service port is 80 (maps to container port 3000), so no port needed in URL
oc create configmap backend-config \
  --from-literal=BACKEND_URL="nodejs-service" \
  -n $NAMESPACE

# frontend-config: External frontend URL for CORS
oc create configmap frontend-config \
  --from-literal=ALLOWED_ORIGINS="https://${FRONTEND_ROUTE}" \
  -n $NAMESPACE

# frontend-url-config: External frontend URL for redirects
oc create configmap frontend-url-config \
  --from-literal=FRONTEND_URL="https://${FRONTEND_ROUTE}" \
  -n $NAMESPACE

echo "   ✅ ConfigMaps created"

# Step 10: Create Spotify credentials secret
echo "9. Creating Spotify credentials..."

REDIRECT_URI="https://${FRONTEND_ROUTE}/api/admin/spotify/callback"

oc delete secret spotify-credentials -n $NAMESPACE 2>/dev/null || true

oc create secret generic spotify-credentials \
  --from-literal=SPOTIFY_CLIENT_ID='502699049878415ca253b4e1e73f6bd3' \
  --from-literal=SPOTIFY_CLIENT_SECRET='3d5497dfc9cb4a83aa4446f513925336' \
  --from-literal=SPOTIFY_REDIRECT_URI="${REDIRECT_URI}" \
  -n $NAMESPACE

echo "   ✅ Spotify secret created"

# Step 11: Restart deployments to pick up ConfigMaps and Secrets
echo "10. Restarting deployments to apply configuration..."
oc rollout restart deployment/nodejs-app -n $NAMESPACE
oc rollout restart deployment/nginx-deployment -n $NAMESPACE

# Step 12: Scale MongoDB to 1 (PVC is ReadWriteOnce)
echo "11. Scaling MongoDB to 1 replica..."
oc scale deployment mongodb --replicas=1 -n $NAMESPACE

# Step 13: Scale nodejs to 1 (audio-storage PVC is ReadWriteOnce)
echo "12. Scaling Node.js app to 1 replica..."
oc scale deployment nodejs-app --replicas=1 -n $NAMESPACE

# Step 14: Wait for deployments to be ready
echo "13. Waiting for deployments to be ready..."
oc rollout status deployment/mongodb -n $NAMESPACE --timeout=120s
oc rollout status deployment/nodejs-app -n $NAMESPACE --timeout=120s
oc rollout status deployment/nginx-deployment -n $NAMESPACE --timeout=120s

echo ""
echo "========================================="
echo "✅ Deployment Complete!"
echo "========================================="
echo ""
echo "Frontend URL: https://${FRONTEND_ROUTE}"
echo "Admin Panel:  https://${FRONTEND_ROUTE}/admin"
echo "Backend API:  https://${BACKEND_ROUTE}"
echo ""
echo "IMPORTANT: Add this Spotify redirect URI to your app settings:"
echo "👉 ${REDIRECT_URI}"
echo ""
echo "Go to: https://developer.spotify.com/dashboard"
echo "Edit your app → Redirect URIs → Add the URL above"
echo ""
echo "Check deployment status:"
echo "  oc get pods -n $NAMESPACE"
echo ""
