module.exports.assignRole = async (member, roleId) => {
    const role = member.guild.roles.cache.get(roleId);
    if (role) {
        try {
            await member.roles.add(role);
            console.log(`[roleUtils] Role "${role.name}" assigned to ${member.user.username}`);
        } catch (e) {
            console.error(`[roleUtils] Error assigning role: ${e}`);
        }
    } else {
        console.error(`[roleUtils] Role ID ${roleId} not found.`);
    }
};
