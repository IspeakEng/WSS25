import {
    SlashCommandBuilder,
    PermissionFlagsBits,
    ChannelType
} from 'discord.js';

import {
    setLeaveChannel
} from '../../services/welcomeLeaveService.js';

const OWNER_ID = '1054967242497982476';

export default {
    data: new SlashCommandBuilder()
        .setName('leave-set')
        .setDescription('Set the leave message channel')
        .setDefaultMemberPermissions(
            PermissionFlagsBits.Administrator
        )
        .addChannelOption(option =>
            option
                .setName('channel')
                .setDescription(
                    'Channel where leave messages will be sent'
                )
                .setRequired(true)
                .addChannelTypes(
                    ChannelType.GuildText,
                    ChannelType.GuildAnnouncement
                )
        ),

    async execute(interaction) {
        // ==========================================
        // OWNER CHECK
        // ==========================================

        if (interaction.user.id !== OWNER_ID) {
            return interaction.reply({
                content:
                    '❌ Only the bot owner can use this command.',
                ephemeral: true
            });
        }

        // ==========================================
        // GUILD CHECK
        // ==========================================

        if (!interaction.guildId) {
            return interaction.reply({
                content:
                    '❌ This command can only be used inside a server.',
                ephemeral: true
            });
        }

        // ==========================================
        // GET CHANNEL
        // ==========================================

        const channel =
            interaction.options.getChannel('channel');

        if (!channel) {
            return interaction.reply({
                content:
                    '❌ Please select a channel.',
                ephemeral: true
            });
        }

        // ==========================================
        // CHANNEL TYPE CHECK
        // ==========================================

        if (!channel.isTextBased()) {
            return interaction.reply({
                content:
                    '❌ Please select a text-based channel.',
                ephemeral: true
            });
        }

        // ==========================================
        // SAVE
        // ==========================================

        try {
            await setLeaveChannel(
                interaction.client,
                interaction.guildId,
                channel.id
            );

            // ======================================
            // VERIFY DATABASE SAVE
            // ======================================

            const saved =
                await interaction.client.db.get(
                    `leave_${interaction.guildId}`
                );

            if (
                !saved ||
                saved.channelId !== channel.id
            ) {
                return interaction.reply({
                    content:
                        '❌ Failed to verify the leave channel setting.',
                    ephemeral: true
                });
            }

            // ======================================
            // SUCCESS
            // ======================================

            return interaction.reply({
                content:
                    `✅ **Leave channel set!**\n\n` +
                    `**Channel:** ${channel}\n` +
                    `**Channel ID:** \`${channel.id}\``,
                ephemeral: true
            });

        } catch (error) {
            console.error(
                'Leave channel set error:',
                error
            );

            return interaction.reply({
                content:
                    `❌ **Failed to set leave channel.**\n` +
                    `\`${error.message}\``,
                ephemeral: true
            });
        }
    }
};
