import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('send')
        .setDescription('Send a message through the bot')
        .addStringOption(option =>
            option
                .setName('message')
                .setDescription('The message you want the bot to send')
                .setRequired(true)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const message = interaction.options.getString('message');

        await interaction.channel.send(message);

        await interaction.reply({
            content: '✅ Message sent.',
            ephemeral: true
        });
    }
};
