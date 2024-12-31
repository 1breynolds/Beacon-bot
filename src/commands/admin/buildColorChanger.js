const { SlashCommandBuilder } = require('discord.js');
const { ROLE_OPIUM } = require('../../config.json');
const { createColorChangeEmbed, createColorPickerButtons } = require('../../utils/embedUtils')

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup_color_change')
        .setDescription('Sets up a reaction role embed for users to change their color'),

    async execute (interaction) {

        const memberRoles = interaction.member.roles.cache;

        // Check if the user has admin permissions
        if (!memberRoles.has(ROLE_OPIUM)) {
            return interaction.reply({
                content: "You don't have permission to use this command!",
                ephemeral: true,
            });
        }

        // send embed with buttons
        await interaction.reply({
            embeds: [createColorChangeEmbed()],
            components: createColorPickerButtons(),
            ephemeral: false,
        });
    }
}