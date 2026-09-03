import {
    SlashCommandBuilder,
    PermissionFlagsBits,
    MessageFlags,
} from 'discord.js';

import {
    getLinkFilterConfig,
    setLinkFilterRole,
    disableLinkFilter,
} from '../../services/linkFilterService.js';

import { createEmbed } from '../../utils/embeds.js';
import { logger } from '../../utils/logger.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';

export default {
    data: new SlashCommandBuilder()
        .setName('linkfilter')
        .setDescription('Manage the server-wide link and GIF filter')
        .setDefaultMemberPermissions(
            PermissionFlagsBits.Administrator
        )

        // ==========================================================
        // ROLE PERMISSION
        // ==========================================================

        .addSubcommand(subcommand =>
            subcommand
                .setName('role_perm')
                .setDescription(
                    'Allow a role to send links and GIFs'
                )
                .addRoleOption(option =>
                    option
                        .setName('role')
                        .setDescription(
                            'Role that can bypass the link filter'
                        )
                        .setRequired(true)
                )
        )

        // ==========================================================
        // DISABLE
        // ==========================================================

        .addSubcommand(subcommand =>
            subcommand
                .setName('disable')
                .setDescription(
                    'Disable the link and GIF filter'
                )
        )

        // ==========================================================
        // STATUS
        // ==========================================================

        .addSubcommand(subcommand =>
            subcommand
                .setName('status')
                .setDescription(
                    'View the current link filter configuration'
                )
        ),

    async execute(interaction) {

        const deferSuccess =
            await InteractionHelper.safeDefer(
                interaction,
                MessageFlags.Ephemeral
            );

        if (!deferSuccess) {
            return;
        }

        try {

            if (!interaction.guild) {
                return InteractionHelper.safeEditReply(
                    interaction,
                    {
                        content:
                            '❌ This command can only be used inside a server.',
                    }
                );
            }

            const subcommand =
                interaction.options.getSubcommand();

            // ======================================================
            // ROLE PERMISSION
            // ======================================================

            if (subcommand === 'role_perm') {

                const role =
                    interaction.options.getRole('role');

                if (!role) {
                    return InteractionHelper.safeEditReply(
                        interaction,
                        {
                            content:
                                '❌ Please select a role.',
                        }
                    );
                }

                // Bot cannot manage @everyone
                if (role.id === interaction.guild.id) {
                    return InteractionHelper.safeEditReply(
                        interaction,
                        {
                            content:
                                '❌ You cannot use @everyone as the bypass role.',
                        }
                    );
                }

                // Prevent using a role higher than/equal to bot
                const botMember =
                    interaction.guild.members.me;

                if (
                    botMember &&
                    role.position >= botMember.roles.highest.position
                ) {
                    return InteractionHelper.safeEditReply(
                        interaction,
                        {
                            content:
                                '❌ I cannot use this role because it is higher than or equal to my highest role.',
                        }
                    );
                }

                await setLinkFilterRole(
                    interaction.client,
                    interaction.guild.id,
                    role.id
                );

                const embed =
                    createEmbed({
                        title: 'Link Filter Enabled',
                        description:
                            `The server-wide link and GIF filter is now **enabled**.\n\n` +
                            `**Bypass Role:** ${role}\n\n` +
                            `Members without this role will have messages containing links or GIFs automatically deleted.`,
                        color: 'success',
                    });

                return InteractionHelper.safeEditReply(
                    interaction,
                    {
                        embeds: [embed],
                    }
                );
            }

            // ======================================================
            // DISABLE
            // ======================================================

            if (subcommand === 'disable') {

                await disableLinkFilter(
                    interaction.client,
                    interaction.guild.id
                );

                const embed =
                    createEmbed({
                        title: 'Link Filter Disabled',
                        description:
                            'The server-wide link and GIF filter has been disabled.',
                        color: 'info',
                    });

                return InteractionHelper.safeEditReply(
                    interaction,
                    {
                        embeds: [embed],
                    }
                );
            }

            // ======================================================
            // STATUS
            // ======================================================

            if (subcommand === 'status') {

                const config =
                    await getLinkFilterConfig(
                        interaction.client,
                        interaction.guild.id
                    );

                if (
                    !config.enabled ||
                    !config.roleId
                ) {

                    const embed =
                        createEmbed({
                            title: 'Link Filter Status',
                            description:
                                '🔴 **Disabled**\n\nNo role is currently configured.',
                            color: 'info',
                        });

                    return InteractionHelper.safeEditReply(
                        interaction,
                        {
                            embeds: [embed],
                        }
                    );
                }

                const role =
                    interaction.guild.roles.cache.get(
                        config.roleId
                    );

                const roleText =
                    role
                        ? `${role}`
                        : `Unknown Role (${config.roleId})`;

                const embed =
                    createEmbed({
                        title: 'Link Filter Status',
                        description:
                            `🟢 **Enabled**\n\n` +
                            `**Bypass Role:** ${roleText}\n\n` +
                            `Members with this role can send:\n` +
                            `• Links\n` +
                            `• GIFs\n` +
                            `• Discord invites`,
                        color: 'success',
                    });

                return InteractionHelper.safeEditReply(
                    interaction,
                    {
                        embeds: [embed],
                    }
                );
            }

        } catch (error) {

            logger.error(
                'Link filter command error:',
                error
            );

            return InteractionHelper.safeEditReply(
                interaction,
                {
                    content:
                        '❌ Something went wrong while configuring the link filter.',
                }
            );
        }
    },
};
