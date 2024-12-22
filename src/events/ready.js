const { Collection } = require('discord.js');
const { initializeInvites } = require('../handlers/inviteTracker');
const { SERVER_ID, YT_ALERT_CHANNEL } = require('../config.json');
const commandHandler = require('../handlers/commandHandler');
const { monitorChannel } = require('../handlers/youtubeMonitor');

module.exports = {
    name: 'ready',
    once: true,
    async execute (client) {
        console.log(`${client.user.displayName} ready for takeoff.`);

        // Find target guild by its ID
        const targetGuild = client.guilds.cache.get(SERVER_ID);

        if (!targetGuild) {
            console.error(`[ready] Guild with ID ${targetGuildId} not found.`);
            return;
        }

        // Cache invites for all guilds
        client.invitesCache = new Collection();
        await initializeInvites(client, targetGuild);
        console.log(`[ready] Invites cached for guild: ${targetGuild.name}`);

        // Load all commands
        await commandHandler(client);
        console.log('Loaded commands:', client.commands.keys());
        console.log(`[ready] Registered commands: ${client.commands.map(command => command.data.name).join(', ')}`)

        // Schedule YouTube monitoring every 5 minutes
        setInterval(() => {
            monitorChannel(client, YT_ALERT_CHANNEL);
        }, 300000);
        console.log('Youtube monitor initialized.');
    }
};
