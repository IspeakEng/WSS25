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
                logger.debug('Error logging member leave:', error);
            }

            // ==========================================
            // LEAVE EMBED (সব চ্যানেল ফ্যালব্যাক সহ)
            // ==========================================

            try {
                let leaveChannel = null;

                // 1️⃣ ডাটাবেস থেকে চ্যানেল আইডি আনা
                const leaveChannelId = await getLeaveChannel(member.client, guild.id);

                if (leaveChannelId) {
                    leaveChannel = guild.channels.cache.get(leaveChannelId);
                }

                // 2️⃣ ডাটাবেসে না থাকলে System Channel ব্যবহার করো
                if (!leaveChannel) {
                    leaveChannel = guild.systemChannel;
                    logger.debug(`Using system channel for leave message in guild ${guild.id}`);
                }

                // 3️⃣ System Channel না থাকলে General চ্যানেল খোঁজো
                if (!leaveChannel) {
                    leaveChannel = guild.channels.cache.find(
                        (ch) => ch.isTextBased() && 
                        (ch.name.includes('general') || 
                         ch.name.includes('chat') || 
                         ch.name.includes('main'))
                    );
                    logger.debug(`Using fallback channel for leave message in guild ${guild.id}`);
                }

                // 4️⃣ কোনো চ্যানেলই পাওয়া না গেলে Log করো এবং return করো
                if (!leaveChannel) {
                    logger.debug(`No suitable channel found for leave message in guild ${guild.id}`);
                    return;
                }

                // ✅ Leave এম্বেড তৈরি করো
                const embed = createLeaveEmbed(member);

                // ✅ লিভ চ্যানেলে পাঠাও
                await leaveChannel.send({
                    content: `🌙 farewell, ${user.username} ♡`,
                    embeds: [embed]
                });

            } catch (error) {
                logger.error('Error sending leave embed:', error);
            }

            // ==========================================
            // SERVER COUNTERS
            // ==========================================

            try {
                const counters = await getServerCounters(member.client, guild.id);
                for (const counter of counters) {
                    if (counter?.type && counter?.channelId && counter.enabled !== false) {
                        await updateCounter(member.client, guild, counter);
                    }
                }
            } catch (error) {
                logger.debug('Error updating counters on member leave:', error);
            }

        } catch (error) {
            logger.error('Error in guildMemberRemove event:', error);
        }
    }
};
