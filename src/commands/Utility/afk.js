import {
    SlashCommandBuilder,
} from 'discord.js';

import { getAFKKey } from '../../utils/database.js';

export default {
    data: new SlashCommandBuilder()
        .setName('afk')
        .setDescription('Set or remove your AFK status.')

        // ------------------------------------------------------------
        // SET
        // ------------------------------------------------------------

        .addSubcommand(subcommand =>
            subcommand
                .setName('set')
                .setDescription('Set your AFK status.')
                .addStringOption(option =>
                    option
                        .setName('reason')
                        .setDescription('Why are you AFK?')
                        .setRequired(false)
                )
        )

        // ------------------------------------------------------------
        // REMOVE
        // ------------------------------------------------------------

        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('Remove your AFK status.')
        ),

    async execute(interaction, guildConfig, client) {
        try {
            // ------------------------------------------------------------
            // SERVER CHECK
            // ------------------------------------------------------------

            if (!interaction.guild) {
                return interaction.reply({
                    content:
                        '❌ This command can only be used in a server.',
                    ephemeral: true,
                });
            }

            // ------------------------------------------------------------
            // DATABASE CHECK
            // ------------------------------------------------------------

            if (!client?.db) {
                return interaction.reply({
                    content:
                        '❌ Database is not available right now.',
                    ephemeral: true,
                });
            }

            const subcommand =
                interaction.options.getSubcommand();

            const key =
                getAFKKey(
                    interaction.guild.id,
                    interaction.user.id
                );

            // ============================================================
            // SET AFK
            // ============================================================

            if (subcommand === 'set') {
                const reason =
                    interaction.options.getString('reason') ||
                    'No reason provided';

                await client.db.set(
                    key,
                    {
                        reason: reason,
                       timestamp: new Date().toISOString(),
                    }
                );

                return interaction.reply({
                    content:
                        `💤 You are now AFK — **${reason}**`,
                });
            }

            // ============================================================
            // REMOVE AFK
            // ============================================================

            if (subcommand === 'remove') {
                const existing =
                    await client.db.get(
                        key,
                        null
                    );

                if (!existing) {
                    return interaction.reply({
                        content:
                            '❌ You are not AFK.',
                        ephemeral: true,
                    });
                }

                await client.db.delete(key);

                return interaction.reply({
                    content:
                        '👋 Welcome back! Your AFK status has been removed.',
                });
            }

        } catch (error) {
            console.error(
                'AFK command error:',
                error
            );

            if (
                interaction.replied ||
                interaction.deferred
            ) {
                return interaction.followUp({
                    content:
                        '❌ Failed to update your AFK status.',
                    ephemeral: true,
                }).catch(() => {});
            }

            return interaction.reply({
                content:
                    '❌ Failed to update your AFK status.',
                ephemeral: true,
            }).catch(() => {});
        }
    },
};
