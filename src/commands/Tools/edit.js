import { SlashCommandBuilder } from 'discord.js';

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
                .setDescription('The new message content')
                .setRequired(true)
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

        try {
            const message = await interaction.channel.messages.fetch(messageId);

            if (message.author.id !== interaction.client.user.id) {
                return interaction.reply({
                    content: '❌ I can only edit messages sent by me.',
                    ephemeral: true
                });
            }

            await message.edit(newMessage);

            await interaction.reply({
                content: '✅ Message edited successfully.',
                ephemeral: true
            });

        } catch (error) {
            console.error('Edit message error:', error);

            await interaction.reply({
                content: '❌ Could not find or edit that message.',
                ephemeral: true
            });
        }
    }
};
