import {
    Events,
    EmbedBuilder,
} from 'discord.js';

import { logger } from '../utils/logger.js';

const LOG_CHANNEL_ID = '1541753459672350770';

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

            // Fetch partial message
            if (message.partial) {
                try {
                    await message.fetch();
                } catch {
                    return;
                }
            }

            let content =
                message.content?.trim() || '*No text content*';

            if (content.length > 1000) {
                content = content.slice(0, 997) + '...';
            }

            const embed = new EmbedBuilder()
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
                        value: message.author
                            ? `<@${message.author.id}>`
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
                        value: `<#${message.channel.id}>`,
                        inline: true,
                    },
                    {
                        name: 'Deleted Content',
                        value: `\`${content.replace(/`/g, "'")}\``,
                        inline: false,
                    },
                )
                .setFooter({
                    text: `Message ID: ${message.id}`,
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
                'Error in messageDelete event:',
                error
            );
        }
    },
};
