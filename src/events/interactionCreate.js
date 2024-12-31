const { COLOR_ROLES } = require('../config.json');

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
                if (member.roles.cache.has(roleId)) {
                    // if the user already has the role, remove it
                    await member.roles.remove(roleId);
                    await interaction.reply({
                        content: `Removed the **${customId}** role.`,
                        ephemeral: true,
                    });
                } else {
                    // remove other color roles first
                    for (const role of Object.values(COLOR_ROLES)) {
                        if (member.roles.cache.has(role)) {
                            await member.roles.remove(role);
                        }
                    }

                    // add the selected role
                    await member.roles.add(roleId);
                    await interaction.reply({
                        content: `Added the **${customId}** role.`,
                        ephemeral: true,
                    });
                }
            } else {
                console.warn(`[interactionCreate] Unhandled button interaction with ID: ${customId}`);
            }
            return;
        }
    },
};
