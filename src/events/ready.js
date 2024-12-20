const { Collection } = require('discord.js');
const { initializeInvites } = require('../handlers/inviteTracker');
const { SERVER_ID } = require('../config.json');
const commandHandler = require('../handlers/commandHandler');

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
    }
};
