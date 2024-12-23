const { SlashCommandBuilder } = require('discord.js');
const { generateLeaderboard } = require('../../utils/commandUtils');
const { createLeaderboardEmbed } = require('../../utils/embedUtils');
const { ROLE_OPIUM, ROLE_FEDORA } = require('../../config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('invite_leaderboard')
        .setDescription('Displays the top 10 users by invite count.'),
    async execute(interaction) {
        const memberRoles = interaction.member.roles.cache;
        
        // Check if the user has admin permissions
        if (!memberRoles.has(ROLE_OPIUM) && !memberRoles.has(ROLE_FEDORA)) {
            return interaction.reply({
                content: "You don't have permission to use this command!",
                ephemeral: true,
            });
        }
        
        try {
            // Generate the leaderboard message
            const leaderboard = await generateLeaderboard();

            // Create the embed
            const leaderboardEmbed = createLeaderboardEmbed(leaderboard)

            // Send the leaderboard message back to the user
            await interaction.reply({ embeds: [leaderboardEmbed] });
        } catch (error) {
            console.error('Error in invite leaderboard command:', error);
            await interaction.reply({ content: 'There was an error fetching the leaderboard.', ephemeral: true });
        }
    }
};
