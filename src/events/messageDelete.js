import {
    Events,
    AuditLogEvent,
    EmbedBuilder,
} from 'discord.js';

import { logger } from '../utils/logger.js';

const MESSAGE_LOG_CHANNEL_ID = '1537755733699989535';

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

            const logChannel =
                message.guild.channels.cache.get(
                    MESSAGE_LOG_CHANNEL_ID
                );

            if (!logChannel) {
                logger.warn(
                    `Message log channel not found: ${MESSAGE_LOG_CHANNEL_ID}`
                );
                return;
            }

            /*
             * ----------------------------------------------------------
             * FIND WHO DELETED THE MESSAGE
             * ----------------------------------------------------------
             */

            let deletedBy = message.author;

            try {

                if (
                    message.guild.members.me?.permissions.has(
                        'ViewAuditLog'
                    )
                ) {

                    const auditLogs =
                        await message.guild.fetchAuditLogs({
                            type: AuditLogEvent.MessageDelete,
                            limit: 5,
                        });

                    const entry =
                        auditLogs.entries.find(entry => {

                            if (!entry.target) {
                                return false;
                            }

                            if (
                                entry.target.id !==
                                message.author?.id
                            ) {
                                return false;
                            }

                            // Audit log entry must be recent
                            return (
                                Date.now() -
                                entry.createdTimestamp <
                                5000
                            );
                        });

                    if (entry?.executor) {
                        deletedBy = entry.executor;
                    }
                }

            } catch (error) {

                logger.debug(
                    'Could not determine message deletion executor:',
                    error
                );
            }


            /*
             * ----------------------------------------------------------
             * MESSAGE CONTENT
             * ----------------------------------------------------------
             */

            let messageContent =
                message.content?.trim();

            if (!messageContent) {
                messageContent = '*No text content*';
            }

            if (messageContent.length > 1000) {
                messageContent =
                    messageContent.slice(0, 997) +
                    '...';
            }


            /*
             * ----------------------------------------------------------
             * EMBED
             * ----------------------------------------------------------
             */

            const embed =
                new EmbedBuilder()
                    .setTitle('🗑️ Message Deleted')
                    .setColor(0xED4245)
                    .setThumbnail(
                        message.author?.displayAvatarURL({
                            dynamic: true,
                            size: 128,
                        }) || null
                    )
                    .addFields(
                        {
                            name: '👤 User',
                            value:
                                message.author
                                    ? `<@${message.author.id}>`
                                    : 'Unknown',
                            inline: true,
                        },
                        {
                            name: '🗑️ By',
                            value:
                                deletedBy
                                    ? `<@${deletedBy.id}>`
                                    : 'Unknown',
                            inline: true,
                        },
                        {
                            name: '📍 Channel',
                            value:
                                `<#${message.channel.id}>`,
                            inline: true,
                        },
                        {
                            name: '💬 Message',
                            value:
                                `\`${messageContent.replace(/`/g, "'")}\``,
                            inline: false,
                        },
                    )
                    .setTimestamp();


            /*
             * ----------------------------------------------------------
             * SEND LOG
             * ----------------------------------------------------------
             */

            await logChannel.send({
                embeds: [embed],
            }).catch(() => {});


        } catch (error) {

            logger.error(
                'Error in messageDelete event:',
                error
            );
        }
    },
};
