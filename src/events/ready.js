const { Collection } = require('discord.js');
const { SERVER_ID, SOCIALS_ALERT_CHANNEL, CHECK_INTERVAL } = require('../config.json');
const commandHandler = require('../handlers/commandHandler');
const { initializeInvites } = require('../handlers/inviteTracker');
const { monitorYouTube } = require('../handlers/youtubeMonitor');
const { monitorTikTok } = require('../handlers/tiktokMonitor');
const { updateServerCountChannel } = require('../handlers/serverCountHandler');

module.exports = {
    name: 'ready',
    once: true,
    async execute (client) {
        console.log(`---------------------\n${client.user.displayName} ready for takeoff.`);

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
        console.log('[ready] Loaded commands:', client.commands.keys());

        // Initialize member count
        await updateServerCountChannel(targetGuild);
        console.log('[ready] Server count channel initialized.');

        // Schedule YouTube monitoring every 5 minutes
        setInterval(() => {
            monitorYouTube(client, SOCIALS_ALERT_CHANNEL);
            monitorTikTok(client, SOCIALS_ALERT_CHANNEL);
        }, CHECK_INTERVAL);
        console.log('[ready] Socials monitor initialized.');
    }
};
