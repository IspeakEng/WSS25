import {
    SlashCommandBuilder,
    PermissionFlagsBits
} from 'discord.js';
import { createLeaveEmbed } from '../../services/welcomeLeaveService.js';

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

            const member = await interaction.guild.members.fetch(interaction.user.id);
            const embed = createLeaveEmbed(member);

            await interaction.channel.send({
                content: `${member}`, // ✅ মেন্টন কাজ করবে (টেস্টের জন্য)
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
