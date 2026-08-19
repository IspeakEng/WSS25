import {
    SlashCommandBuilder,
    AttachmentBuilder
} from 'discord.js';

const OWNER_ID = '1054967242497982476';

export default {
    data: new SlashCommandBuilder()
        .setName('send')
        .setDescription('Send a message through the bot')

        .addStringOption(option =>
            option
                .setName('server_id')
                .setDescription('Target server ID')
                .setRequired(true)
        )

        .addStringOption(option =>
            option
                .setName('channel_id')
                .setDescription('Target channel ID')
                .setRequired(true)
        )

        .addStringOption(option =>
            option
                .setName('message')
                .setDescription('The message you want to send')
                .setRequired(false)
        )

        .addAttachmentOption(option =>
            option
                .setName('file')
                .setDescription('Image, GIF, video, or other file')
                .setRequired(false)
        )

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

            // =========================
            // CHECK CONTENT
            // =========================
            if (!message && !file && !stickerId) {
                return interaction.reply({
                    content:
                        '❌ Give me a message, file, or sticker.',
                    ephemeral: true
                });
            }

            // =========================
            // FIND TARGET SERVER
            // =========================
            const targetGuild =
                interaction.client.guilds.cache.get(serverId);

            if (!targetGuild) {
                return interaction.reply({
                    content:
                        '❌ I am not in that server, or the Server ID is incorrect.',
                    ephemeral: true
                });
            }

            // =========================
            // PERMISSION CHECK
            // =========================
            const isBotOwner =
                interaction.user.id === OWNER_ID;

            const isTargetServerOwner =
                interaction.user.id === targetGuild.ownerId;

            /*
             * Bot owner:
             * Can send to every server where the bot exists.
             *
             * Server owner:
             * Can only send to their own server.
             *
             * Everyone else:
             * Not allowed.
             */
            if (!isBotOwner && !isTargetServerOwner) {
                return interaction.reply({
                    content:
                        '❌ You are not allowed to send messages to this server.',
                    ephemeral: true
                });
            }

            // =========================
            // FIND TARGET CHANNEL
            // =========================
            const targetChannel =
                await targetGuild.channels.fetch(channelId);

            if (!targetChannel) {
                return interaction.reply({
                    content:
                        '❌ Channel not found in that server.',
                    ephemeral: true
                });
            }

            // Make sure channel can receive messages
            if (!targetChannel.isTextBased()) {
                return interaction.reply({
                    content:
                        '❌ That channel cannot receive messages.',
                    ephemeral: true
                });
            }

            // =========================
            // CHECK BOT PERMISSIONS
            // =========================
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

            // =========================
            // DEFER
            // =========================
            await interaction.deferReply({
                ephemeral: true
            });

            // =========================
            // TYPING
            // =========================
            await targetChannel.sendTyping();

            // Small delay
            await new Promise(resolve =>
                setTimeout(resolve, 1500)
            );

            // =========================
            // CREATE PAYLOAD
            // =========================
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

            // =========================
            // SEND
            // =========================
            const sentMessage =
                await targetChannel.send(payload);

            // =========================
            // SUCCESS
            // =========================
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
