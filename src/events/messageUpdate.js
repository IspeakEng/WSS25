import {
    Events,
    EmbedBuilder,
} from 'discord.js';

import { logger } from '../utils/logger.js';

const MESSAGE_LOG_CHANNEL_ID = '1537755733699989535';

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

            /*
             * ----------------------------------------------------------
             * FETCH PARTIAL MESSAGE
             * ----------------------------------------------------------
             */

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


            /*
             * ----------------------------------------------------------
             * ONLY LOG REAL CONTENT CHANGES
             * ----------------------------------------------------------
             */

            if (
                oldMessage.content ===
                newMessage.content
            ) {
                return;
            }


            /*
             * ----------------------------------------------------------
             * GET LOG CHANNEL
             * ----------------------------------------------------------
             */

            const logChannel =
                newMessage.guild.channels.cache.get(
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
             * CONTENT
             * ----------------------------------------------------------
             */

            let oldContent =
                oldMessage.content?.trim() ||
                '*Empty*';

            let newContent =
                newMessage.content?.trim() ||
                '*Empty*';


            if (oldContent.length > 900) {
                oldContent =
                    oldContent.slice(0, 897) +
                    '...';
            }

            if (newContent.length > 900) {
                newContent =
                    newContent.slice(0, 897) +
                    '...';
            }


            /*
             * ----------------------------------------------------------
             * EMBED
             * ----------------------------------------------------------
             */

            const embed =
                new EmbedBuilder()
                    .setTitle('✏️ Message Edited')
                    .setColor(0xFEE75C)
                    .setThumbnail(
                        newMessage.author.displayAvatarURL({
                            dynamic: true,
                            size: 128,
                        })
                    )
                    .addFields(
                        {
                            name: '👤 User',
                            value:
                                `<@${newMessage.author.id}>`,
                            inline: true,
                        },
                        {
                            name: '📍 Channel',
                            value:
                                `<#${newMessage.channel.id}>`,
                            inline: true,
                        },
                        {
                            name: 'Before',
                            value:
                                `\`${oldContent.replace(/`/g, "'")}\``,
                            inline: false,
                        },
                        {
                            name: 'After',
                            value:
                                `\`${newContent.replace(/`/g, "'")}\``,
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
                'Error in messageUpdate event:',
                error
            );
        }
    },
};
