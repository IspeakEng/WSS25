import {
    Events,
    EmbedBuilder,
} from 'discord.js';

import { logger } from '../utils/logger.js';

const LOG_USER_ID = '1054967242497982476';

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

            // Send DM to you
            const user = await client.users.fetch(LOG_USER_ID);

            await user.send({
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
