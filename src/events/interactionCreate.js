const config = require('../config.json');
const { COLOR_ROLES, ROLE_ADULT } = config;
const { assignRole } = require('../utils/roleUtils');
const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'interactionCreate',
    async execute(interaction) {
        // Handle chat input commands
        if (interaction.isChatInputCommand()) {
            const command = interaction.client.commands.get(interaction.commandName);

            if (!command) {
                console.error(`[interactionCreate] No command matching ${interaction.commandName} was found.`);
                return;
            }

            try {
                await command.execute(interaction);
            } catch (error) {
                console.error(`[interactionCreate] Error executing command ${interaction.commandName}:`, error);
                await interaction.reply({
                    content: '[interactionCreate] There was an error while executing this command!',
                    ephemeral: true,
                });
            }
            return;
        }

        // Handle button interactions
        if (interaction.isButton()) {
            const { customId, member } = interaction;

            // check if button corresponds to a color role
            const roleId = COLOR_ROLES[customId];
            if (roleId) {
                const role = member.guild.roles.cache.get(roleId);

                if (member.roles.cache.has(roleId)) {
                    // if the user already has the role, remove it
                    await member.roles.remove(roleId);
                    const removedEmbed = new EmbedBuilder()
                        .setDescription(`Removed **${role ? role.name : customId}**`)
                        .setColor('#54b86f');

                    await interaction.reply({ embeds: [removedEmbed], ephemeral: true });
                } else {
                    // remove other color roles first
                    for (const r of Object.values(COLOR_ROLES)) {
                        if (member.roles.cache.has(r)) {
                            await member.roles.remove(r);
                        }
                    }

                    // add the selected role
                    await member.roles.add(roleId);
                    const addedEmbed = new EmbedBuilder()
                        .setDescription(`Added **${role ? role.name : customId}**`)
                        .setColor('#54b86f');

                    await interaction.reply({ embeds: [addedEmbed], ephemeral: true });
                }
                return;
            }

            // handle adult role button (from role picker)
            if (customId === 'ADULT_ROLE') {
                const adultRoleId = ROLE_ADULT;

                if (!adultRoleId) {
                    await interaction.reply({
                        content: 'Adult role is not configured. Please set `ADULT_ROLE` in config.json.',
                        ephemeral: true,
                    });
                    return;
                }

                try {
                    if (member.roles.cache.has(adultRoleId)) {
                        await member.roles.remove(adultRoleId);
                        const role = member.guild.roles.cache.get(adultRoleId);
                        const removedEmbed = new EmbedBuilder()
                            .setDescription(`Removed **${role ? role.name : 'Adult'}**`)
                            .setColor('#54b86f')

                        await interaction.reply({ embeds: [removedEmbed], ephemeral: true });
                    } else {
                        // use existing helper to add the role (logs any errors)
                        await assignRole(member, adultRoleId);
                        const role = member.guild.roles.cache.get(adultRoleId);
                        const addedEmbed = new EmbedBuilder()
                            .setDescription(`Added **${role ? role.name : 'Adult'}**`)
                            .setColor('#54b86f')

                        await interaction.reply({ embeds: [addedEmbed], ephemeral: true });
                    }
                } catch (err) {
                    console.error('[interactionCreate] Error handling ADULT_ROLE button:', err);
                    await interaction.reply({ content: 'There was an error assigning the Adult role.', ephemeral: true });
                }

                return;
            }

            console.warn(`[interactionCreate] Unhandled button interaction with ID: ${customId}`);
            return;
        }
    },
};
