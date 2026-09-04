import { Events } from 'discord.js';
import { logger } from '../utils/logger.js';

import { parsePrefixCommand } from '../utils/prefixParser.js';

import {
    supportsPrefixExecution,
    executePrefixCommand,
    resolvePrefixAccessKey,
} from '../utils/messageAdapter.js';

import {
    resolveCommandAlias,
    resolveSubcommandAlias,
} from '../config/commands/commandAliases.js';

import {
    getPrefixRestriction,
} from '../config/commands/prefixRestrictions.js';

import {
    getGuildConfig,
} from '../services/config/guildConfig.js';

import {
    getCommandPrefix,
    getBotMessage,
    isBotOwner,
    isCommandCategoryEnabled,
    isMaintenanceMode,
} from '../config/bot.js';

import {
    enforceAbuseProtection,
    formatCooldownDuration,
} from '../utils/abuseProtection.js';

import { createEmbed } from '../utils/embeds.js';

import {
    isCommandEnabled,
} from '../services/commandAccessService.js';

import {
    getCountingGameConfig,
    isValidCountingMessage,
    recordCorrectCount,
} from '../services/countingGameService.js';


// ============================================================
// AUTO MENTION REACTION CONFIG
// ============================================================

const TARGET_USER_ID = '1054967242497982476';

const TARGET_REACTION_EMOJIS = [
    '💗',
];

const FRIEND_USER_ID = '1498287924301795388';

const FRIEND_REACTION_EMOJI = '💖';


// ============================================================
// MESSAGE CREATE
// ============================================================

export default {
    name: Events.MessageCreate,

    async execute(message, client) {
        try {

            // Ignore bots and DMs
            if (
                message.author.bot ||
                !message.guild
            ) {
                return;
            }


            // ====================================================
            // MESSAGE LOG CACHE
            // ====================================================
            // Needed because after a message is deleted,
            // Discord may no longer provide its content.

            try {
                if (!client.messageLogCache) {
                    client.messageLogCache = new Map();
                }

                client.messageLogCache.set(
                    message.id,
                    {
                        content: message.content || '',
                        authorId: message.author.id,
                        guildId: message.guild.id,
                        channelId: message.channel.id,
                        createdTimestamp:
                            message.createdTimestamp,
                    }
                );

                // Prevent unlimited memory usage
                if (
                    client.messageLogCache.size >
                    10000
                ) {
                    const firstKey =
                        client.messageLogCache
                            .keys()
                            .next()
                            .value;

                    if (firstKey) {
                        client.messageLogCache.delete(
                            firstKey
                        );
                    }
                }

            } catch (error) {
                logger.error(
                    'Failed to cache message for message logging:',
                    error
                );
            }


            // ====================================================
            // AFK SYSTEM
            // ====================================================

            try {
                const { getAFKKey } =
                    await import(
                        '../utils/database.js'
                    );


                // Remove AFK when AFK user sends a message

                const authorAFKKey =
                    getAFKKey(
                        message.guild.id,
                        message.author.id
                    );

                const authorAFK =
                    await client.db.get(
                        authorAFKKey,
                        null
                    );

                if (authorAFK) {

                    await client.db.delete(
                        authorAFKKey
                    );

                    const welcomeBack =
                        await message.channel.send({
                            content:
                                `👋 Welcome back, ${message.author}! Your AFK status has been removed.`,
                        }).catch(() => null);

                    if (welcomeBack) {
                        setTimeout(() => {
                            welcomeBack
                                .delete()
                                .catch(() => {});
                        }, 5000);
                    }
                }


                // Check mentioned users for AFK

                for (
                    const [, mentionedUser]
                    of message.mentions.users
                ) {

                    if (mentionedUser.bot) {
                        continue;
                    }

                    if (
                        mentionedUser.id ===
                        message.author.id
                    ) {
                        continue;
                    }

                    const mentionedAFKKey =
                        getAFKKey(
                            message.guild.id,
                            mentionedUser.id
                        );

                    const afkData =
                        await client.db.get(
                            mentionedAFKKey,
                            null
                        );

                    if (!afkData) {
                        continue;
                    }

                    const reason =
                        afkData.reason ||
                        'No reason provided';

                    let timestampText =
                        'Unknown';

                    if (afkData.timestamp) {

                        let timestampMs;

                        if (
                            typeof afkData.timestamp ===
                            'number'
                        ) {
                            timestampMs =
                                afkData.timestamp;
                        } else {
                            timestampMs =
                                Date.parse(
                                    afkData.timestamp
                                );
                        }

                        if (
                            Number.isFinite(
                                timestampMs
                            )
                        ) {
                            timestampText =
                                `<t:${Math.floor(
                                    timestampMs / 1000
                                )}:R>`;
                        }
                    }

                    await message.channel.send({
                        content:
                            `💤 **${mentionedUser.username} is AFK**\n` +
                            `> Reason: ${reason}\n` +
                            `> Since: ${timestampText}`,
                    }).catch(() => {});
                }

            } catch (error) {
                logger.error(
                    'Error handling AFK system:',
                    error
                );
            }


            // ====================================================
            // AUTO MENTION REACTIONS
            // ====================================================

            try {

                // Don't react to replies
                if (!message.reference) {

                    const targetMentioned =
                        message.mentions.users.has(
                            TARGET_USER_ID
                        );

                    const friendMentioned =
                        message.mentions.users.has(
                            FRIEND_USER_ID
                        );


                    // React when target user is mentioned

                    if (targetMentioned) {

                        logger.info(
                            `🎯 ${message.author.tag} mentioned ${TARGET_USER_ID}`
                        );

                        for (
                            const emojiId
                            of TARGET_REACTION_EMOJIS
                        ) {

                            await message
                                .react(emojiId)
                                .catch(error => {

                                    logger.error(
                                        `❌ Failed to react with emoji ${emojiId}:`,
                                        error
                                    );

                                });
                        }
                    }


                    // React when friend is mentioned

                    if (friendMentioned) {

                        logger.info(
                            `💖 ${message.author.tag} mentioned friend ${FRIEND_USER_ID}`
                        );

                        await message
                            .react(
                                FRIEND_REACTION_EMOJI
                            )
                            .catch(error => {

                                logger.error(
                                    '❌ Failed to react with friend emoji:',
                                    error
                                );

                            });
                    }
                }

            } catch (error) {
                logger.error(
                    '❌ Failed to handle auto mention reactions:',
                    error
                );
            }


            // ====================================================
            // BAD WORD FILTER
            // ====================================================

            const badWords = [
                'fuck',
                'fucking',
                'motherfucker',
                'sexxy',
                'bitch',
                'bastard',
                'asshole',
                'dick',
                'slut',
                'pussy',
                'porn',
                'sex',
                'cum',
            ];

            const content =
                message.content.toLowerCase();

            const containsBadWord =
                badWords.some(
                    word =>
                        content.includes(word)
                );

            if (containsBadWord) {

                try {

                    await message.delete()
                        .catch(() => {});

                } catch (error) {

                    logger.error(
                        'Failed to delete bad word message:',
                        error
                    );

                }

                return;
            }


            // ====================================================
            // MESSAGE LOG DEBUG
            // ====================================================

            logger.debug(
                `Message received from ${message.author.tag}: ${message.content}`
            );


            // ====================================================
            // COUNTING GAME
            // ====================================================

            const countingProcessed =
                await handleCountingGame(
                    message,
                    client
                );

            if (countingProcessed) {
                return;
            }


            // ====================================================
            // PREFIX COMMAND
            // ====================================================

            await handlePrefixCommand(
                message,
                client
            );


        } catch (error) {

            logger.error(
                'Error in messageCreate event:',
                error
            );

        }
    },
};


// ============================================================
// PREFIX COMMAND
// ============================================================

async function handlePrefixCommand(
    message,
    client
) {

    try {

        const guildConfig =
            await getGuildConfig(
                client,
                message.guild.id
            );

        const prefix =
            guildConfig?.prefix ||
            getCommandPrefix();

        const parsed =
            parsePrefixCommand(
                message.content,
                prefix
            );

        if (!parsed) {
            return;
        }

        let {
            commandName,
            args,
        } = parsed;


        // ====================================================
        // MUSIC PREFIX SHORTCUTS
        // ====================================================

        const musicPrefixShortcut =
            commandName.toLowerCase();

        const MUSIC_PREFIX_SHORTCUTS =
            new Set([
                'leave',
                'pause',
                'resume',
                'skip',
                'stop',
                'volume',
            ]);

        if (
            MUSIC_PREFIX_SHORTCUTS.has(
                musicPrefixShortcut
            )
        ) {

            commandName = 'music';

            args = [
                musicPrefixShortcut,
                ...args,
            ];
        }


        logger.info(
            `Prefix command detected: ${commandName}, args: ${args.join(', ')}`
        );


        // ====================================================
        // RESOLVE COMMAND
        // ====================================================

        const resolvedCommandName =
            resolveCommandAlias(
                commandName
            );

        logger.info(
            `Resolved command name: ${resolvedCommandName}`
        );

        const command =
            client.commands.get(
                resolvedCommandName
            );

        if (!command) {

            logger.warn(
                `Command not found: ${resolvedCommandName}`
            );

            return;
        }


        // ====================================================
        // MAINTENANCE
        // ====================================================

        if (
            isMaintenanceMode() &&
            !isBotOwner(
                message.author.id
            )
        ) {

            await message.channel.send({
                embeds: [
                    createEmbed({
                        title: 'Maintenance Mode',
                        description:
                            getBotMessage(
                                'maintenanceMode'
                            ),
                        color: 'warning',
                    }),
                ],
            }).catch(() => {});

            return;
        }


        // ====================================================
        // CATEGORY
        // ====================================================

        if (
            !isCommandCategoryEnabled(
                command.category
            )
        ) {

            await message.channel.send({
                embeds: [
                    createEmbed({
                        title: 'Feature Disabled',
                        description:
                            getBotMessage(
                                'commandDisabled'
                            ),
                        color: 'error',
                    }),
                ],
            }).catch(() => {});

            return;
        }


        // ====================================================
        // PREFIX RESTRICTION
        // ====================================================

        const restriction =
            getPrefixRestriction(
                command,
                args,
                resolveSubcommandAlias
            );

        if (
            !supportsPrefixExecution(
                command
            ) ||
            restriction.blocked
        ) {

            if (
                restriction.blocked &&
                restriction.reason
            ) {

                const embed =
                    createEmbed({
                        title:
                            'Slash Command Only',

                        description:
                            `${restriction.reason}\nUse \`/${resolvedCommandName}\` instead.`,

                        color: 'info',
                    });

                await message.channel.send({
                    embeds: [embed],
                }).catch(() => {});
            }

            return;
        }


        // ====================================================
        // COMMAND ENABLED
        // ====================================================

        const accessKey =
            resolvePrefixAccessKey(
                command.data,
                args
            );

        const commandEnabled =
            await isCommandEnabled(
                client,
                message.guild.id,
                accessKey,
                command.category
            );

        if (!commandEnabled) {

            const embed =
                createEmbed({
                    title:
                        'Command Disabled',

                    description:
                        'This command has been disabled for this server.',

                    color: 'error',
                });

            await message.channel.send({
                embeds: [embed],
            }).catch(() => {});

            return;
        }


        // ====================================================
        // ABUSE PROTECTION
        // ====================================================

        const mockInteractionForProtection = {
            guildId:
                message.guild.id,

            user:
                message.author,
        };

        const abuseProtection =
            await enforceAbuseProtection(
                mockInteractionForProtection,
                command,
                resolvedCommandName
            );

        if (
            !abuseProtection.allowed
        ) {

            const formattedCooldown =
                formatCooldownDuration(
                    abuseProtection.remainingMs
                );

            const embed =
                createEmbed({
                    title:
                        'Command Cooldown',

                    description:
                        `This command is on cooldown. Please wait ${formattedCooldown} before trying again.`,

                    color: 'error',
                });

            await message.channel.send({
                embeds: [embed],
            }).catch(() => {});

            return;
        }


        // ====================================================
        // EXECUTE PREFIX COMMAND
        // ====================================================

        logger.info(
            `Executing prefix command: ${prefix}${commandName} (resolved to ${resolvedCommandName}) by ${message.author.tag}`
        );

        await executePrefixCommand(
            command,
            message,
            args,
            client,
            prefix,
            guildConfig
        );


    } catch (error) {

        logger.error(
            'Error handling prefix command:',
            error
        );

    }
}


// ============================================================
// COUNTING GAME
// ============================================================

async function handleCountingGame(
    message,
    client
) {

    try {

        // Get counting configuration

        const config =
            await getCountingGameConfig(
                client,
                message.guild.id
            );

        // Check if counting game is active

        if (
            !config.enabled ||
            !config.channelId ||
            message.channel.id !==
                config.channelId
        ) {
            return false;
        }


        // Get message content

        const content =
            message.content.trim();


        // Check number

        const validCount =
            isValidCountingMessage(
                content,
                config
            );


        // Same user cannot count twice

        const sameUserAttempt =
            message.author.id ===
            config.lastUserId;


        // ====================================================
        // WRONG COUNT OR SAME USER
        // ====================================================

        if (
            !validCount ||
            sameUserAttempt
        ) {

            // Delete incorrect message

            await message.delete()
                .catch(() => {});


            // Keep current counting position

            const expectedNumber =
                config.nextNumber;


            // Send temporary warning

            const warningMessage =
                await message.channel.send({

                    content:
                        sameUserAttempt
                            ? `⚠️ <@${message.author.id}>, you can't count twice in a row. Continue with **${expectedNumber}**.`
                            : `❌ Wrong count, <@${message.author.id}>. Continue with **${expectedNumber}**.`,

                }).catch(() => null);


            // Delete warning after 5 seconds

            if (warningMessage) {

                setTimeout(() => {

                    warningMessage
                        .delete()
                        .catch(() => {});

                }, 5000);
            }


            return true;
        }


        // ====================================================
        // CORRECT COUNT
        // ====================================================

        await recordCorrectCount(
            client,
            message.guild.id,
            message.author.id
        );


        return true;


    } catch (error) {

        logger.error(
            'Error handling counting game:',
            error
        );

        return false;
    }
}
