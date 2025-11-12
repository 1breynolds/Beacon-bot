const { SlashCommandBuilder } = require('discord.js');
const { createRolePickerEmbed, createRolePickerButton } = require('../../utils/embedUtils');
const { ROLE_OPIUM } = require('../../config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup_adultrole')
        .setDescription('Display the role picker embed with a react button'),

    async execute(interaction) {
        const memberRoles = interaction.member.roles.cache;

        // Check if the user has admin permissions
        if (!memberRoles.has(ROLE_OPIUM)) {
            return interaction.reply({
                content: "You don't have permission to use this command!",
                ephemeral: true,
            });
        }

        // Send the embed + button in the channel where the command was used
        await interaction.reply({
            embeds: [createRolePickerEmbed()],
            components: [createRolePickerButton()],
        });
    },
};
