const { EmbedBuilder } = require('discord.js');
const { addPhrases, getGuildSettings } = require('../services/database');

async function setupReddit(interaction) {
    const phrases = interaction.options.getString('phrases');
    const age = interaction.options.getString('age');
    const channel = interaction.options.getChannel('channel');
    const guildId = interaction.guildId;
    const channelId = channel.id;

    try {
        // Parse phrases (split by comma and trim whitespace)
        const phraseList = phrases.split(',').map(phrase => phrase.trim()).filter(phrase => phrase.length > 0);

        if (phraseList.length === 0) {
            await interaction.reply({ 
                content: 'Please provide at least one valid phrase!', 
                ephemeral: true 
            });
            return;
        }

        // Add phrases to database with channel and age settings
        await addPhrases(guildId, channelId, phraseList, age);

        const ageDisplayNames = {
            'hour': 'Within one hour',
            'day': 'Within one day',
            'yesterday': 'Yesterday',
            'week': 'This week',
            'month': 'This month'
        };

        const embed = new EmbedBuilder()
            .setColor('#00ff00')
            .setTitle('✅ Reddit Monitoring Setup Complete!')
            .setDescription(`Successfully configured Reddit monitoring for this server.`)
            .addFields(
                { name: '📝 Monitored Phrases', value: phraseList.map(p => `• ${p}`).join('\n'), inline: false },
                { name: '📅 Post Age Filter', value: ageDisplayNames[age], inline: true },
                { name: '📺 Update Channel', value: `<#${channelId}>`, inline: true },
                { name: '📊 Status', value: '🟢 Active', inline: true }
            )
            .setFooter({ text: 'The bot will now monitor Reddit for these phrases and post matches to the selected channel.' })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });

    } catch (error) {
        console.error('Error in setupReddit:', error);
        
        // Check if we already replied
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ 
                content: '❌ Failed to setup Reddit monitoring. Please try again.', 
                ephemeral: true 
            });
        } else {
            // If we already replied, try to follow up
            await interaction.followUp({ 
                content: '❌ Failed to setup Reddit monitoring. Please try again.', 
                ephemeral: true 
            });
        }
    }
}

module.exports = { setupReddit };
