const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { ROLE_OPIUM, RULES_CHANNEL } = require('../../config.json');
const { createRulesEmbed } = require('../../utils/embedUtils');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('build_rules')
        .setDescription('Posts the server rules embed.'),

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
        const rulesFile = path.join(process.cwd(), 'src', 'data', 'rules.md');
        let rulesText = '';

        try {
            if (fs.existsSync(rulesFile)) {
                rulesText = fs.readFileSync(rulesFile, 'utf8').trim();
            }
        } catch (err) {
            console.error('[build_rules] Error reading rules file:', err);
        }

        if (!rulesText) {
            rulesText = `No rules file found. Please add your rules to \`src/data/rules.md\` or check the rules channel <#${RULES_CHANNEL}>.`;
        }

        const embed = createRulesEmbed(rulesText);

        try {
            await interaction.reply({ embeds: [embed] });
        } catch (err) {
            console.error('[build_rules] Error sending rules embed:', err);
            await interaction.reply({ content: 'Failed to post rules embed. Check logs.', ephemeral: true });
        }
    }
};
