const config = require('../config.json');
const { COLOR_ROLES, ROLE_ADULT, ROLE_OPIUM, ROLE_FEDORA, TICKET_CATEGORY, TICKET_LOG_CHANNEL, CONFESSION_CHANNEL, CONFESSION_LOG_CHANNEL } = config;
const fs = require('fs').promises;
const path = require('path');
const { assignRole } = require('../utils/roleUtils');
const { getRandomColor } = require('../utils/embedUtils');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionFlagsBits, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');

module.exports = {
    name: 'interactionCreate',
    async execute(interaction) {
        // Handle chat input commands
        if (interaction.isChatInputCommand()) {
            const command = interaction.client.commands.get(interaction.commandName);

            if (!command) {
                console.error(`[interactionCreate] No command matching ${interaction.commandName} was found.`);
                return;
            }

            try {
                await command.execute(interaction);
            } catch (error) {
                console.error(`[interactionCreate] Error executing command ${interaction.commandName}:`, error);
                await interaction.reply({
                    content: '[interactionCreate] There was an error while executing this command!',
                    ephemeral: true,
                });
            }
            return;
        }

        // Handle button interactions
        if (interaction.isButton()) {
            const { customId, member } = interaction;

            // check if button corresponds to a color role
            const roleId = COLOR_ROLES[customId];
            if (roleId) {
                const role = member.guild.roles.cache.get(roleId);

                if (member.roles.cache.has(roleId)) {
                    // if the user already has the role, remove it
                    await member.roles.remove(roleId);
                    const removedEmbed = new EmbedBuilder()
                        .setDescription(`Removed **${role ? role.name : customId}**`)
                        .setColor('#54b86f');

                    await interaction.reply({ embeds: [removedEmbed], ephemeral: true });
                } else {
                    // remove other color roles first
                    for (const r of Object.values(COLOR_ROLES)) {
                        if (member.roles.cache.has(r)) {
                            await member.roles.remove(r);
                        }
                    }

                    // add the selected role
                    await member.roles.add(roleId);
                    const addedEmbed = new EmbedBuilder()
                        .setDescription(`Added **${role ? role.name : customId}**`)
                        .setColor('#54b86f');

                    await interaction.reply({ embeds: [addedEmbed], ephemeral: true });
                }
                return;
            }

            // handle adult role button (from role picker)
            if (customId === 'ADULT_ROLE') {
                const adultRoleId = ROLE_ADULT;

                if (!adultRoleId) {
                    await interaction.reply({
                        content: 'Adult role is not configured. Please set `ADULT_ROLE` in config.json.',
                        ephemeral: true,
                    });
                    return;
                }

                try {
                    if (member.roles.cache.has(adultRoleId)) {
                        await member.roles.remove(adultRoleId);
                        const role = member.guild.roles.cache.get(adultRoleId);
                        const removedEmbed = new EmbedBuilder()
                            .setDescription(`Removed **${role ? role.name : 'Adult'}**`)
                            .setColor('#54b86f')

                        await interaction.reply({ embeds: [removedEmbed], ephemeral: true });
                    } else {
                        // use existing helper to add the role (logs any errors)
                        await assignRole(member, adultRoleId);
                        const role = member.guild.roles.cache.get(adultRoleId);
                        const addedEmbed = new EmbedBuilder()
                            .setDescription(`Added **${role ? role.name : 'Adult'}**`)
                            .setColor('#54b86f')

                        await interaction.reply({ embeds: [addedEmbed], ephemeral: true });
                    }
                } catch (err) {
                    console.error('[interactionCreate] Error handling ADULT_ROLE button:', err);
                    await interaction.reply({ content: 'There was an error assigning the Adult role.', ephemeral: true });
                }

                return;
            }

            // handle ticket creation button
            if (customId === 'CREATE_TICKET') {
                try {
                    await interaction.deferReply({ ephemeral: true });
                    const guild = interaction.guild;
                    const user = interaction.user;

                    // Check if user already has an open ticket
                    const existingTicket = guild.channels.cache.find(
                        ch => ch.topic && ch.topic === `ticket:${user.id}`
                    );

                    if (existingTicket) {
                        await interaction.editReply({
                            content: `You already have an open ticket: ${existingTicket}. Please close it before opening a new one.`
                        });
                        return;
                    }

                    // Determine category
                    let category = null;
                    if (TICKET_CATEGORY) category = guild.channels.cache.get(TICKET_CATEGORY);

                    // Build sanitized channel name
                    const baseName = `support-${user.username}`.toLowerCase().replace(/[^a-z0-9-_]/g, '-').replace(/-+/g, '-');
                    let channelName = baseName;
                    let idx = 1;
                    while (guild.channels.cache.find(ch => ch.name === channelName)) {
                        channelName = `${baseName}-${idx++}`;
                    }

                    const overwrites = [
                        { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
                        { id: user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] }
                    ];

                    if (ROLE_OPIUM) overwrites.push({ id: ROLE_OPIUM, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] });
                    if (ROLE_FEDORA) overwrites.push({ id: ROLE_FEDORA, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] });

                    const channel = await guild.channels.create({
                        name: channelName,
                        type: ChannelType.GuildText,
                        parent: category ? category.id : undefined,
                        permissionOverwrites: overwrites,
                        topic: `ticket:${user.id}`
                    });

                    // Create a simple embed with the user's name
                    const ticketEmbed = new EmbedBuilder()
                        .setTitle(`Ticket Created`)
                        .setDescription(`Thanks <@${user.id}> for contacting the support team! 
                            Please explain your case so we can assist you further.`)
                        .setColor(config.PRIMARY_COLOR)
                        .setTimestamp();

                    const row = new ActionRowBuilder().addComponents(
                        new ButtonBuilder()
                            .setCustomId('CLOSE_TICKET')
                            .setLabel('Close Ticket')
                            .setStyle(ButtonStyle.Danger)
                    );

                    // Send mention to staff + embed in the ticket channel
                    const mentions = [];
                    if (ROLE_OPIUM) mentions.push(ROLE_OPIUM);
                    if (ROLE_FEDORA) mentions.push(ROLE_FEDORA);

                    await channel.send({
                        content: `${ROLE_OPIUM ? `<@&${ROLE_OPIUM}>` : ''} ${ROLE_FEDORA ? `<@&${ROLE_FEDORA}>` : ''}`.trim(),
                        embeds: [ticketEmbed],
                        components: [row],
                        allowedMentions: { roles: mentions }
                    });

                    await interaction.editReply({ content: `Ticket created: ${channel}` });
                } catch (err) {
                    console.error('[interactionCreate] Error creating ticket channel:', err);
                    try { await interaction.editReply({ content: 'Failed to create ticket channel. Check logs.' }); } catch (e) {}
                }

                return;
            }

            // handle ticket close button
            if (customId === 'CLOSE_TICKET') {
                try {
                    const channel = interaction.channel;
                    if (!channel || !channel.topic || !channel.topic.startsWith('ticket:')) {
                        await interaction.reply({ content: 'This close button can only be used inside a ticket channel.', ephemeral: true });
                        return;
                    }

                    const ownerId = channel.topic.split(':')[1];
                    const isOwner = interaction.user.id === ownerId;
                    const isStaff = interaction.member.roles.cache.has(ROLE_OPIUM) || interaction.member.roles.cache.has(ROLE_FEDORA);

                    if (!isOwner && !isStaff) {
                        await interaction.reply({ content: 'Only the ticket owner or staff can close this ticket.', ephemeral: true });
                        return;
                    }

                    // Show confirmation embed with buttons
                    const confirmEmbed = new EmbedBuilder()
                        .setTitle('Close Ticket?')
                        .setDescription('Are you sure you want to close this ticket?')
                        .setColor(config.PRIMARY_COLOR);

                    const confirmRow = new ActionRowBuilder().addComponents(
                        new ButtonBuilder()
                            .setCustomId('CONFIRM_CLOSE_TICKET')
                            .setLabel('Yes, Close')
                            .setStyle(ButtonStyle.Danger),
                        new ButtonBuilder()
                            .setCustomId('CANCEL_CLOSE_TICKET')
                            .setLabel('Cancel')
                            .setStyle(ButtonStyle.Secondary)
                    );

                    await interaction.reply({ embeds: [confirmEmbed], components: [confirmRow], ephemeral: true });
                } catch (err) {
                    console.error('[interactionCreate] Error handling close ticket button:', err);
                    try { await interaction.reply({ content: 'Failed to process close request. Check logs.', ephemeral: true }); } catch (e) {}
                }

                return;
            }

            // handle ticket close confirmation
            if (customId === 'CONFIRM_CLOSE_TICKET') {
                try {
                    const isStaff = interaction.member.roles.cache.has(ROLE_OPIUM) || interaction.member.roles.cache.has(ROLE_FEDORA);

                    // If staff, show modal for reason; otherwise close immediately
                    if (isStaff) {
                        const channelName = interaction.channel.name;
                        const modal = new ModalBuilder()
                            .setCustomId('TICKET_CLOSE_REASON')
                            .setTitle(channelName);

                        const reasonInput = new TextInputBuilder()
                            .setCustomId('close_reason')
                            .setLabel('Reason for closing (optional)')
                            .setStyle(TextInputStyle.Paragraph)
                            .setRequired(false)
                            .setMaxLength(1024);

                        modal.addComponents(new ActionRowBuilder().addComponents(reasonInput));
                        await interaction.showModal(modal);
                    } else {
                        // Regular user: close immediately
                        const channel = interaction.channel;
                        await channel.send({ content: `Ticket closed by <@${interaction.user.id}>. Closing...` });
                        await channel.delete(`Closed by ${interaction.user.tag}`);
                        await interaction.reply({ content: 'Ticket closed.', ephemeral: true });
                    }
                } catch (err) {
                    console.error('[interactionCreate] Error confirming close:', err);
                    try {
                        if (!interaction.replied) await interaction.reply({ content: 'Failed to close ticket. Check logs.', ephemeral: true });
                        else await interaction.followUp({ content: 'Failed to close ticket. Check logs.', ephemeral: true });
                    } catch (e) {}
                }

                return;
            }

            // handle cancel close
            if (customId === 'CANCEL_CLOSE_TICKET') {
                await interaction.reply({ content: 'Close cancelled.', ephemeral: true });
                return;
            }

            // Confession submit button - show modal to user
            if (customId === 'CONFESS_SUBMIT') {
                try {
                    const modal = new ModalBuilder()
                        .setCustomId('CONFESS_MODAL')
                        .setTitle('Submit a Confession');

                    const confessionInput = new TextInputBuilder()
                        .setCustomId('confession_text')
                        .setLabel('Your confession (anonymous)')
                        .setStyle(TextInputStyle.Paragraph)
                        .setRequired(true)
                        .setMaxLength(2000);

                    const attachmentInput = new TextInputBuilder()
                        .setCustomId('attachment_link')
                        .setLabel('Attachment link (optional)')
                        .setStyle(TextInputStyle.Short)
                        .setRequired(false)
                        .setMaxLength(500);

                    modal.addComponents(new ActionRowBuilder().addComponents(confessionInput));
                    modal.addComponents(new ActionRowBuilder().addComponents(attachmentInput));
                    await interaction.showModal(modal);
                } catch (err) {
                    console.error('[interactionCreate] Error showing confession modal:', err);
                    try { await interaction.reply({ content: 'Failed to open confession modal.', ephemeral: true }); } catch (e) {}
                }

                return;
            }

            // Confession reply button - open a modal for anyone to post an anonymous reply (thread)
            if (customId === 'CONFESS_REPLY') {
                try {
                    // Include the target message id in the modal customId so we can create a thread and post the reply
                    const targetMessageId = interaction.message ? interaction.message.id : null;
                    const targetChannelId = interaction.channel ? interaction.channel.id : null;
                    // Pass both message id and channel id so we can post back into the same thread/channel
                    const modal = new ModalBuilder()
                        .setCustomId(`CONFESS_REPLY_MODAL:${targetMessageId}:${targetChannelId}`)
                        .setTitle('Reply to Confession (anonymous)');

                    const replyInput = new TextInputBuilder()
                        .setCustomId('reply_text')
                        .setLabel('Your anonymous reply')
                        .setStyle(TextInputStyle.Paragraph)
                        .setRequired(true)
                        .setMaxLength(2000);

                    modal.addComponents(new ActionRowBuilder().addComponents(replyInput));
                    await interaction.showModal(modal);
                } catch (err) {
                    console.error('[interactionCreate] Error showing reply modal:', err);
                    try { await interaction.reply({ content: 'Failed to open reply modal.', ephemeral: true }); } catch (e) {}
                }

                return;
            }

            // Approve confession (from log channel)
            if (customId && customId.startsWith('APPROVE_CONFESSION:')) {
                const isStaff = interaction.member.roles.cache.has(ROLE_OPIUM) || interaction.member.roles.cache.has(ROLE_FEDORA);
                if (!isStaff) {
                    await interaction.reply({ content: 'Only moderators can approve confessions.', ephemeral: true });
                    return;
                }

                // Defer reply to give the bot time to perform posting/editing operations
                try { await interaction.deferReply({ ephemeral: true }); } catch (e) { console.warn('[interactionCreate] Failed to defer approve interaction:', e); }

                let success = false;
                try {
                    const parts = customId.split(':');
                    const msgId = parts[1];
                    const logMsg = interaction.message;
                    const embed = logMsg.embeds && logMsg.embeds[0];
                    const confessionText = embed ? embed.description : null;
                    // try to extract submitter id from fields
                    let submitterId = null;
                    let attachmentLink = null;
                    if (embed && embed.fields) {
                        const submitterField = embed.fields.find(ff => ff.name === 'Submitter' || ff.name === 'User');
                        if (submitterField && submitterField.value) {
                            const m = submitterField.value.match(/(\d{17,19})/);
                            if (m) submitterId = m[1];
                        }
                        const attachmentField = embed.fields.find(ff => ff.name === 'Attachment');
                        if (attachmentField && attachmentField.value) {
                            attachmentLink = attachmentField.value;
                        }
                    }
                    // Also check if the embed has an image (from setImage())
                    if (!attachmentLink && embed && embed.image && embed.image.url) {
                        attachmentLink = embed.image.url;
                    }

                    const targetChannelId = config.CONFESSION_CHANNEL;
                    if (!targetChannelId) {
                        throw new Error('Confession channel not configured');
                    }

                    const targetChannel = interaction.guild.channels.cache.get(targetChannelId) || interaction.client.channels.cache.get(targetChannelId);
                    if (!targetChannel) {
                        throw new Error('Configured confession channel not found');
                    }

                    // Atomically increment confession counter in config and use it to number the confession
                    let confessionNumber = null;
                    let postedMsg = null;
                    try {
                        // Persist confession counter to a data file to avoid modifying watched config.json
                        const statePath = path.resolve(process.cwd(), 'src', 'data', 'confessionState.json');
                        // Read existing state or initialize
                        let state = { CONFESSION_COUNT: 0 };
                        try {
                            const rawState = await fs.readFile(statePath, 'utf8');
                            state = JSON.parse(rawState || '{}');
                        } catch (e) {
                            // file may not exist yet; we'll create it below
                        }

                        state.CONFESSION_COUNT = (state.CONFESSION_COUNT || 0) + 1;
                        await fs.writeFile(statePath, JSON.stringify(state, null, 2), 'utf8');
                        // Use updated count
                        confessionNumber = state.CONFESSION_COUNT;

                        const outEmbed = new EmbedBuilder()
                            .setTitle(`Anonymous Confession #${confessionNumber}`)
                            .setDescription(confessionText || 'No content')
                            .setColor(getRandomColor())

                        if (attachmentLink && attachmentLink.trim()) {
                            // We already validated it's a valid image URL in the modal submission handler
                            outEmbed.setImage(attachmentLink);
                        }

                        // Send the confession and keep the message reference
                        postedMsg = await targetChannel.send({ embeds: [outEmbed] });

                        // Move the CONFESS buttons from the previous message to the newly posted confession
                        try {
                            // Fetch recent messages to find the previous message that contained CONFESS_SUBMIT button
                            const recent = await targetChannel.messages.fetch({ limit: 100 });
                            // Exclude the message we just posted
                            const candidates = recent.filter(m => m.id !== postedMsg.id);
                            let previousWithButtons = null;
                            for (const m of candidates.values()) {
                                if (m.components && m.components.length) {
                                    const hasConfess = m.components.some(row => row.components && row.components.some(c => c.customId === 'CONFESS_SUBMIT' || c.customId === 'CONFESS_REPLY'));
                                    if (hasConfess) { previousWithButtons = m; break; }
                                }
                            }

                            // Build the action row (same as build_confession)
                            const submitBtn = new ButtonBuilder()
                                .setCustomId('CONFESS_SUBMIT')
                                .setLabel('Submit a confession!')
                                .setStyle(ButtonStyle.Primary);
                            const replyBtn = new ButtonBuilder()
                                .setCustomId('CONFESS_REPLY')
                                .setLabel('Reply')
                                .setStyle(ButtonStyle.Secondary);
                            const row = new ActionRowBuilder().addComponents(submitBtn, replyBtn);

                            // Remove buttons from previous message
                            if (previousWithButtons) {
                                try { await previousWithButtons.edit({ components: [] }); } catch (e) { /* ignore */ }
                            }

                            // Attach buttons to the newly posted confession message
                            try { await postedMsg.edit({ components: [row] }); } catch (e) { /* ignore */ }
                        } catch (e) {
                            console.error('[interactionCreate] Failed to move CONFESS buttons to new confession:', e);
                        }
                    } catch (e) {
                        console.error('[interactionCreate] Failed to update CONFESSION_COUNT:', e);
                        const outEmbed = new EmbedBuilder()
                            .setTitle('Confession')
                            .setDescription(confessionText || 'No content')
                            .setColor(getRandomColor())

                        postedMsg = await targetChannel.send({ embeds: [outEmbed] });
                    }

                    // Edit log message to indicate approval and remove buttons. Also add a confirmation embed linking to the posted confession.
                    try {
                        const confLink = postedMsg && postedMsg.url ? postedMsg.url : null;
                        const confirmEmbed = new EmbedBuilder()
                            .setTitle(`Confession Approved #${confessionNumber}`)
                            .setDescription(confessionText || 'No content')
                            .setColor('#54b86f')

                        if (submitterId) confirmEmbed.addFields({ name: 'User', value: `<@${submitterId}>`});
                        if (confLink) confirmEmbed.addFields({ name: 'Posted', value: `[View confession](${confLink})`});

                        await logMsg.edit({ components: [], content: `Approved by <@${interaction.user.id}>`, embeds: [confirmEmbed] });
                    } catch (e) {
                        try { await logMsg.edit({ components: [], content: `Approved by <@${interaction.user.id}>` }); } catch (_) {}
                    }

                    // Notify submitter via DM (if possible)
                    if (submitterId) {
                        try {
                            const user = await interaction.client.users.fetch(submitterId).catch(() => null);
                            if (user) {
                                const dmText = confessionNumber ? `Your confession has been approved and posted as Confession #${confessionNumber}.` : 'Your confession has been approved and posted.';
                                await user.send(dmText);
                            }
                        } catch (e) { console.error('[interactionCreate] Failed to DM submitter on approval:', e); }
                    }

                    success = true;
                    } catch (e) {
                        console.error('[interactionCreate] Error approving confession inner:', e);
                        success = false;
                    } finally {
                    const successMsg = 'Confession approved and posted.';
                    const failMsg = 'Failed to approve confession. Check logs.';
                    try {
                        if (interaction.deferred || interaction.replied) await interaction.editReply({ content: success ? successMsg : failMsg });
                        else await interaction.reply({ content: success ? successMsg : failMsg, ephemeral: true });
                    } catch (e) {
                        console.error('[interactionCreate] Failed to send final approval acknowledgement:', e);
                        try { await interaction.followUp({ content: success ? successMsg : failMsg, ephemeral: true }); } catch (err) { console.error('[interactionCreate] Failed to followUp final approval acknowledgement:', err); }
                    }
                }

                return;
            }

            // Reject confession (from log channel)
            if (customId && customId.startsWith('REJECT_CONFESSION:')) {
                try {
                    const isStaff = interaction.member.roles.cache.has(ROLE_OPIUM) || interaction.member.roles.cache.has(ROLE_FEDORA);
                    if (!isStaff) {
                        await interaction.reply({ content: 'Only moderators can reject confessions.', ephemeral: true });
                        return;
                    }

                    const parts = customId.split(':');
                    const msgId = parts[1];

                    // Validate we actually have a moderation message id to act on
                    if (!msgId) {
                        try { await interaction.reply({ content: 'Cannot open reject modal: missing moderation message id.', ephemeral: true }); } catch (e) {}
                        return;
                    }
                    const modal = new ModalBuilder()
                        .setCustomId(`REJECT_CONFESSION_MODAL:${msgId}`)
                        .setTitle('Reject Confession - Provide reason');

                    const reasonInput = new TextInputBuilder()
                        .setCustomId('reject_reason')
                        .setLabel('Reason for rejection (DM to submitter)')
                        .setStyle(TextInputStyle.Paragraph)
                        .setRequired(true)
                        .setMaxLength(1024);

                    modal.addComponents(new ActionRowBuilder().addComponents(reasonInput));
                    await interaction.showModal(modal);
                } catch (err) {
                    console.error('[interactionCreate] Error opening reject reason modal:', err);
                    try { await interaction.reply({ content: 'Failed to open reject modal.', ephemeral: true }); } catch (e) {}
                }

                return;
            }

            // Approve a previously submitted reply (from log channel)
            if (customId && customId.startsWith('APPROVE_REPLY:')) {
                try {
                    const isStaff = interaction.member.roles.cache.has(ROLE_OPIUM) || interaction.member.roles.cache.has(ROLE_FEDORA);
                    if (!isStaff) {
                        await interaction.reply({ content: 'Only moderators can approve replies.', ephemeral: true });
                        return;
                    }

                    try { await interaction.deferReply({ ephemeral: true }); } catch (e) { console.warn('[interactionCreate] Failed to defer approve-reply interaction:', e); }

                    // Parse customId which may include the raw reply target after a '::' delimiter:
                    // Format: APPROVE_REPLY:<modMessageId>::<replyMessageId:channelId>
                    let msgId = null;
                    let replyToRaw = null;
                    try {
                        const prefix = 'APPROVE_REPLY:';
                        if (customId.startsWith(prefix)) {
                            const rest = customId.slice(prefix.length);
                            if (rest.includes('::')) {
                                const split = rest.split('::');
                                msgId = split[0];
                                replyToRaw = split[1];
                            } else {
                                msgId = rest;
                            }
                        }
                    } catch (e) { /* ignore parse errors - fallback to embed fields below */ }
                    const logMsg = interaction.message;
                    const embed = logMsg.embeds && logMsg.embeds[0];
                    const replyText = embed ? embed.description : null;

                    let submitterId = null;
                    let replyToId = null;
                    let replyToChannelId = null;
                    if (embed && embed.fields) {
                        const s = embed.fields.find(ff => ff.name === 'Submitter' || ff.name === 'User');
                        if (s && s.value) {
                            const m = s.value.match(/(\d{17,19})/);
                            if (m) submitterId = m[1];
                        }
                        // Attempt to read from embed if button didn't include raw target
                        const r = embed.fields.find(ff => ff.name === 'ReplyTo');
                        if (r && r.value) {
                            const v = r.value;
                            if (v.includes(':')) {
                                const partsR = v.split(':');
                                replyToId = partsR[0];
                                replyToChannelId = partsR[1];
                            } else {
                                replyToId = v;
                            }
                        }
                    }

                    // If the button included the raw reply target, prefer that (it preserves exact message:channel)
                    if (!replyToId && replyToRaw) {
                        if (replyToRaw.includes(':')) {
                            const pr = replyToRaw.split(':');
                            replyToId = pr[0];
                            replyToChannelId = pr[1];
                        } else {
                            replyToId = replyToRaw;
                        }
                    }

                    const targetChannelId = config.CONFESSION_CHANNEL;
                    if (!targetChannelId) throw new Error('Confession channel not configured');
                    const targetChannel = interaction.guild.channels.cache.get(targetChannelId) || interaction.client.channels.cache.get(targetChannelId);
                    if (!targetChannel) throw new Error('Configured confession channel not found');

                    // Find the original confession message in the appropriate channel (respect stored channel id)
                    let postedTargetMsg = null;
                    let replyContainerChannel = null;
                    if (replyToChannelId) {
                        // Try to fetch the channel (use fetch to avoid cache misses)
                        replyContainerChannel = await interaction.client.channels.fetch(replyToChannelId).catch(() => null);
                        if (replyContainerChannel) {
                            // Try fetch the message from that channel/thread
                            try {
                                postedTargetMsg = await replyContainerChannel.messages.fetch(replyToId).catch(() => null);
                            } catch (e) {
                                postedTargetMsg = null;
                            }
                        }
                    }
                    // Fallback: try to fetch from the configured confession channel
                    if (!postedTargetMsg && replyToId) {
                        try {
                            postedTargetMsg = await targetChannel.messages.fetch(replyToId).catch(() => null);
                            replyContainerChannel = targetChannel;
                        } catch (e) { postedTargetMsg = null; }
                    }

                    // Determine confession number for thread naming
                    let confessionNumber = null;
                    if (postedTargetMsg && postedTargetMsg.embeds && postedTargetMsg.embeds[0]) {
                        const title = postedTargetMsg.embeds[0].title || '';
                        const match = title.match(/#(\d+)/);
                        if (match) confessionNumber = match[1];
                    }

                    const replyEmbed = new EmbedBuilder()
                        .setTitle('Anonymous Reply')
                        .setDescription(replyText || 'No content')
                        .setColor(getRandomColor())

                    // Post into a thread attached to the confession message (or create/find one)
                    let postedReplyMsg = null;
                    try {
                        let thread = null;

                        // If we already have a channel where the Reply button was pressed, prefer posting there
                        // and avoid creating any new thread. Use .isThread() when available, fall back to type checks.
                        const isThreadChannel = replyContainerChannel && (typeof replyContainerChannel.isThread === 'function' ? replyContainerChannel.isThread() : (
                            replyContainerChannel.type === ChannelType.GuildPublicThread ||
                            replyContainerChannel.type === ChannelType.GuildPrivateThread ||
                            replyContainerChannel.type === ChannelType.GuildNewsThread
                        ));

                        if (isThreadChannel) {
                            postedReplyMsg = await replyContainerChannel.send({ embeds: [replyEmbed] });
                        } else {
                            // Only attempt to start/find/create a thread when we don't already have an existing thread container
                            if (postedTargetMsg) {
                                try {
                                    thread = await postedTargetMsg.startThread({ name: `Confession replies #${confessionNumber}` });
                                } catch (e) {
                                    // If starting a thread failed, try to find an existing one
                                    thread = targetChannel.threads.cache.find(t => t.name && t.name.startsWith(`Confession replies #${confessionNumber}`));
                                }
                            }

                            if (!thread) {
                                try {
                                    thread = await targetChannel.threads.create({ name: `Confession replies #${confessionNumber || Date.now().toString().slice(-6)}`, autoArchiveDuration: 1440 });
                                } catch (e) { thread = null; }
                            }

                            if (thread) {
                                postedReplyMsg = await thread.send({ embeds: [replyEmbed] });
                            } else if (postedTargetMsg) {
                                postedReplyMsg = await postedTargetMsg.reply({ embeds: [replyEmbed] });
                            } else {
                                postedReplyMsg = await targetChannel.send({ embeds: [replyEmbed] });
                            }
                        }

                        // Attach a Reply button to the most recent reply embed in the thread/channel
                        try {
                            const replyBtn = new ButtonBuilder().setCustomId('CONFESS_REPLY').setLabel('Reply').setStyle(ButtonStyle.Secondary);
                            const row = new ActionRowBuilder().addComponents(replyBtn);

                            // Determine the container to search (thread if we posted in a thread, else the channel)
                            const container = postedReplyMsg.channel;

                            const recent = await container.messages.fetch({ limit: 50 });
                            const candidates = recent.filter(m => m.id !== postedReplyMsg.id);
                            let previousWithButtons = null;
                            for (const m of candidates.values()) {
                                if (m.components && m.components.length) {
                                    const hasReply = m.components.some(r => r.components && r.components.some(c => c.customId === 'CONFESS_REPLY'));
                                    if (hasReply) { previousWithButtons = m; break; }
                                }
                            }

                            if (previousWithButtons) {
                                try { await previousWithButtons.edit({ components: [] }); } catch (e) { /* ignore */ }
                            }

                            try { await postedReplyMsg.edit({ components: [row] }); } catch (e) { /* ignore */ }
                        } catch (e) {
                            console.error('[interactionCreate] Failed to attach reply button to approved reply:', e);
                        }
                    } catch (e) {
                        console.error('[interactionCreate] Failed to post approved reply:', e);
                    }

                    // Edit log message to indicate approval and remove buttons
                    try {
                        const confLink = postedReplyMsg && postedReplyMsg.url ? postedReplyMsg.url : null;
                        const confirmEmbed = new EmbedBuilder()
                            .setTitle('Reply Approved')
                            .setDescription(replyText || 'No content')
                            .setColor('#54b86f');

                        if (submitterId) confirmEmbed.addFields({ name: 'User', value: `<@${submitterId}>` });
                        if (confLink) confirmEmbed.addFields({ name: 'Posted', value: `[View reply](${confLink})` });

                        await logMsg.edit({ components: [], content: `Reply approved by <@${interaction.user.id}>`, embeds: [confirmEmbed] });
                    } catch (e) {
                        try { await logMsg.edit({ components: [], content: `Reply approved by <@${interaction.user.id}>` }); } catch (_) {}
                    }

                    // DM submitter if possible
                    if (submitterId) {
                        try {
                            const user = await interaction.client.users.fetch(submitterId).catch(() => null);
                            if (user) await user.send('Your anonymous reply has been approved and posted.');
                        } catch (e) { console.error('[interactionCreate] Failed to DM reply submitter on approval:', e); }
                    }

                    try { if (interaction.deferred || interaction.replied) await interaction.editReply({ content: 'Reply approved and posted.' }); else await interaction.reply({ content: 'Reply approved and posted.', ephemeral: true }); } catch (e) { try { await interaction.followUp({ content: 'Reply approved and posted.', ephemeral: true }); } catch (_) {} }
                } catch (err) {
                    console.error('[interactionCreate] Error approving reply:', err);
                    try { if (interaction.deferred || interaction.replied) await interaction.editReply({ content: 'Failed to approve reply. Check logs.' }); else await interaction.reply({ content: 'Failed to approve reply. Check logs.', ephemeral: true }); } catch (e) {}
                }

                return;
            }

            // Immediate reject (no reason) for replies
            if (customId && customId.startsWith('REJECT_REPLY_NOW:')) {
                try {
                    const isStaff = interaction.member.roles.cache.has(ROLE_OPIUM) || interaction.member.roles.cache.has(ROLE_FEDORA);
                    if (!isStaff) {
                        await interaction.reply({ content: 'Only moderators can reject replies.', ephemeral: true });
                        return;
                    }

                    // customId may be REJECT_REPLY_NOW:<modMsgId>::<rawReplyTo>
                    const parts = customId.split(':');
                    const msgId = parts[1];

                    if (!msgId) { try { await interaction.reply({ content: 'Missing moderation message id.', ephemeral: true }); } catch (e) {} return; }

                    const logChannelId = config.CONFESSION_LOG_CHANNEL;
                    if (!logChannelId) {
                        await interaction.reply({ content: 'Confession log channel not configured.', ephemeral: true });
                        return;
                    }

                    const logChannel = interaction.guild.channels.cache.get(logChannelId) || interaction.client.channels.cache.get(logChannelId);
                    if (!logChannel) {
                        await interaction.reply({ content: 'Confession log channel not found.', ephemeral: true });
                        return;
                    }

                    const logMsg = await logChannel.messages.fetch(msgId).catch(() => null);
                    if (!logMsg) {
                        await interaction.reply({ content: 'Moderation message not found in log channel.', ephemeral: true });
                        return;
                    }

                    const embed = logMsg.embeds && logMsg.embeds[0];
                    let submitterId = null;
                    if (embed && embed.fields) {
                        const f = embed.fields.find(ff => ff.name === 'Submitter' || ff.name === 'User');
                        if (f && f.value) {
                            const m = f.value.match(/(\d{17,19})/);
                            if (m) submitterId = m[1];
                        }
                    }

                    // Edit log message to indicate rejection and remove buttons
                    await logMsg.edit({ components: [], content: `Reply rejected by <@${interaction.user.id}>` });

                    // DM submitter a generic rejection (if possible)
                    if (submitterId) {
                        try {
                            const user = await interaction.client.users.fetch(submitterId).catch(() => null);
                            if (user) await user.send('Your anonymous reply was rejected by the moderation team.');
                        } catch (e) { console.error('[interactionCreate] Failed to DM reply submitter with rejection notice:', e); }
                    }

                    await interaction.reply({ content: 'Rejection sent and logged.', ephemeral: true });
                } catch (err) {
                    console.error('[interactionCreate] Error handling REJECT_REPLY_NOW:', err);
                    try { await interaction.reply({ content: 'Failed to reject reply. Check logs.', ephemeral: true }); } catch (e) {}
                }

                return;
            }

            // Reject a previously submitted reply (open modal for reason)
            if (customId && customId.startsWith('REJECT_REPLY:')) {
                try {
                    const isStaff = interaction.member.roles.cache.has(ROLE_OPIUM) || interaction.member.roles.cache.has(ROLE_FEDORA);
                    if (!isStaff) {
                        await interaction.reply({ content: 'Only moderators can reject replies.', ephemeral: true });
                        return;
                    }

                    const parts = customId.split(':');
                    const msgId = parts[1];
                    if (!msgId) { try { await interaction.reply({ content: 'Cannot open reject modal: missing moderation message id.', ephemeral: true }); } catch (e) {} return; }

                    const modal = new ModalBuilder().setCustomId(`REJECT_REPLY_MODAL:${msgId}`).setTitle('Reject Reply - Provide reason');
                    const reasonInput = new TextInputBuilder().setCustomId('reject_reason').setLabel('Reason for rejection (DM to submitter)').setStyle(TextInputStyle.Paragraph).setRequired(true).setMaxLength(1024);
                    modal.addComponents(new ActionRowBuilder().addComponents(reasonInput));
                    await interaction.showModal(modal);
                } catch (err) {
                    console.error('[interactionCreate] Error opening reject-reply modal:', err);
                    try { await interaction.reply({ content: 'Failed to open reject modal.', ephemeral: true }); } catch (e) {}
                }

                return;
            }

            // Immediate reject (no reason) for confessions
            if (customId && customId.startsWith('REJECT_CONFESSION_NOW:')) {
                try {
                    const isStaff = interaction.member.roles.cache.has(ROLE_OPIUM) || interaction.member.roles.cache.has(ROLE_FEDORA);
                    if (!isStaff) {
                        await interaction.reply({ content: 'Only moderators can reject confessions.', ephemeral: true });
                        return;
                    }

                    const parts = customId.split(':');
                    const msgId = parts[1];

                    if (!msgId) { try { await interaction.reply({ content: 'Missing moderation message id.', ephemeral: true }); } catch (e) {} return; }

                    const logChannelId = config.CONFESSION_LOG_CHANNEL;
                    if (!logChannelId) {
                        await interaction.reply({ content: 'Confession log channel not configured.', ephemeral: true });
                        return;
                    }

                    const logChannel = interaction.guild.channels.cache.get(logChannelId) || interaction.client.channels.cache.get(logChannelId);
                    if (!logChannel) {
                        await interaction.reply({ content: 'Confession log channel not found.', ephemeral: true });
                        return;
                    }

                    const logMsg = await logChannel.messages.fetch(msgId).catch(() => null);
                    if (!logMsg) {
                        await interaction.reply({ content: 'Moderation message not found in log channel.', ephemeral: true });
                        return;
                    }

                    const embed = logMsg.embeds && logMsg.embeds[0];
                    let submitterId = null;
                    if (embed && embed.fields) {
                        const f = embed.fields.find(ff => ff.name === 'Submitter' || ff.name === 'User');
                        if (f && f.value) {
                            const m = f.value.match(/(\d{17,19})/);
                            if (m) submitterId = m[1];
                        }
                    }

                    // Edit log message to indicate rejection and remove buttons
                    await logMsg.edit({ components: [], content: `Rejected by <@${interaction.user.id}>` });

                    // DM submitter a generic rejection (if possible)
                    if (submitterId) {
                        try {
                            const user = await interaction.client.users.fetch(submitterId).catch(() => null);
                            if (user) await user.send('Your confession was rejected by the moderation team.');
                        } catch (e) { console.error('[interactionCreate] Failed to DM submitter with rejection notice:', e); }
                    }

                    await interaction.reply({ content: 'Rejection sent and logged.', ephemeral: true });
                } catch (err) {
                    console.error('[interactionCreate] Error handling REJECT_CONFESSION_NOW:', err);
                    try { await interaction.reply({ content: 'Failed to reject confession. Check logs.', ephemeral: true }); } catch (e) {}
                }

                return;
            }

            console.warn(`[interactionCreate] Unhandled button interaction with ID: ${customId}`);
            return;
        }

        // Handle modal submissions
        if (interaction.isModalSubmit()) {
            const { customId } = interaction;

            if (customId === 'TICKET_CLOSE_REASON') {
                try {
                    const reason = interaction.fields.getTextInputValue('close_reason') || 'No reason provided';
                    const channel = interaction.channel;
                    const channelName = channel.name;
                    const userId = channel.topic.split(':')[1];
                    const closedBy = interaction.user.tag;

                    // Reply to the modal interaction FIRST before any channel operations
                    await interaction.reply({ content: 'Ticket closed and logged.', ephemeral: true });

                    // Send closing message to channel
                    await channel.send({ content: `Ticket closed by <@${interaction.user.id}>\nReason: ${reason}\nClosing...` });

                    // Log to ticket log channel if configured
                    if (TICKET_LOG_CHANNEL) {
                        const logChannel = interaction.guild.channels.cache.get(TICKET_LOG_CHANNEL);
                        if (logChannel) {
                            const logEmbed = new EmbedBuilder()
                                .setTitle('Ticket Closed')
                                .setDescription(`**Channel:** ${channelName}\n**User:** <@${userId}>\n**Closed By:** ${closedBy}\n**Reason:** ${reason}`)
                                .setColor('#54b86f')
                                .setTimestamp();

                            await logChannel.send({ embeds: [logEmbed] });
                        }
                    }

                    // Delete the channel
                    await channel.delete(`Closed by ${closedBy}`);
                } catch (err) {
                    console.error('[interactionCreate] Error handling ticket close reason modal:', err);
                    try {
                        if (!interaction.replied) await interaction.reply({ content: 'Failed to close ticket. Check logs.', ephemeral: true });
                        else await interaction.followUp({ content: 'Failed to close ticket. Check logs.', ephemeral: true });
                    } catch (e) {}
                }

                return;
            }

            // Handle confession modal submit
            if (customId === 'CONFESS_MODAL') {
                try {
                    const confession = interaction.fields.getTextInputValue('confession_text') || '';
                    if (!confession.trim()) {
                        await interaction.reply({ content: 'Confession cannot be empty.', ephemeral: true });
                        return;
                    }
                    const attachmentLink = interaction.fields.getTextInputValue('attachment_link') || null;

                    // Validate attachment link if provided
                    if (attachmentLink && attachmentLink.trim()) {
                        const isImageUrl = /\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/i.test(attachmentLink);
                        if (!isImageUrl) {
                            await interaction.reply({ 
                                content: 'Invalid attachment format. Please provide a direct link to an image or GIF (.jpg, .jpeg, .png, .gif, .webp, .svg).', 
                                ephemeral: true 
                            });
                            return;
                        }
                    }

                    const logChannelId = config.CONFESSION_LOG_CHANNEL;
                    if (!logChannelId) {
                        await interaction.reply({ content: 'Confession log channel is not configured. Ask an admin to run /build_confession with a log channel.', ephemeral: true });
                        return;
                    }

                    const logChannel = interaction.guild.channels.cache.get(logChannelId) || interaction.client.channels.cache.get(logChannelId);
                    if (!logChannel) {
                        await interaction.reply({ content: 'Configured confession log channel not found.', ephemeral: true });
                        return;
                    }

                    // Build moderation embed (includes submitter id visible to mods)
                    const modEmbed = new EmbedBuilder()
                        .setTitle('New Confession Submission')
                        .setDescription(confession)
                        .addFields({ name: 'User', value: `<@${interaction.user.id}> (${interaction.user.id})` })
                        .setColor('#f1c40f')
                    
                    if (attachmentLink && attachmentLink.trim()) {
                        modEmbed.setImage(attachmentLink);
                    }

                    // Send to log channel with approve/deny buttons so moderators can act immediately
                    // We'll include the message id placeholder in the customId after sending, so build buttons now and then replace with proper ids.
                    const tempApprove = new ButtonBuilder().setCustomId('APPROVE_CONF_NONE').setLabel('Approve').setStyle(ButtonStyle.Success);
                    const tempDeny = new ButtonBuilder().setCustomId('REJECT_CONF_NONE').setLabel('Deny (with reason)').setStyle(ButtonStyle.Danger);
                    const tempRow = new ActionRowBuilder().addComponents(tempApprove, tempDeny);

                    const sent = await logChannel.send({ embeds: [modEmbed], components: [tempRow] });

                    // Now replace the placeholder customIds with ones that include the sent message id
                    const approveBtn = new ButtonBuilder().setCustomId(`APPROVE_CONFESSION:${sent.id}`).setLabel('Approve').setStyle(ButtonStyle.Success);
                    const denyWithReasonBtn = new ButtonBuilder().setCustomId(`REJECT_CONFESSION:${sent.id}`).setLabel('Deny (with reason)').setStyle(ButtonStyle.Danger);
                    const denyBtn = new ButtonBuilder().setCustomId(`REJECT_CONFESSION_NOW:${sent.id}`).setLabel('Deny').setStyle(ButtonStyle.Danger);
                    const row = new ActionRowBuilder().addComponents(approveBtn, denyWithReasonBtn, denyBtn);
                    await sent.edit({ components: [row] });

                    await interaction.reply({ content: 'Your confession was submitted for moderation. Thank you.', ephemeral: true });
                } catch (err) {
                    console.error('[interactionCreate] Error handling CONFESS_MODAL:', err);
                    try { await interaction.reply({ content: 'Failed to submit confession. Check logs.', ephemeral: true }); } catch (e) {}
                }

                return;
            }

            // Handle confession reply modal: send reply to moderation for approval
            if (customId.startsWith('CONFESS_REPLY_MODAL:')) {
                try {
                    const replyText = interaction.fields.getTextInputValue('reply_text') || '';
                    if (!replyText.trim()) {
                        await interaction.reply({ content: 'Reply cannot be empty.', ephemeral: true });
                        return;
                    }

                    // extract target message id and channel id (the message being replied to)
                    const parts = customId.split(':');
                    const targetMessageId = parts[1];
                    // Prefer channel id passed in the modal customId, otherwise fall back to the interaction's channel
                    let targetChannelId = parts[2] || null;
                    if (!targetChannelId && interaction.channel) targetChannelId = interaction.channel.id;

                    const logChannelId = config.CONFESSION_LOG_CHANNEL;
                    if (!logChannelId) {
                        await interaction.reply({ content: 'Confession log channel is not configured. Ask an admin to run /build_confession with a log channel.', ephemeral: true });
                        return;
                    }

                    const logChannel = interaction.guild.channels.cache.get(logChannelId) || interaction.client.channels.cache.get(logChannelId);
                    if (!logChannel) {
                        await interaction.reply({ content: 'Configured confession log channel not found.', ephemeral: true });
                        return;
                    }

                    // Build moderation embed for the reply
                    const guildId = interaction.guild ? interaction.guild.id : null;
                    const channelForLink = targetChannelId || config.CONFESSION_CHANNEL || (interaction.channel ? interaction.channel.id : null);
                    let messageLink = null;
                    if (guildId && channelForLink && targetMessageId) {
                        messageLink = `https://discord.com/channels/${guildId}/${channelForLink}/${targetMessageId}`;
                    }

                    // Store raw ids in ReplyTo (messageId:channelId) so the approve handler can fetch the exact channel/thread.
                    // Also include a friendly clickable link in a separate field for moderator convenience.
                    const rawReplyTo = `${targetMessageId || 'unknown'}:${channelForLink || 'unknown'}`;

                    const modEmbed = new EmbedBuilder()
                        .setTitle('New Confession Reply Submission')
                        .setDescription(replyText)
                        .addFields(
                            { name: 'Reply to', value: messageLink || 'N/A' }
                        )
                        .addFields({ name: 'User', value: `<@${interaction.user.id}> (${interaction.user.id})` })
                        .setColor('#f1c40f');

                    const tempApprove = new ButtonBuilder().setCustomId('APPROVE_REPLY_NONE').setLabel('Approve Reply').setStyle(ButtonStyle.Success);
                    const tempDeny = new ButtonBuilder().setCustomId('REJECT_REPLY_NONE').setLabel('Deny Reply').setStyle(ButtonStyle.Danger);
                    const tempRow = new ActionRowBuilder().addComponents(tempApprove, tempDeny);

                    const sent = await logChannel.send({ embeds: [modEmbed], components: [tempRow] });

                    // Replace placeholder customIds with ones that include the sent message id
                    // Include the raw reply target (messageId:channelId) in the button customId after a '::' delimiter
                    const approveBtn = new ButtonBuilder().setCustomId(`APPROVE_REPLY:${sent.id}::${rawReplyTo}`).setLabel('Approve Reply').setStyle(ButtonStyle.Success);
                    const denyWithReasonBtn = new ButtonBuilder().setCustomId(`REJECT_REPLY:${sent.id}::${rawReplyTo}`).setLabel('Deny (with reason)').setStyle(ButtonStyle.Danger);
                    const denyBtn = new ButtonBuilder().setCustomId(`REJECT_REPLY_NOW:${sent.id}::${rawReplyTo}`).setLabel('Deny').setStyle(ButtonStyle.Secondary);
                    const row = new ActionRowBuilder().addComponents(approveBtn, denyWithReasonBtn, denyBtn);
                    await sent.edit({ components: [row] });

                    await interaction.reply({ content: 'Your anonymous reply was submitted for moderation. Thank you.', ephemeral: true });
                } catch (err) {
                    console.error('[interactionCreate] Error handling CONFESS_REPLY_MODAL (to moderation):', err);
                    try { await interaction.reply({ content: 'Failed to submit reply for moderation. Check logs.', ephemeral: true }); } catch (e) {}
                }

                return;
            }

            // Handle reject-with-reason modal
            if (customId.startsWith('REJECT_CONFESSION_MODAL:')) {
                try {
                    const parts = customId.split(':');
                    const msgId = parts[1];
                    const reason = interaction.fields.getTextInputValue('reject_reason') || 'No reason provided';

                    const logChannelId = config.CONFESSION_LOG_CHANNEL;
                    if (!logChannelId) {
                        await interaction.reply({ content: 'Confession log channel not configured.', ephemeral: true });
                        return;
                    }

                    const logChannel = interaction.guild.channels.cache.get(logChannelId) || interaction.client.channels.cache.get(logChannelId);
                    if (!logChannel) {
                        await interaction.reply({ content: 'Confession log channel not found.', ephemeral: true });
                        return;
                    }

                    const logMsg = await logChannel.messages.fetch(msgId).catch(() => null);
                    if (!logMsg) {
                        await interaction.reply({ content: 'Moderation message not found in log channel.', ephemeral: true });
                        return;
                    }

                    const embed = logMsg.embeds && logMsg.embeds[0];
                    let submitterId = null;
                    if (embed && embed.fields) {
                        const f = embed.fields.find(ff => ff.name === 'Submitter' || ff.name === 'User');
                        if (f && f.value) {
                            const m = f.value.match(/(\d{17,19})/);
                            if (m) submitterId = m[1];
                        }
                    }

                    // Edit log message to indicate rejection with reason and remove buttons
                    await logMsg.edit({ components: [], content: `Rejected by <@${interaction.user.id}> — Reason: ${reason}` });

                    // DM submitter the reason (if possible)
                    if (submitterId) {
                        try {
                            const user = await interaction.client.users.fetch(submitterId).catch(() => null);
                            if (user) await user.send(`Your confession was rejected by the moderation team. Reason: ${reason}`);
                        } catch (e) { console.error('[interactionCreate] Failed to DM submitter with rejection reason:', e); }
                    }

                    await interaction.reply({ content: 'Rejection sent and logged.', ephemeral: true });
                } catch (err) {
                    console.error('[interactionCreate] Error handling REJECT_CONFESSION_MODAL:', err);
                    try { await interaction.reply({ content: 'Failed to process rejection. Check logs.', ephemeral: true }); } catch (e) {}
                }

                return;
            }

            // Handle reject-with-reason modal for replies
            if (customId.startsWith('REJECT_REPLY_MODAL:')) {
                try {
                    const parts = customId.split(':');
                    const msgId = parts[1];
                    const reason = interaction.fields.getTextInputValue('reject_reason') || 'No reason provided';

                    const logChannelId = config.CONFESSION_LOG_CHANNEL;
                    if (!logChannelId) {
                        await interaction.reply({ content: 'Confession log channel not configured.', ephemeral: true });
                        return;
                    }

                    const logChannel = interaction.guild.channels.cache.get(logChannelId) || interaction.client.channels.cache.get(logChannelId);
                    if (!logChannel) {
                        await interaction.reply({ content: 'Confession log channel not found.', ephemeral: true });
                        return;
                    }

                    const logMsg = await logChannel.messages.fetch(msgId).catch(() => null);
                    if (!logMsg) {
                        await interaction.reply({ content: 'Moderation message not found in log channel.', ephemeral: true });
                        return;
                    }

                    const embed = logMsg.embeds && logMsg.embeds[0];
                    let submitterId = null;
                    if (embed && embed.fields) {
                        const f = embed.fields.find(ff => ff.name === 'Submitter' || ff.name === 'User');
                        if (f && f.value) {
                            const m = f.value.match(/(\d{17,19})/);
                            if (m) submitterId = m[1];
                        }
                    }

                    // Edit log message to indicate rejection with reason and remove buttons
                    await logMsg.edit({ components: [], content: `Reply rejected by <@${interaction.user.id}> — Reason: ${reason}` });

                    // DM submitter the reason (if possible)
                    if (submitterId) {
                        try {
                            const user = await interaction.client.users.fetch(submitterId).catch(() => null);
                            if (user) await user.send(`Your anonymous reply was rejected by the moderation team. Reason: ${reason}`);
                        } catch (e) { console.error('[interactionCreate] Failed to DM reply submitter with rejection reason:', e); }
                    }

                    await interaction.reply({ content: 'Rejection sent and logged.', ephemeral: true });
                } catch (err) {
                    console.error('[interactionCreate] Error handling REJECT_REPLY_MODAL:', err);
                    try { await interaction.reply({ content: 'Failed to process rejection. Check logs.', ephemeral: true }); } catch (e) {}
                }

                return;
            }
        }
    },
};
