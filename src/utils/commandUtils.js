const fs = require('fs');
const path = require('path');
const { INVITE_DATA_PATH } = require('../config.json');

/**
 * Recursively traverses the directory to load all `.js` files.
 * @param {string} folderPath - The folder to traverse.
 * @returns {string[]} - An array of file paths for `.js` files.
 */
function getCommandFiles(folderPath) {
    let commandFiles = [];
    const files = fs.readdirSync(folderPath);

    files.forEach(file => {
        const filePath = path.join(folderPath, file);
        if (fs.lstatSync(filePath).isDirectory()) {
            // Recursively process subdirectories
            commandFiles = commandFiles.concat(getCommandFiles(filePath));
        } else if (file.endsWith('.js')) {
            // Add .js files to the list
            commandFiles.push(filePath);
        }
    });

    return commandFiles;
}

/**
 * Validates the command module for required properties.
 * @param {object} command - The command module.
 * @param {string} filePath - The file path of the command module.
 * @returns {boolean} - Whether the command is valid.
 */
function validateCommand(command, filePath) {
    if ('data' in command && 'execute' in command) {
        return true;
    } else {
        console.warn(`[WARNING] The command at ${filePath} is missing "data" or "execute" property.`);
        return false;
    }
}

// ========== inviteLeaderboard ==========
/**
 * Read invite data from the inviteData.json file.
 * @returns {Object} The parsed invite data from the JSON file.
 */
const readInviteData = () => {
    try {
        const data = fs.readFileSync(INVITE_DATA_PATH, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading invite data:', error);
        return {};
    }
};

/**
 * Generates the leaderboard data for the top 10 invite leaders.
 * @returns {Array} An array of the top 10 users with their invite counts.
 */
const generateLeaderboard = () => {
    const inviteData = readInviteData();

    const leaderboard = [];
    
    // Loop through each guild and inviter to create leaderboard rows
    for (const guildId in inviteData) {
        const guild = inviteData[guildId];
        for (const inviterId in guild) {
            const inviter = guild[inviterId];
            const totalInvites = inviter.regular + inviter.left + inviter.fake;

            leaderboard.push({
                username: inviterId,
                totalInvites,
                regular: inviter.regular,
                left: inviter.left,
                fake: inviter.fake,
            });
        }
    }

    // Sort the leaderboard based on total invites in descending order
    leaderboard.sort((a, b) => b.totalInvites - a.totalInvites);

    // Get the top 10 users
    const topUsers = leaderboard.slice(0, 10);

    return topUsers;
};

module.exports = {
    getCommandFiles,
    validateCommand,
    generateLeaderboard,
};

