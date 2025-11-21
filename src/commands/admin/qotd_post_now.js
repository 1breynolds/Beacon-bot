const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const fs = require('fs').promises;
const path = require('path');
const { QUESTION_DATA_PATH, QUESTION_STATE_PATH, QUESTION_CHANNEL, PRIMARY_COLOR } = require('../../config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('qotd_post_now')
        .setDescription('Post the next Question of the Day immediately (admin only)')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        try {
            const dataPath = path.resolve(process.cwd(), QUESTION_DATA_PATH);
            const statePath = path.resolve(process.cwd(), QUESTION_STATE_PATH);

            const rawQ = await fs.readFile(dataPath, 'utf8');
            const questions = JSON.parse(rawQ);
            if (!Array.isArray(questions) || questions.length === 0) {
                await interaction.editReply({ content: 'No questions available.' });
                return;
            }

            let state;
            try {
                const rawS = await fs.readFile(statePath, 'utf8');
                state = JSON.parse(rawS);
            } catch (e) {
                state = { used: [], lastPosted: null, lastIndex: null };
            }

            // pick next index
            let index = null;
            for (let i = 0; i < questions.length; i++) {
                if (!state.used.includes(i)) { index = i; break; }
            }
            if (index === null) { state.used = []; index = 0; }

            const question = questions[index];

            const embed = new EmbedBuilder()
                .setTitle('Question of the Day')
                .setDescription(question)
                .setColor(PRIMARY_COLOR || '#5865F2')
                .setTimestamp();

            const targetChannelId = QUESTION_CHANNEL;
            const targetChannel = interaction.guild.channels.cache.get(targetChannelId) || interaction.client.channels.cache.get(targetChannelId);
            if (!targetChannel) {
                await interaction.editReply({ content: `Configured QUESTION_CHANNEL (${targetChannelId}) not found.` });
                return;
            }

            await targetChannel.send({ embeds: [embed] });

            // update state
            state.used = state.used || [];
            if (!state.used.includes(index)) state.used.push(index);
            const now = new Date();
            const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
            const year = parts.find(p => p.type === 'year').value;
            const month = parts.find(p => p.type === 'month').value;
            const day = parts.find(p => p.type === 'day').value;
            state.lastPosted = `${year}-${month}-${day}`;
            state.lastIndex = index;

            await fs.writeFile(statePath, JSON.stringify(state, null, 2), 'utf8');

            await interaction.editReply({ content: `Posted question index ${index}.` });
        } catch (err) {
            console.error('[qotd_post_now] Error:', err);
            try { await interaction.editReply({ content: 'Failed to post QOTD. Check logs.' }); } catch (e) {}
        }
    }
};
