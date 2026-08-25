import {
    SlashCommandBuilder,
    PermissionFlagsBits
} from 'discord.js';
import { createWelcomeEmbed } from '../../services/welcomeLeaveService.js';

const OWNER_ID = '1054967242497982476';

export default {
    data: new SlashCommandBuilder()
        .setName('test-welcome')
        .setDescription('Test the welcome embed')
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
            const embed = createWelcomeEmbed(member);

            await interaction.channel.send({
                content: `${member}`, // ✅ মেন্টন কাজ করবে
                embeds: [embed]
            });

            await interaction.editReply({
                content: `✅ Welcome embed sent! Check the channel.`
            });

        } catch (error) {
            console.error('Test welcome error:', error);
            await interaction.editReply({
                content: `❌ Failed: ${error.message}`
            });
        }
    }
};
