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
    saveCountingGameConfig,
    isValidCountingMessage,
    recordCorrectCount,
} from '../services/countingGameService.js';

/*
 * ==========================================================================
 * AUTO MENTION REACTION CONFIG
 * ==========================================================================
 */

// User ID that will trigger the reaction when mentioned
const TARGET_USER_ID = '1054967242497982476';

// Custom emoji ID used for the reaction
const REACTION_EMOJI_ID = '1528022603770630185';

/*
 * ==========================================================================
 * MESSAGE CREATE
 * ==========================================================================
 */

export default {
    name: Events.MessageCreate,

    async execute(message, client) {
        try {

            // Ignore bots and DMs
            if (message.author.bot || !message.guild) {
                return;
            }

            /*
             * ----------------------------------------------------------------------
             * AFK SYSTEM
             * ----------------------------------------------------------------------
             */

            try {
                const { getAFKKey } =
                    await import('../utils/database.js');

                /*
                 * ------------------------------------------------------------------
                 * REMOVE AFK WHEN AFK USER SENDS A MESSAGE
                 * ------------------------------------------------------------------
                 */

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
                            welcomeBack.delete().catch(() => {});
                        }, 5000);
                    }
                }

                /*
                 * ------------------------------------------------------------------
                 * CHECK MENTIONED USERS FOR AFK STATUS
                 * ------------------------------------------------------------------
                 */

                for (const [, mentionedUser] of message.mentions.users) {

                    if (mentionedUser.bot) {
                        continue;
                    }

                    // Don't check the message author again
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
                            typeof afkData.timestamp === 'number'
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
                            Number.isFinite(timestampMs)
                        ) {
                            timestampText =
                                `<t:${Math.floor(timestampMs / 1000)}:R>`;
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

            /*
             * ==========================================================================
             * AUTO MENTION REACTION
             * ==========================================================================
             *
             * Whenever someone mentions TARGET_USER_ID,
             * the bot reacts with REACTION_EMOJI_ID.
             *
             * =======================================================================
             */

            try {

                if (
                    message.mentions.users.has(
                        TARGET_USER_ID
                    )
                ) {

                    const reactionEmoji =
                        await client.emojis.fetch(
                            REACTION_EMOJI_ID
                        ).catch(() => null);

                    if (!reactionEmoji) {

                        logger.warn(
                            `Auto mention reaction emoji not found or inaccessible: ${REACTION_EMOJI_ID}`
                        );

                    } else {

                        await message.react(
                            reactionEmoji
                        );

                        logger.info(
                            `Auto mention reaction added to message ${message.id}`
                        );
                    }
                }

            } catch (error) {

                logger.error(
                    'Failed to add auto mention reaction:',
                    error
                );
            }

            /*
             * ----------------------------------------------------------------------
             * BAD WORD FILTER
             * ----------------------------------------------------------------------
             */

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
                badWords.some(word =>
                    content.includes(word)
                );

            if (containsBadWord) {

                try {

                    await message.delete();

                    const warning =
                        await message.channel.send({
                            content:
                                `⚠️ ${message.author}, please keep the chat clean.`,
                        });

                    setTimeout(() => {
                        warning.delete().catch(() => {});
                    }, 5000);

                } catch (error) {

                    logger.error(
                        'Failed to handle bad word message:',
                        error
                    );
                }

                return;
            }

            /*
             * ----------------------------------------------------------------------
             * MESSAGE LOG
             * ----------------------------------------------------------------------
             */

            logger.debug(
                `Message received from ${message.author.tag}: ${message.content}`
            );

            /*
             * ----------------------------------------------------------------------
             * COUNTING GAME
             * ----------------------------------------------------------------------
             */

            const countingProcessed =
                await handleCountingGame(
                    message,
                    client
                );

            if (countingProcessed) {
                return;
            }

            /*
             * ----------------------------------------------------------------------
             * PREFIX COMMAND
             * ----------------------------------------------------------------------
             */

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

/*
 * ==========================================================================
 * PREFIX COMMAND
 * ==========================================================================
 */

async function handlePrefixCommand(message, client) {

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

        /*
         * ------------------------------------------------------------------------
         * MUSIC SHORTCUTS
         * ------------------------------------------------------------------------
         */

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

        /*
         * ------------------------------------------------------------------------
         * RESOLVE COMMAND
         * ------------------------------------------------------------------------
         */

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

        /*
         * ------------------------------------------------------------------------
         * MAINTENANCE
         * ------------------------------------------------------------------------
         */

        if (
            isMaintenanceMode() &&
            !isBotOwner(message.author.id)
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

        /*
         * ------------------------------------------------------------------------
         * CATEGORY
         * ------------------------------------------------------------------------
         */

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

        /*
         * ------------------------------------------------------------------------
         * PREFIX RESTRICTION
         * ------------------------------------------------------------------------
         */

        const restriction =
            getPrefixRestriction(
                command,
                args,
                resolveSubcommandAlias
            );

        if (
            !supportsPrefixExecution(command) ||
            restriction.blocked
        ) {

            if (
                restriction.blocked &&
                restriction.reason
            ) {

                const embed =
                    createEmbed({
                        title: 'Slash Command Only',
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

        /*
         * ------------------------------------------------------------------------
         * COMMAND ENABLED
         * ------------------------------------------------------------------------
         */

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
                    title: 'Command Disabled',
                    description:
                        'This command has been disabled for this server.',
                    color: 'error',
                });

            await message.channel.send({
                embeds: [embed],
            }).catch(() => {});

            return;
        }

        /*
         * ------------------------------------------------------------------------
         * ABUSE PROTECTION
         * ------------------------------------------------------------------------
         */

        const mockInteractionForProtection = {
            guildId: message.guild.id,
            user: message.author,
        };

        const abuseProtection =
            await enforceAbuseProtection(
                mockInteractionForProtection,
                command,
                resolvedCommandName
            );

        if (!abuseProtection.allowed) {

            const formattedCooldown =
                formatCooldownDuration(
                    abuseProtection.remainingMs
                );

            const embed =
                createEmbed({
                    title: 'Command Cooldown',
                    description:
                        `This command is on cooldown. Please wait ${formattedCooldown} before trying again.`,
                    color: 'error',
                });

            await message.channel.send({
                embeds: [embed],
            }).catch(() => {});

            return;
        }

        /*
         * ------------------------------------------------------------------------
         * EXECUTE COMMAND
         * ------------------------------------------------------------------------
         */

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

/*
 * ==========================================================================
 * COUNTING GAME
 * ==========================================================================
 */

async function handleCountingGame(message, client) {

    try {

        const config =
            await getCountingGameConfig(
                client,
                message.guild.id
            );

        if (
            !config.enabled ||
            !config.channelId ||
            message.channel.id !== config.channelId
        ) {

            return false;
        }

        const content =
            message.content.trim();

        const validCount =
            isValidCountingMessage(
                content,
                config
            );

        const invalidAttempt =
            !validCount ||
            message.author.id === config.lastUserId;

        if (invalidAttempt) {

            await message.delete().catch(() => {});

            await saveCountingGameConfig(
                client,
                message.guild.id,
                {
                    ...config,
                    nextNumber: 1,
                    lastUserId: null,
                    currentStreak: 0,
                }
            );

            const failureMessage =
                await message.channel.send(
                    `❌ Count broken by <@${message.author.id}>. The sequence has been reset to **1**.`
                );

            setTimeout(() => {
                failureMessage
                    .delete()
                    .catch(() => {});
            }, 10000);

            return true;
        }

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
