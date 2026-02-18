const { Client, GatewayIntentBits, EmbedBuilder, SlashCommandBuilder, REST, Routes } = require('discord.js');
const { setupReddit } = require('./commands/setupReddit');
const { listPhrases } = require('./commands/listPhrases');
const { removePhrase } = require('./commands/removePhrase');
const { addPhrase } = require('./commands/addPhrase');
const { clearPhrases } = require('./commands/clearPhrases');
const { testSearch } = require('./commands/testSearch');
const { stopSearching } = require('./commands/stopSearching');
const { status } = require('./commands/status');
const { help } = require('./commands/help');
const { viewLeads } = require('./commands/viewLeads');
const { updateStatus } = require('./commands/updateStatus');
const { startMonitoring, stopMonitoring } = require('./services/redditMonitor');
const { initDatabase } = require('./services/database');
require('dotenv').config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages
    ]
});

// Command definitions
const commands = [
    new SlashCommandBuilder()
        .setName('setupreddit')
        .setDescription('Setup Reddit monitoring with phrases, age filter, and channel')
        .addStringOption(option =>
            option.setName('phrases')
                .setDescription('Comma-separated phrases to monitor')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('age')
                .setDescription('How old posts can be')
                .setRequired(true)
                .addChoices(
                    { name: 'Within one hour', value: 'hour' },
                    { name: 'Within one day', value: 'day' },
                    { name: 'Yesterday', value: 'yesterday' },
                    { name: 'This week', value: 'week' },
                    { name: 'This month', value: 'month' }
                ))
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('Channel where updates will be posted')
                .setRequired(true)),
    new SlashCommandBuilder()
        .setName('listphrases')
        .setDescription('List all monitored phrases'),
    new SlashCommandBuilder()
        .setName('removephrase')
        .setDescription('Remove a specific phrase from monitoring')
        .addStringOption(option =>
            option.setName('phrase')
                .setDescription('Phrase to remove')
                .setRequired(true)),
    new SlashCommandBuilder()
        .setName('addphrase')
        .setDescription('Add additional phrases to existing monitoring')
        .addStringOption(option =>
            option.setName('phrases')
                .setDescription('Comma-separated phrases to add')
                .setRequired(true)),
    new SlashCommandBuilder()
        .setName('clearphrases')
        .setDescription('Clear all monitored phrases for this server'),
    new SlashCommandBuilder()
        .setName('startmonitoring')
        .setDescription('Start Reddit monitoring'),
    new SlashCommandBuilder()
        .setName('stopmonitoring')
        .setDescription('Stop Reddit monitoring'),
    new SlashCommandBuilder()
        .setName('testsearch')
        .setDescription('Test Reddit search for a specific phrase')
        .addStringOption(option =>
            option.setName('phrase')
                .setDescription('Phrase to search for (defaults to "software engineer to test")')
                .setRequired(false)),
    new SlashCommandBuilder()
        .setName('stopsearching')
        .setDescription('Stop Reddit search monitoring for this server'),
    new SlashCommandBuilder()
        .setName('status')
        .setDescription('Check the current monitoring status'),
    new SlashCommandBuilder()
        .setName('help')
        .setDescription('Show help for available commands'),
    new SlashCommandBuilder()
        .setName('viewleads')
        .setDescription('View recent leads from Google Sheets'),
    new SlashCommandBuilder()
        .setName('updatestatus')
        .setDescription('Update lead status in Google Sheets')
        .addIntegerOption(option =>
            option.setName('row')
                .setDescription('Row number of the lead to update')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('status')
                .setDescription('New status for the lead')
                .setRequired(true)
                .addChoices(
                    { name: 'New', value: 'New' },
                    { name: 'Contacted', value: 'Contacted' },
                    { name: 'Interested', value: 'Interested' },
                    { name: 'Not Interested', value: 'Not Interested' },
                    { name: 'Hired', value: 'Hired' },
                    { name: 'Closed', value: 'Closed' }
                ))
        .addStringOption(option =>
            option.setName('notes')
                .setDescription('Optional notes about the lead')
                .setRequired(false))
];

// Register slash commands
async function registerCommands() {
    try {
        const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
        console.log('Started refreshing application (/) commands.');

        await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID),
            { body: commands }
        );

        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error('Error registering commands:', error);
    }
}

// Handle slash commands
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const { commandName } = interaction;

    try {
        switch (commandName) {
            case 'setupreddit':
                await setupReddit(interaction);
                break;
            case 'listphrases':
                await listPhrases(interaction);
                break;
            case 'removephrase':
                await removePhrase(interaction);
                break;
            case 'addphrase':
                await addPhrase(interaction);
                break;
            case 'clearphrases':
                await clearPhrases(interaction);
                break;
            case 'startmonitoring':
                await startMonitoring(interaction);
                break;
            case 'stopmonitoring':
                await stopMonitoring(interaction);
                break;
            case 'testsearch':
                await testSearch(interaction);
                break;
            case 'stopsearching':
                await stopSearching(interaction);
                break;
            case 'status':
                await status(interaction);
                break;
            case 'help':
                await help(interaction);
                break;
            case 'viewleads':
                await viewLeads(interaction);
                break;
            case 'updatestatus':
                await updateStatus(interaction);
                break;
            default:
                await interaction.reply({ content: 'Unknown command!', ephemeral: true });
        }
    } catch (error) {
        console.error(`Error executing command ${commandName}:`, error);
        await interaction.reply({ 
            content: 'There was an error executing this command!', 
            ephemeral: true 
        });
    }
});

// Bot ready event
client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}!`);
    
    // Initialize database
    await initDatabase();
    
    // Register slash commands
    await registerCommands();
    
    // Start monitoring for all guilds
    const guilds = await client.guilds.fetch();
    for (const [guildId, guild] of guilds) {
        try {
            await startMonitoring({ guildId, client });
        } catch (error) {
            console.error(`Failed to start monitoring for guild ${guildId}:`, error);
        }
    }
    
    console.log('Bot is ready and monitoring Reddit!');
});

// Error handling
client.on('error', error => {
    console.error('Discord client error:', error);
});

process.on('unhandledRejection', error => {
    console.error('Unhandled promise rejection:', error);
});

// Login to Discord
client.login(process.env.DISCORD_TOKEN);
