const { MEMBER_COUNT_CHANNEL } = require('../config.json');

module.exports.updateServerCountChannel = async (guild) => {
    if (!MEMBER_COUNT_CHANNEL) {
        console.error(`[serverCountHandler] No server count channel ID found in config.`);
        return;
    }

    try {
        // fetch channel
        const channel = await guild.channels.fetch(MEMBER_COUNT_CHANNEL);

        // check is channel exists / is text channel
        if (!channel || channel.type !== 2) {
            console.error(`[serverCountHandler] Server count channel not found or is not a voice channel.`);
            return;
        }

        // update channel name to reflect current member count
        const memberCount = guild.memberCount;
        await channel.setName(`puppies: ${memberCount}`);

        console.log(`[serverCountHandler] Server count updated.`);
    } catch (error) {
        console.error('[serverCountHandler] Error updating server count:', error);
    }
};
