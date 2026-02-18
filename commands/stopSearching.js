const { stopMonitoring } = require('../services/redditMonitor');

async function stopSearching(interaction) {
    try {
        // Check if already replied
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ 
                content: '❌ This interaction has already been handled.', 
                ephemeral: true 
            });
            return;
        }

        await interaction.reply({ content: '🛑 Stopping Reddit search monitoring...', ephemeral: true });
        
        // Stop monitoring for this guild
        await stopMonitoring(interaction);
        
        await interaction.followUp({ 
            content: '✅ Reddit search monitoring has been stopped for this server.', 
            ephemeral: true 
        });
        
    } catch (error) {
        console.error('Error in stopSearching:', error);
        
        // Only try to reply if we haven't already
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ 
                content: `❌ Error stopping search: ${error.message}`, 
                ephemeral: true 
            });
        } else {
            await interaction.followUp({ 
                content: `❌ Error stopping search: ${error.message}`, 
                ephemeral: true 
            });
        }
    }
}

module.exports = { stopSearching };
