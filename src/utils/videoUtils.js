const fs = require('fs');
const { NOTI_VIDEOS_PATH } = require('../config.json');

// Read the notified videos JSON file
const readNotifiedVideos = () => {
    try {
        const data = fs.readFileSync(NOTI_VIDEOS_PATH, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        console.error('[notifiedVideos] Error reading JSON file:', error);
        return { youtube: { notifiedVideos: [] }, tiktok: { notifiedVideos: [] } };
    }
};

// Save the notified videos JSON file
const saveNotifiedVideos = (data) => {
    try {
        fs.writeFileSync(NOTI_VIDEOS_PATH, JSON.stringify(data, null, 2), 'utf-8');
    } catch (error) {
        console.error('[notifiedVideos] Error saving JSON file:', error);
    }
};

// Fetch notified videos for a specific platform
const getNotifiedVideos = (platform) => {
    const data = readNotifiedVideos();
    return data[platform]?.notifiedVideos || [];
};

// Update notified videos for a specific platform
const updateNotifiedVideos = (platform, videoId) => {
    const data = readNotifiedVideos();
    if (!data[platform]) data[platform] = { notifiedVideos: [] };

    if (!data[platform].notifiedVideos.includes(videoId)) {
        data[platform].notifiedVideos.push(videoId);
        saveNotifiedVideos(data);
    }
};

module.exports = { getNotifiedVideos, updateNotifiedVideos };