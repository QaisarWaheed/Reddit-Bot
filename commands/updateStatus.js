const { EmbedBuilder } = require('discord.js');
const { googleSheetsService } = require('../services/googleSheets');

async function updateStatus(interaction) {
    try {
        // Check if already replied
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({
                content: '❌ This interaction has already been handled.',
                ephemeral: true
            });
            return;
        }

        const rowNumber = interaction.options.getInteger('row');
        const status = interaction.options.getString('status');
        const notes = interaction.options.getString('notes') || '';

        await interaction.reply({ content: '📝 Updating lead status...', ephemeral: true });

        // Check if Google Sheets is enabled
        if (process.env.GOOGLE_SHEETS_ENABLED !== 'true') {
            await interaction.followUp({
                content: '❌ Google Sheets integration is not enabled. Set `GOOGLE_SHEETS_ENABLED=true` in your environment variables.',
                ephemeral: true
            });
            return;
        }

        // Validate status
        const validStatuses = ['New', 'Contacted', 'Interested', 'Not Interested', 'Hired', 'Closed'];
        if (!validStatuses.includes(status)) {
            await interaction.followUp({
                content: `❌ Invalid status. Valid options: ${validStatuses.join(', ')}`,
                ephemeral: true
            });
            return;
        }

        // Update the status in Google Sheets
        const success = await googleSheetsService.updatePostStatus(rowNumber, status, notes);

        if (success) {
            const statusEmoji = {
                'New': '🆕',
                'Contacted': '📞',
                'Interested': '✅',
                'Not Interested': '❌',
                'Hired': '🎉',
                'Closed': '🔒'
            }[status] || '❓';

            const embed = new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle('✅ Lead Status Updated')
                .setDescription(`Successfully updated lead status in row ${rowNumber}`)
                .addFields(
                    { name: 'Status', value: `${statusEmoji} ${status}`, inline: true },
                    { name: 'Row', value: rowNumber.toString(), inline: true },
                    { name: 'Notes', value: notes || 'No notes added', inline: false }
                )
                .setTimestamp();

            await interaction.followUp({
                embeds: [embed],
                ephemeral: true
            });
        } else {
            await interaction.followUp({
                content: `❌ Failed to update status for row ${rowNumber}. Please check the row number and try again.`,
                ephemeral: true
            });
        }

    } catch (error) {
        console.error('Error in updateStatus:', error);

        // Only try to reply if we haven't already
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({
                content: `❌ Error updating status: ${error.message}`,
                ephemeral: true
            });
        } else {
            await interaction.followUp({
                content: `❌ Error updating status: ${error.message}`,
                ephemeral: true
            });
        }
    }
}

module.exports = { updateStatus };
