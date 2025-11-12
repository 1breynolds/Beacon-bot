const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { ROLE_OPIUM, ROLEGUIDE_CHANNEL } = require('../../config.json');
const { createRoleGuideEmbed } = require('../../utils/embedUtils');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('build_role_guide')
        .setDescription('Posts the server roles guide embed.'),

    async execute(interaction) {
        const memberRoles = interaction.member.roles.cache;

        // Check if the user has admin permissions
        if (!memberRoles.has(ROLE_OPIUM)) {
            return interaction.reply({
                content: "You don't have permission to use this command!",
                ephemeral: true,
            });
        }

        // Try to read rules from src/data/rules.md (repo root: process.cwd())
        const roleGuideFile = path.join(process.cwd(), 'src', 'data', 'roleGuide.md');
        let roleGuideText = '';

        try {
            if (fs.existsSync(roleGuideFile)) {
                roleGuideText = fs.readFileSync(roleGuideFile, 'utf8').trim();
            }
        } catch (err) {
            console.error('[build_role_guide] Error reading roleGuide file:', err);
        }

        if (!roleGuideText) {
            roleGuideText = `No roleGuide file found. Please add your roleGuide to \`src/data/roleGuide.md\` or check the roleGuide channel <#${ROLEGUIDE_CHANNEL}>.`;
        }

        const embed = createRoleGuideEmbed(roleGuideText);

        try {
            await interaction.reply({ embeds: [embed] });
        } catch (err) {
            console.error('[build_role_guide] Error sending roleGuide embed:', err);
            await interaction.reply({ content: 'Failed to post roleGuide embed. Check logs.', ephemeral: true });
        }
    }
};
