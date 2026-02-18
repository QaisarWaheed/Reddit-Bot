// Configuration file for the Discord Reddit Bot
// Copy this file to config.js and fill in your values

module.exports = {
    // Discord Bot Configuration
    discord: {
        token: process.env.DISCORD_TOKEN || 'your_discord_bot_token_here',
        clientId: process.env.CLIENT_ID || 'your_discord_client_id_here'
    },

    // Reddit API Configuration (Optional - for better rate limits)
    reddit: {
        clientId: process.env.REDDIT_CLIENT_ID || null,
        clientSecret: process.env.REDDIT_CLIENT_SECRET || null,
        userAgent: process.env.REDDIT_USER_AGENT || 'Discord-Reddit-Bot/1.0 (by /u/your_username)'
    },

    // Database Configuration
    database: {
        // The bot uses SQLite by default, stored in ./data/reddit_bot.db
        // No additional configuration needed
    },

    // Monitoring Configuration
    monitoring: {
        interval: process.env.MONITORING_INTERVAL || 300000, // 5 minutes in milliseconds
        cleanupTime: '0 2 * * *' // Daily at 2 AM
    },

    // Google Sheets Configuration (Optional - for lead tracking)
    googleSheets: {
        enabled: process.env.GOOGLE_SHEETS_ENABLED === 'true' || false,
        spreadsheetId: process.env.GOOGLE_SHEET_ID || null,
        // You'll need to add a credentials.json file with your Google API credentials
        // Download from: https://console.developers.google.com/
    }
};
