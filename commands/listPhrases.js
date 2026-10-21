const { EmbedBuilder } = require('discord.js');
const { getGuildPhrases, getGuildSettings } = require('../services/database');

async function listPhrases(interaction) {
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
        const phrases = await getGuildPhrases(guildId);
        const settings = await getGuildSettings(guildId);

        if (!phrases || phrases.length === 0) {
            const embed = new EmbedBuilder()
                .setColor('#ff9900')
                .setTitle('📝 No Phrases Found')
                .setDescription('No phrases are currently being monitored in this server.')
                .addFields(
                    { name: '💡 How to add phrases?', value: 'Use `/setupreddit` command to add phrases for monitoring.', inline: false }
                )
                .setTimestamp();

            await interaction.reply({ embeds: [embed], ephemeral: true });
            return;
        }

        const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('📝 Monitored Phrases')
            .setDescription(`Currently monitoring **${phrases.length}** phrase(s) in this server.`)
            .addFields(
                { name: '🔍 Phrases', value: phrases.map(p => `• ${p.phrase}`).join('\n'), inline: false },
                { name: '📅 Post Age Filter', value: settings?.post_age || 'Not set (default: 1 day)', inline: true },
                { name: '📊 Status', value: '🟢 Active', inline: true }
            )
            .addFields(
                { name: '🛠️ Management Commands', value: '• `/removephrase` - Remove specific phrases\n• `/clearphrases` - Clear all phrases\n• `/addphrase` - Add more phrases', inline: false }
            )
            .setFooter({ text: 'Use /status to see full monitoring details' })
            .setTimestamp();

        await interaction.reply({ embeds: [embed], ephemeral: true });

    } catch (error) {
        console.error('Error in listPhrases:', error);
        
        // Only try to reply if we haven't already
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ 
                content: '❌ Failed to retrieve phrases. Please try again.', 
                ephemeral: true 
            });
        } else {
            await interaction.followUp({ 
                content: '❌ Failed to retrieve phrases. Please try again.', 
                ephemeral: true 
            });
        }
    }
}

module.exports = { listPhrases };
