const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { MongoClient, ObjectId } = require('mongodb');
const SpotifyWebApi = require('spotify-web-api-node');
const session = require('express-session');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Simple Levenshtein distance function for fuzzy matching
function levenshteinDistance(str1, str2) {
    const m = str1.length;
    const n = str2.length;
    const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;

    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            if (str1[i - 1] === str2[j - 1]) {
                dp[i][j] = dp[i - 1][j - 1];
            } else {
                dp[i][j] = Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]) + 1;
            }
        }
    }
    return dp[m][n];
}

// Fuzzy match function - allows up to 2 character differences for strings > 5 chars
function fuzzyMatch(guess, actual) {
    const guessLower = guess.toLowerCase().trim();
    const actualLower = actual.toLowerCase().trim();

    if (guessLower === actualLower) return true;

    const maxDistance = actualLower.length > 5 ? 2 : 1;
    const distance = levenshteinDistance(guessLower, actualLower);

    return distance <= maxDistance;
}

// Create an Express application
const app = express();
const port = process.env.PORT || 3000;

// Session middleware for admin authentication
app.use(session({
    secret: process.env.SESSION_SECRET || 'music-game-admin-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Middleware to parse incoming JSON requests
app.use(bodyParser.json());

// Allow all origins (CORS policy for open access)
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type'],
    credentials: true
}));

// Spotify API configuration
const spotifyApi = new SpotifyWebApi({
    clientId: process.env.SPOTIFY_CLIENT_ID,
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
    redirectUri: process.env.SPOTIFY_REDIRECT_URI
});

// Spotify OAuth scopes
const scopes = [
    'user-read-private',
    'user-read-email',
    'playlist-read-private',
    'playlist-read-collaborative'
];

// Audio upload configuration
const AUDIO_UPLOAD_DIR = process.env.AUDIO_UPLOAD_DIR || '/usr/src/app/uploads/audio';

// Ensure upload directory exists
if (!fs.existsSync(AUDIO_UPLOAD_DIR)) {
    fs.mkdirSync(AUDIO_UPLOAD_DIR, { recursive: true });
    console.log(`Created audio upload directory: ${AUDIO_UPLOAD_DIR}`);
}

// Configure multer for audio file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, AUDIO_UPLOAD_DIR);
    },
    filename: function (req, file, cb) {
        // Use songId from request body to create filename
        const songId = req.body.songId;
        const ext = path.extname(file.originalname);
        // Generate filename: songId_timestamp.mp3
        cb(null, `${songId}_${Date.now()}${ext}`);
    }
});

// File filter to only accept MP3 files
const fileFilter = (req, file, cb) => {
    const allowedTypes = ['audio/mpeg', 'audio/mp3'];
    const ext = path.extname(file.originalname).toLowerCase();

    if (allowedTypes.includes(file.mimetype) || ext === '.mp3') {
        cb(null, true);
    } else {
        cb(new Error('Only MP3 files are allowed'), false);
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    }
});

// MongoDB connection URL and database name
const mongoUrl = process.env.MONGO_URL || 'mongodb://mongodb-service:27017';
const dbName = process.env.DB_NAME || 'musicgame';

let dbClient;
let db;

// Function to connect to MongoDB
async function connectToDatabase(retries = 5, delay = 2000) {
    while (retries > 0) {
        try {
            if (!dbClient || !dbClient.topology?.isConnected()) {
                console.log('Connecting to MongoDB...');
                dbClient = new MongoClient(mongoUrl, {
                    useNewUrlParser: true,
                    useUnifiedTopology: true,
                    maxPoolSize: 10,
                    minPoolSize: 2,
                    connectTimeoutMS: 30000,
                    socketTimeoutMS: 45000
                });
                await dbClient.connect();
                db = dbClient.db(dbName);
                console.log("MongoDB connected successfully.");
            }
            return;
        } catch (error) {
            console.error('MongoDB connection error:', error);
            retries--;
            console.log(`Retries left: ${retries}. Retrying in ${delay}ms...`);
            await new Promise(res => setTimeout(res, delay));
        }
    }
    throw new Error('Database connection failed after multiple attempts');
}

// ========================================
// SPOTIFY ADMIN ENDPOINTS
// ========================================

// Middleware to check if admin is authenticated
function requireAuth(req, res, next) {
    if (!req.session.spotifyAccessToken) {
        return res.status(401).json({ error: 'Not authenticated. Please login with Spotify.' });
    }
    next();
}

// Spotify OAuth login endpoint
app.get('/api/admin/spotify/login', (req, res) => {
    const authorizeURL = spotifyApi.createAuthorizeURL(scopes, 'state-key');
    console.log('Redirecting to Spotify OAuth:', authorizeURL);
    res.redirect(authorizeURL);
});

// Spotify OAuth callback endpoint
app.get('/api/admin/spotify/callback', async (req, res) => {
    const { code, error } = req.query;

    if (error) {
        console.error('Spotify OAuth error:', error);
        return res.redirect('/admin?error=spotify_auth_failed');
    }

    if (!code) {
        return res.redirect('/admin?error=no_code');
    }

    try {
        // Exchange authorization code for access token
        const data = await spotifyApi.authorizationCodeGrant(code);
        const { access_token, refresh_token, expires_in } = data.body;

        // Store tokens in session
        req.session.spotifyAccessToken = access_token;
        req.session.spotifyRefreshToken = refresh_token;
        req.session.spotifyTokenExpiry = Date.now() + expires_in * 1000;

        // Set access token on the API object
        spotifyApi.setAccessToken(access_token);
        spotifyApi.setRefreshToken(refresh_token);

        console.log('Spotify OAuth successful');

        // Redirect to admin panel
        res.redirect('/admin?auth=success');
    } catch (error) {
        console.error('Error exchanging code for token:', error);
        res.redirect('/admin?error=token_exchange_failed');
    }
});

// Logout endpoint
app.get('/api/admin/spotify/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Error destroying session:', err);
            return res.status(500).json({ error: 'Logout failed' });
        }
        res.json({ message: 'Logged out successfully' });
    });
});

// Check authentication status
app.get('/api/admin/auth-status', (req, res) => {
    if (req.session.spotifyAccessToken) {
        res.json({ authenticated: true });
    } else {
        res.json({ authenticated: false });
    }
});

// Get user's Spotify playlists
app.get('/api/admin/spotify/playlists', requireAuth, async (req, res) => {
    try {
        // Refresh token if expired
        if (Date.now() >= req.session.spotifyTokenExpiry) {
            const data = await spotifyApi.refreshAccessToken();
            req.session.spotifyAccessToken = data.body.access_token;
            req.session.spotifyTokenExpiry = Date.now() + data.body.expires_in * 1000;
            spotifyApi.setAccessToken(data.body.access_token);
        } else {
            spotifyApi.setAccessToken(req.session.spotifyAccessToken);
        }

        const data = await spotifyApi.getUserPlaylists({ limit: 50 });
        const playlists = data.body.items.map(playlist => ({
            id: playlist.id,
            name: playlist.name,
            description: playlist.description,
            images: playlist.images,
            tracks: { total: playlist.tracks.total },
            owner: playlist.owner.display_name,
            public: playlist.public
        }));

        res.json(playlists);
    } catch (error) {
        console.error('Error fetching playlists:', error);
        res.status(500).json({ error: 'Failed to fetch playlists' });
    }
});

// Get tracks from a specific playlist
app.get('/api/admin/spotify/playlist/:id/tracks', requireAuth, async (req, res) => {
    try {
        // Refresh token if expired
        if (Date.now() >= req.session.spotifyTokenExpiry) {
            const data = await spotifyApi.refreshAccessToken();
            req.session.spotifyAccessToken = data.body.access_token;
            req.session.spotifyTokenExpiry = Date.now() + data.body.expires_in * 1000;
            spotifyApi.setAccessToken(data.body.access_token);
        } else {
            spotifyApi.setAccessToken(req.session.spotifyAccessToken);
        }

        const playlistId = req.params.id;
        const data = await spotifyApi.getPlaylistTracks(playlistId, { limit: 100 });

        const tracks = data.body.items
            .filter(item => item.track) // Filter out null tracks
            .map(item => ({
                id: item.track.id,
                name: item.track.name,
                artist: item.track.artists.map(a => a.name).join(', '),
                album: item.track.album.name,
                albumArt: item.track.album.images[0]?.url,
                releaseDate: item.track.album.release_date,
                duration_ms: item.track.duration_ms,
                popularity: item.track.popularity,
                preview_url: item.track.preview_url,
                spotify_uri: item.track.uri
            }));

        res.json(tracks);
    } catch (error) {
        console.error('Error fetching playlist tracks:', error);
        res.status(500).json({ error: 'Failed to fetch playlist tracks' });
    }
});

// Import playlist metadata (without audio files)
app.post('/api/admin/spotify/import-playlist', requireAuth, async (req, res) => {
    const { tracks } = req.body;

    if (!tracks || !Array.isArray(tracks) || tracks.length === 0) {
        return res.status(400).json({ error: 'Invalid tracks data' });
    }

    try {
        await connectToDatabase();
        const songsCollection = db.collection('songs');

        // Get the current max songNumber
        const maxSong = await songsCollection.findOne({}, { sort: { songNumber: -1 } });
        let nextSongNumber = maxSong ? maxSong.songNumber + 1 : 1;

        const importedSongs = [];

        for (const track of tracks) {
            const songDoc = {
                songNumber: nextSongNumber++,
                mp3_filename: `song${nextSongNumber - 1}.mp3`, // Placeholder, will be updated when audio is uploaded
                song_name: track.name,
                artist_name: track.artist,

                // Spotify metadata
                spotify_id: track.id,
                spotify_preview_url: track.preview_url,
                spotify_uri: track.spotify_uri,
                album_name: track.album,
                album_art_url: track.albumArt,
                release_date: track.releaseDate,
                duration_ms: track.duration_ms,
                popularity: track.popularity,

                // Game metadata
                has_audio: false, // Will be set to true when audio file is uploaded
                difficulty: 'medium',
                category: req.body.category || 'spotify-import',
                uploaded_by: req.session.spotifyUserId || 'admin',
                created_at: new Date()
            };

            await songsCollection.insertOne(songDoc);
            importedSongs.push(songDoc);
        }

        res.json({
            message: `Successfully imported ${importedSongs.length} songs`,
            songs: importedSongs
        });
    } catch (error) {
        console.error('Error importing playlist:', error);
        res.status(500).json({ error: 'Failed to import playlist' });
    }
});

// Get all songs (for admin management)
app.get('/api/admin/songs', requireAuth, async (req, res) => {
    try {
        await connectToDatabase();
        const songsCollection = db.collection('songs');
        const songs = await songsCollection.find({}).sort({ songNumber: 1 }).toArray();
        res.json(songs);
    } catch (error) {
        console.error('Error fetching songs:', error);
        res.status(500).json({ error: 'Failed to fetch songs' });
    }
});

// Update song metadata
app.put('/api/admin/songs/:id', requireAuth, async (req, res) => {
    try {
        await connectToDatabase();
        const songsCollection = db.collection('songs');
        const { ObjectId } = require('mongodb');

        const result = await songsCollection.updateOne(
            { _id: new ObjectId(req.params.id) },
            { $set: req.body }
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({ error: 'Song not found' });
        }

        res.json({ message: 'Song updated successfully' });
    } catch (error) {
        console.error('Error updating song:', error);
        res.status(500).json({ error: 'Failed to update song' });
    }
});

// Delete song
app.delete('/api/admin/songs/:id', requireAuth, async (req, res) => {
    try {
        await connectToDatabase();
        const songsCollection = db.collection('songs');

        const result = await songsCollection.deleteOne({ _id: new ObjectId(req.params.id) });

        if (result.deletedCount === 0) {
            return res.status(404).json({ error: 'Song not found' });
        }

        res.json({ message: 'Song deleted successfully' });
    } catch (error) {
        console.error('Error deleting song:', error);
        res.status(500).json({ error: 'Failed to delete song' });
    }
});

// Upload audio file for a song
app.post('/api/admin/upload-audio/:id', requireAuth, upload.single('audioFile'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No audio file provided' });
        }

        await connectToDatabase();
        const songsCollection = db.collection('songs');

        // Find the song
        const song = await songsCollection.findOne({ _id: new ObjectId(req.params.id) });

        if (!song) {
            // Delete uploaded file if song not found
            fs.unlinkSync(req.file.path);
            return res.status(404).json({ error: 'Song not found' });
        }

        // Delete old audio file if it exists
        if (song.mp3_filename && song.has_audio) {
            const oldFilePath = path.join(AUDIO_UPLOAD_DIR, song.mp3_filename);
            if (fs.existsSync(oldFilePath)) {
                fs.unlinkSync(oldFilePath);
                console.log(`Deleted old audio file: ${oldFilePath}`);
            }
        }

        // Update song with new audio filename
        const filename = req.file.filename;
        const result = await songsCollection.updateOne(
            { _id: new ObjectId(req.params.id) },
            {
                $set: {
                    mp3_filename: filename,
                    has_audio: true,
                    audio_uploaded_at: new Date()
                }
            }
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({ error: 'Song not found' });
        }

        console.log(`Audio uploaded for song: ${song.song_name} - File: ${filename}`);

        res.json({
            message: 'Audio file uploaded successfully',
            filename: filename,
            songId: req.params.id
        });
    } catch (error) {
        console.error('Error uploading audio:', error);
        // Clean up uploaded file on error
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        res.status(500).json({ error: 'Failed to upload audio file' });
    }
});

// Get audio file
app.get('/audio/:filename', async (req, res) => {
    try {
        const filename = req.params.filename;
        const filePath = path.join(AUDIO_UPLOAD_DIR, filename);

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: 'Audio file not found' });
        }

        res.sendFile(filePath);
    } catch (error) {
        console.error('Error serving audio file:', error);
        res.status(500).json({ error: 'Failed to serve audio file' });
    }
});

// ========================================
// GAME ENDPOINTS
// ========================================

// POST route to handle guesses from the frontend
app.post('/submit-guesses', async (req, res) => {
    const { playerName, guesses } = req.body;

    if (!playerName || !guesses || !Array.isArray(guesses) || guesses.length === 0) {
        return res.status(400).json({ error: 'Invalid input' });
    }

    try {
        await connectToDatabase();
        const songsCollection = db.collection('songs');
        const playersCollection = db.collection('players');

        let results = [];
        let correctSongCount = 0;
        let correctArtistCount = 0;

        for (let guessData of guesses) {
            const { songFile, songGuess, artistGuess } = guessData;
            const mp3_filename = `${songFile}.mp3`;

            if (!songFile || !songGuess || !artistGuess) {
                results.push({
                    songFile,
                    songGuess,
                    artistGuess,
                    correctSong: false,
                    correctArtist: false,
                    correctAnswer: 'Incomplete guess data'
                });
                continue;
            }

            const song = await songsCollection.findOne({ mp3_filename: mp3_filename });
            if (!song) {
                results.push({
                    songFile,
                    songGuess,
                    artistGuess,
                    correctSong: false,
                    correctArtist: false,
                    correctAnswer: 'Song not found'
                });
                continue;
            }

            const isSongCorrect = fuzzyMatch(songGuess, song.song_name);
            const isArtistCorrect = fuzzyMatch(artistGuess, song.artist_name);

            if (isSongCorrect) correctSongCount++;
            if (isArtistCorrect) correctArtistCount++;

            results.push({
                songFile,
                songGuess,
                artistGuess,
                correctSong: isSongCorrect,
                correctArtist: isArtistCorrect,
                correctAnswer: { song: song.song_name, artist: song.artist_name }
            });
        }

        const totalPossibleCorrect = guesses.length * 2;
        const correctAnswersFormatted = results.map(result => 
            `Song: ${result.correctAnswer.song}, Artist: ${result.correctAnswer.artist}`
        );

        await playersCollection.updateOne(
            { playerName },
            {
                $inc: { guesses: guesses.length, correctSongGuesses: correctSongCount, correctArtistGuesses: correctArtistCount },
                $set: { results, timestamp: new Date() }
            },
            { upsert: true }
        );

        res.json({
            message: `Game Over! You got ${correctSongCount + correctArtistCount} out of ${totalPossibleCorrect} correct.`,
            correctGuesses: correctSongCount + correctArtistCount,
            correctSongGuesses: correctSongCount,
            correctArtistGuesses: correctArtistCount,
            correctAnswers: correctAnswersFormatted,
            details: results
        });

    } catch (error) {
        console.error('Error processing request:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    } finally {
        if (dbClient) await dbClient.close();
    }
});

// POST route for immediate guess validation (optional feature)
app.post('/validate-guess', async (req, res) => {
    const { songFile, songGuess, artistGuess } = req.body;

    if (!songFile || !songGuess || !artistGuess) {
        return res.status(400).json({ error: 'Invalid input' });
    }

    try {
        await connectToDatabase();
        const songsCollection = db.collection('songs');

        const mp3_filename = `${songFile}.mp3`;
        const song = await songsCollection.findOne({ mp3_filename });

        if (!song) {
            return res.status(404).json({ error: 'Song not found' });
        }

        const isSongCorrect = fuzzyMatch(songGuess, song.song_name);
        const isArtistCorrect = fuzzyMatch(artistGuess, song.artist_name);

        res.json({
            correctSong: isSongCorrect,
            correctArtist: isArtistCorrect,
            correctAnswer: { song: song.song_name, artist: song.artist_name }
        });
    } catch (error) {
        console.error('Error validating guess:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Test route to check MongoDB connectivity
app.get('/test-db', async (req, res) => {
    try {
        await connectToDatabase();
        const collection = db.collection('songs');
        const document = await collection.findOne({});
        res.status(200).json({ success: true, document });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Leaderboard route with time filtering
app.get('/leaderboard', async (req, res) => {
    try {
        await connectToDatabase();
        const playersCollection = db.collection('players');

        const filter = req.query.filter || 'all';
        let dateFilter = {};

        const now = new Date();
        if (filter === 'daily') {
            // Today's records only
            const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            dateFilter = { timestamp: { $gte: startOfDay } };
        } else if (filter === 'weekly') {
            // Last 7 days
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            dateFilter = { timestamp: { $gte: weekAgo } };
        }
        // 'all' or any other value = no date filter

        const leaderboard = await playersCollection
            .find(dateFilter)
            .project({
                playerName: 1,
                correctSongGuesses: 1,
                correctArtistGuesses: 1,
                timestamp: 1
            })
            .sort({ correctSongGuesses: -1, correctArtistGuesses: -1 })
            .limit(10)
            .toArray();

        const leaderboardWithTotals = leaderboard.map(player => ({
            ...player,
            totalScore: (player.correctSongGuesses || 0) + (player.correctArtistGuesses || 0),
            playedAt: player.timestamp
        }));

        res.json(leaderboardWithTotals);
    } catch (error) {
        console.error('Error fetching leaderboard:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Top player route
app.get('/top-player', async (req, res) => {
    try {
        await connectToDatabase();
        const playersCollection = db.collection('players');

        const topPlayer = await playersCollection.aggregate([
            { $addFields: { totalCorrectGuesses: { $add: ["$correctSongGuesses", "$correctArtistGuesses"] } } },
            { $sort: { totalCorrectGuesses: -1 } },
            { $limit: 1 },
            { $project: { playerName: 1, correctSongGuesses: 1, correctArtistGuesses: 1, totalCorrectGuesses: 1, timestamp: 1 } }
        ]).toArray();

        if (topPlayer.length === 0) {
            return res.status(404).json({ message: 'No players found' });
        }

        res.json({
            playerName: topPlayer[0].playerName,
            correctSongGuesses: topPlayer[0].correctSongGuesses || 0,
            correctArtistGuesses: topPlayer[0].correctArtistGuesses || 0,
            totalCorrectGuesses: topPlayer[0].totalCorrectGuesses || 0,
            timestamp: topPlayer[0].timestamp
        });
    } catch (error) {
        console.error('Error fetching top player:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Middleware to log frontend URL from Referer header
app.use((req, res, next) => {
    const referer = req.get('Referer');
    if (referer) {
        const frontendUrl = new URL(referer).origin;
        console.log(`Frontend URL: ${frontendUrl}`);
    }
    next();
});

// Start the backend server
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
