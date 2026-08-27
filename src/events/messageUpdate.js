import {
    Events,
    EmbedBuilder,
} from 'discord.js';

import { logger } from '../utils/logger.js';

const LOG_CHANNEL_ID = '1541753459672350770';

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

            // Discord embed field limit protection
            if (oldContent.length > 900) {
                oldContent = oldContent.slice(0, 897) + '...';
            }

            if (newContent.length > 900) {
                newContent = newContent.slice(0, 897) + '...';
            }

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
                        value: `<@${newMessage.author.id}>`,
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
                        value: `\`${oldContent.replace(/`/g, "'")}\``,
                        inline: false,
                    },
                    {
                        name: 'After',
                        value: `\`${newContent.replace(/`/g, "'")}\``,
                        inline: false,
                    },
                )
                .setFooter({
                    text: `Message ID: ${newMessage.id}`,
                })
                .setTimestamp();

            // Get log channel
            const logChannel = await client.channels.fetch(
                LOG_CHANNEL_ID
            );

            // Make sure the channel can receive messages
            if (!logChannel || !logChannel.isTextBased()) {
                logger.error('Log channel not found or is not text-based.');
                return;
            }

            // Send log to channel
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
