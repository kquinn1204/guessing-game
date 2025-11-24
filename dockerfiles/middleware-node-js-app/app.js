const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { MongoClient } = require('mongodb');

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

// Middleware to parse incoming JSON requests
app.use(bodyParser.json());

// Allow all origins (CORS policy for open access)
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type']
}));

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
