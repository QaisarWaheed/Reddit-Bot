const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database file path
const dbPath = path.join(__dirname, '../data/reddit_bot.db');

// Ensure data directory exists
const fs = require('fs');
const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

// Initialize database
async function initDatabase() {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(dbPath, (err) => {
            if (err) {
                console.error('Error opening database:', err);
                reject(err);
                return;
            }

            // Create tables
            db.serialize(() => {
                // Guilds table
                db.run(`CREATE TABLE IF NOT EXISTS guilds (
                    guild_id TEXT PRIMARY KEY,
                    channel_id TEXT NOT NULL,
                    post_age TEXT DEFAULT 'day',
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )`);

                // Phrases table
                db.run(`CREATE TABLE IF NOT EXISTS phrases (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    guild_id TEXT NOT NULL,
                    phrase TEXT NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (guild_id) REFERENCES guilds(guild_id) ON DELETE CASCADE
                )`);

                // Posts table (to avoid duplicate notifications)
                db.run(`CREATE TABLE IF NOT EXISTS posts (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    reddit_id TEXT UNIQUE NOT NULL,
                    guild_id TEXT NOT NULL,
                    phrase TEXT NOT NULL,
                    title TEXT NOT NULL,
                    url TEXT NOT NULL,
                    subreddit TEXT NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (guild_id) REFERENCES guilds(guild_id) ON DELETE CASCADE
                )`);

                // Create indexes
                db.run('CREATE INDEX IF NOT EXISTS idx_phrases_guild_id ON phrases(guild_id)');
                db.run('CREATE INDEX IF NOT EXISTS idx_posts_reddit_id ON posts(reddit_id)');
                db.run('CREATE INDEX IF NOT EXISTS idx_posts_guild_id ON posts(guild_id)');
            });

            db.close((err) => {
                if (err) {
                    console.error('Error closing database:', err);
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    });
}

// Add phrases to a guild
async function addPhrases(guildId, channelId, phrases, postAge = 'day') {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(dbPath, (err) => {
            if (err) {
                reject(err);
                return;
            }

            db.serialize(() => {
                // First, ensure guild exists or create it with age setting
                db.run(`INSERT OR REPLACE INTO guilds (guild_id, channel_id, post_age, updated_at) 
                        VALUES (?, ?, ?, CURRENT_TIMESTAMP)`, [guildId, channelId, postAge]);

                // Add phrases
                const stmt = db.prepare('INSERT OR IGNORE INTO phrases (guild_id, phrase) VALUES (?, ?)');
                phrases.forEach(phrase => {
                    stmt.run([guildId, phrase]);
                });
                stmt.finalize();

                db.close((err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
        });
    });
}

// Get all phrases for a guild
async function getGuildPhrases(guildId) {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(dbPath, (err) => {
            if (err) {
                reject(err);
                return;
            }

            db.all('SELECT phrase FROM phrases WHERE guild_id = ? ORDER BY created_at ASC', [guildId], (err, rows) => {
                db.close();
                if (err) reject(err);
                else resolve(rows);
            });
        });
    });
}

// Remove a phrase from a guild
async function removePhraseFromGuild(guildId, phrase) {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(dbPath, (err) => {
            if (err) {
                reject(err);
                return;
            }

            db.run('DELETE FROM phrases WHERE guild_id = ? AND phrase = ?', [guildId, phrase], function(err) {
                db.close();
                if (err) reject(err);
                else resolve(this.changes > 0);
            });
        });
    });
}

// Get guild settings
async function getGuildSettings(guildId) {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(dbPath, (err) => {
            if (err) {
                reject(err);
                return;
            }

            db.get('SELECT * FROM guilds WHERE guild_id = ?', [guildId], (err, row) => {
                db.close();
                if (err) reject(err);
                else resolve(row);
            });
        });
    });
}

// Update guild settings
async function updateGuildSettings(guildId, settings) {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(dbPath, (err) => {
            if (err) {
                reject(err);
                return;
            }

            const updates = [];
            const values = [];
            
            if (settings.channelId) {
                updates.push('channel_id = ?');
                values.push(settings.channelId);
            }
            if (settings.postAge) {
                updates.push('post_age = ?');
                values.push(settings.postAge);
            }
            
            updates.push('updated_at = CURRENT_TIMESTAMP');
            values.push(guildId);

            const query = `UPDATE guilds SET ${updates.join(', ')} WHERE guild_id = ?`;
            
            db.run(query, values, function(err) {
                db.close();
                if (err) reject(err);
                else resolve(this.changes > 0);
            });
        });
    });
}

// Check if a post has already been notified
async function isPostNotified(redditId, guildId) {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(dbPath, (err) => {
            if (err) {
                reject(err);
                return;
            }

            db.get('SELECT id FROM posts WHERE reddit_id = ? AND guild_id = ?', [redditId, guildId], (err, row) => {
                db.close();
                if (err) reject(err);
                else resolve(!!row);
            });
        });
    });
}

// Mark a post as notified
async function markPostAsNotified(redditId, guildId, phrase, title, url, subreddit) {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(dbPath, (err) => {
            if (err) {
                reject(err);
                return;
            }

            db.run(`INSERT INTO posts (reddit_id, guild_id, phrase, title, url, subreddit) 
                    VALUES (?, ?, ?, ?, ?, ?)`, [redditId, guildId, phrase, title, url, subreddit], function(err) {
                db.close();
                if (err) reject(err);
                else resolve(this.lastID);
            });
        });
    });
}

// Get all guilds with their settings
async function getAllGuilds() {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(dbPath, (err) => {
            if (err) {
                reject(err);
                return;
            }

            db.all('SELECT * FROM guilds', (err, rows) => {
                db.close();
                if (err) reject(err);
                else resolve(rows);
            });
        });
    });
}

// Clean old posts (older than 1 month)
async function cleanOldPosts() {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(dbPath, (err) => {
            if (err) {
                reject(err);
                return;
            }

            db.run('DELETE FROM posts WHERE created_at < datetime("now", "-1 month")', function(err) {
                db.close();
                if (err) reject(err);
                else resolve(this.changes);
            });
        });
    });
}

// Clear all phrases for a guild
async function clearAllPhrases(guildId) {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(dbPath, (err) => {
            if (err) {
                reject(err);
                return;
            }

            db.run('DELETE FROM phrases WHERE guild_id = ?', [guildId], function(err) {
                db.close();
                if (err) reject(err);
                else resolve(this.changes);
            });
        });
    });
}

module.exports = {
    initDatabase,
    addPhrases,
    getGuildPhrases,
    removePhraseFromGuild,
    getGuildSettings,
    updateGuildSettings,
    isPostNotified,
    markPostAsNotified,
    getAllGuilds,
    cleanOldPosts,
    clearAllPhrases
};
