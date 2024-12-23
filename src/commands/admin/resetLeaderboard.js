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

        // reset all invite stats for guild
        inviteData[guildId] = {};

        // save updated invite data
        saveInviteData(inviteData);

        // send confirmation message
        return interaction.reply({
            content: '✅ The invite leaderboard has been successfully reset.',
            ephemeral: false,
        });
    }
};