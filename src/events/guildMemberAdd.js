const { assignRole } = require('../utils/roleUtils');
const { createWelcomeEmbed } = require('../utils/embedUtils');
const { trackInviteUsage, readInviteData } = require('../handlers/inviteTracker');
const { updateServerCountChannel } = require('../handlers/serverCountHandler');
const { WELCOME_CHANNEL, ROLE_LEVEL0, TRACK_INVITES } = require('../config.json');

module.exports = {
    name: 'guildMemberAdd',
    async execute(member) {
        const { guild } = member;
        const welcomeChannel = guild.channels.cache.get(WELCOME_CHANNEL);

        // Auto-assign role
        await assignRole(member, ROLE_LEVEL0);

        // Track invites (if enabled in config)
        let usedInvite = null;
        if (TRACK_INVITES) {
            usedInvite = await trackInviteUsage(guild, member);
            
            // If we have an invite, get the tracked regular count from inviteData for the embed
            if (usedInvite && usedInvite.inviter) {
                const inviteData = readInviteData();
                const inviterId = usedInvite.inviter.id;
                const trackedCount = inviteData[guild.id]?.[inviterId]?.regular || 0;
                // Attach tracked count to the invite object for the embed to use
                usedInvite.trackedCount = trackedCount;
            }
        }
        const welcomeEmbed = createWelcomeEmbed(member, usedInvite);

        // Send welcome embed
        if (welcomeChannel) {
            welcomeChannel.send({ 
                content: `🐾 Welcome to The Kennel, <@${member.id}>!`,
                embeds: [welcomeEmbed] 
            });
        }

        // Update channel count
        await updateServerCountChannel(member.guild);
    }
};
