const { SlashCommandBuilder } = require('discord.js');
const { readInviteData, saveInviteData } = require('../../handlers/inviteTracker');
const { ROLE_OPIUM } = require('../../config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('reset_leaderboard')
        .setDescription('Resets the invite leaderboard.'),

    async execute(interaction) {
        const memberRoles = interaction.member.roles.cache;

        // Check if the user has admin permissions
        if (!memberRoles.has(ROLE_OPIUM)) {
            return interaction.reply({
                content: "You don't have permission to use this command!",
                ephemeral: true,
            });
        }

        const guildId = interaction.guild.id;

        // read current invite data
        const inviteData = readInviteData();

        // check if data exists for guild
        if (!inviteData[guildId]) {
            return interaction.reply({
                content: "There is no leaderboard data to reset for this server.",
                ephemeral: true,
            });
        }

        // reset all invite stats for guild — but preserve invite "currentUses" as baseline
        inviteData[guildId] = {};
        inviteData[guildId].invitedMembers = {};
        inviteData[guildId].resetTimestamp = Date.now(); // Mark when reset was run

        try {
            // Fetch current invites for the guild and use their current uses as the baseline
            const invites = await interaction.guild.invites.fetch();

            invites.forEach(invite => {
                const inviterId = invite.inviter?.id;
                if (!inviterId) return;

                // Set currentUses to the current invite.uses as baseline
                // Only NEW uses after this reset will be counted
                inviteData[guildId][inviterId] = {
                    regular: 0,
                    left: 0,
                    fake: 0,
                    currentUses: invite.uses || 0
                };
            });

            // save updated invite data
            saveInviteData(inviteData);

            // send confirmation message
            return interaction.reply({
                content: '✅ The invite leaderboard has been successfully reset.',
                ephemeral: false,
            });
        } catch (err) {
            console.error('[reset_leaderboard] Error fetching invites for baseline after reset:', err);
            // still save the cleared data if fetch failed
            saveInviteData(inviteData);
            return interaction.reply({ content: '⚠️ Leaderboard reset, but failed to fetch invites for baseline. Check logs.', ephemeral: true });
        }
    }
};