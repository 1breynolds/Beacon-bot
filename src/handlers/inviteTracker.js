const fs = require('fs');
const path = require('path');
const { INVITE_DATA_PATH } = require('../config.json');

// Path for invite data file
const inviteDataPath = INVITE_DATA_PATH

// Read data from file
module.exports.readInviteData = () => {
    try {
        const data = fs.readFileSync(inviteDataPath, 'utf-8');
        return JSON.parse(data);
    } catch (e) {
        console.error('[inviteTracker] Error reading invite data:', e);
        return {};
    }
};

// Save data to file
module.exports.saveInviteData = (data) => {
    try {
        fs.writeFileSync(inviteDataPath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (e) {
        console.error('[inviteTracker] Error saving invite data:', e);
    }
}

// Update the invite data
const updateInviteData = (guildId, userId, category, count) => {
    const inviteData = readInviteData();

    // Ensure the guild exists
    if (!inviteData[guildId]) {
        inviteData[guildId] = {};
    }

    // Ensure the user exists in the guild
    if (!inviteData[guildId][userId]) {
        inviteData[guildId][userId] = { regular: 0, left: 0, fake: 0 };
    }

    // Update the invite category
    if (inviteData[guildId][userId][category] !== undefined) {
        inviteData[guildId][userId][category] += count; // Add to the current invite count
    } else {
        console.error('[inviteTracker] Invalid category:', category);
        return;
    }

    // Save the updated data
    saveInviteData(inviteData);
};

module.exports.initializeInvites = async (client, guild) => {
    try {
        const invites = await guild.invites.fetch();
        const inviteData = readInviteData();

        invites.forEach(invite => {
            const inviterId = invite.inviter.id; // Correctly define inviterId
            const currentUses = invite.uses || 0; // Define currentUses based on invite.uses

            // Initialize guild data if not present
            inviteData[guild.id] = inviteData[guild.id] || {};

            // Initialize inviter data if not present
            inviteData[guild.id][inviterId] = inviteData[guild.id][inviterId] || {
                regular: 0,
                left: 0,
                fake: 0,
                currentUses: 0
            };

            // Synchronize currentUses and regular
            inviteData[guild.id][inviterId].currentUses = currentUses;

            // If currentUses is greater than regular, update regular to match
            if (inviteData[guild.id][inviterId].regular < currentUses) {
                inviteData[guild.id][inviterId].regular = currentUses;
            }
        });

        // Save the updated invite data to the file
        saveInviteData(inviteData);
    } catch (e) {
        console.error(`Error fetching invites for ${guild.name}: ${e}`);
    }
};


module.exports.trackInviteUsage = async (guild, member) => {
    const newInvites = await guild.invites.fetch();
    const inviteData = readInviteData();

    const isFake = false;
    let usedInvite = null;
    
    for (const invite of newInvites.values()) {
        const inviterId = invite.inviter?.id;
        if (!inviterId) continue; // skip if no inviter is associated
        
        inviteData[guild.id] = inviteData[guild.id] || {};
        inviteData[guild.id][inviterId] = inviteData[guild.id][inviterId] || {
            regular: 0,
            left: 0,
            fake: 0,
            currentUses: 0
        };

        const previousUses = inviteData[guild.id][inviterId].currentUses || 0;

        if (invite.uses > previousUses) {
            usedInvite = invite; // Found the correct invite
            const isFake = member.user.createdTimestamp > Date.now() - 7 * 24 * 60 * 60 * 1000; // Check for fake account (created within 7 days)

            if (isFake) {
                updateInviteData(guild.id, inviterId, 'fake', 1); // Increment fake count
            } else {
                updateInviteData(guild.id, inviterId, 'regular', 1); // Increment regular count
            }

            // Update currentUses to reflect the latest count
            inviteData[guild.id][inviterId].currentUses = invite.uses;
            break;
        }
    }

    saveInviteData(inviteData);
    return usedInvite;
};

module.exports.handleMemberLeave = async (client, member) => {
    const inviteData = readInviteData();
    const newInvites = await member.guild.invites.fetch();
    let leftInvite = null;

    // check which invite was used by the member who left
    for (const invite of newInvites.values()) {
        const previousUses = inviteData[member.guild.id] && inviteData[member.guild.id][invite.inviter.id] || 0;
        if (invite.uses > previousUses) {
            leftInvite = invite;
            break;
        }
    }

    if (leftInvite) {
        const inviterId = leftInvite.inviter.id;
        const currentInviteCount = inviteData[member.guild.id] && inviteData[member.guild.id][inviterId] || 0;
        updateInviteData(member.guild.id, inviter.id, 'regular', -1);
        console.log(`[inviteTracker] Decreased invite count for ${leftInvite.inviter.tag}. New invite count: ${currentInviteCount - 1}`);
    }

    saveInviteData(inviteData); // save the updated data
};