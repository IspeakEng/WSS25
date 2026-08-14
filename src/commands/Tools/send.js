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

        // Show typing indicator
        await interaction.channel.sendTyping();

        // Wait 1.5 seconds
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Send the message and save the message object
        const sentMessage = await interaction.channel.send(message);

        await interaction.reply({
            content: `✅ Message sent.\n\n**Message ID:** \`${sentMessage.id}\``,
            ephemeral: true
        });
    }
};
