const config = require('../config.json');
const { COLOR_ROLES, ROLE_ADULT, ROLE_OPIUM, ROLE_FEDORA, TICKET_CATEGORY, TICKET_LOG_CHANNEL } = config;
const { assignRole } = require('../utils/roleUtils');
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
        }
    },
};
