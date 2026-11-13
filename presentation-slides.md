# Music Guessing Game - Presentation Slides

## Slide 1: Title Slide
**Music Guessing Game**
*A Cloud-Native Three-Tier Application on OpenShift*

---

## Slide 2: What is it?
**Interactive Music Quiz Application**

- Players listen to 10 song clips
- Guess both the song name AND artist
- Compete on a global leaderboard
- 2 points per song (1 for song, 1 for artist)

**Built for OpenShift** - Fully containerized, scalable architecture

---

## Slide 3: How It Works

**User Experience:**
1. Enter your name
2. Play each of the 10 music clips
3. Submit your guesses for song name and artist
4. Get instant feedback with your score
5. See how you rank on the leaderboard

**Current Song List:**
Beautiful Day (U2), Shivers (Ed Sheeran), Take Your Mama (Scissor Sisters),
Vampire (Olivia Rodrigo), Try (Pink), Enjoy the Silence (Depeche Mode),
About Damn Time (Lizzo), Sabotage (Beastie Boys), Believe (Cher),
Blinding Lights (The Weeknd)

---

## Slide 4: Technical Architecture

**Three-Tier Cloud-Native Application**

```
┌─────────────────────────────────────────────┐
│  Frontend (Nginx)                           │
│  - HTML/JavaScript UI                       │
│  - Serves 10 MP3 song clips                 │
│  - Port 8080                                │
└─────────────────┬───────────────────────────┘
                  │
┌─────────────────▼───────────────────────────┐
│  Backend (Node.js/Express)                  │
│  - REST API endpoints                       │
│  - Validates guesses                        │
│  - Manages leaderboard                      │
│  - Port 3000                                │
└─────────────────┬───────────────────────────┘
                  │
┌─────────────────▼───────────────────────────┐
│  Database (MongoDB)                         │
│  - Songs collection (pre-populated)         │
│  - Players collection (runtime data)        │
│  - Persistent storage via PVC               │
└─────────────────────────────────────────────┘
```

---

## Slide 5: Key Features

**Technical Highlights:**

✅ **Dynamic Configuration** - ConfigMaps for route URLs
✅ **Persistent Storage** - MongoDB with PVC for player data
✅ **High Availability** - Multiple replicas (3 backend, 2 database)
✅ **Connection Resilience** - Retry logic and connection pooling
✅ **Security Context** - Proper OpenShift SCC configuration
✅ **Template Substitution** - Runtime URL injection via envsubst

**DevOps Ready:**
- Container images on Quay.io
- YAML manifests for all components
- One-command deployment workflow

---

## Slide 6: Deployment Architecture

**OpenShift Resources:**

| Component | Type | Details |
|-----------|------|---------|
| Namespace | `music-game` | Isolated environment |
| Services | 3 (Frontend, Backend, DB) | Internal/external access |
| Routes | 2 (Frontend, Backend) | External HTTPS endpoints |
| Deployments | 3 | Nginx, Node.js, MongoDB |
| ConfigMaps | 2 | Dynamic URL configuration |
| PV/PVC | 1 | MongoDB persistent storage |

**Deployment Time:** ~5 minutes end-to-end

---

## Slide 7: Demo / Live Application

**Try it yourself!**

🎵 **Live Demo:** [Your OpenShift Route URL]

**Quick Stats:**
- 10 songs to guess
- Maximum score: 20 points
- Top 10 players displayed
- Real-time score updates

**Technologies Used:**
- OpenShift / Kubernetes
- Node.js / Express
- MongoDB
- Nginx
- Podman/Container builds

---

## Optional: Technical Deep Dive Slide

**Interesting Implementation Details:**

**Challenge:** Routes don't exist until after deployment
**Solution:** ConfigMaps created post-deployment with route URLs

**Challenge:** Frontend needs backend URL at runtime
**Solution:** Template substitution using envsubst in init container

**Challenge:** MongoDB permissions on hostPath
**Solution:** Privileged SCC with specific fsGroup (1000710000)

**Architecture Pattern:**
- Backend uses MongoDB native driver (not ORM)
- CORS configured for cross-origin requests
- Connection pooling (10 max, 2 min)
- 5 retry attempts with 2-second delays
