const fs = require('fs');
const path = require('path');
const { INVITE_DATA_PATH } = require('../config.json');

// Read data from file
const readInviteData = () => {
    try {
        const data = fs.readFileSync(INVITE_DATA_PATH, 'utf-8');
        return JSON.parse(data);
    } catch (e) {
        console.error('[inviteTracker] Error reading invite data:', e);
        return {};
    }
};

// Save data to file
const saveInviteData = (data) => {
    try {
        fs.writeFileSync(INVITE_DATA_PATH, JSON.stringify(data, null, 2), 'utf-8');
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

const initializeInvites = async (client, guild) => {
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


const trackInviteUsage = async (guild, member) => {
    const newInvites = await guild.invites.fetch();
    const inviteData = readInviteData();
    let usedInvite = null;

    // Ensure guild data exists, and a mapping for invited members to prevent double-counting
    inviteData[guild.id] = inviteData[guild.id] || {};
    inviteData[guild.id].invitedMembers = inviteData[guild.id].invitedMembers || {};

    // Check if a reset was run recently (within last hour - 3600000 ms)
    const resetTimestamp = inviteData[guild.id].resetTimestamp;
    const isRecentReset = resetTimestamp && (Date.now() - resetTimestamp) < 3600000; // 1 hour window

    for (const invite of newInvites.values()) {
        const inviterId = invite.inviter?.id;
        if (!inviterId) continue; // skip if no inviter is associated

        inviteData[guild.id][inviterId] = inviteData[guild.id][inviterId] || {
            regular: 0,
            left: 0,
            fake: 0,
            currentUses: 0
        };

        const previousUses = inviteData[guild.id][inviterId].currentUses || 0;

        if (invite.uses > previousUses) {
            usedInvite = invite; // Found the correct invite

            // If this member was already recorded as invited by this inviter, don't increment again
            // UNLESS a reset was recently run, in which case everyone counts as new
            const alreadyRecorded = !!inviteData[guild.id].invitedMembers[member.id];
            const shouldCount = !alreadyRecorded || isRecentReset;

            const isFake = member.user.createdTimestamp > Date.now() - 7 * 24 * 60 * 60 * 1000; // created within 7 days

            if (shouldCount) {
                if (isFake) {
                    inviteData[guild.id][inviterId].fake += 1;
                } else {
                    // If invite.uses jumped by more than 1, account for the delta
                    const delta = invite.uses - previousUses;
                    inviteData[guild.id][inviterId].regular += delta;
                }

                // Record that this member was invited by this inviter to avoid double-counting
                inviteData[guild.id].invitedMembers[member.id] = inviterId;
            }

            // Update currentUses to reflect the latest count
            inviteData[guild.id][inviterId].currentUses = invite.uses;
            break;
        }
    }

    saveInviteData(inviteData);
    return usedInvite;
};

const handleMemberLeave = async (client, member) => {
    const inviteData = readInviteData();

    // Ensure guild data exists
    inviteData[member.guild.id] = inviteData[member.guild.id] || {};
    inviteData[member.guild.id].invitedMembers = inviteData[member.guild.id].invitedMembers || {};

    // If we recorded who invited this member, use that mapping to decrement and remove the record
    const inviterId = inviteData[member.guild.id].invitedMembers[member.id];
    if (inviterId) {
        updateInviteData(member.guild.id, inviterId, 'regular', -1);
        // Remove the mapping so the user can be counted again if they rejoin and are tracked
        delete inviteData[member.guild.id].invitedMembers[member.id];
        console.log(`[inviteTracker] Decreased invite count for inviter ${inviterId} because ${member.user.tag} left.`);
        saveInviteData(inviteData);
        return;
    }

    // Fallback: try to detect from invites if we don't have a mapping
    const newInvites = await member.guild.invites.fetch();
    let leftInvite = null;

    for (const invite of newInvites.values()) {
        const id = invite.inviter?.id;
        if (!id) continue;

        const previousUses = (inviteData[member.guild.id] && inviteData[member.guild.id][id] && inviteData[member.guild.id][id].currentUses) || 0;
        if (invite.uses > previousUses) {
            leftInvite = invite;
            break;
        }
    }

    if (leftInvite) {
        const id = leftInvite.inviter?.id;
        if (id) {
            updateInviteData(member.guild.id, id, 'regular', -1);
            console.log(`[inviteTracker] Decreased invite count for ${leftInvite.inviter?.tag || id}.`);
        }
    }

    saveInviteData(inviteData); // save the updated data
};

module.exports = {
    readInviteData,
    saveInviteData,
    initializeInvites,
    trackInviteUsage,
    handleMemberLeave
}