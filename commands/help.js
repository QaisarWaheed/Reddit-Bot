const { EmbedBuilder } = require('discord.js');

async function help(interaction) {
    try {
        // Check if already replied
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ 
                content: '❌ This interaction has already been handled.', 
                ephemeral: true 
            });
            return;
        }

        const helpEmbed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('🔍 Reddit Bot Help & Commands')
            .setDescription('This bot monitors Reddit for posts containing exact phrases and sends them to your Discord channel.')
            .addFields(
                {
                    name: '🚀 Setup Commands',
                    value: '• `/setupreddit` - Initial setup with phrases, age filter, and channel\n• `/addphrase` - Add more phrases to existing monitoring\n• `/clearphrases` - Remove all monitored phrases',
                    inline: false
                },
                {
                    name: '📋 Management Commands',
                    value: '• `/listphrases` - View all monitored phrases\n• `/removephrase` - Remove specific phrases\n• `/status` - Check monitoring status',
                    inline: false
                },
                {
                    name: '⚙️ Control Commands',
                    value: '• `/startmonitoring` - Start Reddit monitoring\n• `/stopsearching` - Stop Reddit monitoring\n• `/testsearch` - Test search for a specific phrase',
                    inline: false
                },
                {
                    name: '📊 Lead Management (Google Sheets)',
                    value: '• `/viewleads` - View recent leads from Google Sheets\n• `/updatestatus` - Update lead status (New, Contacted, Interested, etc.)\n• **Requires**: Google Sheets integration setup (see GOOGLE_SHEETS_SETUP.md)',
                    inline: false
                },
                {
                    name: '🎯 Exact Phrase Matching',
                    value: '• **Exact matches only**: "hire software developer" must appear exactly in post titles\n• **Word order matters**: "hire developer" ≠ "developer hire"\n• **Case-insensitive**: "Hire Developer" = "hire developer"\n• **No partial matches**: "hire" alone won\'t match "hire software developer"',
                    inline: false
                },
                {
                    name: '💡 Example Usage',
                    value: '1. `/setupreddit` phrases: "hire software developer, remote developer" age: "This week" channel: #jobs\n2. `/testsearch` phrase: "hire software developer" (to test matching)\n3. `/listphrases` (to see current phrases)\n4. `/clearphrases` (to start fresh)',
                    inline: false
                },
                {
                    name: '🔍 How It Works',
                    value: '• Bot searches Reddit every 5 minutes\n• Only posts with EXACT phrase matches are sent\n• Posts are filtered by your specified time range\n• Duplicate posts are automatically avoided',
                    inline: false
                }
            )
            .setFooter({ text: 'Use /testsearch to verify exact phrase matching works as expected' })
            .setTimestamp();

        await interaction.reply({ 
            embeds: [helpEmbed], 
            ephemeral: true 
        });

    } catch (error) {
        console.error('Error in help:', error);
        
        // Only try to reply if we haven't already
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ 
                content: `❌ Error showing help: ${error.message}`, 
                ephemeral: true 
            });
        } else {
            await interaction.followUp({ 
                content: `❌ Error showing help: ${error.message}`, 
                ephemeral: true 
            });
        }
    }
}

module.exports = { help };

