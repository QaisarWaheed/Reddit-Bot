const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

class GoogleSheetsService {
    constructor() {
        this.sheets = null;
        this.spreadsheetId = null;
        this.initialized = false;
    }

    async initialize() {
        try {
            // Check if credentials file exists
            const credentialsPath = path.join(__dirname, '..', 'credentials.json');
            if (!fs.existsSync(credentialsPath)) {
                console.log('❌ Google Sheets credentials not found. Please add credentials.json file.');
                return false;
            }

            const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
            
            // Initialize Google Sheets API
            const auth = new google.auth.GoogleAuth({
                credentials: credentials,
                scopes: ['https://www.googleapis.com/auth/spreadsheets']
            });

            this.sheets = google.sheets({ version: 'v4', auth });
            this.spreadsheetId = process.env.GOOGLE_SHEET_ID;
            
            if (!this.spreadsheetId) {
                console.log('❌ GOOGLE_SHEET_ID not found in environment variables.');
                return false;
            }

            this.initialized = true;
            console.log('✅ Google Sheets service initialized successfully');
            return true;
        } catch (error) {
            console.error('❌ Error initializing Google Sheets:', error);
            return false;
        }
    }

    async addPostToSheet(postData) {
        if (!this.initialized) {
            console.log('❌ Google Sheets not initialized');
            return false;
        }

        try {
            const values = [
                [
                    new Date().toISOString(), // Timestamp
                    postData.title || '',
                    postData.author || '',
                    postData.subreddit || '',
                    postData.score || 0,
                    postData.numComments || 0,
                    postData.url || '',
                    postData.permalink || '',
                    'New', // Status
                    '', // Notes
                    postData.keyword || '' // Matched keyword
                ]
            ];

            const request = {
                spreadsheetId: this.spreadsheetId,
                range: 'A:K', // Adjust range as needed
                valueInputOption: 'RAW',
                insertDataOption: 'INSERT_ROWS',
                resource: {
                    values: values
                }
            };

            await this.sheets.spreadsheets.values.append(request);
            console.log('✅ Post added to Google Sheets:', postData.title);
            return true;
        } catch (error) {
            console.error('❌ Error adding post to Google Sheets:', error);
            return false;
        }
    }

    async updatePostStatus(rowIndex, status, notes = '') {
        if (!this.initialized) {
            console.log('❌ Google Sheets not initialized');
            return false;
        }

        try {
            const values = [
                [status, notes]
            ];

            const request = {
                spreadsheetId: this.spreadsheetId,
                range: `I${rowIndex}:J${rowIndex}`, // Status and Notes columns
                valueInputOption: 'RAW',
                resource: {
                    values: values
                }
            };

            await this.sheets.spreadsheets.values.update(request);
            console.log(`✅ Updated post status in row ${rowIndex}: ${status}`);
            return true;
        } catch (error) {
            console.error('❌ Error updating post status:', error);
            return false;
        }
    }

    async getRecentPosts(limit = 10) {
        if (!this.initialized) {
            console.log('❌ Google Sheets not initialized');
            return [];
        }

        try {
            const request = {
                spreadsheetId: this.spreadsheetId,
                range: 'A:K', // Adjust range as needed
                valueRenderOption: 'UNFORMATTED_VALUE'
            };

            const response = await this.sheets.spreadsheets.values.get(request);
            const rows = response.data.values || [];
            
            // Skip header row and get recent posts
            const posts = rows.slice(1, limit + 1).map((row, index) => ({
                rowNumber: index + 2, // +2 because we skip header and arrays are 0-indexed
                timestamp: row[0] || '',
                title: row[1] || '',
                author: row[2] || '',
                subreddit: row[3] || '',
                score: row[4] || 0,
                comments: row[5] || 0,
                url: row[6] || '',
                permalink: row[7] || '',
                status: row[8] || 'New',
                notes: row[9] || '',
                keyword: row[10] || ''
            }));

            return posts;
        } catch (error) {
            console.error('❌ Error getting recent posts:', error);
            return [];
        }
    }

    async setupSheet() {
        if (!this.initialized) {
            console.log('❌ Google Sheets not initialized');
            return false;
        }

        try {
            // Create headers
            const headers = [
                'Timestamp',
                'Title',
                'Author',
                'Subreddit',
                'Score',
                'Comments',
                'URL',
                'Permalink',
                'Status',
                'Notes',
                'Matched Keyword'
            ];

            const request = {
                spreadsheetId: this.spreadsheetId,
                range: 'A1:K1',
                valueInputOption: 'RAW',
                resource: {
                    values: [headers]
                }
            };

            await this.sheets.spreadsheets.values.update(request);
            console.log('✅ Google Sheet headers set up successfully');
            return true;
        } catch (error) {
            console.error('❌ Error setting up sheet:', error);
            return false;
        }
    }
}

// Create singleton instance
const googleSheetsService = new GoogleSheetsService();

module.exports = {
    googleSheetsService,
    GoogleSheetsService
};
