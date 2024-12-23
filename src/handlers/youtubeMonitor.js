const { google } = require('googleapis');
const axios = require('axios');
const { 
    YOUTUBE_API_KEY, 
    YOUTUBE_CHANNEL_ID, 
} = require('../config.json');
const notifiedVideosPath = '../data/notifiedVideos.json';

// Store most recently uploaded video ID
let lastVideoId = null

// Read list of notified videos from JSON file
const readNotifiedVideos = () => {
    try {
        const data = FileSystem.readFileSync(notifiedVideosPath, 'utf-8');
        return JSON.parse(data).notifiedVideos;
    } catch (e) {
        console.error('[youtubeMonitor] Error reading notified videos:', e);
    }
};

// Save the updated list of notified videos to the JSON file
const saveNotifiedVideos = (notifiedVideos) => {
    try {
        fs.writeFileSync(notifiedVideosPath, JSON.stringify({ notifiedVideos }, null, 2), 'utf-8');
    } catch (e) {
        console.error('[youtubeMonitor] Error saving notified videos:', e);
    }
};

// Check if the video has already been notified
const hasBeenNotified = (videoId) => {
    const notifiedVideos = readNotifiedVideos();
    return notifiedVideos.includes(videoId);
};

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

    if (!hasBeenNotified(latestVideo.videoId)) {
        // Send a message to the alert channel
        const channel = client.channels.cache.get(channelIdToAlert);
        if (!channel) {
            console.error(`[youtubeMonitor] Discord channel with ID ${channelIdToAlert} not found.`);
            return;
        }

        // Send a message to the Discord channel
        channel.send({
            content: `🎥 **New 3am Clips video uploaded!**\n${latestVideo.url}`,
        });

        // Update the list of notified videos
        const notifiedVideos = readNotifiedVideos();
        notifiedVideos.push(latestVideo.videoId);
        saveNotifiedVideos(notifiedVideos);
    } else {
        console.log('[youtubeMonitor] Video already notified:', latestVideo.title);
    }
}

module.exports = { monitorChannel };