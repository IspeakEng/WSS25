import {
    Events,
    EmbedBuilder,
} from 'discord.js';

import { logger } from '../utils/logger.js';

export default {
    name: Events.MessageDelete,

    async execute(message, client) {
        try {
            // Ignore DMs
            if (!message.guild) {
                return;
            }

            // Ignore bot messages
            if (message.author?.bot) {
                return;
            }

            // Get message log configuration
            const config = await client.db.get(
                `msglog:${message.guild.id}`,
                null
            );

            if (!config?.channelId) {
                return;
            }

            // Get cached message data
            const cachedMessage =
                client.messageLogCache?.get(
                    message.id
                );

            let content =
                cachedMessage?.content ||
                message.content ||
                '*No text content available*';

            content = content.trim();

            // Limit Discord embed field size
            if (content.length > 1000) {
                content =
                    content.slice(0, 997) + '...';
            }

            // Protect markdown/backticks
            content =
                content.replace(/`/g, "'");

            const authorId =
                cachedMessage?.authorId ||
                message.author?.id;

            const channelId =
                cachedMessage?.channelId ||
                message.channel?.id;

            const embed = new EmbedBuilder()
                .setTitle('🗑️ Message Deleted')
                .setColor(0xED4245)
                .setThumbnail(
                    authorId
                        ? (
                            await message.guild.members
                                .fetch(authorId)
                                .then(member =>
                                    member.user.displayAvatarURL({
                                        dynamic: true,
                                        size: 128,
                                    })
                                )
                                .catch(() => null)
                        )
                        : null
                )
                .addFields(
                    {
                        name: '👤 User',
                        value: authorId
                            ? `<@${authorId}>`
                            : '*Unknown*',
                        inline: true,
                    },
                    {
                        name: '📍 Server',
                        value: message.guild.name,
                        inline: true,
                    },
                    {
                        name: '💬 Channel',
                        value: channelId
                            ? `<#${channelId}>`
                            : '*Unknown*',
                        inline: true,
                    },
                    {
                        name: 'Deleted Content',
                        value: `\`${content}\``,
                        inline: false,
                    }
                )
                .setFooter({
                    text: `Message ID: ${message.id}`,
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
                    `Message log channel not found for guild ${message.guild.id}`
                );
                return;
            }

            // Send log
            await logChannel.send({
                embeds: [embed],
            });

            // Remove from cache
            if (client.messageLogCache) {
                client.messageLogCache.delete(
                    message.id
                );
            }

        } catch (error) {
            logger.error(
                'Error in messageDelete event:',
                error
            );
        }
    },
};
