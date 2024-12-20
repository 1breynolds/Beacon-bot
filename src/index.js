require('dotenv').config();
const { Client, Collection, GatewayIntentBits } = require('discord.js');
const eventHandler = require('./handlers/eventHandler');

// client Initialization
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ]
});

// Initialize commands
client.commands = new Collection();

// Event Handler (Dynamically loads events)
eventHandler(client);

// client Login
client.login(process.env.TOKEN);
