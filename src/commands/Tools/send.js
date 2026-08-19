import {
    SlashCommandBuilder,
    AttachmentBuilder
} from 'discord.js';

const OWNER_ID = '1054967242497982476';

export default {
    data: new SlashCommandBuilder()
        .setName('send')
        .setDescription('Send a message through the bot')

        // Optional target server
        .addStringOption(option =>
            option
                .setName('server_id')
                .setDescription('Target server ID (leave empty for current server)')
                .setRequired(false)
        )

        // Optional target channel
        .addStringOption(option =>
            option
                .setName('channel_id')
                .setDescription('Target channel ID (leave empty for current channel)')
                .setRequired(false)
        )

        // Message
        .addStringOption(option =>
            option
                .setName('message')
                .setDescription('The message you want to send')
                .setRequired(false)
        )

        // File
        .addAttachmentOption(option =>
            option
                .setName('file')
                .setDescription('Image, GIF, video, or other file')
                .setRequired(false)
        )

        // Sticker
        .addStringOption(option =>
            option
                .setName('sticker_id')
                .setDescription('Sticker ID to send')
                .setRequired(false)
        ),

    async execute(interaction) {
        try {
            const serverId =
                interaction.options.getString('server_id');

            const channelId =
                interaction.options.getString('channel_id');

            const message =
                interaction.options.getString('message');

            const file =
                interaction.options.getAttachment('file');

            const stickerId =
                interaction.options.getString('sticker_id');

            // ==========================================
            // CHECK MESSAGE / FILE / STICKER
            // ==========================================

            if (!message && !file && !stickerId) {
                return interaction.reply({
                    content:
                        '❌ Give me a message, file, or sticker.',
                    ephemeral: true
                });
            }

            // ==========================================
            // DETERMINE TARGET SERVER
            // ==========================================

            let targetGuild;

            if (serverId) {
                // Specific server requested
                targetGuild =
                    interaction.client.guilds.cache.get(serverId);

                if (!targetGuild) {
                    return interaction.reply({
                        content:
                            '❌ I am not in that server, or the Server ID is incorrect.',
                        ephemeral: true
                    });
                }
            } else {
                // No server ID = current server
                if (!interaction.guild) {
                    return interaction.reply({
                        content:
                            '❌ You must provide a server_id when using this command in DMs.',
                        ephemeral: true
                    });
                }

                targetGuild = interaction.guild;
            }

            // ==========================================
            // PERMISSION CHECK
            // ==========================================

            const isBotOwner =
                interaction.user.id === OWNER_ID;

            const isTargetServerOwner =
                interaction.user.id === targetGuild.ownerId;

            /*
             * Bot owner:
             * Can send to every server where bot exists.
             *
             * Server owner:
             * Can send only to their own server.
             */

            if (!isBotOwner && !isTargetServerOwner) {
                return interaction.reply({
                    content:
                        '❌ Only the bot owner or this server\'s owner can use this command.',
                    ephemeral: true
                });
            }

            // ==========================================
            // DETERMINE TARGET CHANNEL
            // ==========================================

            let targetChannel;

            if (channelId) {
                // Specific channel requested
                targetChannel =
                    await targetGuild.channels.fetch(channelId);

                if (!targetChannel) {
                    return interaction.reply({
                        content:
                            '❌ Channel not found in that server.',
                        ephemeral: true
                    });
                }
            } else {
                // No channel ID = current channel
                if (!interaction.channel) {
                    return interaction.reply({
                        content:
                            '❌ Could not determine the current channel.',
                        ephemeral: true
                    });
                }

                // Make sure current channel belongs to target server
                if (
                    !interaction.guild ||
                    interaction.guild.id !== targetGuild.id
                ) {
                    return interaction.reply({
                        content:
                            '❌ When sending to another server, you must provide a channel_id.',
                        ephemeral: true
                    });
                }

                targetChannel = interaction.channel;
            }

            // ==========================================
            // CHECK TEXT CHANNEL
            // ==========================================

            if (!targetChannel.isTextBased()) {
                return interaction.reply({
                    content:
                        '❌ That channel cannot receive messages.',
                    ephemeral: true
                });
            }

            // ==========================================
            // CHECK BOT PERMISSIONS
            // ==========================================

            const botMember =
                await targetGuild.members.fetchMe();

            const permissions =
                targetChannel.permissionsFor(botMember);

            if (!permissions?.has('SendMessages')) {
                return interaction.reply({
                    content:
                        '❌ I do not have **Send Messages** permission in that channel.',
                    ephemeral: true
                });
            }

            if (file && !permissions?.has('AttachFiles')) {
                return interaction.reply({
                    content:
                        '❌ I do not have **Attach Files** permission in that channel.',
                    ephemeral: true
                });
            }

            // ==========================================
            // DEFER
            // ==========================================

            await interaction.deferReply({
                ephemeral: true
            });

            // ==========================================
            // TYPING
            // ==========================================

            await targetChannel.sendTyping();

            // Small delay
            await new Promise(resolve =>
                setTimeout(resolve, 1500)
            );

            // ==========================================
            // CREATE PAYLOAD
            // ==========================================

            const payload = {};

            // Text
            if (message) {
                payload.content = message;
            }

            // Image / GIF / Video / File
            if (file) {
                payload.files = [
                    new AttachmentBuilder(file.url, {
                        name: file.name
                    })
                ];
            }

            // Sticker
            if (stickerId) {
                payload.stickers = [stickerId];
            }

            // ==========================================
            // SEND MESSAGE
            // ==========================================

            const sentMessage =
                await targetChannel.send(payload);

            // ==========================================
            // SUCCESS
            // ==========================================

            await interaction.editReply({
                content:
                    `✅ **Message sent successfully!**\n\n` +
                    `**Server:** ${targetGuild.name}\n` +
                    `**Channel:** ${targetChannel}\n` +
                    `**Message ID:** \`${sentMessage.id}\``
            });

        } catch (error) {
            console.error('Send command error:', error);

            const errorMessage =
                '❌ Failed to send the message. Check the Server ID, Channel ID, and bot permissions.';

            if (interaction.deferred || interaction.replied) {
                await interaction.editReply({
                    content: errorMessage
                }).catch(() => {});
            } else {
                await interaction.reply({
                    content: errorMessage,
                    ephemeral: true
                }).catch(() => {});
            }
        }
    }
};
