import { SlashCommandBuilder } from 'discord.js';

const OWNER_ID = '1054967242497982476';

export default {
    data: new SlashCommandBuilder()
        .setName('reply')
        .setDescription('Reply to a specific message through the bot')
        .addStringOption(option =>
            option
                .setName('message_link')
                .setDescription('The Discord message link to reply to')
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName('message')
                .setDescription('The message you want the bot to reply with')
                .setRequired(true)
        ),

    async execute(interaction) {
        if (interaction.user.id !== OWNER_ID) {
            return interaction.reply({
                content: '❌ You are not allowed to use this command.',
                ephemeral: true
            });
        }

        const messageLink = interaction.options.getString('message_link');
        const messageContent = interaction.options.getString('message');

        // Discord message link format:
        // https://discord.com/channels/GUILD_ID/CHANNEL_ID/MESSAGE_ID
        const match = messageLink.match(
            /^https?:\/\/(?:www\.)?discord(?:app)?\.com\/channels\/(\d+)\/(\d+)\/(\d+)$/
        );

        if (!match) {
            return interaction.reply({
                content: '❌ Invalid Discord message link.',
                ephemeral: true
            });
        }

        const [, guildId, channelId, messageId] = match;

        if (guildId !== interaction.guildId) {
            return interaction.reply({
                content: '❌ That message is from another server.',
                ephemeral: true
            });
        }

        try {
            const channel = await interaction.client.channels.fetch(channelId);

            if (!channel || !channel.isTextBased()) {
                return interaction.reply({
                    content: '❌ I could not access that channel.',
                    ephemeral: true
                });
            }

            const targetMessage = await channel.messages.fetch(messageId);

            await targetMessage.reply({
                content: messageContent
            });

            await interaction.reply({
                content: '✅ Reply sent.',
                ephemeral: true
            });

        } catch (error) {
            console.error(error);

            await interaction.reply({
                content: '❌ I could not reply to that message. Make sure the link is valid and I can access the channel.',
                ephemeral: true
            });
        }
    }
};
