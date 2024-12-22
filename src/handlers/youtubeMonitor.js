const { google } = require('googleapis');
const axios = require('axios');
const { 
    YOUTUBE_API_KEY, 
    YOUTUBE_CHANNEL_ID, 
} = require('../config.json')

// Store most recently uploaded video ID
let lastVideoId = null

// Fetch latest video from channel
async function fetchLatestVideo() {
    const youtube = google.youtube({
        version: 'v3',
        auth: YOUTUBE_API_KEY,
    });

    try {
        const response = await youtube.search.list({
            channelId: YOUTUBE_CHANNEL_ID,
            part: 'snippet',
            order: 'date',
            maxResults: 1, // fetch latest video
        });

        const video = response.data.items[0];
        if (!video) return null;

        return {
            videoId: video.id.videoId,
            title: video.snippet.title,
            url: `https://www.youtube.com/watch?v=${video.id.videoId}`
        };
    } catch (error) {
        console.error('[youtubeMonitor] Error fetching latest video:', error.message);
        return null;
    }
}

// Monitor channel for new videos
async function monitorChannel(client, channelIdToAlert) {
    const latestVideo = await fetchLatestVideo();
    if (!latestVideo) return;

    if (latestVideo.videoId !== lastVideoId) {
        // update last video ID
        lastVideoId = latestVideo.videoId;

        // get the discord channel to send the alert
        const channel = client.channels.cache.get(channelIdToAlert);
        if(!channel) {
            console.error(`[youtubeMonitor] Discord channel with ID ${channelIdToAlert} not found.`);
            return;
        }

        // send a message to alert channel
        channel.send({
            content: `🎥 **New 3am Clips video uploaded!**\n**${latestVideo.title}**\n${latestVideo.url}`,
        });
    }
}

module.exports = { monitorChannel };