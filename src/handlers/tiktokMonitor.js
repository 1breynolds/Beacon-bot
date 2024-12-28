const { getNotifiedVideos, updateNotifiedVideos } = require('../utils/videoUtils');
const axios = require('axios');
const cheerio = require('cheerio');
const { TIKTOK_USERNAME } = require('../config.json');

// Fetch latest TikTok video
async function fetchLatestTikTokVideo() {
    try {
        const response = await axios.get(`https://www.tiktok.com/@${TIKTOK_USERNAME}`);
        const $ = cheerio.load(response.data);

        // Find video data
        const latestVideo = $('script')
            .map((i, el) => {
                const scriptContent = $(el).html();
                if (scriptContent && scriptContent.includes('window.__INIT_PROPS__')) {
                    return scriptContent;
                }
            })
            .get(0);

        if (!latestVideo) return null;

        // Parse script content for video data
        const videoData = extractVideoDataFromScript(latestVideo);
        return videoData;

    } catch (error) {
        console.error('[tiktokMonitor] Error fetching latest TikTok video:', error.message);
        return null;
    }
}

// Extract video data from script
function extractVideoDataFromScript(scriptContent) {
    // Look for video data within the __INIT_PROPS__ object
    const videoDataMatch = scriptContent.match(/"itemListData":(\[.*?\])/);
    if (!videoDataMatch) return null;

    const videoList = JSON.parse(videoDataMatch[1]);
    if (videoList.length === 0) return null;

    // Return the first video (latest)
    const latestVideo = videoList[0];
    return {
        videoId: latestVideo.id,
        title: latestVideo.desc || 'New TikTok Video',
        url: `https://www.tiktok.com/@${TIKTOK_USERNAME}/video/${latestVideo.id}`,
    };
}

// Monitor TikTok uploads
async function monitorTikTok(client, channelId) {
    const latestVideo = await fetchLatestTikTokVideo();
    if (!latestVideo) return;

    const notifiedVideos = getNotifiedVideos('tiktok');

    if (!notifiedVideos.includes(latestVideo.videoId)) {
        const channel = client.channels.cache.get(channelId);
        if (!channel) {
            console.error(`[tiktokMonitor] Discord channel with ID ${channelId} not found.`);
            return;
        }

        channel.send({
            content: `📹 **New 3am TikTok video uploaded by @${TIKTOK_USERNAME}!**\n${latestVideo.url}`,
        });

        updateNotifiedVideos('tiktok', latestVideo.videoId);
    }
}

module.exports = { monitorTikTok };
