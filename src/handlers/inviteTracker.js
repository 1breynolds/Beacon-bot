module.exports.initializeInvites = async (client, guild) => {
    try {
        const invites = await guild.invites.fetch();
        client.invitesCache.set(guild.id, new Map(invites.map(invite => [invite.code, invite.uses])));
    } catch (e) {
        console.error(`Error fetching invites for ${guild.name}: ${e}`);
    }
};

module.exports.trackInviteUsage = async (guild, member) => {
    const newInvites = await guild.invites.fetch();
    const cachedInvites = guild.client.invitesCache.get(guild.id);
    let usedInvite = null;

    for (const invite of newInvites.values()) {
        const previousUses = cachedInvites.get(invite.code) || 0;
        if (invite.uses > previousUses) {
            usedInvite = invite;
            break;
        }
    }

    guild.client.invitesCache.set(guild.id, new Map(newInvites.map(inv => [inv.code, inv.uses])));
    return usedInvite;
};
