const { TRACK_INVITES } = require('../config.json');

module.exports = {
    name: 'inviteDelete',
    execute(invite) {
        // Only track invites if enabled in config
        if (!TRACK_INVITES) return;

        const cachedInvites = invite.guild.client.invitesCache.get(invite.guild.id);
        if (cachedInvites) cachedInvites.delete(invite.code);
    }
};
