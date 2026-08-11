import {
    SlashCommandBuilder,
    PermissionFlagsBits,
} from 'discord.js';

import { getAFKKey } from '../../utils/database.js';

export default {
    data: new SlashCommandBuilder()
        .setName('afk')
        .setDescription('Set or remove your AFK status.')

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

        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('Remove your AFK status.')
        ),

    async execute(interaction, client) {
        const subcommand = interaction.options.getSubcommand();

        if (!interaction.guild) {
            return interaction.reply({
                content: '❌ This command can only be used in a server.',
                ephemeral: true,
            });
        }

        const key = getAFKKey(
            interaction.guild.id,
            interaction.user.id
        );

        if (subcommand === 'set') {
            const reason =
                interaction.options.getString('reason') ||
                'No reason provided';

            await client.db.set(key, {
                reason,
                timestamp: Date.now(),
            });

            return interaction.reply({
                content: `💤 You are now AFK — **${reason}**`,
            });
        }

        if (subcommand === 'remove') {
            const existing = await client.db.get(key, null);

            if (!existing) {
                return interaction.reply({
                    content: '❌ You are not AFK.',
                    ephemeral: true,
                });
            }

            await client.db.delete(key);

            return interaction.reply({
                content: '👋 Welcome back! Your AFK status has been removed.',
            });
        }
    },
};
