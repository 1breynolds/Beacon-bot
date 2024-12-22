const axios = require('axios');

// Replace with your API key and test video ID
const API_KEY = 'AIzaSyBknh6kWwrhw6iQdM0EILuuk-pkEx8D9zU';
const VIDEO_ID = 'dQw4w9WgXcQ'; // Example video ID

async function testYouTubeAPI() {
    try {
        const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${VIDEO_ID}&key=${API_KEY}`;
        const response = await axios.get(url);

        if (response.data.items.length > 0) {
            const videoTitle = response.data.items[0].snippet.title;
            console.log('API Key is working! Video title:', videoTitle);
        } else {
            console.log('No video found. Check your Video ID.');
        }
    } catch (error) {
        console.error('Error with YouTube API:', error.response?.data || error.message);
    }
}

testYouTubeAPI();
