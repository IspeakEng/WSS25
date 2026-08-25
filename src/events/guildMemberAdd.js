import { Events } from 'discord.js';
import { getGuildConfig } from '../services/config/guildConfig.js';
import { logEvent, EVENT_TYPES } from '../services/loggingService.js';
import {
    getServerCounters,
    updateCounter
} from '../services/serverstatsService.js';
import { setBirthday as dbSetBirthday } from '../utils/database.js';
import { logger } from '../utils/logger.js';
import { getWelcomeChannel, createWelcomeEmbed } from '../services/welcomeLeaveService.js';

export default {
    name: Events.GuildMemberAdd,
    once: false,

    async execute(member) {
        try {
            const { guild, user } = member;

            // ==========================================
            // GUILD CONFIG
            // ==========================================

            const config = await getGuildConfig(
                member.client,
                guild.id
            );

            // ==========================================
            // AUTO ROLE
            // ==========================================

            if (config?.welcome?.roleIds?.length > 0) {
                const delay = config.welcome.autoRoleDelay || 0;
                const roleId = config.welcome.roleIds[0];

                if (delay > 0) {
                    const timeout = setTimeout(async () => {
                        const role = guild.roles.cache.get(roleId);

                        if (role) {
                            await assignRoleSafely(member, role);
                        }
                    }, delay * 1000);

                    if (typeof timeout.unref === 'function') {
                        timeout.unref();
                    }
                } else {
                    const role = guild.roles.cache.get(roleId);

                    if (role) {
                        await assignRoleSafely(member, role);
                    }
                }
            }

            // ==========================================
            // VERIFICATION
            // ==========================================

            if (
                config?.verification?.enabled ||
                config?.verification?.autoVerify?.enabled
            ) {
                await handleVerification(
                    member,
                    guild,
                    config.verification,
                    member.client
                );
            }

            // ==========================================
            // MEMBER JOIN LOG
            // ==========================================

            try {
                await logEvent({
                    client: member.client,
                    guildId: guild.id,
                    eventType: EVENT_TYPES.MEMBER_JOIN,
                    data: {
                        title: 'User joined',
                        lines: [
                            `**User:** ${user.toString()} (${user.displayName !== user.username ? `@${user.displayName}` : user.tag})`,
                            `**ID:** \`${user.id}\``,
                            `**Created:** <t:${Math.floor(user.createdTimestamp / 1000)}:R>`,
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
                    'Error logging member join:',
                    error
                );
            }

            // ==========================================
            // WELCOME EMBED (IMMEDIATE)
            // ==========================================

            try {
                const welcomeChannelId = await getWelcomeChannel(member.client, guild.id);
                if (welcomeChannelId) {
                    const welcomeChannel = guild.channels.cache.get(welcomeChannelId);
                    if (welcomeChannel?.isTextBased()) {
                        const embed = createWelcomeEmbed(member);
                        await welcomeChannel.send({
                            content: `☁️ welcome, ${member}`,
                            embeds: [embed]
                        });
                    }
                }
            } catch (error) {
                logger.debug('Error sending welcome embed:', error);
            }

            // ============================================================
            // 6 SECONDS LATER – SHORT & CUTE FOLLOW-UP
            // ============================================================

            setTimeout(async () => {
                try {
                    // ✅ সরাসরি general চ্যানেল আইডি
                    const GENERAL_CHANNEL_ID = '1534104536879206412';
                    const generalChannel = guild.channels.cache.get(GENERAL_CHANNEL_ID);

                    if (!generalChannel) return;

                    // ✅ তোমার দেওয়া channel IDs
                    const ROLES_CHANNEL_ID = '1527205606396661780';
                    const RULES_CHANNEL_ID = '1527205591162814615';

                    await generalChannel.send(
                        `✨ hey ${member}! we're so glad you're here ♡\n\n` +
                        `• head to <#${ROLES_CHANNEL_ID}> to pick roles\n` +
                        `• check <#${RULES_CHANNEL_ID}> for the rules\n\n` +
                        `enjoy your stay! ₊˚⊹♡`
                    );

                } catch (error) {
                    logger.debug('Error sending follow-up welcome message:', error);
                }
            }, 6000); // ⏱️ 6 seconds

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
                    'Error updating counters on member join:',
                    error
                );
            }

            // ==========================================
            // RESTORE BIRTHDAY
            // ==========================================

            try {
                const backupKey =
                    `guild:${guild.id}:birthdays:left`;

                const backup =
                    (await member.client.db.get(backupKey)) || {};

                if (backup[user.id]) {
                    const { month, day } = backup[user.id];

                    await dbSetBirthday(
                        member.client,
                        guild.id,
                        user.id,
                        month,
                        day
                    );

                    delete backup[user.id];

                    await member.client.db.set(
                        backupKey,
                        backup
                    );

                    logger.debug(
                        `Birthday restored for user ${user.id} in guild ${guild.id}`
                    );
                }
            } catch (error) {
                logger.debug(
                    'Error restoring birthday on member join:',
                    error
                );
            }

        } catch (error) {
            logger.error(
                'Error in guildMemberAdd event:',
                error
            );
        }
    }
};


// ==========================================
// VERIFICATION HELPER
// ==========================================

async function handleVerification(
    member,
    guild,
    verificationConfig,
    client
) {
    const {
        autoVerifyOnJoin
    } = await import(
        '../services/verificationService.js'
    );

    try {
        const result = await autoVerifyOnJoin(
            client,
            guild,
            member,
            verificationConfig
        );

        if (result.autoVerified) {
            logger.info(
                'User auto-verified on join',
                {
                    guildId: guild.id,
                    userId: member.id,
                    userTag: member.user.tag,
                    roleName: result.roleName,
                    criteria: result.criteria
                }
            );
        } else {
            logger.debug(
                'User not auto-verified on join',
                {
                    guildId: guild.id,
                    userId: member.id,
                    reason: result.reason
                }
            );
        }

    } catch (error) {
        logger.error(
            'Error in auto-verification for member',
            {
                guildId: guild.id,
                userId: member.id,
                userTag: member.user.tag,
                error: error.message
            }
        );
    }
}


// ==========================================
// SAFE ROLE ASSIGNMENT
// ==========================================

async function assignRoleSafely(member, role) {
    try {
        await member.roles.add(role);
    } catch (error) {
        logger.warn(
            `Failed to assign role ${role.id} to member ${member.id}:`,
            error
        );
    }
}
