import {
    SlashCommandBuilder,
    AttachmentBuilder
} from 'discord.js';

const OWNER_ID = '1054967242497982476';

export default {
    data: new SlashCommandBuilder()
        .setName('send')
        .setDescription('Send a message through the bot')

        .addStringOption(option =>
            option
                .setName('message')
                .setDescription('The message you want the bot to send')
                .setRequired(false)
        )

        .addAttachmentOption(option =>
            option
                .setName('file')
                .setDescription('Image, GIF, video, or other file to send')
                .setRequired(false)
        )

        .addStringOption(option =>
            option
                .setName('sticker_id')
                .setDescription('Sticker ID to send')
                .setRequired(false)
        ),

    async execute(interaction) {
        if (interaction.user.id !== OWNER_ID) {
            return interaction.reply({
                content: '❌ You are not allowed to use this command.',
                ephemeral: true
            });
        }

        const message = interaction.options.getString('message');
        const file = interaction.options.getAttachment('file');
        const stickerId = interaction.options.getString('sticker_id');

        // Make sure something is provided
        if (!message && !file && !stickerId) {
            return interaction.reply({
                content: '❌ Give me a message, file, or sticker.',
                ephemeral: true
            });
        }

        try {
            // Show typing indicator
            await interaction.channel.sendTyping();

            // Wait 1.5 seconds
            await new Promise(resolve => setTimeout(resolve, 1500));

            const payload = {};

            // Text
            if (message) {
                payload.content = message;
            }

            // Image / GIF / Video / File
            if (file) {
                payload.files = [
                    new AttachmentBuilder(file.url, {
                        name: file.name
                    })
                ];
            }

            // Sticker
            if (stickerId) {
                payload.stickers = [stickerId];
            }

            // Send
            const sentMessage = await interaction.channel.send(payload);

            await interaction.reply({
                content: `✅ Message sent.\n\n**Message ID:** \`${sentMessage.id}\``,
                ephemeral: true
            });

        } catch (error) {
            console.error('Send command error:', error);

            await interaction.reply({
                content: '❌ Failed to send the message.',
                ephemeral: true
            });
        }
    }
};
