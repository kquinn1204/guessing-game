print("Running initialization script...");

// Initialize the 'musicgame' database
db = db.getSiblingDB('musicgame');

// Drop and recreate the 'songs' collection
db.songs.drop();
db.createCollection('songs');

// Insert song data into the 'songs' collection
// Corrected song and artist data to match actual MP3 files
db.songs.insertMany([
    { songNumber: 1, mp3_filename: 'song1.mp3', song_name: 'Born to Run', artist_name: 'Bruce Springsteen' },
    { songNumber: 2, mp3_filename: 'song2.mp3', song_name: 'Material Girl', artist_name: 'Madonna' },
    { songNumber: 3, mp3_filename: 'song3.mp3', song_name: 'Superstition', artist_name: 'Stevie Wonder' },
    { songNumber: 4, mp3_filename: 'song4.mp3', song_name: 'Ain\'t Nobody', artist_name: 'Chaka Khan' },
    { songNumber: 5, mp3_filename: 'song5.mp3', song_name: 'Come on Eileen', artist_name: 'Dexys Midnight Runners' },
    { songNumber: 6, mp3_filename: 'song6.mp3', song_name: 'Summertime Sadness', artist_name: 'Lana Del Rey' },
    { songNumber: 7, mp3_filename: 'song7.mp3', song_name: 'Too Sweet', artist_name: 'Hozier' },
    { songNumber: 8, mp3_filename: 'song8.mp3', song_name: 'Theme From Shaft', artist_name: 'Isaac Hayes' },
    { songNumber: 9, mp3_filename: 'song9.mp3', song_name: 'Fortnight', artist_name: 'Taylor Swift' },
    { songNumber: 10, mp3_filename: 'song10.mp3', song_name: 'I Had Some Help', artist_name: 'Post Malone' }
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
