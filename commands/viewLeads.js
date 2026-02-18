const { EmbedBuilder } = require('discord.js');
const { googleSheetsService } = require('../services/googleSheets');

async function viewLeads(interaction) {
    try {
        // Check if already replied
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({
                content: '❌ This interaction has already been handled.',
                ephemeral: true
            });
            return;
        }

        await interaction.reply({ content: '📊 Fetching leads from Google Sheets...', ephemeral: true });

        // Check if Google Sheets is enabled
        if (process.env.GOOGLE_SHEETS_ENABLED !== 'true') {
            await interaction.followUp({
                content: '❌ Google Sheets integration is not enabled. Set `GOOGLE_SHEETS_ENABLED=true` in your environment variables.',
                ephemeral: true
            });
            return;
        }

        // Get recent posts from Google Sheets
        const posts = await googleSheetsService.getRecentPosts(10);

        if (posts.length === 0) {
            await interaction.followUp({
                content: '📝 No leads found in Google Sheets. Posts will be added automatically when they are sent to Discord.',
                ephemeral: true
            });
            return;
        }

        // Create embed with leads
        const embed = new EmbedBuilder()
            .setColor('#00ff00')
            .setTitle('📊 Recent Leads from Google Sheets')
            .setDescription(`Showing ${posts.length} most recent leads`)
            .setTimestamp();

        // Add fields for each post (limit to 5 to avoid embed limits)
        const displayPosts = posts.slice(0, 5);
        displayPosts.forEach((post, index) => {
            const statusEmoji = {
                'New': '🆕',
                'Contacted': '📞',
                'Interested': '✅',
                'Not Interested': '❌',
                'Hired': '🎉',
                'Closed': '🔒'
            }[post.status] || '❓';

            embed.addFields({
                name: `${index + 1}. ${post.title.substring(0, 50)}${post.title.length > 50 ? '...' : ''}`,
                value: `**Status:** ${statusEmoji} ${post.status}\n**Subreddit:** r/${post.subreddit}\n**Author:** u/${post.author}\n**Score:** ${post.score} | **Comments:** ${post.comments}\n**Keyword:** ${post.keyword}\n**Date:** ${new Date(post.timestamp).toLocaleDateString()}\n**URL:** [View Post](${post.url})`,
                inline: false
            });
        });

        if (posts.length > 5) {
            embed.setFooter({ text: `Showing 5 of ${posts.length} total leads. Use /updatestatus to manage lead status.` });
        } else {
            embed.setFooter({ text: 'Use /updatestatus to manage lead status.' });
        }

        await interaction.followUp({
            embeds: [embed],
            ephemeral: true
        });

    } catch (error) {
        console.error('Error in viewLeads:', error);

        // Only try to reply if we haven't already
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({
                content: `❌ Error fetching leads: ${error.message}`,
                ephemeral: true
            });
        } else {
            await interaction.followUp({
                content: `❌ Error fetching leads: ${error.message}`,
                ephemeral: true
            });
        }
    }
}

module.exports = { viewLeads };
