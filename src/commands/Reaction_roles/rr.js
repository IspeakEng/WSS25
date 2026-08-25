import {
    SlashCommandBuilder,
    PermissionFlagsBits,
    MessageFlags,
} from 'discord.js';

// Change this import - from service to event file
import { saveReactionRole } from '../events/messageReactionAdd.js';

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

            // ========== MEMORY STORAGE CHECK ==========
            // Check if emoji already exists in memory
            // Note: We need to check from the event file's memory
            // Since we can't directly access roleConfigs from here,
            // we'll rely on the save function to handle duplicate check
            
            // Add reaction to the Discord message
            await message.react(emojiInput).catch(error => {
                throw new Error(
                    `I could not react with ${emojiInput}. Make sure the emoji is valid and I can add reactions.\n\n${error.message}`
                );
            });

            // ========== SAVE TO MEMORY ==========
            // Save reaction role using memory storage
            const saved = saveReactionRole(
                messageId,
                emojiInput,
                role.id,
                interaction.guildId,
                channel.id
            );

            if (!saved) {
                return interaction.editReply(
                    '❌ Failed to save reaction role to memory.'
                );
            }

            return interaction.editReply(
                `✅ Reaction role added!\n\n` +
                `**Emoji:** ${emojiInput}\n` +
                `**Role:** ${role}\n` +
                `**Message:** [Jump to message](${message.url})\n` +
                `**Storage:** Memory (will reset on bot restart)`
            );

        } catch (error) {
            console.error('RR addmany error:', error);

            return interaction.editReply(
                `❌ Failed to add reaction role.\n\`\`\`\n${error.message}\n\`\`\``
            );
        }
    },
};
