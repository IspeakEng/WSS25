import { Events } from 'discord.js';
import {
    logEvent,
    EVENT_TYPES
} from '../services/loggingService.js';
import {
    getServerCounters,
    updateCounter
} from '../services/serverstatsService.js';
import {
    getLeaveChannel,
    createLeaveEmbed
} from '../services/welcomeLeaveService.js';
import { logger } from '../utils/logger.js';

export default {
    name: Events.GuildMemberRemove,
    once: false,

    async execute(member) {
        const guild = member.guild;
        const user = member.user;
        const client = member.client;

        try {
            // ==========================================
            // MEMBER LEAVE LOG
            // ==========================================

            try {
                await logEvent({
                    client,
                    guildId: guild.id,
                    eventType: EVENT_TYPES.MEMBER_LEAVE,
                    data: {
                        title: 'User left',
                        lines: [
                            `**User:** ${user.toString()} (${user.tag})`,
                            `**ID:** \`${user.id}\``,
                            `**Joined:** ${
                                member.joinedTimestamp
                                    ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>`
                                    : 'Unknown'
                            }`,
                            `**Members:** ${guild.memberCount}`
                        ],
                        quoted: false,
                        thumbnail: user.displayAvatarURL({
                            dynamic: true,
                            size: 256
                        }),
                        userId: user.id
                    }
                });
            } catch (error) {
                logger.debug(
                    'Error logging member leave:',
                    error
                );
            }

            // ==========================================
            // LEAVE MESSAGE
            // ==========================================

            try {
                const leaveChannelId = await getLeaveChannel(
                    client,
                    guild.id
                );

                logger.debug(
                    `Leave channel for ${guild.name}: ${leaveChannelId || 'NOT SET'}`
                );

                if (!leaveChannelId) {
                    logger.warn(
                        `No leave channel configured for guild ${guild.id}`
                    );
                } else {
                    let leaveChannel = null;

                    // ------------------------------------------
                    // Try guild cache first
                    // ------------------------------------------

                    leaveChannel =
                        guild.channels.cache.get(
                            leaveChannelId
                        );

                    // ------------------------------------------
                    // If not cached, fetch from Discord
                    // ------------------------------------------

                    if (!leaveChannel) {
                        try {
                            leaveChannel =
                                await client.channels.fetch(
                                    leaveChannelId
                                );
                        } catch (error) {
                            logger.error(
                                `Failed to fetch leave channel ${leaveChannelId}:`,
                                error
                            );
                        }
                    }

                    // ------------------------------------------
                    // Validate channel
                    // ------------------------------------------

                    if (!leaveChannel) {
                        logger.warn(
                            `Leave channel ${leaveChannelId} could not be found.`
                        );
                    } else if (!leaveChannel.isTextBased()) {
                        logger.warn(
                            `Leave channel ${leaveChannelId} is not a text-based channel.`
                        );
                    } else {
                        // --------------------------------------
                        // Create leave embed
                        // --------------------------------------

                        const embed =
                            createLeaveEmbed(member);

                        // --------------------------------------
                        // Send leave message
                        // --------------------------------------

                        await leaveChannel.send({
                            content: `🌙 farewell, ${user.username} ♡`,
                            embeds: [embed]
                        });

                        logger.info(
                            `Leave message successfully sent for ${user.tag} in ${guild.name}`
                        );
                    }
                }
            } catch (error) {
                logger.error(
                    `Error sending leave message in guild ${guild.id}:`,
                    error
                );
            }

            // ==========================================
            // SERVER COUNTERS
            // ==========================================

            try {
                const counters =
                    await getServerCounters(
                        client,
                        guild.id
                    );

                for (const counter of counters) {
                    if (
                        counter &&
                        counter.type &&
                        counter.channelId &&
                        counter.enabled !== false
                    ) {
                        await updateCounter(
                            client,
                            guild,
                            counter
                        );
                    }
                }
            } catch (error) {
                logger.debug(
                    'Error updating counters on member leave:',
                    error
                );
            }

        } catch (error) {
            logger.error(
                `Error in guildMemberRemove event for guild ${guild?.id}:`,
                error
            );
        }
    }
};
