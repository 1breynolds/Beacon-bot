const axios = require('axios');
const { YOUTUBE_API_KEY, YOUTUBE_CHANNEL_ID } = require('../src/config.json');

// Replace with your API key and channel ID
const API_KEY = YOUTUBE_API_KEY;
const CHANNEL_ID = YOUTUBE_CHANNEL_ID;
const BASE_URL = 'https://www.googleapis.com/youtube/v3/search';

// Function to fetch the latest videos from the channel
const fetchLatestVideos = async () => {
    try {
        const response = await axios.get(BASE_URL, {
            params: {
                part: 'snippet',
                channelId: CHANNEL_ID,
                type: 'video',
                order: 'date',
                maxResults: 1,
                key: API_KEY,
            },
        });

        if (response.data.items.length > 0) {
            const video = response.data.items[0];
            const videoTitle = video.snippet.title;
            const videoLink = `https://www.youtube.com/watch?v=${video.id.videoId}`;
            const publishedAt = video.snippet.publishedAt;

            console.log('Latest Video Detected:');
            console.log(`Title: ${videoTitle}`);
            console.log(`Link: ${videoLink}`);
            console.log(`Published At: ${publishedAt}`);
        } else {
            console.log('No videos found for this channel.');
        }
    } catch (error) {
        console.error('Error fetching videos:', error.response ? error.response.data : error.message);
    }
};

// Call the function
fetchLatestVideos();
