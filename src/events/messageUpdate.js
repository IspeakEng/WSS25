import {
    Events,
    EmbedBuilder,
} from 'discord.js';

import { logger } from '../utils/logger.js';

export default {
    name: Events.MessageUpdate,

    async execute(oldMessage, newMessage, client) {
        try {
            // Ignore DMs
            if (!newMessage.guild) {
                return;
            }

            // Ignore bot messages
            if (newMessage.author?.bot) {
                return;
            }

            // Get message log configuration
            const config = await client.db.get(
                `msglog:${newMessage.guild.id}`,
                null
            );

            if (!config?.channelId) {
                return;
            }

            // Fetch partial messages
            if (oldMessage.partial) {
                try {
                    await oldMessage.fetch();
                } catch {
                    return;
                }
            }

            if (newMessage.partial) {
                try {
                    await newMessage.fetch();
                } catch {
                    return;
                }
            }

            // Only log actual content changes
            if (oldMessage.content === newMessage.content) {
                return;
            }

            let oldContent =
                oldMessage.content?.trim() || '*Empty*';

            let newContent =
                newMessage.content?.trim() || '*Empty*';

            // Prevent Discord embed field overflow
            if (oldContent.length > 900) {
                oldContent =
                    oldContent.slice(0, 897) + '...';
            }

            if (newContent.length > 900) {
                newContent =
                    newContent.slice(0, 897) + '...';
            }

            // Protect markdown/backticks
            oldContent =
                oldContent.replace(/`/g, "'");

            newContent =
                newContent.replace(/`/g, "'");

            const embed = new EmbedBuilder()
                .setTitle('✏️ Message Edited')
                .setColor(0xFEE75C)
                .setThumbnail(
                    newMessage.author?.displayAvatarURL({
                        dynamic: true,
                        size: 128,
                    }) || null
                )
                .addFields(
                    {
                        name: '👤 User',
                        value: newMessage.author
                            ? `<@${newMessage.author.id}>`
                            : '*Unknown*',
                        inline: true,
                    },
                    {
                        name: '📍 Server',
                        value: newMessage.guild.name,
                        inline: true,
                    },
                    {
                        name: '💬 Channel',
                        value: `<#${newMessage.channel.id}>`,
                        inline: true,
                    },
                    {
                        name: 'Before',
                        value: `\`${oldContent}\``,
                        inline: false,
                    },
                    {
                        name: 'After',
                        value: `\`${newContent}\``,
                        inline: false,
                    }
                )
                .setFooter({
                    text: `Message ID: ${newMessage.id}`,
                })
                .setTimestamp();

            // Get log channel
            const logChannel =
                await client.channels.fetch(
                    config.channelId
                ).catch(() => null);

            if (
                !logChannel ||
                !logChannel.isTextBased()
            ) {
                logger.error(
                    `Message log channel not found for guild ${newMessage.guild.id}`
                );
                return;
            }

            // Send log
            await logChannel.send({
                embeds: [embed],
            });

        } catch (error) {
            logger.error(
                'Error in messageUpdate event:',
                error
            );
        }
    },
};
