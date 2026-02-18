const puppeteer = require('puppeteer');
const cron = require('node-cron');
const { EmbedBuilder } = require('discord.js');
const { getAllGuilds, getGuildPhrases, isPostNotified, markPostAsNotified, cleanOldPosts } = require('./database');
const { googleSheetsService } = require('./googleSheets');

// Store monitoring status for each guild
const monitoringStatus = new Map();

// Reddit search URL
const REDDIT_SEARCH_URL = 'https://www.reddit.com/search';

// Time filters for Reddit search
const TIME_FILTERS = {
    'hour': 'hour',
    'day': 'day',
    'yesterday': 'day', // Reddit doesn't have yesterday, use day and filter later
    'week': 'week',
    'month': 'month'
};

// Search Reddit for posts containing a phrase using Puppeteer
async function searchReddit(phrase, timeFilter = 'day') {
    let browser;
    try {
        browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
        });
        
        const page = await browser.newPage();
        
        // Set user agent to avoid detection
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        
        // Try multiple search approaches
        let posts = [];
        
        // Approach 1: Standard Reddit search
        try {
            const searchUrl = `${REDDIT_SEARCH_URL}?q=${encodeURIComponent(phrase)}&t=${timeFilter}&sort=new`;
            console.log(`Trying approach 1 - Standard search: ${searchUrl}`);
            await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 30000 });
            
            // Add a longer delay to ensure content loads completely
            await new Promise(resolve => setTimeout(resolve, 5000));
            
            // Debug: Take a screenshot to see what's on the page
            try {
                await page.screenshot({ path: `debug_${phrase.replace(/[^a-zA-Z0-9]/g, '_')}.png`, fullPage: true });
                console.log(`Screenshot saved for phrase: ${phrase}`);
            } catch (e) {
                console.log('Could not save screenshot:', e.message);
            }
            
            // Debug: Get page content to see what selectors might work
            const pageContent = await page.content();
            console.log(`Page title: ${await page.title()}`);
            console.log(`Page URL: ${page.url()}`);
            
            // Debug: Check if we're on a login page or if there are any error messages
            const pageText = await page.evaluate(() => document.body.textContent);
            if (pageText.includes('log in') || pageText.includes('sign up')) {
                console.log('Page appears to require login');
            }
            if (pageText.includes('no results') || pageText.includes('try again')) {
                console.log('Page shows no results message');
            }
            
            // Debug: Look for any Reddit-specific elements
            const redditElements = await page.evaluate(() => {
                const elements = [];
                // Look for any elements with Reddit-specific classes or attributes
                document.querySelectorAll('*').forEach(el => {
                    const className = el.className || '';
                    const id = el.id || '';
                    // Fix: Check if className is a string before using includes
                    if (typeof className === 'string' && (className.includes('reddit') || className.includes('Reddit') || 
                        id.includes('reddit') || id.includes('Reddit') ||
                        className.includes('post') || className.includes('Post') ||
                        className.includes('search') || className.includes('Search'))) {
                        elements.push({
                            tag: el.tagName,
                            className: className,
                            id: id,
                            text: el.textContent.substring(0, 100)
                        });
                    }
                });
                return elements;
            });
            console.log('Reddit-specific elements found:', redditElements.length);
            
            posts = await extractPostsFromPage(page);
            
            if (posts.length > 0) {
                // Filter posts to only include those containing the target keyword
                posts = filterPostsByKeyword(posts, phrase);
                console.log(`Approach 1 successful: found ${posts.length} posts after keyword filtering`);
                return posts;
            }
        } catch (error) {
            console.log('Approach 1 failed:', error.message);
        }
        
        // Approach 2: Try Reddit's old search interface
        try {
            const oldSearchUrl = `https://old.reddit.com/search?q=${encodeURIComponent(phrase)}&t=${timeFilter}&sort=new`;
            console.log(`Trying approach 2 - Old Reddit: ${oldSearchUrl}`);
            await page.goto(oldSearchUrl, { waitUntil: 'networkidle2', timeout: 30000 });
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            posts = await extractPostsFromPage(page);
            
            if (posts.length > 0) {
                // Filter posts to only include those containing the target keyword
                posts = filterPostsByKeyword(posts, phrase);
                console.log(`Approach 2 successful: found ${posts.length} posts after keyword filtering`);
                return posts;
            }
        } catch (error) {
            console.log('Approach 2 failed:', error.message);
        }
        
        // Approach 3: Try searching in popular subreddits
        try {
            const popularSubreddits = ['programming', 'webdev', 'freelance', 'forhire', 'jobs'];
            for (const subreddit of popularSubreddits) {
                const subredditSearchUrl = `https://www.reddit.com/r/${subreddit}/search?q=${encodeURIComponent(phrase)}&t=${timeFilter}&sort=new`;
                console.log(`Trying approach 3 - Subreddit search: ${subredditSearchUrl}`);
                
                await page.goto(subredditSearchUrl, { waitUntil: 'networkidle2', timeout: 30000 });
                await new Promise(resolve => setTimeout(resolve, 3000));
                
                posts = await extractPostsFromPage(page);
                
                if (posts.length > 0) {
                    // Filter posts to only include those containing the target keyword
                    posts = filterPostsByKeyword(posts, phrase);
                    console.log(`Approach 3 successful: found ${posts.length} posts in r/${subreddit} after keyword filtering`);
                    return posts;
                }
            }
        } catch (error) {
            console.log('Approach 3 failed:', error.message);
        }
        
        // Approach 4: Try using Reddit's JSON API
        try {
            console.log('Trying approach 4 - Reddit JSON API');
            const jsonUrl = `https://www.reddit.com/search.json?q=${encodeURIComponent(phrase)}&t=${timeFilter}&sort=new&limit=25`;
            
            // Use fetch to get JSON data
            const response = await page.evaluate(async (url) => {
                try {
                    const res = await fetch(url, {
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                        }
                    });
                    if (res.ok) {
                        const data = await res.json();
                        return data;
                    }
                    return null;
                } catch (e) {
                    console.log('Fetch error:', e.message);
                    return null;
                }
            }, jsonUrl);
            
            if (response && response.data && response.data.children) {
                console.log(`Approach 4 successful: found ${response.data.children.length} posts via JSON API`);
                posts = response.data.children.map(child => {
                    const post = child.data;
                    return {
                        id: post.id,
                        title: post.title,
                        url: `https://www.reddit.com${post.permalink}`,
                        subreddit: post.subreddit,
                        author: post.author,
                        score: post.score.toString(),
                        numComments: post.num_comments.toString(),
                        created: post.created_utc
                    };
                });
                
                // Filter posts to only include those containing the target keyword
                posts = filterPostsByKeyword(posts, phrase);
                console.log(`Approach 4 successful: found ${posts.length} posts after keyword filtering`);
                return posts;
            }
        } catch (error) {
            console.log('Approach 4 failed:', error.message);
        }
        
        console.log(`All approaches failed for phrase "${phrase}"`);
        return [];
        
    } catch (error) {
        console.error(`Error searching Reddit for phrase "${phrase}":`, error.message);
        return [];
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

// Extract posts from a Reddit page
async function extractPostsFromPage(page) {
    return await page.evaluate(() => {
        console.log('Starting post extraction...');
        
        // Debug: Log the page structure
        console.log('Page HTML structure:', document.body.innerHTML.substring(0, 1000));
        
        // Debug: Look for any links that might be Reddit posts
        const allLinks = document.querySelectorAll('a');
        const redditLinks = Array.from(allLinks).filter(link => 
            link.href.includes('/comments/') || link.href.includes('/r/')
        );
        console.log(`Found ${redditLinks.length} Reddit-related links`);
        
        // Debug: Look for any text that might indicate posts
        const allText = document.body.textContent;
        if (allText.includes('comments') || allText.includes('points') || allText.includes('submitted')) {
            console.log('Page contains Reddit post indicators');
        }
        
        // Try multiple selector strategies for Reddit posts
        let postElements = [];
        
        // Strategy 1: Look for Reddit post containers with data attributes
        postElements = document.querySelectorAll('[data-testid="post-container"], [data-testid="post"], [data-testid="post-content"]');
        console.log(`Strategy 1 (data-testid) found ${postElements.length} posts`);
        
        // Strategy 2: Look for elements with Reddit post classes
        if (postElements.length === 0) {
            postElements = document.querySelectorAll('div[class*="Post"], div[class*="post"], div[class*="PostContainer"], div[class*="post-container"]');
            console.log(`Strategy 2 (class-based) found ${postElements.length} posts`);
        }
        
        // Strategy 3: Look for any elements containing Reddit post links
        if (postElements.length === 0) {
            const allElements = document.querySelectorAll('*');
            postElements = Array.from(allElements).filter(el => {
                const hasCommentLink = el.querySelector('a[href*="/comments/"]');
                const hasSubredditLink = el.querySelector('a[href*="/r/"]');
                const hasUserLink = el.querySelector('a[href*="/user/"]');
                return hasCommentLink && hasSubredditLink && hasUserLink;
            });
            console.log(`Strategy 3 (link-based) found ${postElements.length} posts`);
        }
        
        // Strategy 4: Look for Reddit's search result structure
        if (postElements.length === 0) {
            // Try to find search result containers
            const searchResults = document.querySelectorAll('div[class*="search-result"], div[class*="SearchResult"], div[class*="result"]');
            if (searchResults.length > 0) {
                postElements = searchResults;
                console.log(`Strategy 4 (search results) found ${searchResults.length} posts`);
            }
        }
        
        // Strategy 5: Look for any divs that might contain post information
        if (postElements.length === 0) {
            const allDivs = document.querySelectorAll('div');
            postElements = Array.from(allDivs).filter(div => {
                // Check if this div contains elements that suggest it's a post
                const hasTitle = div.querySelector('h1, h2, h3, h4, [class*="title"], [class*="Title"]');
                const hasLinks = div.querySelector('a[href*="/comments/"]');
                const hasText = div.textContent.length > 50; // Reasonable amount of text
                return hasTitle && hasLinks && hasText;
            });
            console.log(`Strategy 5 (generic divs) found ${postElements.length} posts`);
        }
        
        // Strategy 6: Look for Reddit's new search interface elements
        if (postElements.length === 0) {
            // Try to find elements that contain Reddit post information
            const potentialPosts = document.querySelectorAll('div, article, section');
            postElements = Array.from(potentialPosts).filter(el => {
                // Look for elements that contain both a title and Reddit-specific links
                const hasRedditLinks = el.querySelector('a[href*="/r/"]') || el.querySelector('a[href*="/comments/"]');
                const hasContent = el.textContent.length > 30;
                const hasStructure = el.children.length > 2;
                return hasRedditLinks && hasContent && hasStructure;
            });
            console.log(`Strategy 6 (structure-based) found ${postElements.length} posts`);
        }
        
        // Strategy 7: Look for any clickable elements that might be posts
        if (postElements.length === 0) {
            const clickableElements = document.querySelectorAll('a[href*="/comments/"], a[href*="/r/"]');
            const parentElements = new Set();
            clickableElements.forEach(el => {
                let parent = el.parentElement;
                for (let i = 0; i < 3 && parent; i++) { // Go up 3 levels
                    if (parent.tagName === 'DIV' || parent.tagName === 'ARTICLE') {
                        parentElements.add(parent);
                    }
                    parent = parent.parentElement;
                }
            });
            postElements = Array.from(parentElements);
            console.log(`Strategy 7 (clickable-based) found ${postElements.length} posts`);
        }
        
        // Strategy 8: Look for any elements that might contain post-like content
        if (postElements.length === 0) {
            console.log('Trying strategy 8 - looking for any content that might be posts');
            const allElements = document.querySelectorAll('div, article, section');
            postElements = Array.from(allElements).filter(el => {
                // Look for elements with substantial content and some structure
                const hasContent = el.textContent.length > 100;
                const hasLinks = el.querySelectorAll('a').length > 0;
                const hasStructure = el.children.length > 3;
                return hasContent && hasLinks && hasStructure;
            });
            console.log(`Strategy 8 (content-based) found ${postElements.length} potential content elements`);
        }
        
        const results = [];
        
        postElements.forEach((post, index) => {
            if (index >= 25) return; // Limit to 25 posts
            
            try {
                // Try to find title - multiple strategies
                let title = '';
                const titleElement = post.querySelector('h1, h2, h3, h4, [class*="title"], [class*="Title"], [class*="heading"]');
                if (titleElement) {
                    title = titleElement.textContent.trim();
                } else {
                    // Look for text in comment links
                    const commentLink = post.querySelector('a[href*="/comments/"]');
                    if (commentLink) {
                        title = commentLink.textContent.trim();
                    }
                }
                
                // Try to find URL
                let url = '';
                const urlElement = post.querySelector('a[href*="/comments/"]');
                if (urlElement) {
                    url = urlElement.href;
                }
                
                // Try to find subreddit
                let subreddit = 'unknown';
                const subredditElement = post.querySelector('a[href*="/r/"]');
                if (subredditElement) {
                    subreddit = subredditElement.textContent.replace('r/', '').trim();
                }
                
                // Try to find author
                let author = 'unknown';
                const authorElement = post.querySelector('a[href*="/user/"], [class*="author"], [class*="Author"], [class*="username"]');
                if (authorElement) {
                    author = authorElement.textContent.replace('u/', '').trim();
                }
                
                // Try to find score
                let score = '0';
                const scoreElement = post.querySelector('[data-testid="post-vote-count"], [class*="score"], [class*="Score"], [class*="votes"]');
                if (scoreElement) {
                    score = scoreElement.textContent.trim();
                }
                
                // Try to find comment count
                let numComments = '0';
                const commentsElement = post.querySelector('a[href*="/comments/"]');
                if (commentsElement) {
                    const commentText = commentsElement.textContent;
                    const commentMatch = commentText.match(/(\d+)\s*comment/);
                    if (commentMatch) {
                        numComments = commentMatch[1];
                    }
                }
                
                // Additional validation - ensure we have meaningful data
                if (title && url && title.length > 0 && title.length < 500) {
                    // Clean up the title
                    title = title.replace(/\s+/g, ' ').trim();
                    
                    console.log(`Found post: ${title.substring(0, 50)}...`);
                    results.push({
                        id: url.split('/comments/')[1]?.split('/')[0] || `post_${index}`,
                        title: title,
                        url: url,
                        subreddit: subreddit,
                        author: author,
                        score: score,
                        numComments: numComments,
                        created: Math.floor(Date.now() / 1000) // Approximate timestamp
                    });
                }
            } catch (e) {
                console.log('Error parsing post:', e.message);
            }
        });
        
        console.log(`Total posts found: ${results.length}`);
        return results;
    });
}

// Check if a post matches the time filter
function isPostInTimeRange(post, timeFilter) {
    const now = Math.floor(Date.now() / 1000);
    const postTime = post.created;
    const timeDiff = now - postTime;

    switch (timeFilter) {
        case 'hour':
            return timeDiff <= 3600; // 1 hour
        case 'day':
            return timeDiff <= 86400; // 1 day
        case 'yesterday':
            // Posts from 1-2 days ago
            return timeDiff > 86400 && timeDiff <= 172800;
        case 'week':
            return timeDiff <= 604800; // 1 week
        case 'month':
            return timeDiff <= 2592000; // 30 days
        default:
            return timeDiff <= 86400; // Default to 1 day
    }
}

// Check if a post contains the target keyword phrase
function postContainsKeyword(post, keyword) {
    if (!keyword || !post.title) return false;
    
    // Convert both to lowercase for case-insensitive matching
    const titleLower = post.title.toLowerCase();
    const keywordLower = keyword.toLowerCase();
    
    // Check if the title contains the exact keyword phrase
    if (titleLower.includes(keywordLower)) {
        return true;
    }
    
    // For multi-word phrases, check if the exact phrase appears in the title
    // This ensures "hire software developer" only matches if the entire phrase is present
    const keywordWords = keywordLower.split(/\s+/).filter(word => word.length > 0);
    if (keywordWords.length > 1) {
        // Check if the exact phrase appears as a whole
        if (titleLower.includes(keywordLower)) {
            return true;
        }
        
        // Also check if the phrase appears with different spacing (e.g., "hire software developer" vs "hire software developer")
        const normalizedTitle = titleLower.replace(/\s+/g, ' ');
        const normalizedKeyword = keywordLower.replace(/\s+/g, ' ');
        if (normalizedTitle.includes(normalizedKeyword)) {
            return true;
        }
        
        // For very strict matching, require all words to appear in sequence
        // This prevents "hire developer software" from matching "hire software developer"
        const titleWords = titleLower.split(/\s+/);
        for (let i = 0; i <= titleWords.length - keywordWords.length; i++) {
            let match = true;
            for (let j = 0; j < keywordWords.length; j++) {
                if (titleWords[i + j] !== keywordWords[j]) {
                    match = false;
                    break;
                }
            }
            if (match) {
                return true;
            }
        }
        
        return false;
    }
    
    // For single words, check if they appear as whole words
    const titleWords = titleLower.split(/\s+/);
    return titleWords.some(titleWord => titleWord === keywordLower);
}

// Filter posts to only include those matching the keyword
function filterPostsByKeyword(posts, keyword) {
    if (!keyword) return posts;
    
    const filteredPosts = [];
    const rejectedPosts = [];
    
    posts.forEach(post => {
        if (postContainsKeyword(post, keyword)) {
            filteredPosts.push(post);
        } else {
            rejectedPosts.push({
                title: post.title,
                reason: `Title does not contain exact phrase: "${keyword}"`
            });
        }
    });
    
    console.log(`Filtered ${posts.length} posts down to ${filteredPosts.length} posts containing keyword "${keyword}"`);
    
    // Log some examples of rejected posts for debugging
    if (rejectedPosts.length > 0) {
        console.log(`Sample rejected posts (showing first 3):`);
        rejectedPosts.slice(0, 3).forEach((rejected, index) => {
            console.log(`  ${index + 1}. "${rejected.title}" - ${rejected.reason}`);
        });
    }
    
    return filteredPosts;
}

// Create Discord embed for a Reddit post
function createPostEmbed(post, phrase) {
    const embed = new EmbedBuilder()
        .setColor('#ff4500') // Reddit orange
        .setTitle(post.title)
        .setURL(post.url)
        .addFields(
            { name: '🔍 Matched Phrase', value: phrase, inline: true },
            { name: '📁 Subreddit', value: `r/${post.subreddit}`, inline: true },
            { name: '👤 Author', value: post.author, inline: true },
            { name: '⬆️ Score', value: post.score.toString(), inline: true },
            { name: '💬 Comments', value: post.numComments.toString(), inline: true }
        )
        .setFooter({ text: 'Found via Reddit monitoring' })
        .setTimestamp();

    return embed;
}

// Monitor Reddit for a specific guild
async function monitorGuild(guildId, client) {
    try {
        const guild = await client.guilds.fetch(guildId);
        if (!guild) {
            console.log(`Guild ${guildId} not found, stopping monitoring`);
            stopMonitoring({ guildId });
            return;
        }

        const phrases = await getGuildPhrases(guildId);
        if (!phrases || phrases.length === 0) {
            console.log(`No phrases found for guild ${guildId}, stopping monitoring`);
            stopMonitoring({ guildId });
            return;
        }

        const guildData = await getAllGuilds();
        const guildSettings = guildData.find(g => g.guild_id === guildId);
        if (!guildSettings) {
            console.log(`No settings found for guild ${guildId}`);
            return;
        }

        const timeFilter = TIME_FILTERS[guildSettings.post_age] || 'day';
        const channel = await guild.channels.fetch(guildSettings.channel_id);
        
        if (!channel) {
            console.log(`Channel ${guildSettings.channel_id} not found in guild ${guildId}`);
            return;
        }

        console.log(`Monitoring guild ${guildId} with ${phrases.length} phrases, time filter: ${timeFilter}`);

        // Search for each phrase
        for (const phraseData of phrases) {
            const phrase = phraseData.phrase;
            const posts = await searchReddit(phrase, timeFilter);

            for (const post of posts) {
                // Check if post is within time range
                if (!isPostInTimeRange(post, guildSettings.post_age)) {
                    continue;
                }

                // Check if we've already notified about this post
                const alreadyNotified = await isPostNotified(post.id, guildId);
                if (alreadyNotified) {
                    continue;
                }

                try {
                    // Send the post to Discord
                    const embed = createPostEmbed(post, phrase);
                    await channel.send({ embeds: [embed] });

                    // Mark post as notified
                    await markPostAsNotified(post.id, guildId, phrase, post.title, post.url, post.subreddit);

                    // Add to Google Sheets if enabled
                    if (process.env.GOOGLE_SHEETS_ENABLED === 'true') {
                        try {
                            await googleSheetsService.addPostToSheet({
                                ...post,
                                keyword: phrase
                            });
                        } catch (sheetsError) {
                            console.error('Error adding post to Google Sheets:', sheetsError);
                        }
                    }

                    console.log(`Sent post ${post.id} to guild ${guildId} for phrase "${phrase}"`);

                    // Small delay to avoid rate limiting
                    await new Promise(resolve => setTimeout(resolve, 1000));
                } catch (error) {
                    console.error(`Error sending post to Discord for guild ${guildId}:`, error);
                }
            }
        }
    } catch (error) {
        console.error(`Error monitoring guild ${guildId}:`, error);
    }
}

// Start monitoring for a guild
async function startMonitoring(interaction) {
    const guildId = interaction?.guildId || interaction?.guildId || interaction;
    const client = interaction?.client || interaction?.client || global.client;
    
    if (monitoringStatus.get(guildId)) {
        if (interaction?.reply) {
            await interaction.reply({ content: '🟢 Monitoring is already active for this server!', ephemeral: true });
        }
        return;
    }

    // Schedule monitoring every 5 minutes
    const cronJob = cron.schedule('*/5 * * * *', async () => {
        try {
            await monitorGuild(guildId, client);
        } catch (error) {
            console.error(`Error in monitoring cron job for guild ${guildId}:`, error);
        }
    }, {
        scheduled: false
    });

    cronJob.start();
    monitoringStatus.set(guildId, cronJob);

    if (interaction?.reply) {
        await interaction.reply({ content: '🟢 Reddit monitoring started! The bot will check for new posts every 5 minutes.', ephemeral: true });
    }

    console.log(`Started monitoring for guild ${guildId}`);
}

// Stop monitoring for a guild
async function stopMonitoring(interaction) {
    const guildId = interaction?.guildId || interaction;
    
    const cronJob = monitoringStatus.get(guildId);
    if (cronJob) {
        cronJob.stop();
        monitoringStatus.delete(guildId);
        
        if (interaction?.reply) {
            await interaction.reply({ content: '🔴 Reddit monitoring stopped!', ephemeral: true });
        }
        
        console.log(`Stopped monitoring for guild ${guildId}`);
    } else {
        if (interaction?.reply) {
            await interaction.reply({ content: '🔴 Monitoring was not active for this server.', ephemeral: true });
        }
    }
}

// Start monitoring for all guilds
async function startMonitoringForAllGuilds(client) {
    try {
        const guilds = await getAllGuilds();
        for (const guild of guilds) {
            if (!monitoringStatus.get(guild.guild_id)) {
                await startMonitoring(guild.guild_id);
            }
        }
        console.log(`Started monitoring for ${guilds.length} guilds`);
    } catch (error) {
        console.error('Error starting monitoring for all guilds:', error);
    }
}

// Clean up old posts periodically
function startCleanupJob() {
    cron.schedule('0 2 * * *', async () => { // Daily at 2 AM
        try {
            const cleanedCount = await cleanOldPosts();
            console.log(`Cleaned up ${cleanedCount} old posts from database`);
        } catch (error) {
            console.error('Error cleaning up old posts:', error);
        }
    });
}

// Initialize monitoring
function initializeMonitoring(client) {
    global.client = client;
    startCleanupJob();
    
    // Start monitoring for all guilds after a short delay
    setTimeout(() => {
        startMonitoringForAllGuilds(client);
    }, 5000);
}

module.exports = {
    startMonitoring,
    stopMonitoring,
    startMonitoringForAllGuilds,
    initializeMonitoring,
    searchReddit
};
