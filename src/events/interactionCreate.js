module.exports = {
    name: 'interactionCreate',
    async execute(interaction) {
        if (!interaction.isChatInputCommand()) return;

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
    },
};
