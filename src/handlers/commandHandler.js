const path = require('path');
const { REST, Routes } = require('discord.js');
const { getCommandFiles, validateCommand } = require('../utils/commandUtils');
require('dotenv').config();

module.exports = async (client) => {
    const commands = [];
    const commandsPath = path.join(__dirname, '../commands');
    const commandFiles = getCommandFiles(commandsPath); // Use utility to get command files

    // Load and validate commands
    for (const filePath of commandFiles) {
        const command = require(filePath);
        if (validateCommand(command, filePath)) {
            commands.push(command.data.toJSON());
            client.commands.set(command.data.name, command);
        }
    }

    // Log all commands BEFORE API call
    //console.log(`[commandHandler] PRE API Commands loaded: ${commands.map(cmd => cmd.name)}`)

    // Register commands with Discord API
    const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
    try {
        console.log('[commandHandler] Started refreshing application (/) commands.');

        const response = await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID),
            { body: commands },
        );

        console.log('[commandHandler] Successfully reloaded application (/) commands.');

        // Log all registered commands AFTER API call
        //console.log(`[commandHandler] Post API Registered command names: ${response.map(cmd => cmd.name)}`)
    } catch (error) {
        console.error(error);
    }
};
