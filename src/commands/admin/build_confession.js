const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const fs = require('fs').promises;
const path = require('path');
const CONFIG_PATH = path.resolve(process.cwd(), 'src', 'config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('build_confession')
        .setDescription('Post the initial confession embed with buttons. Admin only.')
        .addChannelOption(opt => opt.setName('target_channel').setDescription('Channel to post the confession embed in').setRequired(true))
        .addChannelOption(opt => opt.setName('log_channel').setDescription('Optional: channel where confessions are logged/approved'))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        try {
            const targetChannel = interaction.options.getChannel('target_channel');
            const logChannel = interaction.options.getChannel('log_channel');

            if (!targetChannel || targetChannel.type !== ChannelType.GuildText) {
                await interaction.editReply({ content: 'Please provide a valid text channel as the target.' });
                return;
            }

            // Build embed
            const embed = new EmbedBuilder()
                .setTitle('Confessions')
                .setDescription('Share anonymously by clicking "Submit a confession!" — admins will review submissions before posting.')
                .setColor('#2f3136')
                .setFooter({ text: 'Confession system' })
                .setTimestamp();

            const submitBtn = new ButtonBuilder()
                .setCustomId('CONFESS_SUBMIT')
                .setLabel('Submit a confession!')
                .setStyle(ButtonStyle.Primary);

            const replyBtn = new ButtonBuilder()
                .setCustomId('CONFESS_REPLY')
                .setLabel('Reply')
                .setStyle(ButtonStyle.Secondary);

            const row = new ActionRowBuilder().addComponents(submitBtn, replyBtn);

            await targetChannel.send({ embeds: [embed], components: [row] });

            // Persist confession channels into main config if provided
            try {
                const cfgRaw = await fs.readFile(CONFIG_PATH, 'utf8');
                const cfg = JSON.parse(cfgRaw);
                cfg.CONFESSION_CHANNEL = targetChannel.id;
                if (logChannel) cfg.CONFESSION_LOG_CHANNEL = logChannel.id;
                await fs.writeFile(CONFIG_PATH, JSON.stringify(cfg, null, 2), 'utf8');
            } catch (e) {
                console.error('[build_confession] Failed to save CONFESSION channel(s) to config.json:', e);
            }

            await interaction.editReply({ content: `Posted confession embed in ${targetChannel.toString()}${logChannel ? ` and saved log channel ${logChannel.toString()}` : ''}.` });
        } catch (err) {
            console.error('[build_confession] Error:', err);
            try { await interaction.editReply({ content: 'Failed to build confession embed. Check logs.' }); } catch (e) {}
        }
    }
};
