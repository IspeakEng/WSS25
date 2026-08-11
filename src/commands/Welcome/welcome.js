import { getColor } from '../../config/bot.js';
import {
    SlashCommandBuilder,
    PermissionFlagsBits,
    ChannelType,
    EmbedBuilder
} from 'discord.js';

import {
    getWelcomeConfig,
    updateWelcomeConfig
} from '../../utils/database.js';

import {
    formatWelcomeMessage,
    truncateForEmbedField
} from '../../utils/welcome.js';

import { logger } from '../../utils/logger.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
import {
    ErrorTypes,
    replyUserError
} from '../../utils/errorHandler.js';

export default {
    data: new SlashCommandBuilder()
        .setName('welcome')
        .setDescription('Configure the welcome system')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)

        .addSubcommand(subcommand =>
            subcommand
                .setName('setup')
                .setDescription('Set up the welcome message')

                // Welcome channel
                .addChannelOption(option =>
                    option
                        .setName('channel')
                        .setDescription('The channel to send welcome messages to')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true)
                )

                // Welcome message
                .addStringOption(option =>
                    option
                        .setName('message')
                        .setDescription(
                            'Welcome message. Variables: {user}, {username}, {server}, {memberCount}'
                        )
                        .setRequired(true)
                )

                // Optional image
                .addStringOption(option =>
                    option
                        .setName('image')
                        .setDescription(
                            'URL of the image to include in the welcome message'
                        )
                        .setRequired(false)
                )

                // Ping member
                .addBooleanOption(option =>
                    option
                        .setName('ping')
                        .setDescription(
                            'Whether to ping the user in the welcome message'
                        )
                        .setRequired(false)
                )
        ),

    async execute(interaction) {
        try {
            const deferSuccess =
                await InteractionHelper.safeDefer(interaction);

            if (!deferSuccess) {
                logger.warn('[Welcome] Failed to defer interaction', {
                    userId: interaction.user.id,
                    guildId: interaction.guildId,
                    commandName: 'welcome'
                });

                return;
            }
        } catch (deferError) {
            logger.error('[Welcome] Defer error', {
                error: deferError.message
            });

            return;
        }

        const { options, guild, client } = interaction;

        // ================================
        // PERMISSION CHECK
        // ================================

        if (
            !interaction.memberPermissions?.has(
                PermissionFlagsBits.ManageGuild
            )
        ) {
            return await replyUserError(interaction, {
                type: ErrorTypes.PERMISSION,
                message:
                    'You need the **Manage Server** permission to use `/welcome`.'
            });
        }

        const subcommand = options.getSubcommand();

        // ================================
        // /welcome setup
        // ================================

        if (subcommand === 'setup') {
            const channel = options.getChannel('channel');
            const message = options.getString('message');
            const image = options.getString('image');
            const ping = options.getBoolean('ping') ?? false;

            // ================================
            // VALIDATION
            // ================================

            if (!channel) {
                return await replyUserError(interaction, {
                    type: ErrorTypes.VALIDATION,
                    message: 'Please select a welcome channel.'
                });
            }

            if (!message || message.trim().length === 0) {
                return await replyUserError(interaction, {
                    type: ErrorTypes.VALIDATION,
                    message: 'Welcome message cannot be empty.'
                });
            }

            // Check image URL
            if (image) {
                try {
                    new URL(image);
                } catch {
                    logger.warn(
                        `[Welcome] Invalid image URL from ${interaction.user.tag}: ${image}`
                    );

                    return await replyUserError(interaction, {
                        type: ErrorTypes.VALIDATION,
                        message:
                            'Please provide a valid image URL starting with `http://` or `https://`.'
                    });
                }
            }

            // ================================
            // CHECK EXISTING CONFIG
            // ================================

            const existingConfig = await getWelcomeConfig(
                client,
                guild.id
            );

            if (existingConfig?.channelId) {
                logger.info(
                    `[Welcome] Configuration already exists for guild ${guild.id}`
                );

                return await replyUserError(interaction, {
                    type: ErrorTypes.UNKNOWN,
                    message:
                        `Welcome is already configured for <#${existingConfig.channelId}>.\n\n` +
                        `Use **/greet dashboard** to change the channel, message, ping, or image.`
                });
            }

            // ================================
            // SAVE CONFIGURATION
            // ================================

            try {
                await updateWelcomeConfig(client, guild.id, {
                    enabled: true,
                    channelId: channel.id,
                    welcomeMessage: message.trim(),
                    welcomeImage: image || undefined,
                    welcomePing: ping
                });

                logger.info(
                    `[Welcome] Setup completed by ${interaction.user.tag} ` +
                    `for ${guild.name} (${guild.id})`
                );

                // ================================
                // PREVIEW MESSAGE
                // ================================

                const previewMessage = formatWelcomeMessage(
                    message,
                    {
                        user: interaction.user,
                        guild
                    }
                );

                // ================================
                // CONFIRMATION EMBED
                // ================================

                const embed = new EmbedBuilder()
                    .setColor(getColor('success'))
                    .setTitle('Welcome System Configured')
                    .setDescription(
                        `Welcome messages will now be sent to ${channel}.`
                    )
                    .addFields(
                        {
                            name: 'Message Preview',
                            value: truncateForEmbedField(
                                previewMessage
                            )
                        },
                        {
                            name: 'Ping User',
                            value: ping ? 'Yes' : 'No',
                            inline: true
                        },
                        {
                            name: 'Status',
                            value: 'Enabled',
                            inline: true
                        }
                    )
                    .setFooter({
                        text:
                            'Use /greet dashboard to customize your welcome system.'
                    });

                if (image) {
                    embed.setImage(image);
                }

                await InteractionHelper.safeEditReply(
                    interaction,
                    {
                        embeds: [embed]
                    }
                );

            } catch (error) {
                logger.error(
                    `[Welcome] Failed to save configuration for guild ${guild.id}`,
                    {
                        error: error.message
                    }
                );

                return await replyUserError(interaction, {
                    type: ErrorTypes.UNKNOWN,
                    message:
                        'An error occurred while configuring the welcome system. Please try again.'
                });
            }
        }
    }
};
