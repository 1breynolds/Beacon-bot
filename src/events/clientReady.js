const { Collection, EmbedBuilder } = require('discord.js');
const { SERVER_ID, SOCIALS_ALERT_CHANNEL, CHECK_INTERVAL, TRACK_INVITES, MONITOR_SOCIALS, QUESTION_OF_DAY_ENABLED, QUESTION_CHANNEL, QUESTION_DATA_PATH, QUESTION_STATE_PATH, PRIMARY_COLOR } = require('../config.json');
const fs = require('fs').promises;
const path = require('path');
const commandHandler = require('../handlers/commandHandler');
const { initializeInvites } = require('../handlers/inviteTracker');
const { monitorYouTube } = require('../handlers/youtubeMonitor');
const { monitorTikTok } = require('../handlers/tiktokMonitor');
const { updateServerCountChannel } = require('../handlers/serverCountHandler');

module.exports = {
    name: 'clientReady',
    once: true,
    async execute (client) {
        console.log(`---------------------\n${client.user.displayName} ready for takeoff.`);

        // Find target guild by its ID
        const targetGuild = client.guilds.cache.get(SERVER_ID);

        if (!targetGuild) {
            console.error(`[ready] Guild with ID ${SERVER_ID} not found.`);
            return;
        }

        // Cache invites for all guilds (if enabled in config)
        if (TRACK_INVITES) {
            client.invitesCache = new Collection();
            await initializeInvites(client, targetGuild);
            console.log(`[ready] Invites cached for guild: ${targetGuild.name}`);
        } else {
            console.log('[ready] Invite tracking disabled in config.');
        }

        // Load all commands
        await commandHandler(client);
        console.log('[ready] Loaded commands:', client.commands.keys());

        // Initialize member count
        await updateServerCountChannel(targetGuild);
        console.log('[ready] Server count channel initialized.');

        // Schedule YouTube and TikTok monitoring (if enabled in config)
        if (MONITOR_SOCIALS) {
            setInterval(() => {
                monitorYouTube(client, SOCIALS_ALERT_CHANNEL);
                monitorTikTok(client, SOCIALS_ALERT_CHANNEL);
            }, CHECK_INTERVAL);
            console.log('[ready] Socials monitor initialized.');
        } else {
            console.log('[ready] Socials monitoring disabled in config.');
        }

        // Question of the Day scheduler
        if (QUESTION_OF_DAY_ENABLED) {
            const qChannelId = QUESTION_CHANNEL;
            if (!qChannelId) {
                console.log('[ready] QUESTION_OF_DAY_ENABLED is true but QUESTION_CHANNEL is not configured.');
            } else {
                const dataPath = path.resolve(process.cwd(), QUESTION_DATA_PATH);
                const statePath = path.resolve(process.cwd(), QUESTION_STATE_PATH);

                const loadQuestions = async () => {
                    try {
                        const raw = await fs.readFile(dataPath, 'utf8');
                        const arr = JSON.parse(raw);
                        if (!Array.isArray(arr)) return [];
                        return arr;
                    } catch (e) {
                        console.error('[QOTD] Failed to load questions:', e.message);
                        return [];
                    }
                };

                const loadState = async () => {
                    try {
                        const raw = await fs.readFile(statePath, 'utf8');
                        return JSON.parse(raw);
                    } catch (e) {
                        return { used: [], lastPosted: null, lastIndex: null };
                    }
                };

                const saveState = async (state) => {
                    try {
                        await fs.writeFile(statePath, JSON.stringify(state, null, 2), 'utf8');
                    } catch (e) {
                        console.error('[QOTD] Failed to save state:', e.message);
                    }
                };

                const pickNextIndex = (questions, state) => {
                    for (let i = 0; i < questions.length; i++) {
                        if (!state.used.includes(i)) return i;
                    }
                    // all used -> reset and pick 0
                    state.used = [];
                    return 0;
                };

                const postIfTime = async () => {
                    try {
                        // Get current date/time in America/New_York
                        const now = new Date();
                        const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(now);
                        const year = parts.find(p => p.type === 'year').value;
                        const month = parts.find(p => p.type === 'month').value;
                        const day = parts.find(p => p.type === 'day').value;
                        const hour = parseInt(parts.find(p => p.type === 'hour').value, 10);
                        const minute = parseInt(parts.find(p => p.type === 'minute').value, 10);
                        const todayStr = `${year}-${month}-${day}`;

                        if (!(hour === 9 && minute === 0)) return; // not 09:00 NY

                        const state = await loadState();
                        if (state.lastPosted === todayStr) return; // already posted today

                        const questions = await loadQuestions();
                        if (!questions.length) {
                            console.log('[QOTD] No questions found, skipping.');
                            return;
                        }

                        const index = pickNextIndex(questions, state);
                        const question = questions[index];

                        // Build embed
                        const embed = new EmbedBuilder()
                            .setTitle('Question of the Day')
                            .setDescription(question)
                            .setColor(PRIMARY_COLOR || '#5865F2')
                            .setTimestamp();

                        const qChannel = client.channels.cache.get(qChannelId) || targetGuild.channels.cache.get(qChannelId);
                        if (!qChannel) {
                            console.error(`[QOTD] QUESTION_CHANNEL ${qChannelId} not found in cache.`);
                            return;
                        }

                        await qChannel.send({ embeds: [embed] });

                        // update state
                        state.used = state.used || [];
                        if (!state.used.includes(index)) state.used.push(index);
                        state.lastPosted = todayStr;
                        state.lastIndex = index;
                        await saveState(state);

                        console.log(`[QOTD] Posted question index ${index} to ${qChannelId}`);
                    } catch (e) {
                        console.error('[QOTD] Error during scheduled check:', e);
                    }
                };

                // Run every 30 seconds to catch the 09:00 minute (uses Intl timezone handling for DST correctness)
                setInterval(postIfTime, 30 * 1000);
                // Also run once at startup in case the bot started exactly at 09:00 NY and should post
                postIfTime();
                console.log('[ready] QOTD scheduler initialized.');
            }
        } else {
            console.log('[ready] Question-of-the-Day disabled in config.');
        }
    }
};
