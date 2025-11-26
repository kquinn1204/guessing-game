# Training Materials - Supplementary Resources

## Pre-Lab Checklist for Students

### Week Before Lab
- [ ] Request OpenShift cluster access
- [ ] Install `oc` CLI on your machine
- [ ] Create Spotify Developer account
- [ ] Install `podman` or `docker`
- [ ] Install `jq` (optional but recommended)
- [ ] Test cluster connectivity

### Day Before Lab
- [ ] Login to OpenShift cluster and verify access
- [ ] Create Spotify app in dashboard
- [ ] Fork the GitHub repository
- [ ] Clone repository locally
- [ ] Review architecture diagram

### Day of Lab
- [ ] Laptop fully charged
- [ ] Stable internet connection
- [ ] Browser with dev tools open
- [ ] Terminal ready
- [ ] Notebook for taking notes

---

## Cheat Sheet - Common Commands

### OpenShift Basics
```bash
# Login
oc login --server=https://api.cluster.com:6443 --token=YOUR_TOKEN

# Current user
oc whoami

# Switch project
oc project music-game-spotify

# Get all resources
oc get all

# Describe resource
oc describe pod POD_NAME
oc describe deployment DEPLOYMENT_NAME

# Delete resource
oc delete pod POD_NAME
oc delete deployment DEPLOYMENT_NAME
```

### Debugging Pods
```bash
# Get pods
oc get pods
oc get pods -o wide
oc get pods -w  # Watch mode

# Pod logs
oc logs POD_NAME
oc logs -f POD_NAME  # Follow
oc logs POD_NAME --previous  # Previous container
oc logs -l app=nodejs-app  # All pods with label

# Execute command in pod
oc exec POD_NAME -- ls /app
oc exec -it POD_NAME -- /bin/bash  # Interactive shell

# Pod events
oc get events --sort-by='.lastTimestamp'

# Resource usage
oc adm top pods
oc adm top nodes
```

### ConfigMaps and Secrets
```bash
# List
oc get configmaps
oc get secrets

# Describe
oc describe configmap CONFIG_NAME
oc describe secret SECRET_NAME

# Get value
oc get configmap CONFIG_NAME -o yaml
oc get secret SECRET_NAME -o jsonpath='{.data.KEY}' | base64 -d

# Edit
oc edit configmap CONFIG_NAME
oc patch configmap CONFIG_NAME -p '{"data":{"KEY":"VALUE"}}'

# Delete and recreate
oc delete configmap CONFIG_NAME
oc create configmap CONFIG_NAME --from-literal=KEY=VALUE
```

### Routes and Services
```bash
# Get routes
oc get routes
oc get route ROUTE_NAME -o jsonpath='{.spec.host}'

# Get services
oc get svc
oc describe svc SERVICE_NAME

# Test connectivity
oc run test-pod --image=busybox --rm -it --restart=Never -- wget -qO- http://SERVICE_NAME:PORT
```

### Deployments and Scaling
```bash
# Get deployments
oc get deployments

# Scale
oc scale deployment DEPLOYMENT_NAME --replicas=3

# Rollout status
oc rollout status deployment DEPLOYMENT_NAME

# Rollout history
oc rollout history deployment DEPLOYMENT_NAME

# Undo rollout
oc rollout undo deployment DEPLOYMENT_NAME

# Restart (force new pods)
oc rollout restart deployment DEPLOYMENT_NAME
```

### Storage
```bash
# Get PVCs
oc get pvc

# Describe PVC
oc describe pvc PVC_NAME

# Get storage classes
oc get storageclass
```

---

## Troubleshooting Decision Tree

```
Pod not starting?
├─ Pending
│  ├─ Insufficient resources? → Check node capacity, adjust requests/limits
│  ├─ PVC not binding? → Check PVC status, storage class
│  └─ Node selector issue? → Check node labels
│
├─ CreateContainerConfigError
│  ├─ Missing ConfigMap? → Check ConfigMap exists
│  ├─ Missing Secret? → Check Secret exists
│  └─ Wrong key reference? → Check env var names
│
├─ CrashLoopBackOff
│  ├─ Check logs → `oc logs POD_NAME`
│  ├─ Application error? → Fix application code
│  ├─ Missing dependency? → Check service connectivity
│  └─ Resource limits? → Increase memory/CPU
│
├─ ImagePullBackOff
│  ├─ Wrong image name? → Check deployment YAML
│  ├─ Private registry? → Add image pull secret
│  └─ Network issue? → Check connectivity
│
└─ Running but not working
   ├─ Check logs → `oc logs POD_NAME`
   ├─ Exec into pod → `oc exec -it POD_NAME -- /bin/sh`
   ├─ Check service → `oc get svc`
   └─ Check route → `oc get route`
```

---

## Lab Walkthrough Videos (Concept)

### Video 1: Introduction and Architecture (10 min)
- Overview of the music guessing game
- Architecture diagram walkthrough
- Technology stack explanation
- Learning objectives

### Video 2: Initial Deployment (15 min)
- Creating namespace
- Deploying services
- Creating routes
- ConfigMap and Secret creation

### Video 3: Troubleshooting Session Persistence (20 min)
- Demonstrating the issue
- Debugging with browser dev tools
- Checking backend logs
- Implementing the fix
- Testing the solution

### Video 4: Advanced Topics (15 min)
- Building container images
- Scaling strategies
- Monitoring and logging
- Security best practices

---

## Quiz Questions

### Module 1: Kubernetes Fundamentals

1. **What is the difference between a Deployment and a StatefulSet?**
   - A) Deployments are for stateless apps, StatefulSets for stateful
   - B) Deployments can scale, StatefulSets cannot
   - C) StatefulSets are deprecated
   - D) No difference

   **Answer:** A

2. **Which access mode allows multiple pods on different nodes to mount a PVC?**
   - A) ReadWriteOnce
   - B) ReadOnlyMany
   - C) ReadWriteMany
   - D) ReadWriteOncePod

   **Answer:** C

3. **What happens when you update a ConfigMap used by a running pod?**
   - A) Pod automatically restarts
   - B) Pod picks up changes immediately (for env vars)
   - C) Pod must be restarted to see changes (for env vars)
   - D) ConfigMaps cannot be updated

   **Answer:** C

### Module 2: Networking

4. **Why should nginx proxy to internal service name instead of external route?**
   - A) Faster performance
   - B) Avoids redirect loops through ingress controller
   - C) Better security
   - D) All of the above

   **Answer:** D

5. **What is the purpose of the X-Forwarded-Proto header?**
   - A) Forward the client's IP address
   - B) Indicate the original protocol (HTTP/HTTPS)
   - C) Forward authentication tokens
   - D) Enable compression

   **Answer:** B

### Module 3: Security

6. **Why won't Express set a secure cookie if trust proxy is false?**
   - A) It's a security risk
   - B) Express thinks the request is HTTP, not HTTPS
   - C) The browser blocks it
   - D) It's a bug in Express

   **Answer:** B

7. **What's the difference between ConfigMaps and Secrets in terms of data protection?**
   - A) Secrets are encrypted at rest, ConfigMaps are not
   - B) Secrets are base64 encoded, ConfigMaps are plain text
   - C) No difference, both are base64 encoded
   - D) Secrets can only be accessed by admin users

   **Answer:** A (in OpenShift with etcd encryption enabled)

### Module 4: Troubleshooting

8. **You see CreateContainerConfigError. What's the first thing to check?**
   - A) Node capacity
   - B) Image pull secrets
   - C) Pod events/description for missing ConfigMaps or Secrets
   - D) Network policies

   **Answer:** C

9. **Pod logs show "mongod.lock already exists". What's likely the issue?**
   - A) MongoDB is corrupted
   - B) Multiple replicas trying to mount same ReadWriteOnce PVC
   - C) Insufficient permissions
   - D) Out of disk space

   **Answer:** B

10. **CORS error in browser: "No 'Access-Control-Allow-Origin' header". What to check?**
    - A) ALLOWED_ORIGINS ConfigMap matches request origin
    - B) CORS middleware is configured
    - C) credentials: true requires specific origin (not *)
    - D) All of the above

    **Answer:** D

---

## Hands-On Lab Scenarios

### Scenario 1: The Deployment That Won't Scale

**Situation:** Your manager asks you to scale the nodejs-app to 3 replicas for a big marketing event. You scale it, but users report intermittent "Not Authenticated" errors.

**Tasks:**
1. Identify why authentication is failing
2. Explain the root cause
3. Propose 3 different solutions
4. Implement the best solution for production

**Solution Approaches:**
- Option A: Use session affinity (sticky sessions)
- Option B: Implement Redis for shared session storage
- Option C: Switch to stateless JWT authentication
- Option D: Keep 1 replica, scale nginx instead

### Scenario 2: The Mysterious 502 Bad Gateway

**Situation:** The game frontend loads, but clicking "Play Song" gives 502 errors.

**Tasks:**
1. Check nginx error logs
2. Verify backend pod is running
3. Test backend service directly
4. Fix the routing issue

**Hints:**
- Check if backend-config uses correct service name
- Verify nodejs-app pods are in Running state
- Test internal connectivity with debug pod

### Scenario 3: The Storage Crisis

**Situation:** MongoDB pod won't start after node failure. PVC shows "FailedAttachVolume".

**Tasks:**
1. Understand why PVC can't attach
2. Check if old pod still exists on failed node
3. Force delete the old pod
4. Verify new pod starts successfully

**Commands:**
```bash
oc get pods -o wide
oc delete pod OLD_POD_NAME --force --grace-period=0
oc get pvc
```

### Scenario 4: The OAuth Redirect Loop

**Situation:** Users trying to login get ERR_TOO_MANY_REDIRECTS.

**Tasks:**
1. Use curl to trace redirects
2. Check nginx proxy configuration
3. Identify configuration mistake
4. Fix and test

**Investigation:**
```bash
curl -skL -v https://nginx-route.../api/admin/spotify/login 2>&1 | grep -i location
```

---

## Project Ideas for Extension

### Project 1: Implement High Availability
- Deploy MongoDB replica set (3 nodes)
- Use StatefulSet instead of Deployment
- Configure ReadWriteMany PVC or distributed storage
- Test failover scenarios

### Project 2: Add CI/CD Pipeline
- Create Tekton pipeline
- Build images on git commit
- Run automated tests
- Deploy to staging → prod

### Project 3: Observability Stack
- Deploy Prometheus operator
- Add custom metrics to backend
- Create Grafana dashboards
- Set up alerting rules

### Project 4: Multi-Tenant Deployment
- Deploy game in multiple namespaces (dev, staging, prod)
- Use Kustomize for environment-specific config
- Implement Network Policies for isolation
- Set up resource quotas

### Project 5: Serverless Implementation
- Convert to OpenShift Serverless (Knative)
- Scale to zero when not in use
- Test autoscaling behavior
- Compare costs vs always-on deployment

---

## References and Further Reading

### OpenShift Documentation
- [OpenShift 4.14 Documentation](https://docs.openshift.com/container-platform/4.14/welcome/index.html)
- [Kubernetes Concepts](https://kubernetes.io/docs/concepts/)
- [Pod Lifecycle](https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/)

### Networking
- [Service Networking](https://kubernetes.io/docs/concepts/services-networking/service/)
- [Ingress Controllers](https://kubernetes.io/docs/concepts/services-networking/ingress/)
- [DNS for Services](https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/)

### Storage
- [Persistent Volumes](https://kubernetes.io/docs/concepts/storage/persistent-volumes/)
- [Storage Classes](https://kubernetes.io/docs/concepts/storage/storage-classes/)
- [Dynamic Provisioning](https://kubernetes.io/docs/concepts/storage/dynamic-provisioning/)

### Security
- [Secrets Management](https://kubernetes.io/docs/concepts/configuration/secret/)
- [RBAC Authorization](https://kubernetes.io/docs/reference/access-authn-authz/rbac/)
- [Network Policies](https://kubernetes.io/docs/concepts/services-networking/network-policies/)

### Application Development
- [Twelve-Factor App](https://12factor.net/)
- [Express.js Documentation](https://expressjs.com/)
- [Nginx Configuration Guide](https://nginx.org/en/docs/)
- [MongoDB Documentation](https://docs.mongodb.com/)

---

## Glossary

**ConfigMap**: Kubernetes object for storing non-confidential configuration data as key-value pairs

**CrashLoopBackOff**: Pod status indicating the container is repeatedly crashing and Kubernetes is backing off restart attempts

**Ingress/Route**: Mechanism to expose HTTP/HTTPS services outside the cluster

**Namespace/Project**: Virtual cluster for resource isolation and multi-tenancy

**PVC (Persistent Volume Claim)**: Request for storage by a user

**ReadWriteOnce (RWO)**: Storage access mode allowing read-write access by a single node

**ReadWriteMany (RWX)**: Storage access mode allowing read-write access by multiple nodes

**Service**: Abstract way to expose an application running on pods

**StatefulSet**: Workload API object for managing stateful applications

**Trust Proxy**: Express.js setting to trust X-Forwarded-* headers from reverse proxies

---

**Version:** 1.0  
**Last Updated:** 2025-11-26
