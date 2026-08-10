import { SlashCommandBuilder } from 'discord.js';

const OWNER_ID = '1054967242497982476';

export default {
    data: new SlashCommandBuilder()
        .setName('react')
        .setDescription('React to a message through the bot')
        .addStringOption(option =>
            option
                .setName('message_link')
                .setDescription('The Discord message link to react to')
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName('emoji')
                .setDescription('The emoji to react with')
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
        const emoji = interaction.options.getString('emoji');

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

            await targetMessage.react(emoji);

            await interaction.reply({
                content: `✅ Reacted with ${emoji}`,
                ephemeral: true
            });

        } catch (error) {
            console.error(error);

            await interaction.reply({
                content: '❌ I could not react to that message. Make sure the emoji and message link are valid.',
                ephemeral: true
            });
        }
    }
};
