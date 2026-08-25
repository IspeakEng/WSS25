import { Events } from 'discord.js';
import { getGuildConfig } from '../services/config/guildConfig.js';
import { logEvent, EVENT_TYPES } from '../services/loggingService.js';
import {
    getServerCounters,
    updateCounter
} from '../services/serverstatsService.js';
import { logger } from '../utils/logger.js';
import { getLeaveChannel, createLeaveEmbed } from '../services/welcomeLeaveService.js';

export default {
    name: Events.GuildMemberRemove,
    once: false,

    async execute(member) {
        try {
            const { guild, user } = member;

            // ==========================================
            // MEMBER LEAVE LOG
            // ==========================================

            try {
                await logEvent({
                    client: member.client,
                    guildId: guild.id,
                    eventType: EVENT_TYPES.MEMBER_LEAVE,
                    data: {
                        title: 'User left',
                        lines: [
                            `**User:** ${user.toString()} (${user.tag})`,
                            `**ID:** \`${user.id}\``,
                            `**Joined:** <t:${Math.floor(member.joinedTimestamp / 1000)}:R>`,
                            `**Members:** ${guild.memberCount}`
                        ],
                        quoted: false,
                        thumbnail: user.displayAvatarURL({
                            dynamic: true
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
            // LEAVE EMBED
            // ==========================================

            try {
                const leaveChannelId = await getLeaveChannel(member.client, guild.id);
                
                if (leaveChannelId) {
                    const leaveChannel = guild.channels.cache.get(leaveChannelId);
                    
                    if (leaveChannel?.isTextBased()) {
                        // ✅ Leave এম্বেড তৈরি করো
                        const embed = createLeaveEmbed(member);
                        
                        // ✅ লিভ চ্যানেলে পাঠাও
                        await leaveChannel.send({
                            content: `🌙 farewell, ${user.username} ♡`,
                            embeds: [embed]
                        });
                    } else {
                        logger.debug(`Leave channel ${leaveChannelId} not found or not text-based`);
                    }
                } else {
                    logger.debug(`No leave channel set for guild ${guild.id}`);
                }
            } catch (error) {
                logger.debug('Error sending leave embed:', error);
            }

            // ==========================================
            // SERVER COUNTERS
            // ==========================================

            try {
                const counters = await getServerCounters(
                    member.client,
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
                            member.client,
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
                'Error in guildMemberRemove event:',
                error
            );
        }
    }
};
