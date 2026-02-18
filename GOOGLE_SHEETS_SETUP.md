# Google Sheets Integration Setup

This guide will help you set up Google Sheets integration for lead tracking in your Reddit bot.

## Prerequisites

1. A Google account
2. Access to Google Cloud Console
3. Your Reddit bot already set up and running

## Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a project" → "New Project"
3. Enter project name: "Reddit Bot Lead Tracker"
4. Click "Create"

## Step 2: Enable Google Sheets API

1. In your project, go to "APIs & Services" → "Library"
2. Search for "Google Sheets API"
3. Click on it and press "Enable"

## Step 3: Create Service Account

1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "Service Account"
3. Fill in:
   - **Name**: `reddit-bot-service`
   - **Description**: `Service account for Reddit bot Google Sheets integration`
4. Click "Create and Continue"
5. Skip the optional steps and click "Done"

## Step 4: Generate Service Account Key

1. In "Credentials", find your service account
2. Click on the service account email
3. Go to "Keys" tab
4. Click "Add Key" → "Create new key"
5. Choose "JSON" format
6. Click "Create"
7. **Important**: Save the downloaded JSON file as `credentials.json` in your bot's root directory

## Step 5: Create Google Sheet

1. Go to [Google Sheets](https://sheets.google.com/)
2. Create a new sheet
3. Name it "Reddit Bot Leads"
4. **Share the sheet** with your service account email (found in credentials.json)
   - Click "Share" button
   - Add the service account email
   - Give "Editor" permissions
5. Copy the Sheet ID from the URL:
   ```
   https://docs.google.com/spreadsheets/d/SHEET_ID_HERE/edit
   ```

## Step 6: Configure Environment Variables

Add these to your `.env` file:

```env
# Google Sheets Integration
GOOGLE_SHEETS_ENABLED=true
GOOGLE_SHEET_ID=your_sheet_id_here
```

## Step 7: Set Up Sheet Headers

The bot will automatically create headers, but you can manually set them up:

| A | B | C | D | E | F | G | H | I | J | K |
|---|---|---|---|---|---|---|---|---|---|---|
| Timestamp | Title | Author | Subreddit | Score | Comments | URL | Permalink | Status | Notes | Matched Keyword |

## Step 8: Test the Integration

1. Start your bot: `npm start`
2. Use `/setupreddit` to set up monitoring
3. Use `/viewleads` to see if posts are being added to the sheet
4. Use `/updatestatus` to update lead status

## Available Commands

- `/viewleads` - View recent leads from Google Sheets
- `/updatestatus` - Update lead status (New, Contacted, Interested, etc.)

## Lead Status Options

- **New** 🆕 - Just found, not contacted yet
- **Contacted** 📞 - Reached out to the user
- **Interested** ✅ - User showed interest
- **Not Interested** ❌ - User declined
- **Hired** 🎉 - Successfully hired
- **Closed** 🔒 - Lead closed for other reasons

## Troubleshooting

### "Google Sheets credentials not found"
- Make sure `credentials.json` is in your bot's root directory
- Check that the file is valid JSON

### "GOOGLE_SHEET_ID not found"
- Add `GOOGLE_SHEET_ID=your_sheet_id` to your `.env` file
- Make sure the sheet ID is correct

### "Permission denied"
- Make sure you shared the sheet with your service account email
- Check that the service account has "Editor" permissions

### Posts not appearing in sheet
- Check that `GOOGLE_SHEETS_ENABLED=true` in your `.env` file
- Verify the bot is running and monitoring is active
- Check bot logs for any Google Sheets errors

## Security Notes

- Never commit `credentials.json` to version control
- Add `credentials.json` to your `.gitignore` file
- Keep your service account credentials secure
- Consider using environment variables for sensitive data in production

## File Structure

```
reddit-bot/
├── credentials.json          # Google service account credentials
├── .env                      # Environment variables
├── services/
│   └── googleSheets.js       # Google Sheets service
└── commands/
    ├── viewLeads.js          # View leads command
    └── updateStatus.js       # Update status command
```

## Support

If you encounter issues:
1. Check the bot logs for error messages
2. Verify all environment variables are set correctly
3. Test the Google Sheets API connection manually
4. Ensure the service account has proper permissions
