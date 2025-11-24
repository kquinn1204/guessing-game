#!/bin/bash
# Script to deploy music guessing game with Spotify integration

set -e  # Exit on error

echo "🎵 Deploying Music Guessing Game - Spotify Integration"
echo "=============================================="
echo ""

# 1. Create namespace
echo "📦 Creating namespace..."
oc apply -f deployment-spotify/namespace.yaml

# 2. Add privileged SCC
echo "🔐 Adding privileged SCC to default service account..."
oc adm policy add-scc-to-user privileged -z default -n music-game-spotify

# 3. Deploy services
echo "🔌 Deploying services..."
oc apply -f deployment-spotify/services-files/

# 4. Create routes
echo "🌐 Creating routes..."
oc apply -f deployment-spotify/route-files/

# 5. Create ConfigMaps
echo "⚙️  Creating ConfigMaps..."
oc create configmap backend-config -n music-game-spotify \
  --from-literal=BACKEND_URL=$(oc get route nodejs-route -n music-game-spotify -o jsonpath='{.spec.host}') \
  --dry-run=client -o yaml | oc apply -f -

oc create configmap frontend-config -n music-game-spotify \
  --from-literal=ALLOWED_ORIGINS=$(oc get route nginx-route -n music-game-spotify -o jsonpath='{.spec.host}') \
  --dry-run=client -o yaml | oc apply -f -

# 6. Create Spotify credentials secret
echo "🔑 Creating Spotify credentials secret..."
./scripts/create-spotify-secret.sh

# 7. Deploy persistent volumes
echo "💾 Deploying persistent volumes..."
oc apply -f deployment-spotify/pv-files/

# 8. Deploy MongoDB
echo "🗄️  Deploying MongoDB..."
oc apply -f deployment-spotify/deploybemongo.yaml

# 9. Deploy Node.js backend
echo "⚙️  Deploying Node.js backend with Spotify integration..."
oc apply -f deployment-spotify/nodejs-deployment.yaml

# 10. Deploy Nginx frontend
echo "🖥️  Deploying Nginx frontend with admin panel..."
oc apply -f deployment-spotify/html_deploy_fe.yaml

echo ""
echo "✅ Deployment complete!"
echo ""
echo "Waiting for pods to be ready..."
oc wait --for=condition=ready pod -l app=mongodb -n music-game-spotify --timeout=120s
oc wait --for=condition=ready pod -l app=nodejs-app -n music-game-spotify --timeout=120s
oc wait --for=condition=ready pod -l app=nginx -n music-game-spotify --timeout=120s

echo ""
echo "🎉 All pods are ready!"
echo ""
echo "Access URLs:"
echo "Frontend: https://$(oc get route nginx-route -n music-game-spotify -o jsonpath='{.spec.host}')"
echo "Backend: https://$(oc get route nodejs-route -n music-game-spotify -o jsonpath='{.spec.host}')"
echo "Admin: https://$(oc get route nodejs-route -n music-game-spotify -o jsonpath='{.spec.host}')/admin"
echo ""
echo "Check status: oc get pods -n music-game-spotify"
