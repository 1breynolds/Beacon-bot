const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('simjoin')
        .setDescription('Simulates a user joining the server.')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to simulate joining.')
                .setRequired(true)
        ),
    async execute(interaction) {
        // Fetch the selected user
        const user = interaction.options.getUser('user');

        // Check if the guild member exists
        const guild = interaction.guild;
        const member = guild.members.cache.get(user.id);

        if (!member) {
            await interaction.reply({ content: `The user ${user.tag} is not a member of this server.`, ephemeral: true });
            return;
        }

        // Emit the guildMemberAdd event
        interaction.client.emit('guildMemberAdd', member);

        // Confirm success to the user
        await interaction.reply({ content: `Simulated join event for ${user.tag}.`, ephemeral: true });
    },
};
