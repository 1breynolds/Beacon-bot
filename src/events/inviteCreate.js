const { TRACK_INVITES } = require('../config.json');

module.exports = {
    name: 'inviteCreate',
    execute(invite) {
        // Only track invites if enabled in config
        if (!TRACK_INVITES) return;

        const cachedInvites = invite.guild.client.invitesCache.get(invite.guild.id) || new Map();
        cachedInvites.set(invite.code, invite.uses);
        invite.guild.client.invitesCache.set(invite.guild.id, cachedInvites);
    }
};
