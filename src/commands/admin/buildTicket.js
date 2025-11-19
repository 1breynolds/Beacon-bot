const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { ROLE_OPIUM, TICKET_CHANNEL } = require('../../config.json');
const { createTicketEmbed } = require('../../utils/embedUtils');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('build_ticket')
        .setDescription('Posts the ticket creation embed with a button.'),

    async execute(interaction) {
        const memberRoles = interaction.member.roles.cache;

        // Only allow admins with ROLE_OPIUM to run this
        if (!memberRoles.has(ROLE_OPIUM)) {
            return interaction.reply({ content: "You don't have permission to use this command!", ephemeral: true });
        }

        // Read ticket text from src/data/ticket.md
        const ticketFile = path.join(process.cwd(), 'src', 'data', 'ticket.md');
        let ticketText = '';

        try {
            if (fs.existsSync(ticketFile)) {
                ticketText = fs.readFileSync(ticketFile, 'utf8').trim();
            }
        } catch (err) {
            console.error('[build_ticket] Error reading ticket file:', err);
        }

        if (!ticketText) {
            ticketText = `No ticket template found. Add your ticket content to \`src/data/ticket.md\` or check the configured channel <#${TICKET_CHANNEL}>.`;
        }

        const embed = createTicketEmbed(ticketText);

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('CREATE_TICKET')
                .setLabel('🎫 Create Ticket')
                .setStyle(ButtonStyle.Primary)
        );

        try {
            await interaction.reply({ embeds: [embed], components: [row] });
        } catch (err) {
            console.error('[build_ticket] Error sending ticket embed:', err);
            await interaction.reply({ content: 'Failed to post ticket embed. Check logs.', ephemeral: true });
        }
    }
};
