import {
    SlashCommandBuilder,
    PermissionFlagsBits,
    MessageFlags,
} from 'discord.js';

// ========== IMPORT FROM SERVICE ==========
import {
    addReactionRole,
    addExclusiveReactionRole,
    getReactionRoleMessage,
    removeReactionRole
} from '../../services/reactionRoleService.js';

export default {
    data: new SlashCommandBuilder()
        .setName('rr')
        .setDescription('Manage reaction roles')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)

        // ========== ADDMANY ==========
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
        )

        // ========== EXCLUSIVE ==========
        .addSubcommand(subcommand =>
            subcommand
                .setName('exclusive')
                .setDescription('Add an exclusive reaction role (user can only have one from this group)')
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
                .addStringOption(option =>
                    option
                        .setName('group')
                        .setDescription('Exclusive group name (e.g., region, color, game)')
                        .setRequired(true)
                )
        )

        // ========== REMOVE ==========
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('Remove a reaction role from a message')
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
                        .setDescription('Emoji to remove')
                        .setRequired(true)
                )
        ),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        // ========== ADDMANY ==========
        if (subcommand === 'addmany') {
            await interaction.deferReply({ flags: MessageFlags.Ephemeral });

            try {
                const channel = interaction.options.getChannel('channel');
                const messageId = interaction.options.getString('message');
                const emojiInput = interaction.options.getString('emoji');
                const role = interaction.options.getRole('role');

                if (!/^\d{17,19}$/.test(messageId)) {
                    return interaction.editReply('❌ Invalid message ID.');
                }

                if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.ManageRoles)) {
                    return interaction.editReply('❌ I need **Manage Roles** permission.');
                }

                if (role.position >= interaction.guild.members.me.roles.highest.position) {
                    return interaction.editReply(`❌ I cannot manage ${role} because it is above my bot role.`);
                }

                if (role.id === interaction.guild.id) {
                    return interaction.editReply('❌ You cannot use @everyone.');
                }

                if (role.managed) {
                    return interaction.editReply('❌ Managed/integration roles cannot be used.');
                }

                const message = await channel.messages.fetch(messageId).catch(() => null);
                if (!message) {
                    return interaction.editReply('❌ I could not find that message in the selected channel.');
                }

                await message.react(emojiInput).catch(error => {
                    throw new Error(`Could not react with ${emojiInput}. ${error.message}`);
                });

                await addReactionRole(
                    interaction.client,
                    interaction.guildId,
                    messageId,
                    emojiInput,
                    role.id,
                    channel.id
                );

                return interaction.editReply(
                    `✅ Reaction role added!\n\n` +
                    `**Emoji:** ${emojiInput}\n` +
                    `**Role:** ${role}\n` +
                    `**Message:** [Jump to message](${message.url})`
                );

            } catch (error) {
                console.error('RR addmany error:', error);
                return interaction.editReply(`❌ Failed to add reaction role.\n\`\`\`\n${error.message}\n\`\`\``);
            }
        }

        // ========== EXCLUSIVE ==========
        if (subcommand === 'exclusive') {
            await interaction.deferReply({ flags: MessageFlags.Ephemeral });

            try {
                const channel = interaction.options.getChannel('channel');
                const messageId = interaction.options.getString('message');
                const emojiInput = interaction.options.getString('emoji');
                const role = interaction.options.getRole('role');
                const groupName = interaction.options.getString('group');

                if (!/^\d{17,19}$/.test(messageId)) {
                    return interaction.editReply('❌ Invalid message ID.');
                }

                if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.ManageRoles)) {
                    return interaction.editReply('❌ I need **Manage Roles** permission.');
                }

                if (role.position >= interaction.guild.members.me.roles.highest.position) {
                    return interaction.editReply(`❌ I cannot manage ${role} because it is above my bot role.`);
                }

                if (role.id === interaction.guild.id) {
                    return interaction.editReply('❌ You cannot use @everyone.');
                }

                if (role.managed) {
                    return interaction.editReply('❌ Managed/integration roles cannot be used.');
                }

                if (!groupName || groupName.length < 2) {
                    return interaction.editReply('❌ Group name must be at least 2 characters long.');
                }

                const message = await channel.messages.fetch(messageId).catch(() => null);
                if (!message) {
                    return interaction.editReply('❌ I could not find that message in the selected channel.');
                }

                await message.react(emojiInput).catch(error => {
                    throw new Error(`Could not react with ${emojiInput}. ${error.message}`);
                });

                await addExclusiveReactionRole(
                    interaction.client,
                    interaction.guildId,
                    messageId,
                    emojiInput,
                    role.id,
                    groupName,
                    channel.id
                );

                return interaction.editReply(
                    `✅ Exclusive reaction role added!\n\n` +
                    `**Emoji:** ${emojiInput}\n` +
                    `**Role:** ${role}\n` +
                    `**Group:** ${groupName}\n` +
                    `**Message:** [Jump to message](${message.url})\n\n` +
                    `⚠️ User can only have ONE role from this group.`
                );

            } catch (error) {
                console.error('RR exclusive error:', error);
                return interaction.editReply(`❌ Failed to add exclusive role.\n\`\`\`\n${error.message}\n\`\`\``);
            }
        }

        // ========== REMOVE ==========
        if (subcommand === 'remove') {
            await interaction.deferReply({ flags: MessageFlags.Ephemeral });

            try {
                const channel = interaction.options.getChannel('channel');
                const messageId = interaction.options.getString('message');
                const emojiInput = interaction.options.getString('emoji');

                if (!/^\d{17,19}$/.test(messageId)) {
                    return interaction.editReply('❌ Invalid message ID.');
                }

                const data = await getReactionRoleMessage(
                    interaction.client,
                    interaction.guildId,
                    messageId
                );

                if (!data || !data.roles || !data.roles[emojiInput]) {
                    return interaction.editReply(`❌ No reaction role found for emoji **${emojiInput}** on this message.`);
                }

                await removeReactionRole(
                    interaction.client,
                    interaction.guildId,
                    messageId,
                    emojiInput
                );

                try {
                    const message = await channel.messages.fetch(messageId);
                    const reaction = message.reactions.cache.get(emojiInput);
                    if (reaction) {
                        await reaction.remove();
                    }
                } catch (e) {
                    // Ignore
                }

                return interaction.editReply(
                    `✅ Removed reaction role **${emojiInput}** from message.`
                );

            } catch (error) {
                console.error('RR remove error:', error);
                return interaction.editReply(`❌ Failed to remove reaction role.\n\`\`\`\n${error.message}\n\`\`\``);
            }
        }
    },
};
