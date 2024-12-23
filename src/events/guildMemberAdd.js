const { assignRole } = require('../utils/roleUtils');
const { createWelcomeEmbed } = require('../utils/embedUtils');
const { trackInviteUsage } = require('../handlers/inviteTracker');
const { updateServerCountChannel } = require('../handlers/serverCountHandler');
const { WELCOME_CHANNEL, ROLE_MYSTERIOUS } = require('../config.json');

module.exports = {
    name: 'guildMemberAdd',
    async execute(member) {
        const { guild } = member;
        const welcomeChannel = guild.channels.cache.get(WELCOME_CHANNEL);

        // Auto-assign role
        await assignRole(member, ROLE_MYSTERIOUS);

        // Track invites
        const usedInvite = await trackInviteUsage(guild, member);
        const welcomeEmbed = createWelcomeEmbed(member, usedInvite);

        // Send welcome embed
        if (welcomeChannel) {
            welcomeChannel.send({ embeds: [welcomeEmbed] });
        }

        // Update channel count
        await updateServerCountChannel(member.guild);
    }
};
