# Quick Setup Guide

## 🚀 Get Your Bot Running in 5 Minutes

### Step 1: Create Discord Bot

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click "New Application" and give it a name
3. Go to "Bot" section → "Add Bot"
4. Copy the **Bot Token** (you'll need this)
5. Go to "OAuth2" → "URL Generator"
6. Select scopes: `bot`, `applications.commands`
7. Select permissions: `Send Messages`, `Use Slash Commands`, `Read Message History`
8. Copy the generated URL and open it in a browser to invite the bot

### Step 2: Configure Environment

Create a `.env` file in the bot folder:

```env
DISCORD_TOKEN=your_bot_token_here
CLIENT_ID=your_application_client_id_here
```

### Step 3: Install & Run

```bash
npm install
npm start
```

### Step 4: Use the Bot

In your Discord server, use these commands:

- `/setupreddit phrases: your phrase here age: Within one day channel: #general` - Setup complete monitoring
- `/startmonitoring` - Start the bot
- `/listphrases` - See what you're monitoring

## 🔧 Troubleshooting

**Bot not responding?**

- Check the bot has permissions in your server
- Verify the token is correct in `.env`

**No posts found?**

- Make sure phrases are set up with `/setupreddit`
- Check the time filter with `/setage`

**Need help?**

- Check the main README.md for detailed instructions
- Look at console logs for error messages

## 📱 Example Usage

```
/setupreddit phrases: artificial intelligence, machine learning, AI news age: Within one day channel: #general
/startmonitoring
```

The bot will now automatically find Reddit posts with those phrases and send them to your Discord channel every 5 minutes!
