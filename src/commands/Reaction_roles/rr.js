import {
    SlashCommandBuilder,
    PermissionFlagsBits,
    MessageFlags,
} from 'discord.js';

import {
    addReactionRole,
    getReactionRoleMessage,
} from '../../services/reactionRoleService.js';

export default {
    data: new SlashCommandBuilder()
        .setName('rr')
        .setDescription('Manage reaction roles')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)

        .addSubcommand(subcommand =>
            subcommand
                .setName('addmany')
                .setDescription('Add a reaction role to an existing message')

                .addChannelOption(option =>
                    option
                        .setName('channel')
                        .setDescription('Channel containing the message')
                        .setRequired(true)
                )

                .addStringOption(option =>
                    option
                        .setName('message')
                        .setDescription('Message ID')
                        .setRequired(true)
                )

                .addStringOption(option =>
                    option
                        .setName('emoji')
                        .setDescription('Emoji to use for the reaction')
                        .setRequired(true)
                )

                .addRoleOption(option =>
                    option
                        .setName('role')
                        .setDescription('Role to give when reacting')
                        .setRequired(true)
                )
        ),

    async execute(interaction) {
        if (interaction.options.getSubcommand() !== 'addmany') {
            return;
        }

        await interaction.deferReply({
            flags: MessageFlags.Ephemeral,
        });

        try {
            const channel = interaction.options.getChannel('channel');
            const messageId = interaction.options.getString('message');
            const emojiInput = interaction.options.getString('emoji');
            const role = interaction.options.getRole('role');

            // Basic message ID validation
            if (!/^\d{17,19}$/.test(messageId)) {
                return interaction.editReply(
                    '❌ Invalid message ID.'
                );
            }

            // Bot must have Manage Roles
            if (
                !interaction.guild.members.me.permissions.has(
                    PermissionFlagsBits.ManageRoles
                )
            ) {
                return interaction.editReply(
                    '❌ I need **Manage Roles** permission.'
                );
            }

            // Check role hierarchy
            if (
                role.position >=
                interaction.guild.members.me.roles.highest.position
            ) {
                return interaction.editReply(
                    `❌ I cannot manage ${role} because it is above my bot role.`
                );
            }

            // Cannot use @everyone
            if (role.id === interaction.guild.id) {
                return interaction.editReply(
                    '❌ You cannot use @everyone.'
                );
            }

            // Managed roles cannot be assigned
            if (role.managed) {
                return interaction.editReply(
                    '❌ Managed/integration roles cannot be used.'
                );
            }

            // Get the actual Discord message
            const message = await channel.messages
                .fetch(messageId)
                .catch(() => null);

            if (!message) {
                return interaction.editReply(
                    '❌ I could not find that message in the selected channel.'
                );
            }

            // Get existing reaction-role configuration
            const existing = await getReactionRoleMessage(
                interaction.client,
                interaction.guild.id,
                messageId
            );

            // Count existing reaction roles
            const existingRoles = existing?.roles || {};
            const existingCount = Object.keys(existingRoles).length;

            // Maximum 25 reactions per message
            if (
                !existingRoles[emojiInput] &&
                existingCount >= 25
            ) {
                return interaction.editReply(
                    '❌ This message already has **25 reaction roles**, which is the maximum.'
                );
            }

            // Check if emoji is already configured
            if (existingRoles[emojiInput]) {
                return interaction.editReply(
                    `❌ The emoji **${emojiInput}** is already assigned to <@&${existingRoles[emojiInput]}>.`
                );
            }

            // Add reaction to the Discord message
            await message.react(emojiInput).catch(error => {
                throw new Error(
                    `I could not react with ${emojiInput}. Make sure the emoji is valid and I can add reactions.\n\n${error.message}`
                );
            });

            // Save reaction role
            await addReactionRole(
                interaction.client,
                interaction.guild.id,
                messageId,
                emojiInput,
                role.id
            );

            const total = existingCount + 1;

            return interaction.editReply(
                `✅ Reaction role added!\n\n` +
                `**Emoji:** ${emojiInput}\n` +
                `**Role:** ${role}\n` +
                `**Message:** [Jump to message](${message.url})\n` +
                `**Reaction roles:** ${total}/25`
            );

        } catch (error) {
            console.error('RR addmany error:', error);

            return interaction.editReply(
                `❌ Failed to add reaction role.\n\`\`\`\n${error.message}\n\`\`\``
            );
        }
    },
};
