const { EmbedBuilder } = require('discord.js');
const { assignRole } = require('../utils/roleUtils');
const { createWelcomeEmbed } = require('../utils/embedUtils');
const { fetchInvites } = require('../handlers/inviteTracker');
const config = require('../config.json');

module.exports = {
    name: 'guildMemberAdd',
    async execute(member) {
        const { guild } = member;
        const welcomeChannel = guild.channels.cache.get(config.WELCOME_CHANNEL);

        // Auto-assign role
        await assignRole(member, config.ROLE_MYSTERIOUS);

        // Track invites
        const usedInvite = await fetchInvites(guild, member);
        const welcomeEmbed = createWelcomeEmbed(member, usedInvite);

        // Send welcome embed
        if (welcomeChannel) {
            welcomeChannel.send({ embeds: [welcomeEmbed] });
        }
    }
};
