const { EmbedBuilder } = require('discord.js');
const { removePhraseFromGuild, getGuildPhrases } = require('../services/database');

async function removePhrase(interaction) {
    const phrase = interaction.options.getString('phrase');
    const guildId = interaction.guildId;

    try {
        const removed = await removePhraseFromGuild(guildId, phrase);

        if (!removed) {
            await interaction.reply({ 
                content: `❌ Phrase "${phrase}" was not found in the monitored phrases.`, 
                ephemeral: true 
            });
            return;
        }

        // Get remaining phrases
        const remainingPhrases = await getGuildPhrases(guildId);

        const embed = new EmbedBuilder()
            .setColor('#ff6b6b')
            .setTitle('🗑️ Phrase Removed')
            .setDescription(`Successfully removed **"${phrase}"** from monitoring.`)
            .addFields(
                { name: '📝 Remaining Phrases', value: remainingPhrases.length > 0 ? remainingPhrases.map(p => `• ${p.phrase}`).join('\n') : 'No phrases remaining', inline: false }
            )
            .setFooter({ text: remainingPhrases.length === 0 ? 'Use /setupreddit to add new phrases' : 'Monitoring will continue with remaining phrases' })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });

    } catch (error) {
        console.error('Error in removePhrase:', error);
        await interaction.reply({ 
            content: '❌ Failed to remove phrase. Please try again.', 
            ephemeral: true 
        });
    }
}

module.exports = { removePhrase };
