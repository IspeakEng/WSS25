import {
    SlashCommandBuilder,
    AttachmentBuilder,
    EmbedBuilder
} from 'discord.js';

const OWNER_ID = '1054967242497982476';

export default {
    data: new SlashCommandBuilder()
        .setName('send')
        .setDescription('Send a message or embed through the bot')

        // ==========================================
        // TARGET SERVER
        // ==========================================

        .addStringOption(option =>
            option
                .setName('server_id')
                .setDescription('Target server ID (leave empty for current server)')
                .setRequired(false)
        )

        // ==========================================
        // TARGET CHANNEL
        // ==========================================

        .addStringOption(option =>
            option
                .setName('channel_id')
                .setDescription('Target channel ID (leave empty for current channel)')
                .setRequired(false)
        )

        // ==========================================
        // NORMAL MESSAGE
        // ==========================================

        .addStringOption(option =>
            option
                .setName('message')
                .setDescription('Normal message to send')
                .setRequired(false)
        )

        // ==========================================
        // EMBED TITLE
        // ==========================================

        .addStringOption(option =>
            option
                .setName('title')
                .setDescription('Embed title')
                .setRequired(false)
        )

        // ==========================================
        // EMBED DESCRIPTION
        // ==========================================

        .addStringOption(option =>
            option
                .setName('description')
                .setDescription('Embed description')
                .setRequired(false)
        )

        // ==========================================
        // EMBED IMAGE URL
        // ==========================================

        .addStringOption(option =>
            option
                .setName('image')
                .setDescription('Image or GIF URL for the embed')
                .setRequired(false)
        )

        // ==========================================
        // EMBED THUMBNAIL
        // ==========================================

        .addStringOption(option =>
            option
                .setName('thumbnail')
                .setDescription('Thumbnail image URL')
                .setRequired(false)
        )

        // ==========================================
        // EMBED COLOR
        // ==========================================

        .addStringOption(option =>
            option
                .setName('color')
                .setDescription('Embed color, example: #000000')
                .setRequired(false)
        )

        // ==========================================
        // EMBED FOOTER
        // ==========================================

        .addStringOption(option =>
            option
                .setName('footer')
                .setDescription('Embed footer text')
                .setRequired(false)
        )

        // ==========================================
        // FILE UPLOAD
        // ==========================================

        .addAttachmentOption(option =>
            option
                .setName('file')
                .setDescription('Upload an image, GIF, video, or other file')
                .setRequired(false)
        )

        // ==========================================
        // STICKER
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

            const serverId =
                interaction.options.getString('server_id');

            const channelId =
                interaction.options.getString('channel_id');

            const message =
                interaction.options.getString('message');

            const title =
                interaction.options.getString('title');

            const description =
                interaction.options.getString('description');

            const image =
                interaction.options.getString('image');

            const thumbnail =
                interaction.options.getString('thumbnail');

            const color =
                interaction.options.getString('color');

            const footer =
                interaction.options.getString('footer');

            const file =
                interaction.options.getAttachment('file');

            const stickerId =
                interaction.options.getString('sticker_id');


            // ==========================================
            // CHECK IF SOMETHING WAS PROVIDED
            // ==========================================

            if (
                !message &&
                !title &&
                !description &&
                !image &&
                !thumbnail &&
                !footer &&
                !file &&
                !stickerId
            ) {
                return interaction.reply({
                    content:
                        '❌ Give me a message, embed content, file, or sticker.',
                    ephemeral: true
                });
            }


            // ==========================================
            // DETERMINE TARGET SERVER
            // ==========================================

            let targetGuild;

            if (serverId) {

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

                if (!interaction.channel) {
                    return interaction.reply({
                        content:
                            '❌ Could not determine the current channel.',
                        ephemeral: true
                    });
                }

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

            await new Promise(resolve =>
                setTimeout(resolve, 1000)
            );


            // ==========================================
            // CREATE PAYLOAD
            // ==========================================

            const payload = {};


            // ==========================================
            // NORMAL MESSAGE
            // ==========================================

            if (message) {
                payload.content = message;
            }


            // ==========================================
            // CREATE EMBED
            // ==========================================

            if (
                title ||
                description ||
                image ||
                thumbnail ||
                footer ||
                color
            ) {

                const embed =
                    new EmbedBuilder();

                // Title
                if (title) {
                    embed.setTitle(title);
                }

                // Description
                if (description) {
                    embed.setDescription(description);
                }

                // Image / GIF
                if (image) {
                    embed.setImage(image);
                }

                // Thumbnail
                if (thumbnail) {
                    embed.setThumbnail(thumbnail);
                }

                // Footer
                if (footer) {
                    embed.setFooter({
                        text: footer
                    });
                }

                // Color
                if (color) {

                    const cleanColor =
                        color.replace('#', '');

                    if (/^[0-9A-Fa-f]{6}$/.test(cleanColor)) {

                        embed.setColor(
                            `#${cleanColor}`
                        );

                    } else {

                        return interaction.editReply({
                            content:
                                '❌ Invalid color. Use a HEX color like `#000000`.'
                        });
                    }
                }

                payload.embeds = [embed];
            }


            // ==========================================
            // FILE
            // ==========================================

            if (file) {

                payload.files = [
                    new AttachmentBuilder(file.url, {
                        name: file.name
                    })
                ];

                // If uploaded file is an image/GIF,
                // automatically display it inside embed
                if (
                    file.contentType?.startsWith('image/') &&
                    !image
                ) {

                    if (!payload.embeds) {

                        const embed =
                            new EmbedBuilder();

                        embed.setImage(
                            `attachment://${file.name}`
                        );

                        payload.embeds = [embed];

                    } else {

                        payload.embeds[0].setImage(
                            `attachment://${file.name}`
                        );
                    }
                }
            }


            // ==========================================
            // STICKER
            // ==========================================

            if (stickerId) {
                payload.stickers = [stickerId];
            }


            // ==========================================
            // SEND
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

            console.error(
                'Send command error:',
                error
            );

            const errorMessage =
                '❌ Failed to send the message. Check the Server ID, Channel ID, image URL, and bot permissions.';

            if (
                interaction.deferred ||
                interaction.replied
            ) {

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
