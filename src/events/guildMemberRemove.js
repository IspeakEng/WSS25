import { Events } from 'discord.js';

import {
    getUserApplications,
    deleteApplication,
    getGuildBirthdays,
    deleteBirthday
} from '../utils/database.js';

import {
    logEvent,
    EVENT_TYPES
} from '../services/loggingService.js';

import {
    getServerCounters,
    updateCounter
} from '../services/serverstatsService.js';

import { deleteUserLevelData } from '../services/leveling/leveling.js';
import { logger } from '../utils/logger.js';

export default {
    name: Events.GuildMemberRemove,
    once: false,

    async execute(member) {
        try {
            const { guild, user } = member;

            // ==========================================
            // GOODBYE SYSTEM
            // REMOVED
            // ==========================================
            //
            // The old Goodbye system has been removed.
            // A new Goodbye system will be added later.
            //
            // ==========================================


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
                            `**Joined:** <t:${Math.floor(
                                (member.joinedTimestamp || Date.now()) / 1000
                            )}:R>`,
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


            // ==========================================
            // BACKUP BIRTHDAY
            // ==========================================

            try {
                const birthdays = await getGuildBirthdays(
                    member.client,
                    guild.id
                );

                if (birthdays[user.id]) {
                    const backupKey =
                        `guild:${guild.id}:birthdays:left`;

                    const backup =
                        (await member.client.db.get(backupKey)) || {};

                    backup[user.id] = birthdays[user.id];

                    await member.client.db.set(
                        backupKey,
                        backup
                    );

                    await deleteBirthday(
                        member.client,
                        guild.id,
                        user.id
                    );

                    logger.debug(
                        `Birthday backed up and removed for user ${user.id} in guild ${guild.id}`
                    );
                }
            } catch (error) {
                logger.debug(
                    'Error handling birthday on member leave:',
                    error
                );
            }


            // ==========================================
            // REMOVE USER APPLICATIONS
            // ==========================================

            try {
                const userApplications =
                    await getUserApplications(
                        member.client,
                        guild.id,
                        user.id
                    );

                if (
                    userApplications &&
                    userApplications.length > 0
                ) {
                    for (const app of userApplications) {
                        await deleteApplication(
                            member.client,
                            guild.id,
                            app.id,
                            user.id
                        );
                    }

                    logger.debug(
                        `Removed ${userApplications.length} applications for user ${user.id} in guild ${guild.id}`
                    );
                }
            } catch (error) {
                logger.debug(
                    'Error handling applications on member leave:',
                    error
                );
            }


            // ==========================================
            // REMOVE LEVELING DATA
            // ==========================================

            try {
                await deleteUserLevelData(
                    member.client,
                    guild.id,
                    user.id
                );

                logger.debug(
                    `Removed leveling data for user ${user.id} in guild ${guild.id}`
                );
            } catch (error) {
                logger.debug(
                    'Error handling leveling data on member leave:',
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
