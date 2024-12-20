const { EmbedBuilder } = require('discord.js');
const config = require('../config.json');

module.exports.createWelcomeEmbed = (member, invite) => {
    const inviterInfo = invite
        ? `**<@${invite.inviter.id}>** now has **${invite.uses}** invites.`
        : "Unable to track the inviter.";

    return new EmbedBuilder()
        .setColor(config.PRIMARY_COLOR)
        .setTitle("Welcome to **3am**!")
        .setDescription(`Nice to see you, ${member.toString()}!\n${inviterInfo}`)
        .setThumbnail(member.user.avatarURL())
        .setTimestamp();
};
