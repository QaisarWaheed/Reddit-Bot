const { EmbedBuilder } = require('discord.js');
const { addPhrases, getGuildSettings, getGuildPhrases } = require('../services/database');

async function addPhrase(interaction) {
    const phrases = interaction.options.getString('phrases');
    const guildId = interaction.guildId;

    try {
        // Check if monitoring is already set up
        const guildSettings = await getGuildSettings(guildId);
        if (!guildSettings) {
            await interaction.reply({ 
                content: '❌ Reddit monitoring is not set up for this server. Use `/setupreddit` first.', 
                ephemeral: true 
            });
            return;
        }

        // Parse phrases (split by comma and trim whitespace)
        const phraseList = phrases.split(',').map(phrase => phrase.trim()).filter(phrase => phrase.length > 0);

        if (phraseList.length === 0) {
            await interaction.reply({ 
                content: 'Please provide at least one valid phrase!', 
                ephemeral: true 
            });
            return;
        }

        // Add new phrases to existing monitoring
        await addPhrases(guildId, guildSettings.channel_id, phraseList, guildSettings.post_age);

        // Get updated phrase list
        const allPhrases = await getGuildPhrases(guildId);

        const embed = new EmbedBuilder()
            .setColor('#00ff00')
            .setTitle('✅ Phrases Added Successfully!')
            .setDescription(`Added ${phraseList.length} new phrase(s) to Reddit monitoring.`)
            .addFields(
                { name: '🆕 New Phrases', value: phraseList.map(p => `• ${p}`).join('\n'), inline: false },
                { name: '📝 All Monitored Phrases', value: allPhrases.map(p => `• ${p.phrase}`).join('\n'), inline: false },
                { name: '📺 Update Channel', value: `<#${guildSettings.channel_id}>`, inline: true },
                { name: '📅 Post Age Filter', value: guildSettings.post_age, inline: true }
            )
            .setFooter({ text: 'The bot will now monitor Reddit for these additional phrases.' })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });

    } catch (error) {
        console.error('Error in addPhrase:', error);
        await interaction.reply({ 
            content: `❌ Failed to add phrases: ${error.message}`, 
            ephemeral: true 
        });
    }
}

module.exports = { addPhrase };

