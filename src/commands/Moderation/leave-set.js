import {
    SlashCommandBuilder,
    PermissionFlagsBits
} from 'discord.js';
import { setLeaveChannel } from '../../services/welcomeLeaveService.js';

const OWNER_ID = '1054967242497982476';

export default {
    data: new SlashCommandBuilder()
        .setName('leave-set')
        .setDescription('Set the leave message channel')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addChannelOption(option =>
            option
                .setName('channel')
                .setDescription('Channel to send leave messages')
                .setRequired(true)
        ),

    async execute(interaction) {
        if (interaction.user.id !== OWNER_ID) {
            return interaction.reply({
                content: '❌ Only the bot owner can use this.',
                ephemeral: true
            });
        }

        const channel = interaction.options.getChannel('channel');

        if (!channel.isTextBased()) {
            return interaction.reply({
                content: '❌ This is not a text channel.',
                ephemeral: true
            });
        }

        try {
            await setLeaveChannel(interaction.client, interaction.guildId, channel.id);

            await interaction.reply({
                content: `✅ **Leave channel set!**\n\n**Channel:** ${channel}`,
                ephemeral: true
            });

        } catch (error) {
            console.error('Leave set error:', error);
            await interaction.reply({
                content: `❌ Failed: ${error.message}`,
                ephemeral: true
            });
        }
    }
};
