const { searchReddit } = require('../services/redditMonitor');

async function testSearch(interaction) {
    try {
        const phrase = interaction.options.getString('phrase') || 'software engineer to test';
        
        await interaction.reply({ content: `🔍 Testing Reddit search for exact phrase: "${phrase}"...`, ephemeral: true });
        
        console.log(`Testing search for exact phrase: ${phrase}`);
        
        // Test the search function directly
        const posts = await searchReddit(phrase, 'week');
        
        if (posts.length > 0) {
            const postList = posts.slice(0, 5).map((post, index) => 
                `${index + 1}. **${post.title}**\n   📍 r/${post.subreddit} | 👤 ${post.author} | ⬆️ ${post.score} | 💬 ${post.numComments}\n   🔗 ${post.url}`
            ).join('\n\n');
            
            await interaction.followUp({ 
                content: `✅ Found ${posts.length} posts with EXACT phrase match "${phrase}":\n\n${postList}`, 
                ephemeral: true 
            });
        } else {
            await interaction.followUp({ 
                content: `❌ No posts found with EXACT phrase match "${phrase}"\n\n💡 This means the bot is working correctly - it only returns posts that contain the exact phrase you specified.`, 
                ephemeral: true 
            });
        }
        
        // Add information about the matching criteria
        await interaction.followUp({
            content: `📋 **Exact Phrase Matching Rules:**\n• The phrase "${phrase}" must appear exactly in the post title\n• Word order matters: "hire developer" ≠ "developer hire"\n• Case-insensitive matching\n• Partial matches are rejected for accuracy`, 
            ephemeral: true 
        });
        
    } catch (error) {
        console.error('Error in testSearch:', error);
        await interaction.followUp({ 
            content: `❌ Error testing search: ${error.message}`, 
            ephemeral: true 
        });
    }
}

module.exports = { testSearch };
