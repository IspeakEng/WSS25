import {
    SlashCommandBuilder,
    AttachmentBuilder,
} from 'discord.js';

const OWNER_ID = '1054967242497982476';

export default {
    data: new SlashCommandBuilder()
        .setName('edit')
        .setDescription('Edit a message sent by the bot')

        .addStringOption(option =>
            option
                .setName('message_id')
                .setDescription('The ID of the message you want to edit')
                .setRequired(true)
        )

        .addStringOption(option =>
            option
                .setName('message')
                .setDescription('New message content')
                .setRequired(false)
        )

        .addAttachmentOption(option =>
            option
                .setName('file')
                .setDescription('New image, GIF, video, or file')
                .setRequired(false)
        ),

    async execute(interaction) {
        if (interaction.user.id !== OWNER_ID) {
            return interaction.reply({
                content: '❌ You are not allowed to use this command.',
                ephemeral: true
            });
        }

        const messageId = interaction.options.getString('message_id');
        const newMessage = interaction.options.getString('message');
        const file = interaction.options.getAttachment('file');

        // Make sure something is provided to edit
        if (!newMessage && !file) {
            return interaction.reply({
                content: '❌ Provide a new message or a new file.',
                ephemeral: true
            });
        }

        try {
            // Fetch the original message
            const message = await interaction.channel.messages.fetch(messageId);

            // Only allow editing bot's own messages
            if (message.author.id !== interaction.client.user.id) {
                return interaction.reply({
                    content: '❌ I can only edit messages sent by me.',
                    ephemeral: true
                });
            }

            const editData = {};

            // Edit text
            if (newMessage) {
                editData.content = newMessage;
            }

            // Replace attachment
            if (file) {
                editData.files = [
                    new AttachmentBuilder(file.url, {
                        name: file.name
                    })
                ];
            }

            // Edit the message
            await message.edit(editData);

            await interaction.reply({
                content: '✅ Message edited successfully.',
                ephemeral: true
            });

        } catch (error) {
            console.error('Edit command error:', error);

            await interaction.reply({
                content:
                    '❌ Could not edit that message.\n' +
                    'Make sure the Message ID is correct and the message is in this channel.',
                ephemeral: true
            });
        }
    }
};
