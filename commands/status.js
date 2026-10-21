const { getAllGuilds, getGuildPhrases } = require('../services/database');

async function status(interaction) {
    try {
        // Check if already replied
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ 
                content: '❌ This interaction has already been handled.', 
                ephemeral: true 
            });
            return;
        }

        await interaction.reply({ content: '📊 Checking monitoring status...', ephemeral: true });
        
        const guildId = interaction.guildId;
        const guildData = await getAllGuilds();
        const guildSettings = guildData.find(g => g.guild_id === guildId);
        
        if (!guildSettings) {
            await interaction.followUp({ 
                content: '❌ No monitoring setup found for this server. Use `/setupreddit` to configure monitoring.', 
                ephemeral: true 
            });
            return;
        }
        
        const phrases = await getGuildPhrases(guildId);
        const channel = await interaction.guild.channels.fetch(guildSettings.channel_id);
        
        const statusEmbed = {
            color: 0x00ff00,
            title: '🔍 Reddit Monitoring Status',
            fields: [
                {
                    name: '📡 Status',
                    value: '🟢 Active',
                    inline: true
                },
                {
                    name: '⏰ Post Age Filter',
                    value: guildSettings.post_age,
                    inline: true
                },
                {
                    name: '📺 Channel',
                    value: channel ? `<#${guildSettings.channel_id}>` : '❌ Channel not found',
                    inline: true
                },
                {
                    name: '🔍 Monitored Phrases',
                    value: phrases.length > 0 ? phrases.map(p => `• ${p.phrase}`).join('\n') : 'No phrases configured',
                    inline: false
                }
            ],
            timestamp: new Date(),
            footer: {
                text: 'Reddit Bot Status'
            }
        };
        
        await interaction.followUp({ 
            embeds: [statusEmbed], 
            ephemeral: true 
        });
        
    } catch (error) {
        console.error('Error in status:', error);
        
        // Only try to reply if we haven't already
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ 
                content: `❌ Error checking status: ${error.message}`, 
                ephemeral: true 
            });
        } else {
            await interaction.followUp({ 
                content: `❌ Error checking status: ${error.message}`, 
                ephemeral: true 
            });
        }
    }
}

module.exports = { status };
