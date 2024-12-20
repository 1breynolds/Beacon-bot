const fs = require('fs');
const path = require('path');

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

module.exports = {
    getCommandFiles,
    validateCommand,
};
