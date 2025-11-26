# Music Guessing Game - OpenShift Training Lab

## Overview

This hands-on lab teaches essential OpenShift and Kubernetes concepts through deploying a real-world, three-tier application with Spotify integration. Students will troubleshoot common deployment issues and learn production-ready patterns.

**Estimated Time:** 3-4 hours  
**Difficulty:** Intermediate  
**Prerequisites:** Basic knowledge of containers, Linux command line, and REST APIs

## Learning Objectives

By completing this lab, you will:

1. Deploy a multi-tier application on OpenShift
2. Configure ConfigMaps, Secrets, and environment variables
3. Understand internal vs external routing with Services and Routes
4. Work with persistent storage (PVCs) and ReadWriteOnce limitations
5. Debug common deployment issues using logs and pod inspection
6. Implement OAuth authentication flows
7. Configure reverse proxies (nginx) for microservices
8. Handle session persistence in stateless containers
9. Work with CORS and secure cookies in production
10. Build and push container images to registries

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    OpenShift Routes (TLS)                   │
│  ┌────────────────────────┐  ┌─────────────────────────┐   │
│  │   nginx-route (8080)   │  │ nodejs-route (3000)     │   │
│  │   (Frontend & Admin)   │  │   (Backend API)         │   │
│  └────────────────────────┘  └─────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                    │                        │
                    ▼                        ▼
┌──────────────────────────────────────────────────────────────┐
│                    ClusterIP Services                        │
│  ┌────────────────────┐  ┌────────────────────────────┐     │
│  │ frontend-service   │  │  nodejs-service (port 80)  │     │
│  │    (nginx:8080)    │  │   → targetPort 3000         │     │
│  └────────────────────┘  └────────────────────────────┘     │
└──────────────────────────────────────────────────────────────┘
                    │                        │
                    ▼                        ▼
┌──────────────────────────────────────────────────────────────┐
│                        Deployments                           │
│  ┌────────────────────┐  ┌────────────────────────────┐     │
│  │ nginx-deployment   │  │   nodejs-app (1 replica)   │     │
│  │   (1 replica)      │  │   - Express + Sessions     │     │
│  │   - Static files   │  │   - Spotify OAuth          │     │
│  │   - Proxy /api/    │  │   - MongoDB client         │     │
│  └────────────────────┘  └────────────────────────────┘     │
└──────────────────────────────────────────────────────────────┘
                                     │
                                     ▼
                    ┌────────────────────────────┐
                    │  mongodb (1 replica)       │
                    │  - StatefulSet pattern     │
                    │  - PVC: mongodb-pvc (5Gi)  │
                    │  - ReadWriteOnce storage   │
                    └────────────────────────────┘
```

### Components

- **Frontend (Nginx)**: Serves static HTML/JS, proxies API requests to backend
- **Backend (Node.js/Express)**: REST API, Spotify OAuth, session management
- **Database (MongoDB)**: Stores songs, player scores, metadata
- **External Integration**: Spotify Web API for music metadata

## Lab Structure

This lab is designed as a **guided troubleshooting exercise** where students deploy the application and encounter (and fix) real production issues.

### Teaching Approach Options

#### Option A: Guided Discovery (Recommended)
Students deploy the initial broken version and work through issues with hints:
1. Deploy broken configuration
2. Encounter errors
3. Get progressive hints
4. Debug and fix issues
5. Learn why each fix was necessary

#### Option B: Reference Implementation
Students follow step-by-step instructions with explanations:
1. Deploy correct configuration
2. Learn why each component is configured that way
3. Optional: Break things intentionally to see what happens

#### Option C: Challenge Mode
Students receive only architecture diagram and requirements:
1. Minimal initial documentation
2. Must figure out configuration themselves
3. Instructor available for hints only

---

## Part 1: Environment Setup (30 minutes)

### Prerequisites

**Required:**
- Access to an OpenShift cluster (4.12+)
- `oc` CLI installed and configured
- Quay.io account (or access to container registry)
- Spotify Developer account
- `podman` or `docker` installed locally (for building images)

**Optional:**
- `jq` for JSON parsing
- `curl` for API testing

### Initial Setup

1. **Clone the Repository**
   ```bash
   git clone https://github.com/YOUR-USERNAME/guessing-game.git
   cd guessing-game
   git checkout spotify-integration
   ```

2. **Verify OpenShift Access**
   ```bash
   oc whoami
   oc version
   ```

3. **Create Spotify Application**
   - Go to: https://developer.spotify.com/dashboard
   - Create new app: "Music Guessing Game Training"
   - Note your Client ID and Client Secret
   - Add redirect URI: `http://localhost:3000/api/admin/spotify/callback` (temporary)

**Expected Output:** Successfully logged into cluster, Spotify app created

**Troubleshooting Tips:**
- If `oc` command not found, install OpenShift CLI tools
- If can't access cluster, check VPN/network connectivity

---

## Part 2: Deploy the Application (45 minutes)

### Learning Focus
- Namespaces and resource isolation
- Deployment strategies
- Service discovery
- Route configuration

### Step 1: Create Namespace

```bash
oc apply -f deployment-spotify/namespace.yaml
oc project music-game-spotify
```

**Discussion Questions:**
- Why use a dedicated namespace?
- What happens to resources when a namespace is deleted?
- How do services communicate across namespaces?

### Step 2: Deploy Services

```bash
cd deployment-spotify/service-files
oc apply -f mongodb-service.yaml
oc apply -f nodejs-service.yaml
oc apply -f feservice.yaml
```

**Key Concepts:**
- ClusterIP vs NodePort vs LoadBalancer
- Service selectors and labels
- Port vs targetPort

**Challenge:** Explain why `nodejs-service` uses `port: 80` but `targetPort: 3000`

### Step 3: Create Routes

```bash
cd ../route-files
oc apply -f nodejs-route.yaml
oc apply -f feroute.yaml
```

**Get Route URLs:**
```bash
NGINX_ROUTE=$(oc get route nginx-route -o jsonpath='{.spec.host}')
NODEJS_ROUTE=$(oc get route nodejs-route -o jsonpath='{.spec.host}')
echo "Frontend: https://${NGINX_ROUTE}"
echo "Backend: https://${NODEJS_ROUTE}"
```

**Discussion:**
- TLS termination: Edge vs Passthrough vs Reencrypt
- Why we use HTTPS routes in production
- How OpenShift router (HAProxy) works

### Step 4: Create ConfigMaps

**Exercise:** Students must create three ConfigMaps. Provide partial examples:

```bash
# Hint 1: Backend URL should use internal service name
oc create configmap backend-config -n music-game-spotify \
  --from-literal=BACKEND_URL=?????

# Hint 2: CORS origin must match exact protocol + hostname
oc create configmap frontend-config -n music-game-spotify \
  --from-literal=ALLOWED_ORIGINS=?????

# Hint 3: OAuth redirects need full HTTPS URL
oc create configmap frontend-url-config -n music-game-spotify \
  --from-literal=FRONTEND_URL=?????
```

**Common Mistakes to Watch For:**
- Using external route URL for internal proxy (causes redirect loops!)
- Forgetting `https://` prefix in ALLOWED_ORIGINS (CORS fails!)
- Using `http://` instead of `https://` for production URLs

**Correct Solution:**
```bash
oc create configmap backend-config -n music-game-spotify \
  --from-literal=BACKEND_URL=nodejs-service

oc create configmap frontend-config -n music-game-spotify \
  --from-literal=ALLOWED_ORIGINS=https://${NGINX_ROUTE}

oc create configmap frontend-url-config -n music-game-spotify \
  --from-literal=FRONTEND_URL=https://${NGINX_ROUTE}
```

### Step 5: Create Secrets

**Security Best Practice Discussion:**
- Why secrets vs ConfigMaps?
- Base64 encoding vs encryption
- RBAC for secret access
- External secret management (Vault, AWS Secrets Manager)

```bash
oc create secret generic spotify-credentials -n music-game-spotify \
  --from-literal=SPOTIFY_CLIENT_ID='your_client_id' \
  --from-literal=SPOTIFY_CLIENT_SECRET='your_client_secret' \
  --from-literal=SPOTIFY_REDIRECT_URI=https://${NGINX_ROUTE}/api/admin/spotify/callback
```

**Challenge:** Decode a secret to verify contents:
```bash
oc get secret spotify-credentials -o jsonpath='{.data.SPOTIFY_CLIENT_ID}' | base64 -d
```

### Step 6: Deploy Persistent Storage

```bash
cd ../pv-files
oc apply -f pvcmongo.yaml
oc apply -f audio-storage-pvc.yaml
```

**Key Learning:**
- Storage Classes (gp3-csi, gp2, nfs)
- Access Modes: ReadWriteOnce vs ReadWriteMany vs ReadOnlyMany
- What happens when multiple pods try to mount RWO PVC?

**Discussion Question:** Why can't we scale MongoDB to 2+ replicas with current PVC?

### Step 7: Deploy Application Pods

```bash
cd ..
oc apply -f deploybemongo.yaml
oc apply -f nodejs-deployment.yaml
oc apply -f html_deploy_fe.yaml
```

**Wait for pods:**
```bash
oc get pods -w
```

---

## Part 3: Troubleshooting Exercise (60 minutes)

### Issue 1: nodejs-app Pods Failing

**Symptom:** Pods show `CreateContainerConfigError`

```bash
oc get pods -l app=nodejs-app
# Expected: STATUS = CreateContainerConfigError
```

**Student Task:** Use `oc describe pod` to find the issue

**Hints:**
1. Check events section in pod description
2. Look for missing ConfigMaps or Secrets
3. Check environment variable references in deployment YAML

**Solution:**
```bash
oc describe pod -l app=nodejs-app | grep -A 5 Events
# Output shows: configmap "frontend-url-config" not found

# This ConfigMap was created in Step 4, but if student skipped it:
oc create configmap frontend-url-config -n music-game-spotify \
  --from-literal=FRONTEND_URL=https://${NGINX_ROUTE}
```

**Learning Points:**
- How to debug pod startup issues
- Environment variable injection from ConfigMaps
- The importance of dependency order

### Issue 2: MongoDB CrashLoopBackOff

**Symptom:** MongoDB pod repeatedly crashes

```bash
oc logs deployment/mongodb | tail -20
# Expected: "Unable to lock the lock file: /data/db/mongod.lock"
```

**Student Task:** Diagnose why MongoDB can't start

**Guided Questions:**
1. How many MongoDB replicas are configured?
2. What access mode does the PVC use?
3. Can multiple pods write to a ReadWriteOnce PVC?

**Root Cause:** Deployment YAML specifies 2 replicas, but PVC is ReadWriteOnce

**Solution:**
```bash
# Scale to 1 replica
oc scale deployment mongodb --replicas=1

# Verify
oc get pods -l app=mongodb
```

**Discussion:**
- When to use StatefulSets vs Deployments
- MongoDB replica sets and storage requirements
- Production patterns: ReadWriteMany PVCs or distributed storage

### Issue 3: ERR_TOO_MANY_REDIRECTS

**Symptom:** Accessing `/api/admin/spotify/login` causes infinite redirect

**Student Task:** Use browser dev tools and curl to debug

**Investigation Steps:**
```bash
# Test endpoint
curl -skL -I https://${NGINX_ROUTE}/api/admin/spotify/login

# Check nginx config
oc exec deployment/nginx-deployment -- cat /tmp/nginx.conf | grep -A 5 "location /api"

# Check backend-config ConfigMap
oc get configmap backend-config -o yaml
```

**Root Cause:** `backend-config` uses external route URL, causing nginx to proxy through ingress again

**Solution:**
```bash
oc patch configmap backend-config -p '{"data":{"BACKEND_URL":"nodejs-service"}}'
oc rollout restart deployment nginx-deployment
```

**Learning Points:**
- Internal service mesh vs external routing
- How reverse proxies work
- Debugging HTTP redirect chains

### Issue 4: Admin Panel Authentication Not Persisting

**Symptom:** Login succeeds but immediately shows "Not Authenticated"

**Investigation Steps:**
```bash
# Check session cookie in browser dev tools
# Network tab → Headers → Response Headers → Set-Cookie

# Check backend logs
oc logs deployment/nodejs-app | grep -i "oauth\|session"
```

**Root Causes (Multiple):**

**Problem 1: Secure Cookie Without Proxy Trust**
```javascript
// Backend doesn't trust proxy, thinks request is HTTP
cookie: { secure: true }  // Refuses to set cookie!
```

**Solution:** Add to app.js before session middleware:
```javascript
app.set('trust proxy', 1);
```

**Problem 2: Session Not Saved Before Redirect**
```javascript
// Session data set but redirect happens before save completes
req.session.spotifyAccessToken = access_token;
res.redirect('/admin');  // ❌ Session lost!
```

**Solution:** Explicitly save session:
```javascript
req.session.save((err) => {
    if (err) return res.redirect('/admin?error=session_failed');
    res.redirect('/admin?auth=success');
});
```

**Problem 3: CORS Origin Mismatch**
```bash
# ConfigMap has: ALLOWED_ORIGINS=nginx-route-....openshift.org
# Browser sends: Origin: https://nginx-route-....openshift.org
# CORS rejects because protocol doesn't match!
```

**Solution:**
```bash
oc patch configmap frontend-config -p \
  '{"data":{"ALLOWED_ORIGINS":"https://nginx-route-...'"}}'
```

**Problem 4: Multiple Pod Replicas with In-Memory Sessions**
```yaml
# nodejs-deployment.yaml
replicas: 3  # ❌ OAuth callback hits different pod!
```

**Solution:**
```yaml
replicas: 1  # ✅ Session persists
```

**Production Solution Discussion:**
- Shared session storage (Redis, connect-mongo)
- Session affinity (sticky sessions)
- Stateless JWT tokens

**Learning Points:**
- HTTP session management in distributed systems
- Secure cookie requirements
- CORS with credentials
- Load balancing and session affinity

---

## Part 4: Testing and Validation (30 minutes)

### Automated Testing Script

Create `scripts/validate-deployment.sh`:

```bash
#!/bin/bash
echo "=== Deployment Validation ==="

# Test 1: All pods running
echo "✓ Checking pod status..."
oc get pods -n music-game-spotify

# Test 2: ConfigMaps exist
echo "✓ Checking ConfigMaps..."
oc get configmap backend-config frontend-config frontend-url-config -n music-game-spotify

# Test 3: Secrets exist
echo "✓ Checking secrets..."
oc get secret spotify-credentials -n music-game-spotify

# Test 4: Routes accessible
NGINX_ROUTE=$(oc get route nginx-route -n music-game-spotify -o jsonpath='{.spec.host}')
echo "✓ Testing frontend: https://${NGINX_ROUTE}"
curl -sk -I https://${NGINX_ROUTE} | grep "HTTP"

# Test 5: API endpoint
echo "✓ Testing API: /api/admin/auth-status"
curl -sk https://${NGINX_ROUTE}/api/admin/auth-status

# Test 6: Leaderboard
echo "✓ Testing leaderboard"
curl -sk https://${NGINX_ROUTE}/leaderboard?filter=all | jq '.'

echo "=== Validation Complete ==="
```

### Manual Testing Checklist

Students complete this checklist:

- [ ] Frontend loads at `https://nginx-route-.../`
- [ ] Admin panel loads at `https://nginx-route-.../admin`
- [ ] Spotify login redirects to Spotify OAuth
- [ ] After OAuth, returns to admin panel authenticated
- [ ] Can browse Spotify playlists
- [ ] Can import songs (with preview auto-download)
- [ ] Can upload audio files
- [ ] Songs appear in game interface
- [ ] Leaderboard displays scores
- [ ] `/top-player` endpoint works

---

## Part 5: Advanced Topics (Optional - 45 minutes)

### A. Building and Pushing Container Images

**Learning Objectives:**
- Dockerfile best practices
- Multi-stage builds
- Image tagging and versioning
- Container registry authentication

**Exercise: Modify and rebuild backend image**

```bash
cd dockerfiles/middleware-node-js-app

# Make a code change (add console.log)
vi app.js

# Build image
podman build -t quay.io/YOUR_USERNAME/middleware-spotify:v1.1 .

# Login to registry
podman login quay.io

# Push image
podman push quay.io/YOUR_USERNAME/middleware-spotify:v1.1

# Update deployment
oc set image deployment/nodejs-app \
  nodejs-app=quay.io/YOUR_USERNAME/middleware-spotify:v1.1
```

**Discussion:**
- Image layers and caching
- Security scanning
- Private vs public registries
- Image pull secrets

### B. Monitoring and Logging

**Setup Logging:**
```bash
# Stream logs
oc logs -f deployment/nodejs-app

# View last 100 lines with timestamps
oc logs deployment/nodejs-app --tail=100 --timestamps

# Logs from all pods
oc logs -l app=nodejs-app --all-containers
```

**Metrics:**
```bash
# Pod resource usage
oc adm top pods -n music-game-spotify

# Node resource usage
oc adm top nodes
```

**Discussion:**
- Centralized logging (EFK stack)
- Prometheus metrics
- OpenShift monitoring stack
- Alerting strategies

### C. Scaling and Performance

**Horizontal Scaling:**
```bash
# Scale nginx (stateless, can scale freely)
oc scale deployment nginx-deployment --replicas=3

# Why can't we scale nodejs-app?
# Challenge: Implement Redis session storage to enable scaling
```

**Resource Limits:**
```yaml
resources:
  requests:
    memory: "256Mi"
    cpu: "100m"
  limits:
    memory: "512Mi"
    cpu: "500m"
```

**Discussion:**
- Requests vs Limits
- QoS classes (Guaranteed, Burstable, BestEffort)
- Cluster autoscaling
- Pod disruption budgets

### D. Security Hardening

**Topics:**
- Non-root containers
- Security Context Constraints (SCCs)
- Network Policies
- Pod Security Standards
- Image vulnerability scanning
- Secret encryption at rest
- RBAC fine-tuning

**Exercise: Implement Network Policy**
```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: nodejs-netpol
spec:
  podSelector:
    matchLabels:
      app: nodejs-app
  ingress:
  - from:
    - podSelector:
        matchLabels:
          app: nginx
    ports:
    - protocol: TCP
      port: 3000
```

---

## Part 6: Clean Up (10 minutes)

```bash
# Delete namespace (removes all resources)
oc delete namespace music-game-spotify

# Or delete individually
oc delete -f deployment-spotify/
```

---

## Assessment and Learning Validation

### Knowledge Check Questions

1. **Networking:**
   - Explain the difference between a Service and a Route
   - Why use `nodejs-service` instead of `nodejs-route` in nginx proxy_pass?
   - What happens if you remove the `proxy_set_header Cookie` directive?

2. **Storage:**
   - What are the implications of ReadWriteOnce PVC with 2 replicas?
   - When would you use ReadWriteMany vs ReadWriteOnce?
   - How do you migrate data between PVCs?

3. **Configuration:**
   - Why separate ConfigMaps from Secrets?
   - What happens when you update a ConfigMap? Do pods restart?
   - How would you manage environment-specific config (dev/staging/prod)?

4. **Security:**
   - Why is `secure: true` cookie flag important?
   - What does `trust proxy` setting do?
   - How do you rotate Spotify credentials without downtime?

5. **Troubleshooting:**
   - Pod stuck in Pending: What are 3 possible causes?
   - CrashLoopBackOff: How do you debug?
   - Difference between `ImagePullBackOff` and `ErrImagePull`?

### Hands-On Challenges

**Challenge 1: Implement Session Persistence**
- Add Redis deployment
- Configure connect-redis in Node.js app
- Scale nodejs-app to 3 replicas
- Verify sessions persist across pods

**Challenge 2: Add CI/CD Pipeline**
- Create Tekton/Jenkins pipeline
- Build images on code commit
- Run tests
- Deploy to staging namespace
- Promote to production

**Challenge 3: High Availability**
- Implement MongoDB replica set
- Add multiple nginx replicas
- Configure pod anti-affinity
- Test failover scenarios

**Challenge 4: Observability**
- Add Prometheus metrics endpoint
- Create Grafana dashboard
- Set up alerting rules
- Implement distributed tracing (Jaeger)

---

## Instructor Notes

### Common Student Mistakes

1. **Forgetting to switch namespace**
   - Symptom: "Error: resource not found"
   - Reminder: `oc project music-game-spotify`

2. **Using old route URLs**
   - Symptom: 404 errors, redirect loops
   - Fix: Re-run `oc get route` to get current URLs

3. **Not waiting for pods to be ready**
   - Symptom: "Connection refused" errors
   - Reminder: `oc get pods -w` and wait for READY 1/1

4. **Skipping ConfigMap creation**
   - Symptom: CreateContainerConfigError
   - Prevention: Checklist validation before proceeding

5. **Wrong CORS origin format**
   - Symptom: 401 Unauthorized, CORS errors in browser
   - Fix: Must include `https://` protocol

### Time Management

- **Fast Track (2 hours):** Skip optional sections, provide all solutions
- **Standard (3-4 hours):** Guided troubleshooting, some hints
- **Deep Dive (6-8 hours):** Include all advanced topics, minimal hints

### Pre-Lab Setup for Instructors

```bash
# Create instructor demo environment
./scripts/deploy-spotify.sh

# Pre-build all images to save time
podman build -t quay.io/training/fe-spotify:latest dockerfiles/fe/
podman build -t quay.io/training/middleware-spotify:latest dockerfiles/middleware-node-js-app/
podman build -t quay.io/training/be-mongo:latest dockerfiles/be/

# Push to shared registry
podman push --all quay.io/training/

# Create answer key namespace
oc new-project music-game-answers
# Deploy working solution
```

### Extension Activities

1. **Multi-Cluster Deployment**
   - Deploy to hub cluster
   - Deploy to edge cluster
   - Implement data replication

2. **Disaster Recovery**
   - Backup MongoDB with Velero
   - Restore to new cluster
   - Test recovery procedures

3. **Cost Optimization**
   - Right-size resource requests/limits
   - Implement pod autoscaling
   - Analyze node utilization

4. **Compliance and Governance**
   - Implement admission webhooks
   - Policy enforcement with OPA
   - Audit logging

---

## Additional Resources

### Documentation
- [OpenShift Documentation](https://docs.openshift.com)
- [Kubernetes Concepts](https://kubernetes.io/docs/concepts/)
- [Spotify Web API Guide](https://developer.spotify.com/documentation/web-api/)

### Further Learning
- OpenShift Certified Specialist Exam
- Kubernetes Administrator (CKA) Certification
- Container Security Best Practices
- GitOps with ArgoCD

### Community
- OpenShift Commons
- Kubernetes Slack
- Stack Overflow `[openshift]` tag

---

## License and Attribution

This training material is based on the Music Guessing Game with Spotify Integration.
Original repository: [github.com/YOUR-USERNAME/guessing-game]

Licensed under MIT License.

---

**Created by:** [Your Name]  
**Last Updated:** 2025-11-26  
**Version:** 1.0
