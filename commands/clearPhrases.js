const { EmbedBuilder } = require('discord.js');
const { clearAllPhrases, getGuildPhrases } = require('../services/database');

async function clearPhrases(interaction) {
    try {
        // Check if already replied
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ 
                content: '❌ This interaction has already been handled.', 
                ephemeral: true 
            });
            return;
        }

        const guildId = interaction.guildId;
        
        // Get current phrases to show what will be cleared
        const currentPhrases = await getGuildPhrases(guildId);
        
        if (!currentPhrases || currentPhrases.length === 0) {
            await interaction.reply({ 
                content: '❌ No phrases are currently being monitored in this server.', 
                ephemeral: true 
            });
            return;
        }

        await interaction.reply({ 
            content: `🗑️ Clearing all ${currentPhrases.length} monitored phrases...`, 
            ephemeral: true 
        });

        // Clear all phrases for this guild
        await clearAllPhrases(guildId);

        const embed = new EmbedBuilder()
            .setColor('#ff4444')
            .setTitle('🗑️ All Phrases Cleared!')
            .setDescription(`Successfully cleared **${currentPhrases.length}** monitored phrase(s) from this server.`)
            .addFields(
                { name: '🧹 Cleared Phrases', value: currentPhrases.map(p => `• ${p.phrase}`).join('\n'), inline: false },
                { name: '💡 Next Steps', value: 'Use `/setupreddit` to add new phrases for monitoring.', inline: false }
            )
            .setFooter({ text: 'Reddit monitoring has been stopped for this server' })
            .setTimestamp();

        await interaction.followUp({ 
            embeds: [embed], 
            ephemeral: true 
        });

    } catch (error) {
        console.error('Error in clearPhrases:', error);
        
        // Only try to reply if we haven't already
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ 
                content: `❌ Error clearing phrases: ${error.message}`, 
                ephemeral: true 
            });
        } else {
            await interaction.followUp({ 
                content: `❌ Error clearing phrases: ${error.message}`, 
                ephemeral: true 
            });
        }
    }
}

module.exports = { clearPhrases };

