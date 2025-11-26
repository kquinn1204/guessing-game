# Spotify Integration - Complete Workflow Guide

This document provides a step-by-step guide for using the Spotify integration feature to create music guessing games.

## Table of Contents
- [Overview](#overview)
- [Admin Workflow](#admin-workflow)
- [Player Workflow](#player-workflow)
- [Technical Details](#technical-details)
- [Troubleshooting](#troubleshooting)

---

## Overview

The Spotify integration allows admins to:
1. **Import song metadata** from their Spotify playlists (song names, artists, album art)
2. **Automatically download Spotify preview clips** (30-second snippets) when available
3. **Manually upload audio files** for songs without previews or to use full songs
4. **Manage songs** (view, update, delete)
5. **Publish games** for players to enjoy

**Hybrid Audio System**: The system automatically downloads 30-second Spotify preview clips during import when available. For songs without previews or to use full songs, admins can manually upload MP3 files.

---

## Admin Workflow

### Prerequisites
- Spotify account with playlists
- Access to the admin panel
- **Spotify app redirect URI updated (see below)**
- *Optional:* Full-length MP3 files to replace preview clips or for songs without previews

### Step 0: Update Spotify Redirect URI (FIRST TIME SETUP)

**Critical:** Before using the admin panel, you must update your Spotify app settings with the correct redirect URI.

1. **Deploy the application** first:
   ```bash
   ./scripts/deploy-spotify.sh
   ```

2. **The script will display** the exact redirect URI you need:
   ```
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   ⚠️  IMPORTANT: Update Spotify App Redirect URI
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

   Add this redirect URI to your Spotify app settings:

   👉 https://nginx-route-music-game-spotify.apps.ci-ln-abc123-xyz89.aws-4.ci.openshift.org/api/admin/spotify/callback

   Steps:
   1. Go to: https://developer.spotify.com/dashboard
   2. Click on your app
   3. Click 'Edit Settings'
   4. Add the redirect URI above to 'Redirect URIs'
   5. Click 'Save'
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   ```

3. **Copy the redirect URI** from the terminal output

4. **Go to** https://developer.spotify.com/dashboard

5. **Click** on your Spotify app

6. **Click** "Edit Settings"

7. **In the "Redirect URIs" field**, paste the URL you copied

8. **Click** "Add" then "Save"

**Why this is needed:** The cluster route URL changes each time you create a new cluster. The part `apps.ci-ln-XXXXXX-XXXXX` is unique per cluster, so the redirect URI must be updated to match your current cluster.

**Note:** You only need to do this once per cluster deployment. If you redeploy to the same cluster, the URL stays the same.

### Step 1: Access Admin Panel

1. Navigate to the admin panel URL (shown in deployment output):
   ```
   https://nginx-route-music-game-spotify.apps.ci-ln-XXXXXX-XXXXX.aws-4.ci.openshift.org/admin
   ```

   **Note:** The exact URL will be displayed when you run `./scripts/deploy-spotify.sh`

   **Important:** Use the **nginx-route** URL (not nodejs-route) - the admin panel is served by nginx

2. You'll see the welcome screen with authentication status showing "Not Authenticated"

### Step 2: Login with Spotify

1. Click the **"Login with Spotify"** button

2. You'll be redirected to Spotify's OAuth page

3. **Authorize the application** to access your playlists
   - Permissions requested:
     - Read your private playlists
     - Read your email and profile

4. After authorization, you'll be redirected back to the admin panel

5. Authentication status will show **"Authenticated"** (green badge)

6. You'll see two tabs:
   - **"Import from Spotify"** (active by default)
   - **"Manage Songs"**

### Step 3: Browse Your Spotify Playlists

1. The "Import from Spotify" tab will automatically load your playlists

2. You'll see visual cards for each playlist showing:
   - Playlist cover art
   - Playlist name
   - Number of tracks
   - Playlist owner

3. Click on any playlist card to view its tracks

### Step 4: Select Songs to Import

1. After clicking a playlist, you'll see all tracks with:
   - Album art thumbnail
   - Song name
   - Artist name
   - Album name

2. **Select up to 10 songs** using the checkboxes
   - Selection counter shows: "Selected: X / 10 max"
   - You cannot select more than 10 at once

3. Click the **"Import Selected Songs"** button

4. Success message appears showing:
   - "Successfully imported X songs!"
   - "✓ Y Spotify previews auto-downloaded (30s clips)" (if any had previews)
   - "⚠ Z songs need manual upload (no Spotify preview available)" (if any lacked previews)

5. The songs are now in your database with:
   - ✅ Song metadata (name, artist, album, album art)
   - ✅ Auto-downloaded 30-second preview clips (for songs with Spotify previews)
   - ⚠️ Songs without previews need manual upload

### Step 5: Manage Audio Files

1. Click the **"Manage Songs"** tab

2. You'll see a table of all imported songs showing:

   | Column | Description |
   |--------|-------------|
   | Album Art | Thumbnail from Spotify |
   | Song | Song name |
   | Artist | Artist name |
   | Album | Album name |
   | Status | "⚠️ No Audio", "🎵 Preview (30s)", or "✓ Full Song" |
   | Actions | Upload/Replace/Delete buttons |

3. **Audio Status Meanings**:
   - **🎵 Preview (30s)** (blue badge) - Spotify preview clip auto-downloaded, ready to play
   - **✓ Full Song** (green badge) - Manually uploaded full MP3 file
   - **⚠️ No Audio** (yellow badge) - No Spotify preview available, needs manual upload

4. **For songs with "⚠️ No Audio"** (manual upload required):
   - Click the **"Upload Audio"** button in that song's row
   - File picker opens automatically
   - Select your MP3 file for that song
   - Click "Open"
   - Upload completes automatically
   - Status changes to "✓ Full Song"

5. **To replace preview clips with full songs** (optional):
   - Songs with "🎵 Preview (30s)" are already playable
   - Click "Replace Audio" to upload full version
   - Select MP3 file
   - Old preview clip is automatically deleted
   - Status changes to "✓ Full Song"

6. **Upload process**:
   - Message shows: "Uploading audio file..."
   - File is validated (must be MP3, max 10MB)
   - Upload happens automatically
   - Success message: "Audio file uploaded successfully!"
   - Table refreshes automatically

### Step 6: Manage Your Songs

**View All Songs:**
- The "Manage Songs" tab shows all imported songs
- Filter by status using the badges
- See which songs are ready for the game

**Replace Audio:**
- Click "Replace Audio" for any song with audio
- Upload a new MP3 file
- Old file is automatically deleted
- New file is linked to the song

**Delete Songs:**
- Click "Delete" button next to any song
- Confirmation prompt appears
- Song and its audio file are removed from database

**Return to Import:**
- Click "Import from Spotify" tab
- Import more songs from other playlists
- Repeat the process

### Step 7: Verify Game is Ready

Songs are ready for players when:
- ✅ Status shows "🎵 Preview (30s)" (blue) or "✓ Full Song" (green)
- ✅ You can see the album art
- ✅ All song metadata is correct
- ✅ At least one song has audio available

**Logout:**
- Click "Logout" button when done
- Your session is cleared
- Songs remain in the database

---

## Player Workflow

### Step 1: Access the Game

1. Navigate to the game URL:
   ```
   https://nginx-route-music-game-spotify.apps.ci-ln-l20996b-76ef8.aws-4.ci.openshift.org/
   ```

2. You'll see the Music Guessing Game homepage

### Step 2: Enter Your Name

1. Type your name in the "Player Name" field
   - Your name is saved to localStorage
   - Next time you visit, it will be pre-filled

2. Click **"Set Name"** button

3. The "Play Song" button becomes active

### Step 3: Play the Game

1. Click **"Play Song"** to start

2. For each song:
   - 30-second audio clip plays automatically
   - Use audio controls:
     - ⏸️ Pause/Play button
     - 🔄 Replay button
     - Progress bar shows playback position

3. Enter your guesses:
   - **Song Name** field
   - **Artist Name** field

4. Click **"Submit Guess"**

5. **Immediate feedback** appears:
   - ✅ Green = Correct
   - ❌ Red = Incorrect
   - Shows correct answer if wrong

6. Click **"Next Song"** to continue

7. Progress indicator shows: "Song X of 10"

### Step 4: View Results

1. After all songs, final results appear:
   - Total score (out of 20 possible)
   - Correct song guesses
   - Correct artist guesses
   - List of all correct answers

2. Click **"Play Again"** to restart

### Step 5: Check Leaderboard

1. Scroll down to see the leaderboard

2. Filter options:
   - **Daily** - Today's top scores
   - **Weekly** - Last 7 days
   - **All Time** - Overall leaders

3. Leaderboard shows:
   - Player names
   - Song guesses correct
   - Artist guesses correct
   - Total score
   - Date played

---

## Technical Details

### How Songs Are Linked

**Database Structure:**
```javascript
{
  _id: "507f1f77bcf86cd799439011",  // Unique song ID
  songNumber: 1,
  song_name: "Born to Run",
  artist_name: "Bruce Springsteen",

  // Spotify metadata
  spotify_id: "4RiGHUVnNJN3TLjZ7ZLlWo",
  album_name: "Born to Run",
  album_art_url: "https://i.scdn.co/image/...",

  // Audio file info
  mp3_filename: "spotify_4RiGHUVnNJN3TLjZ7ZLlWo_1732461234567.mp3",
  has_audio: true,
  audio_source: "spotify_preview",  // or "manual_upload" or "none"
  audio_uploaded_at: "2025-11-24T10:30:00Z",

  // Game metadata
  category: "spotify-import",
  uploaded_by: "admin",
  created_at: "2025-11-24T10:00:00Z"
}
```

**Automatic Process:**

1. **Import with Preview Download:**
   - Admin imports "Born to Run" from Spotify
   - System checks if Spotify preview URL exists
   - If preview available:
     - Downloads 30s clip automatically
     - Saves as: `spotify_4RiGHUVnNJN3TLjZ7ZLlWo_1732461234567.mp3`
     - Sets `has_audio: true` and `audio_source: "spotify_preview"`
   - If no preview:
     - Sets `has_audio: false` and `audio_source: "none"`
     - Admin can upload manually later

2. **Manual Upload (Optional):**
   - Admin clicks "Upload Audio" or "Replace Audio"
   - System knows the song's `_id` and Spotify ID
   - File uploaded as: `spotify_4RiGHUVnNJN3TLjZ7ZLlWo_TIMESTAMP.mp3`
   - Old file automatically deleted
   - Database updated:
     - `mp3_filename: "spotify_4RiGHUVnNJN3TLjZ7ZLlWo_TIMESTAMP.mp3"`
     - `has_audio: true`
     - `audio_source: "manual_upload"`
     - `audio_uploaded_at: <current timestamp>`

3. **Game Loads Songs:**
   - Frontend calls: `GET /api/available-songs`
   - Backend filters: `{ has_audio: true }`
   - Returns songs regardless of audio source
   - Audio served from: `/audio/[filename]`
   - Game adapts to number of available songs

**No Manual Database Updates Required** - Everything is automatic!

### File Storage

**Persistent Volume:**
- Location: `/usr/src/app/uploads/audio/`
- Mounted from: `audio-storage-pvc` (5Gi)
- Shared across all backend pods
- Files persist through pod restarts

**File Naming:**
- Auto-downloaded previews: `spotify_{spotify_id}_{timestamp}.mp3`
- Example: `spotify_4RiGHUVnNJN3TLjZ7ZLlWo_1732461234567.mp3`
- Manually uploaded: `{songId}_{timestamp}.mp3`
- Unique per song
- Old files automatically deleted on replacement

### Audio Validation

**Client-side:**
- File type: MP3 only
- Size limit: 10MB
- Format check: `.mp3` extension

**Server-side:**
- MIME type: `audio/mpeg` or `audio/mp3`
- File size: 10MB max (10 * 1024 * 1024 bytes)
- Multer validation

### Session Management

**Admin Authentication:**
- Session-based (express-session)
- Stored in server memory
- 24-hour timeout
- httpOnly cookies
- Secure flag in production

**Spotify Token Refresh:**
- Access tokens expire after 1 hour
- Automatic refresh before API calls
- Refresh token stored in session
- Transparent to admin

---

## Troubleshooting

### Admin Panel Issues

#### "INVALID_CLIENT: Invalid redirect URI" error
**Cause:** Redirect URI in Spotify app doesn't match the cluster route

**Solutions:**
1. Get the correct redirect URI from deployment output
2. Or run: `echo "https://$(oc get route nginx-route -n music-game-spotify -o jsonpath='{.spec.host}')/api/admin/spotify/callback"`
3. Go to https://developer.spotify.com/dashboard
4. Edit your app → Redirect URIs
5. Add the exact URL (must match exactly, including `/api/admin/spotify/callback`)
6. Remove old redirect URIs from previous clusters
7. Click Save
8. Wait 10-30 seconds for changes to propagate
9. Try logging in again

**Common Mistakes:**
- Using old cluster URL (apps.ci-ln-**old**-**cluster**.aws-4...)
- Missing `/api/admin/spotify/callback` path
- Using `http://` instead of `https://`
- Typo in the URL

#### "Not Authenticated" after login
**Cause:** Session cookies not being set

**Solutions:**
1. Check browser is accepting cookies
2. Verify HTTPS is enabled on backend route
3. Clear browser cache and cookies
4. Try incognito/private browsing mode
5. Verify redirect URI is correct in Spotify (see above)

#### "Failed to fetch playlists"
**Cause:** Spotify token expired or invalid

**Solutions:**
1. Logout and login again
2. Check Spotify app credentials are correct
3. Verify redirect URI matches exactly (see first troubleshooting item)
4. Check backend logs: `oc logs deployment/nodejs-app -n music-game-spotify`

#### Upload fails with "Only MP3 files are allowed"
**Cause:** File is not actually MP3 format

**Solutions:**
1. Verify file extension is `.mp3`
2. Check file properties (should show audio/mpeg)
3. Convert file to MP3 if needed (use ffmpeg, Audacity, etc.)
4. Try re-exporting the audio clip

#### Upload fails with "File size must be less than 10MB"
**Cause:** Audio file is too large

**Solutions:**
1. Check file size in file properties
2. Re-encode at lower bitrate (128kbps is sufficient)
3. Ensure clip is only 30 seconds
4. Use audio editing software to compress

### Player Game Issues

#### No songs available
**Cause:** No songs have `has_audio: true`

**Solutions:**
1. Admin must upload audio files
2. Check "Manage Songs" tab - all should show "✓ Has Audio"
3. Verify persistent volume is mounted correctly

#### Audio doesn't play
**Cause:** File not found or CORS issue

**Solutions:**
1. Check browser console for errors
2. Verify audio file endpoint: `/audio/{filename}`
3. Check backend logs for file access errors
4. Verify persistent volume contains files

#### Guesses marked wrong when correct
**Cause:** Spelling differences or special characters

**Solutions:**
1. Fuzzy matching allows 2 character difference
2. Check for special characters (é, ñ, etc.)
3. Verify song name in database matches expectations
4. Use "Manage Songs" to update if needed

### Deployment Issues

#### "ERR_TOO_MANY_REDIRECTS" when accessing /api/admin/spotify/login
**Symptom:** Browser shows infinite redirect loop error

**Cause:** nginx is proxying API requests to external route instead of internal service

**Solution:**
```bash
# Fix the backend-config ConfigMap
oc create configmap backend-config -n music-game-spotify \
  --from-literal=BACKEND_URL=nodejs-service \
  --dry-run=client -o yaml | oc apply -f -

# Restart nginx to apply changes
oc rollout restart deployment nginx-deployment -n music-game-spotify

# Wait for rollout to complete
oc rollout status deployment nginx-deployment -n music-game-spotify
```

**Why it happens:** The backend-config ConfigMap was incorrectly set to the external route hostname, causing nginx to proxy requests back through the ingress controller in a loop.

**Prevention:** The `deploy-spotify.sh` script now automatically sets this to `nodejs-service`

#### MongoDB pod in CrashLoopBackOff
**Symptom:** MongoDB pod logs show "Unable to lock the lock file: /data/db/mongod.lock"

**Cause:** Multiple MongoDB replicas trying to use the same ReadWriteOnce persistent volume

**Solution:**
```bash
# Scale MongoDB to exactly 1 replica
oc scale deployment mongodb -n music-game-spotify --replicas=1

# Verify only one pod is running
oc get pods -n music-game-spotify -l app=mongodb
```

**Why it happens:** The PVC uses ReadWriteOnce access mode, which only allows one pod to mount it at a time. MongoDB needs exclusive access to its data directory.

**Prevention:** The `deployment-spotify/deploybemongo.yaml` file now defaults to 1 replica

#### nodejs-app pods showing CreateContainerConfigError
**Symptom:** nodejs-app pods fail to start with error "configmap 'frontend-url-config' not found"

**Cause:** The frontend-url-config ConfigMap wasn't created during deployment

**Solution:**
```bash
# Get the nginx route hostname
NGINX_ROUTE=$(oc get route nginx-route -n music-game-spotify -o jsonpath='{.spec.host}')

# Create the missing ConfigMap
oc create configmap frontend-url-config -n music-game-spotify \
  --from-literal=FRONTEND_URL=https://${NGINX_ROUTE} \
  --dry-run=client -o yaml | oc apply -f -

# Pods will automatically restart and pick up the ConfigMap
```

**Why it happens:** Earlier versions of the deployment script didn't create this ConfigMap

**Prevention:** The `deploy-spotify.sh` script now automatically creates all three required ConfigMaps:
- `backend-config` (internal service name)
- `frontend-config` (CORS allowed origins)
- `frontend-url-config` (OAuth redirect URL)

#### Pods not starting
**Solutions:**
1. Check pod status: `oc get pods -n music-game-spotify`
2. View pod logs: `oc logs <pod-name> -n music-game-spotify`
3. Describe pod: `oc describe pod <pod-name> -n music-game-spotify`
4. Verify images exist: Check quay.io

#### Persistent volume not mounting
**Solutions:**
1. Check PVC status: `oc get pvc -n music-game-spotify`
2. Verify storage class exists
3. Check PVC is bound: `oc describe pvc audio-storage-pvc -n music-game-spotify`
4. Review deployment volume mounts

#### Routes not accessible
**Solutions:**
1. Check routes: `oc get routes -n music-game-spotify`
2. Verify TLS is configured
3. Test route: `curl -I https://<route-url>`
4. Check route targets correct service

---

## Quick Reference

### URLs
- **Admin Panel:** `https://nginx-route-music-game-spotify.apps.YOUR-CLUSTER.openshift.org/admin`
- **Player Game:** `https://nginx-route-music-game-spotify.apps.YOUR-CLUSTER.openshift.org/`
- **Backend API:** `https://nodejs-route-music-game-spotify.apps.YOUR-CLUSTER.openshift.org/api/`

**Note:** Frontend and Admin are served by nginx-route. API endpoints are on nodejs-route.

### Admin Actions
| Action | Tab | Button |
|--------|-----|--------|
| Login | Welcome | "Login with Spotify" |
| Browse playlists | Import from Spotify | Click playlist card |
| Import songs | Import from Spotify | "Import Selected Songs" |
| Upload audio | Manage Songs | "Upload Audio" |
| Replace audio | Manage Songs | "Replace Audio" |
| Delete song | Manage Songs | "Delete" |
| Logout | Any | "Logout" |

### File Requirements
- **Format:** MP3 only
- **Size:** Maximum 10MB
- **Duration:** Recommended 30 seconds
- **Bitrate:** 128-192 kbps recommended
- **Sample Rate:** 44.1 kHz standard

### Database Query Examples
```bash
# Connect to MongoDB pod
oc exec -it deployment/mongodb -n music-game-spotify -- mongosh

# Switch to database
use musicgame

# View all songs
db.songs.find().pretty()

# View songs with audio
db.songs.find({ has_audio: true }).pretty()

# View songs without audio
db.songs.find({ has_audio: false }).pretty()

# Count imported songs
db.songs.countDocuments()

# Count ready songs
db.songs.countDocuments({ has_audio: true })
```

### Useful Commands
```bash
# Deploy everything
./scripts/deploy-spotify.sh

# Check deployment status
oc get all -n music-game-spotify

# View backend logs
oc logs deployment/nodejs-app -n music-game-spotify -f

# View frontend logs
oc logs deployment/nginx-deployment -n music-game-spotify -f

# Check persistent volume
oc get pvc -n music-game-spotify

# List audio files (exec into backend pod)
oc exec -it deployment/nodejs-app -n music-game-spotify -- ls -lh /usr/src/app/uploads/audio/
```

---

## Best Practices

### For Admins

1. **Source Audio Legally**
   - Only use audio you have rights to
   - CD rips, digital purchases, or licensed sources
   - Never rip directly from Spotify (violates ToS)

2. **Organize Playlists**
   - Create themed playlists on Spotify
   - Group by era, genre, or difficulty
   - Makes importing easier

3. **Prepare Audio Clips**
   - Pre-cut all clips to 30 seconds
   - Use most recognizable part of song
   - Normalize audio levels for consistency
   - Test quality before uploading

4. **Import in Batches**
   - Max 10 songs at a time
   - Upload audio immediately after import
   - Verify each batch before moving on

5. **Test Before Publishing**
   - Play the game yourself
   - Verify all audio plays correctly
   - Check song names/artists are correct

### For Players

1. **Use Headphones**
   - Better audio quality
   - Easier to identify songs

2. **Take Your Time**
   - You can replay each song
   - Listen multiple times if needed
   - 30 seconds is enough for most songs

3. **Spelling Matters**
   - Fuzzy matching allows small errors
   - But try to spell correctly
   - Check capitalization isn't strict

4. **Play Regularly**
   - Daily leaderboard resets daily
   - Compete for top scores
   - Try different playlists/categories

---

## Summary

**Admin Workflow:**
1. Login → Browse Playlists → Import Metadata → Upload Audio → Publish

**Player Workflow:**
1. Enter Name → Play Songs → Submit Guesses → View Results → Check Leaderboard

**Key Points:**
- ✅ Metadata import is automatic from Spotify
- ✅ Audio upload is manual but linked automatically
- ✅ No database updates needed
- ✅ Everything managed through admin UI
- ✅ Ready for deployment and testing!
