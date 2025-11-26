#!/bin/bash
# Script to upload songs to the Music Guessing Game from command line

set -e

# Configuration
NGINX_ROUTE="https://nginx-route-music-game-spotify.apps.ci-ln-5v48rcb-76ef8.aws-4.ci.openshift.org"
COOKIE_FILE="/tmp/music-game-cookies.txt"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_success() { echo -e "${GREEN}✓ $1${NC}"; }
print_error() { echo -e "${RED}✗ $1${NC}"; }
print_info() { echo -e "${YELLOW}ℹ $1${NC}"; }

# Function to check authentication
check_auth() {
    local response=$(curl -sk -b "$COOKIE_FILE" "$NGINX_ROUTE/api/admin/auth-status" 2>/dev/null)
    if echo "$response" | grep -q '"authenticated":true'; then
        return 0
    else
        return 1
    fi
}

# Function to create a song
create_song() {
    local song_name="$1"
    local artist_name="$2"

    local response=$(curl -sk -b "$COOKIE_FILE" -c "$COOKIE_FILE" \
        -X POST "$NGINX_ROUTE/api/admin/songs" \
        -H "Content-Type: application/json" \
        -d "{\"song_name\":\"$song_name\",\"artist_name\":\"$artist_name\"}" 2>/dev/null)

    if echo "$response" | grep -q '"songId"'; then
        local song_id=$(echo "$response" | grep -o '"songId":"[^"]*"' | cut -d'"' -f4)
        echo "$song_id"
        return 0
    else
        echo "$response" >&2
        return 1
    fi
}

# Function to upload audio for a song
upload_audio() {
    local song_id="$1"
    local audio_file="$2"

    local response=$(curl -sk -b "$COOKIE_FILE" -c "$COOKIE_FILE" \
        -X POST "$NGINX_ROUTE/api/admin/upload-audio/$song_id" \
        -F "audioFile=@$audio_file" 2>/dev/null)

    if echo "$response" | grep -q '"message":"Audio file uploaded successfully"'; then
        return 0
    else
        echo "$response" >&2
        return 1
    fi
}

# Main script
echo "========================================"
echo "Music Guessing Game - Song Upload Tool"
echo "========================================"
echo ""

# Check if user is authenticated
if check_auth; then
    print_success "Already authenticated"
else
    print_error "Not authenticated. Please login first."
    echo ""
    print_info "To authenticate:"
    echo "  1. Open browser and go to: $NGINX_ROUTE/admin"
    echo "  2. Login with Spotify"
    echo "  3. Open browser developer tools (F12)"
    echo "  4. Go to Application/Storage > Cookies"
    echo "  5. Copy the 'connect.sid' cookie value"
    echo "  6. Run: echo 'connect.sid=<your-cookie-value>' > $COOKIE_FILE"
    echo "  7. Then run this script again"
    echo ""
    exit 1
fi

# Parse command line arguments
if [ "$#" -lt 3 ]; then
    echo "Usage: $0 <song_name> <artist_name> <audio_file.mp3>"
    echo ""
    echo "Example:"
    echo "  $0 \"Bohemian Rhapsody\" \"Queen\" ~/Music/bohemian_rhapsody.mp3"
    echo ""
    exit 1
fi

SONG_NAME="$1"
ARTIST_NAME="$2"
AUDIO_FILE="$3"

# Validate audio file
if [ ! -f "$AUDIO_FILE" ]; then
    print_error "Audio file not found: $AUDIO_FILE"
    exit 1
fi

if [[ ! "$AUDIO_FILE" =~ \.mp3$ ]]; then
    print_error "Audio file must be an MP3 file"
    exit 1
fi

FILE_SIZE=$(stat -f%z "$AUDIO_FILE" 2>/dev/null || stat -c%s "$AUDIO_FILE" 2>/dev/null)
MAX_SIZE=$((10 * 1024 * 1024)) # 10MB

if [ "$FILE_SIZE" -gt "$MAX_SIZE" ]; then
    print_error "Audio file is too large ($(($FILE_SIZE / 1024 / 1024))MB). Maximum size is 10MB"
    exit 1
fi

echo "Song Details:"
echo "  Name: $SONG_NAME"
echo "  Artist: $ARTIST_NAME"
echo "  File: $AUDIO_FILE ($(($FILE_SIZE / 1024))KB)"
echo ""

# Step 1: Create song entry
print_info "Creating song entry..."
SONG_ID=$(create_song "$SONG_NAME" "$ARTIST_NAME")

if [ -z "$SONG_ID" ]; then
    print_error "Failed to create song entry"
    exit 1
fi

print_success "Song created with ID: $SONG_ID"

# Step 2: Upload audio file
print_info "Uploading audio file..."
if upload_audio "$SONG_ID" "$AUDIO_FILE"; then
    print_success "Audio uploaded successfully!"
    echo ""
    print_success "Song is now ready to play in the game!"
else
    print_error "Failed to upload audio file"
    exit 1
fi

echo ""
echo "=========================================="
echo "Upload complete!"
echo "=========================================="
