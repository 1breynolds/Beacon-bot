const { getNotifiedVideos, updateNotifiedVideos } = require('../utils/videoUtils');
const { google } = require('googleapis');
const { YOUTUBE_API_KEY, YOUTUBE_CHANNEL_ID } = require('../config.json');

// Fetch latest YouTube video
async function fetchLatestYouTubeVideo() {
    const youtube = google.youtube({
        version: 'v3',
        auth: YOUTUBE_API_KEY,
    });

    try {
        const response = await youtube.search.list({
            channelId: YOUTUBE_CHANNEL_ID,
            part: 'snippet',
            order: 'date',
            maxResults: 1,
        });

        const video = response.data.items[0];
        if (!video) return null;

        return {
            videoId: video.id.videoId,
            title: video.snippet.title,
            url: `https://www.youtube.com/watch?v=${video.id.videoId}`,
        };
    } catch (error) {
        console.error('[youtubeMonitor] Error fetching latest YouTube video:', error.message);
        return null;
    }
}

// Monitor YouTube channel
async function monitorYouTube(client, channelId) {
    const latestVideo = await fetchLatestYouTubeVideo();
    if (!latestVideo) return;

    const notifiedVideos = getNotifiedVideos('youtube');

    if (!notifiedVideos.includes(latestVideo.videoId)) {
        const channel = client.channels.cache.get(channelId);
        if (!channel) {
            console.error(`[youtubeMonitor] Discord channel with ID ${channelId} not found.`);
            return;
        }

        channel.send({
            content: `🎥 **New 3am YouTube video uploaded!**\n${latestVideo.url}`,
        });

        updateNotifiedVideos('youtube', latestVideo.videoId);
    }
}

module.exports = { monitorYouTube };