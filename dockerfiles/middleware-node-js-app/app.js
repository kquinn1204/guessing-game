const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { MongoClient } = require('mongodb');

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

            const isSongCorrect = song.song_name.toLowerCase() === songGuess.toLowerCase();
            const isArtistCorrect = song.artist_name.toLowerCase() === artistGuess.toLowerCase();

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

// Leaderboard route
app.get('/leaderboard', async (req, res) => {
    try {
        await connectToDatabase();
        const playersCollection = db.collection('players');

        const leaderboard = await playersCollection
            .find({})
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
            correctArtistGuesses: topPlayer[0].correctArtistGuesses
