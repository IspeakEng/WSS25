import { SlashCommandBuilder } from 'discord.js';

const OWNER_ID = '1054967242497982476';

export default {
    data: new SlashCommandBuilder()
        .setName('send')
        .setDescription('Send a message through the bot')
        .addStringOption(option =>
            option
                .setName('message')
                .setDescription('The message you want the bot to send')
                .setRequired(true)
        ),

    async execute(interaction) {
        if (interaction.user.id !== OWNER_ID) {
            return interaction.reply({
                content: '❌ You are not allowed to use this command.',
                ephemeral: true
            });
        }

        const message = interaction.options.getString('message');

        await interaction.channel.sendTyping();
        await interaction.channel.send(message);

        await interaction.reply({
            content: '✅ Message sent.',
            ephemeral: true
        });
    }
};
