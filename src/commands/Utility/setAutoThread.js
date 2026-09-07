import { SlashCommandBuilder, ChannelType, PermissionsBitField } from 'discord.js';
import { logger } from '../../utils/logger.js';

export default {
    data: new SlashCommandBuilder()
        .setName('set_auto_thread')
        .setDescription('Set a channel for auto-thread creation on media uploads')
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('Select the channel for auto-threads')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(true))
        .addStringOption(option =>
            option.setName('name')
                .setDescription('Thread name (optional)')
                .setRequired(false)),
    
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const channel = interaction.options.getChannel('channel');
        const threadName = interaction.options.getString('name') || `${interaction.user.username}'s Media`;

        try {
            // Check permissions
            const botMember = interaction.guild.members.me;
            if (!channel.permissionsFor(botMember).has(PermissionsBitField.Flags.CreatePublicThreads)) {
                return interaction.editReply('❌ I don\'t have permission to create threads in this channel!');
            }

            // Send dummy message
            const sentMessage = await channel.send({
                content: '🔧 Auto-thread system has been activated!'
            });

            // Create thread
            const thread = await sentMessage.startThread({
                name: threadName,
                autoArchiveDuration: 1440 // 24 hours
            });

            // Save channel ID (in memory)
            if (!global.autoThreadChannels) {
                global.autoThreadChannels = [];
            }
            if (!global.autoThreadChannels.includes(channel.id)) {
                global.autoThreadChannels.push(channel.id);
            }

            await interaction.editReply({
                content: `✅ **${channel.name}** has been set for auto-threads!\n` +
                        `📌 Thread name: ${threadName}\n` +
                        `⏰ Archive time: 24 hours`
            });

            logger.info(`Auto-thread enabled for channel: ${channel.name} (${channel.id})`);

        } catch (error) {
            logger.error('Error setting auto-thread:', error);
            await interaction.editReply(`❌ Error: ${error.message}`);
        }
    }
};
