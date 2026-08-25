import {
    SlashCommandBuilder,
    AttachmentBuilder,
    PermissionFlagsBits
} from 'discord.js';

const OWNER_ID = '1054967242497982476';

export default {
    data: new SlashCommandBuilder()
        .setName('send')
        .setDescription('Send a message, file, image, video, GIF, or sticker')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)

        // ==========================================
        // TARGET SERVER (Optional)
        // ==========================================
        .addStringOption(option =>
            option
                .setName('server_id')
                .setDescription('Target server ID (leave empty for current server)')
                .setRequired(false)
        )

        // ==========================================
        // TARGET CHANNEL (Optional)
        // ==========================================
        .addStringOption(option =>
            option
                .setName('channel_id')
                .setDescription('Target channel ID (leave empty for current channel)')
                .setRequired(false)
        )

        // ==========================================
        // NORMAL MESSAGE (Optional)
        // ==========================================
        .addStringOption(option =>
            option
                .setName('message')
                .setDescription('Normal message to send')
                .setRequired(false)
        )

        // ==========================================
        // FILE UPLOAD (Optional)
        // ==========================================
        .addAttachmentOption(option =>
            option
                .setName('file')
                .setDescription('Upload an image, GIF, video, or other file')
                .setRequired(false)
        )

        // ==========================================
        // STICKER (Optional)
        // ==========================================
        .addStringOption(option =>
            option
                .setName('sticker_id')
                .setDescription('Sticker ID to send')
                .setRequired(false)
        ),

    async execute(interaction) {
        try {
            // ==========================================
            // GET OPTIONS
            // ==========================================
            const serverId = interaction.options.getString('server_id');
            const channelId = interaction.options.getString('channel_id');
            const message = interaction.options.getString('message');
            const file = interaction.options.getAttachment('file');
            const stickerId = interaction.options.getString('sticker_id');

            // ==========================================
            // CHECK IF SOMETHING WAS PROVIDED
            // ==========================================
            if (!message && !file && !stickerId) {
                return interaction.reply({
                    content: '❌ Please provide a message, file, or sticker to send.',
                    ephemeral: true
                });
            }

            // ==========================================
            // DETERMINE TARGET SERVER
            // ==========================================
            let targetGuild;

            if (serverId) {
                targetGuild = interaction.client.guilds.cache.get(serverId);
                if (!targetGuild) {
                    return interaction.reply({
                        content: '❌ I am not in that server, or the Server ID is incorrect.',
                        ephemeral: true
                    });
                }
            } else {
                if (!interaction.guild) {
                    return interaction.reply({
                        content: '❌ You must provide a server_id when using this command in DMs.',
                        ephemeral: true
                    });
                }
                targetGuild = interaction.guild;
            }

            // ==========================================
            // PERMISSION CHECK (Owner or Server Owner)
            // ==========================================
            const isBotOwner = interaction.user.id === OWNER_ID;
            const isTargetServerOwner = interaction.user.id === targetGuild.ownerId;

            if (!isBotOwner && !isTargetServerOwner) {
                return interaction.reply({
                    content: '❌ Only the bot owner or this server\'s owner can use this command.',
                    ephemeral: true
                });
            }

            // ==========================================
            // DETERMINE TARGET CHANNEL
            // ==========================================
            let targetChannel;

            if (channelId) {
                targetChannel = await targetGuild.channels.fetch(channelId).catch(() => null);
                if (!targetChannel) {
                    return interaction.reply({
                        content: '❌ Channel not found in that server.',
                        ephemeral: true
                    });
                }
            } else {
                if (!interaction.channel) {
                    return interaction.reply({
                        content: '❌ Could not determine the current channel.',
                        ephemeral: true
                    });
                }
                if (!interaction.guild || interaction.guild.id !== targetGuild.id) {
                    return interaction.reply({
                        content: '❌ When sending to another server, you must provide a channel_id.',
                        ephemeral: true
                    });
                }
                targetChannel = interaction.channel;
            }

            // ==========================================
            // CHECK TEXT CHANNEL & PERMISSIONS
            // ==========================================
            if (!targetChannel.isTextBased()) {
                return interaction.reply({
                    content: '❌ That channel cannot receive messages.',
                    ephemeral: true
                });
            }

            const botMember = await targetGuild.members.fetchMe();
            const permissions = targetChannel.permissionsFor(botMember);

            if (!permissions?.has('SendMessages')) {
                return interaction.reply({
                    content: '❌ I do not have **Send Messages** permission in that channel.',
                    ephemeral: true
                });
            }
            if (file && !permissions?.has('AttachFiles')) {
                return interaction.reply({
                    content: '❌ I do not have **Attach Files** permission in that channel.',
                    ephemeral: true
                });
            }

            // ==========================================
            // DEFER REPLY
            // ==========================================
            await interaction.deferReply({ ephemeral: true });

            // ==========================================
            // TYPING INDICATOR
            // ==========================================
            await targetChannel.sendTyping();
            await new Promise(resolve => setTimeout(resolve, 1000));

            // ==========================================
            // BUILD PAYLOAD
            // ==========================================
            const payload = {};

            if (message) payload.content = message;

            if (file) {
                payload.files = [
                    new AttachmentBuilder(file.url, {
                        name: file.name || 'file'
                    })
                ];
            }

            if (stickerId) {
                try {
                    const sticker = await interaction.client.stickers.fetch(stickerId).catch(() => null);
                    if (sticker) {
                        payload.stickers = [sticker];
                    } else {
                        return interaction.editReply({
                            content: '❌ Sticker not found. Make sure the sticker ID is correct.'
                        });
                    }
                } catch (error) {
                    return interaction.editReply({
                        content: '❌ Invalid sticker ID.'
                    });
                }
            }

            // ==========================================
            // SEND MESSAGE
            // ==========================================
            const sentMessage = await targetChannel.send(payload);

            // ==========================================
            // SUCCESS REPLY
            // ==========================================
            let replyMessage =
                `✅ **Message sent successfully!**\n\n` +
                `**Server:** ${targetGuild.name}\n` +
                `**Channel:** ${targetChannel}\n` +
                `**Message ID:** \`${sentMessage.id}\``;

            if (message) replyMessage += `\n**Content:** ${message.substring(0, 100)}${message.length > 100 ? '...' : ''}`;
            if (file) replyMessage += `\n**File:** ${file.name}`;
            if (stickerId) replyMessage += `\n**Sticker:** ${stickerId}`;

            await interaction.editReply({ content: replyMessage });

        } catch (error) {
            console.error('Send command error:', error);
            const errorMessage = '❌ Failed to send the message. Check the Server ID, Channel ID, and bot permissions.';
            if (interaction.deferred || interaction.replied) {
                await interaction.editReply({ content: errorMessage }).catch(() => {});
            } else {
                await interaction.reply({ content: errorMessage, ephemeral: true }).catch(() => {});
            }
        }
    }
};
