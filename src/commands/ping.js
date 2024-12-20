const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ping') // Name of the command
        .setDescription('Replies with Pong!'), // Command description

    async execute(interaction) {
        // Respond to the slash command
        await interaction.reply(`Pong! 🏓 Latency: ${interaction.client.ws.ping}ms`);
    },
};
