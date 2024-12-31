const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { PRIMARY_COLOR, COLOR_ROLES } = require('../config.json');

const createWelcomeEmbed = (member, invite) => {
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

const createLeaderboardEmbed = (leaderboard) => {
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
};

const createColorChangeEmbed = () => {
    return new EmbedBuilder()
        .setTitle('🎉 Congratulations on Achieving the Humble Role! 🎉')
        .setDescription(
            `Welcome to the best tier of 3am! Reaching the Humble role is a testament to your dedication and contributions to the server. 
        
            As a nonchalant Humble member, you’ve unlocked a special privilege: the ability to customize your name color!
        
            To choose your color:
            👉 Press the **Color Picker** button below. Your name will update instantly to reflect your choice.
        
            Thank you for your chill engagement and support. You’re a key part of what makes this community great! 🌟`
        )
        .setColor(PRIMARY_COLOR);        
};

const createColorPickerButtons = () => {
    const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('ROLE_BLACK')
            .setLabel('Black')
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId('ROLE_ORANGE')
            .setLabel('Orange')
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId('ROLE_YELLOW')
            .setLabel('Yellow')
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId('ROLE_DARKGREEN')
            .setLabel('Dark Green')
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId('ROLE_CYAN')
            .setLabel('Cyan')
            .setStyle(ButtonStyle.Primary)
    );

    const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('ROLE_LIGHTPINK')
            .setLabel('Light Pink')
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId('ROLE_HOTPINK')
            .setLabel('Hot Pink')
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId('ROLE_PURPLE')
            .setLabel('Purple')
            .setStyle(ButtonStyle.Primary)
    );

    return [row1, row2]
};

module.exports = {
    createWelcomeEmbed,
    createLeaderboardEmbed,
    createColorChangeEmbed,
    createColorPickerButtons
}