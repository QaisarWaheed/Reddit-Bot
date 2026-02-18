# Discord Reddit Bot

A powerful Discord bot that monitors Reddit for specific phrases and automatically posts matching content to your Discord server.

## Features

- 🔍 **Phrase Monitoring**: Monitor unlimited phrases across all of Reddit
- ⏰ **Time Filtering**: Choose from 1 hour, 1 day, 3 days, 1 week, or 1 month
- 📊 **Rich Embeds**: Beautiful Discord embeds with post details, scores, and links
- 🚫 **Duplicate Prevention**: Never get the same post twice
- 🎯 **Server-Specific**: Each Discord server can have its own phrases and settings
- 🔄 **Automatic Monitoring**: Runs every 5 minutes to find new posts
- 💾 **Persistent Storage**: SQLite database stores all settings and prevents duplicates

## Commands

| Command            | Description                                            | Usage                                                                                   |
| ------------------ | ------------------------------------------------------ | --------------------------------------------------------------------------------------- |
| `/setupreddit`     | Setup monitoring with phrases, age filter, and channel | `/setupreddit phrases: phrase1, phrase2, phrase3 age: Within one day channel: #general` |
| `/listphrases`     | Show all monitored phrases                             | `/listphrases`                                                                          |
| `/removephrase`    | Remove a specific phrase                               | `/removephrase phrase: phrase_to_remove`                                                |
| `/startmonitoring` | Start Reddit monitoring                                | `/startmonitoring`                                                                      |
| `/stopmonitoring`  | Stop Reddit monitoring                                 | `/stopmonitoring`                                                                       |

## Setup Instructions

### 1. Prerequisites

- Node.js 16.9.0 or higher
- A Discord bot token
- A Discord application with bot permissions

### 2. Install Dependencies

```bash
npm install
```

### 3. Discord Bot Setup

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application
3. Go to the "Bot" section and create a bot
4. Copy the bot token
5. Go to "OAuth2" → "URL Generator"
6. Select scopes: `bot`, `applications.commands`
7. Select bot permissions: `Send Messages`, `Use Slash Commands`, `Read Message History`
8. Use the generated URL to invite the bot to your server

### 4. Environment Configuration

Create a `.env` file in the root directory:

```env
DISCORD_TOKEN=your_discord_bot_token_here
CLIENT_ID=your_discord_client_id_here
```

### 5. Run the Bot

```bash
# Development mode with auto-restart
npm run dev

# Production mode
npm start
```

## Usage Examples

### Setting up Reddit monitoring

1. **Setup complete monitoring configuration:**

   ```
   /setupreddit phrases: artificial intelligence, machine learning, AI news age: Within one day channel: #general
   ```

2. **Check your phrases:**

   ```
   /listphrases
   ```

3. **Start monitoring:**

   ```
   /startmonitoring
   ```

The bot will automatically:

- Search Reddit every 5 minutes for posts containing your phrases
- Filter posts based on the selected time range
- Send rich embeds to your Discord channel
- Prevent duplicate notifications

### Removing phrases

```
/removephrase phrase: artificial intelligence
```

## Configuration Options

### Post Age Filters

- **Within one hour**: Only posts from the last hour
- **Within one day**: Only posts from the last 24 hours
- **Yesterday**: Posts from 1-2 days ago
- **This week**: Only posts from the last week
- **This month**: Only posts from the last month

### Monitoring Frequency

The bot checks for new posts every 5 minutes by default. This can be adjusted in the configuration.

## Database

The bot uses SQLite to store:

- Guild settings and channel preferences
- Monitored phrases for each server
- Post history to prevent duplicates

Database file: `./data/reddit_bot.db`

## Rate Limiting

The bot includes built-in rate limiting to respect Reddit's API:

- 1 second delay between post notifications
- Uses Reddit's public search API (no authentication required)
- Optional Reddit API credentials for better rate limits

## Troubleshooting

### Common Issues

1. **Bot not responding to commands**

   - Ensure the bot has the correct permissions
   - Check that slash commands are registered

2. **No posts being found**

   - Verify phrases are correctly set up
   - Check the time filter settings
   - Ensure the bot has permission to send messages in the channel

3. **Duplicate posts**
   - The bot automatically prevents duplicates
   - If you see duplicates, restart the bot

### Logs

Check the console output for detailed logs about:

- Bot startup and initialization
- Reddit search results
- Discord message sending
- Error messages

## Development

### Project Structure

```
reddit-bot/
├── commands/           # Discord slash commands
├── services/           # Core services (database, Reddit monitoring)
├── data/              # SQLite database (created automatically)
├── index.js           # Main bot file
├── package.json       # Dependencies and scripts
└── README.md          # This file
```

### Adding New Features

1. **New Commands**: Add to `commands/` directory and register in `index.js`
2. **New Services**: Add to `services/` directory
3. **Database Changes**: Modify `services/database.js`

### Testing

```bash
# Run tests (when implemented)
npm test

# Development mode with auto-restart
npm run dev
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the ISC License.

## Support

If you encounter any issues or have questions:

1. Check the troubleshooting section
2. Review the logs for error messages
3. Open an issue on GitHub with detailed information

## Changelog

### Version 1.0.0

- Initial release
- Basic Reddit monitoring functionality
- Discord slash commands
- SQLite database storage
- Time filtering options
- Duplicate prevention
