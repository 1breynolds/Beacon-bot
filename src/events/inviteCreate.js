module.exports = {
    name: 'inviteCreate',
    execute(invite) {
        const cachedInvites = invite.guild.client.invitesCache.get(invite.guild.id) || new Map();
        cachedInvites.set(invite.code, invite.uses);
        invite.guild.client.invitesCache.set(invite.guild.id, cachedInvites);
    }
};
