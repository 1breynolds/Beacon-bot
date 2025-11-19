const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { PRIMARY_COLOR, COLOR_ROLES, RULES_CHANNEL, INTRO_CHANNEL, ROLES_CHANNEL, ADULT_CHANNEL, TRACK_INVITES } = require('../config.json');

const createWelcomeEmbed = (member, invite) => {
    let descriptionLines = [
        `Before you start roaming around, check out the <#${RULES_CHANNEL}>.`,
        `\nSwing by <#${ROLES_CHANNEL}> to grab your tags and \n<#${INTRO_CHANNEL}> to tell us all about yourself!`
    ];

    // Only add inviter info if invite tracking is enabled and we have invite data
    if (TRACK_INVITES && invite && invite.inviter && member && member.guild) {
        // Try to resolve the inviter's guild member to get their display name (nickname), fall back to username
        const inviterMember = member.guild.members.cache.get(invite.inviter.id);
        const inviterName = inviterMember ? inviterMember.displayName : (invite.inviter.username || invite.inviter.tag || `<@${invite.inviter.id}>`);
        // Use the tracked count (from inviteData) if available, otherwise fall back to invite.uses
        const displayCount = invite.trackedCount !== undefined ? invite.trackedCount : invite.uses;
        descriptionLines.push(`\n**${inviterName}** now has **${displayCount}** invites.`);
    }

    return new EmbedBuilder()
        .setColor(PRIMARY_COLOR)
        .setTitle("Welcome to the pack - You're home now.")
        .setDescription(descriptionLines.join('\n'))
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
        .setTitle('🐺 Alpha Colors: Claim Your Mark')
        .setDescription(
            `Congratulations on reaching Level 20 — you’ve earned the right to a custom color!

            🎨 How to Choose:
            ✅ React below to select your color (First one's on us).
            ✅ You can only wear one color at a time.
            ✅ Want to change? Spend some points.`
        )
        .setFooter({ text: "🐾 Wear your colors with pride" })
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

const createRolePickerEmbed = () => {
    return new EmbedBuilder()
        .setTitle('🎟️ The Doghouse After Dark 🐕🌙')
        .setDescription(`Some topics aren't for pups!
            \nIf you're 18+ and want access to our grown-up lounge, press the button below to unlock the <#${ADULT_CHANNEL}> channel.
            \n🐶 Keep in mind: even here, the Kennel rules still apply — respect the pack, keep it classy.`)
        .setColor(PRIMARY_COLOR);
};

const createRolePickerButton = () => {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('ADULT_ROLE')
            .setLabel('🔞')
            .setStyle(ButtonStyle.Primary)
    );
};

const createRulesEmbed = (rulesText) => {
    return new EmbedBuilder()
        .setTitle('📜 Kennel Rules')
        .setDescription(rulesText)
        .setColor(PRIMARY_COLOR)
};

const createRoleGuideEmbed = (roleGuideText) => {
    return new EmbedBuilder()
        .setDescription(roleGuideText)
        .setColor(PRIMARY_COLOR)
};

const createTicketEmbed = (ticketText) => {
    return new EmbedBuilder()
        .setTitle('🎫 Ticket Support')
        .setDescription(ticketText)
        .setColor(PRIMARY_COLOR)
};

module.exports = {
    createWelcomeEmbed,
    createLeaderboardEmbed,
    createColorChangeEmbed,
    createColorPickerButtons,
    createRolePickerEmbed,
    createRolePickerButton,
    createRulesEmbed,
    createRoleGuideEmbed
    ,
    createTicketEmbed
}