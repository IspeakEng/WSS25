import {
    SlashCommandBuilder,
    PermissionFlagsBits
} from 'discord.js';
import { testLeave } from '../../services/welcomeLeaveService.js';

const OWNER_ID = '1054967242497982476';

export default {
    data: new SlashCommandBuilder()
        .setName('test-leave')
        .setDescription('Test the leave embed')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        if (interaction.user.id !== OWNER_ID) {
            return interaction.reply({
                content: '❌ Only the bot owner can use this.',
                ephemeral: true
            });
        }

        try {
            await interaction.deferReply({ ephemeral: true });

            const embed = await testLeave(
                interaction.client,
                interaction.guildId,
                interaction.user.id
            );

            await interaction.channel.send({
                content: `🧪 **Leave Embed Test**`,
                embeds: [embed]
            });

            await interaction.editReply({
                content: `✅ Leave embed sent! Check the channel.`
            });

        } catch (error) {
            console.error('Test leave error:', error);
            await interaction.editReply({
                content: `❌ Failed: ${error.message}`
            });
        }
    }
};
