const { EmbedBuilder } = require('discord.js');
const config = require('../config.json');

module.exports.createWelcomeEmbed = (member, invite) => {
    const inviterInfo = invite
        ? `Invited by **${invite.inviter.tag}** who now has **${invite.uses}** invites.`
        : "Unable to track the inviter.";

    return new EmbedBuilder()
        .setColor(config.PRIMARY_COLOR)
        .setTitle("Welcome to **3am**!")
        .setDescription(`Welcome ${member.toString()}! ${inviterInfo}`)
        .setTimestamp();
};
