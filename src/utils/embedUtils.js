const { EmbedBuilder } = require('discord.js');
const { PRIMARY_COLOR } = require('../config.json');

module.exports.createWelcomeEmbed = (member, invite) => {
    const inviterInfo = invite
        ? `**<@${invite.inviter.id}>** now has **${invite.uses}** invites.`
        : "Unable to track the inviter.";

    return new EmbedBuilder()
        .setColor(PRIMARY_COLOR)
        .setTitle("Welcome to **3am**!")
        .setDescription(`Nice to see you, ${member.toString()}!\n${inviterInfo}`)
        .setThumbnail(member.user.avatarURL())
        .setTimestamp();
};

module.exports.createLeaderboardEmbed = (leaderboard) => {
    const embed = new EmbedBuilder()
        .setTitle('Invites Leaderboard')
        .setColor(PRIMARY_COLOR)
        .setTimestamp();

    let leaderboardText = '';
    leaderboard.forEach((user, index) => {
        leaderboardText += `${index + 1}. <@${user.username}> • **${user.totalInvites}** invites. (**${user.regular}** regular, **${user.left}** left, **${user.fake}** fake)\n`;
    });

    embed.setDescription(leaderboardText);

    return embed;
}