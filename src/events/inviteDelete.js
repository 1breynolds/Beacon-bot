module.exports = {
    name: 'inviteDelete',
    execute(invite) {
        const cachedInvites = invite.guild.client.invitesCache.get(invite.guild.id);
        if (cachedInvites) cachedInvites.delete(invite.code);
    }
};
