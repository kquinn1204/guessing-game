print("Running initialization script...");

// Initialize the 'musicgame' database
db = db.getSiblingDB('musicgame');

// Drop and recreate the 'songs' collection
db.songs.drop();
db.createCollection('songs');

// Insert song data into the 'songs' collection
db.songs.insertMany([
    { songNumber: 1, mp3_filename: 'song1.mp3', song_name: 'Born to Run' },
    { songNumber: 2, mp3_filename: 'song2.mp3', song_name: 'Material Girl' },
    { songNumber: 3, mp3_filename: 'song3.mp3', song_name: 'Superstition' },
    { songNumber: 4, mp3_filename: 'song4.mp3', song_name: 'Ain\'t Nobody' },
    { songNumber: 5, mp3_filename: 'song5.mp3', song_name: 'Come on Eileen' },
    { songNumber: 6, mp3_filename: 'song6.mp3', song_name: 'Summertime Sadness' },
    { songNumber: 7, mp3_filename: 'song7.mp3', song_name: 'Too Sweet' },
    { songNumber: 8, mp3_filename: 'song8.mp3', song_name: 'Theme From Shaft' },
    { songNumber: 9, mp3_filename: 'song9.mp3', song_name: 'Fortnight' },
    { songNumber: 10, mp3_filename: 'song10.mp3', song_name: 'I Had Some Help' }
]);

// Drop and recreate the 'players' collection, starting with empty data
db.players.drop();
db.createCollection('players');

// Example of a test player with initial stats (optional)
db.players.insertOne({
    playerName: 'Test Player',
    guesses: 0,
    correctGuesses: 0,
    results: [],
    timestamp: new Date()
});

// The 'players' collection will remain empty and will expand as players participate

print("Database initialization complete.");
