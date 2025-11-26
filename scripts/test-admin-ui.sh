#!/bin/bash
# Script to diagnose admin UI issues

NGINX_ROUTE="https://nginx-route-music-game-spotify.apps.ci-ln-5v48rcb-76ef8.aws-4.ci.openshift.org"

echo "=========================================="
echo "Admin UI Diagnostics"
echo "=========================================="
echo ""

echo "1. Testing admin page load..."
STATUS=$(curl -skL -w "%{http_code}" -o /dev/null "$NGINX_ROUTE/admin")
if [ "$STATUS" = "200" ]; then
    echo "   ✓ Admin page loads (HTTP $STATUS)"
else
    echo "   ✗ Admin page failed (HTTP $STATUS)"
fi

echo ""
echo "2. Testing auth status endpoint..."
AUTH_RESPONSE=$(curl -sk "$NGINX_ROUTE/api/admin/auth-status")
echo "   Response: $AUTH_RESPONSE"

echo ""
echo "3. Testing Spotify login endpoint..."
LOGIN_STATUS=$(curl -skL -w "%{http_code}" -o /dev/null "$NGINX_ROUTE/api/admin/spotify/login")
if [ "$LOGIN_STATUS" = "200" ] || [ "$LOGIN_STATUS" = "302" ]; then
    echo "   ✓ Spotify login endpoint accessible (HTTP $LOGIN_STATUS)"
else
    echo "   ✗ Spotify login endpoint issue (HTTP $LOGIN_STATUS)"
fi

echo ""
echo "4. Testing songs API endpoint (expect auth error)..."
SONGS_RESPONSE=$(curl -sk "$NGINX_ROUTE/api/admin/songs")
echo "   Response: $SONGS_RESPONSE"

echo ""
echo "5. Checking nginx pod status..."
oc get pods -n music-game-spotify -l app=nginx

echo ""
echo "6. Checking nodejs-app pod status..."
oc get pods -n music-game-spotify -l app=nodejs-app

echo ""
echo "7. Recent nginx errors..."
oc logs deployment/nginx-deployment -n music-game-spotify --tail=20 2>&1 | grep -i error || echo "   No errors found"

echo ""
echo "8. Recent nodejs errors..."
oc logs deployment/nodejs-app -n music-game-spotify --tail=50 | grep -i "error\|fail" | tail -5 || echo "   No errors found"

echo ""
echo "9. Testing frontend static files..."
for file in "admin.html" "admin-script.js"; do
    STATUS=$(curl -skL -w "%{http_code}" -o /dev/null "$NGINX_ROUTE/$file")
    if [ "$STATUS" = "200" ]; then
        echo "   ✓ $file loads (HTTP $STATUS)"
    else
        echo "   ✗ $file failed (HTTP $STATUS)"
    fi
done

echo ""
echo "=========================================="
echo "Diagnostics complete"
echo "=========================================="
