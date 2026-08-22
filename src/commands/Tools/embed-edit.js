import {
    SlashCommandBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder,
    EmbedBuilder
} from 'discord.js';

const OWNER_ID = '1054967242497982476';

export default {
    data: new SlashCommandBuilder()
        .setName('embed-edit')
        .setDescription('Open the embed editor for a bot message')

        // ==========================================
        // MESSAGE ID
        // ==========================================

        .addStringOption(option =>
            option
                .setName('message_id')
                .setDescription('The ID of the embed message')
                .setRequired(true)
        )

        // ==========================================
        // CHANNEL ID
        // ==========================================

        .addStringOption(option =>
            option
                .setName('channel_id')
                .setDescription('Channel where the message is located')
                .setRequired(false)
        ),

    async execute(interaction) {

        // ==========================================
        // OWNER CHECK
        // ==========================================

        if (interaction.user.id !== OWNER_ID) {
            return interaction.reply({
                content: '❌ You are not allowed to use this command.',
                ephemeral: true
            });
        }

        const messageId =
            interaction.options.getString('message_id');

        const channelId =
            interaction.options.getString('channel_id');

        try {

            // ==========================================
            // FIND CHANNEL
            // ==========================================

            let targetChannel;

            if (channelId) {
                targetChannel =
                    await interaction.client.channels.fetch(channelId);
            } else {
                targetChannel =
                    interaction.channel;
            }

            if (!targetChannel?.isTextBased()) {
                return interaction.reply({
                    content:
                        '❌ I could not find a valid text channel.',
                    ephemeral: true
                });
            }

            // ==========================================
            // FETCH MESSAGE
            // ==========================================

            const message =
                await targetChannel.messages.fetch(messageId);

            // ==========================================
            // BOT MESSAGE CHECK
            // ==========================================

            if (
                message.author.id !==
                interaction.client.user.id
            ) {
                return interaction.reply({
                    content:
                        '❌ I can only edit messages sent by me.',
                    ephemeral: true
                });
            }

            // ==========================================
            // CHECK EMBED
            // ==========================================

            if (!message.embeds.length) {
                return interaction.reply({
                    content:
                        '❌ This message does not contain an embed.',
                    ephemeral: true
                });
            }

            const oldEmbed = message.embeds[0];

            // ==========================================
            // CREATE MODAL
            // ==========================================

            const modal = new ModalBuilder()
                .setCustomId(
                    `embed_edit:${message.id}:${targetChannel.id}`
                )
                .setTitle('Edit Embed');

            // ==========================================
            // TITLE
            // ==========================================

            const titleInput = new TextInputBuilder()
                .setCustomId('title')
                .setLabel('Embed Title')
                .setStyle(TextInputStyle.Short)
                .setRequired(false)
                .setMaxLength(256)
                .setPlaceholder(
                    oldEmbed.title || 'Enter embed title'
                )
                .setValue(
                    oldEmbed.title || ''
                );

            // ==========================================
            // DESCRIPTION
            // ==========================================

            const descriptionInput = new TextInputBuilder()
                .setCustomId('description')
                .setLabel('Embed Description')
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(false)
                .setMaxLength(4000)
                .setPlaceholder(
                    'Enter your embed description'
                )
                .setValue(
                    oldEmbed.description || ''
                );

            // ==========================================
            // COLOR
            // ==========================================

            let currentColor = '';

            if (oldEmbed.color !== null) {
                currentColor =
                    `#${oldEmbed.color
                        .toString(16)
                        .padStart(6, '0')}`;
            }

            const colorInput = new TextInputBuilder()
                .setCustomId('color')
                .setLabel('Embed Color')
                .setStyle(TextInputStyle.Short)
                .setRequired(false)
                .setMaxLength(7)
                .setPlaceholder('#000000')
                .setValue(currentColor);

            // ==========================================
            // IMAGE
            // ==========================================

            const imageInput = new TextInputBuilder()
                .setCustomId('image')
                .setLabel('Image / GIF URL')
                .setStyle(TextInputStyle.Short)
                .setRequired(false)
                .setPlaceholder(
                    oldEmbed.image?.url ||
                    'https://example.com/image.gif'
                )
                .setValue(
                    oldEmbed.image?.url || ''
                );

            // ==========================================
            // THUMBNAIL
            // ==========================================

            const thumbnailInput = new TextInputBuilder()
                .setCustomId('thumbnail')
                .setLabel('Thumbnail URL')
                .setStyle(TextInputStyle.Short)
                .setRequired(false)
                .setPlaceholder(
                    oldEmbed.thumbnail?.url ||
                    'https://example.com/thumbnail.png'
                )
                .setValue(
                    oldEmbed.thumbnail?.url || ''
                );

            // ==========================================
            // ADD MODAL COMPONENTS
            // ==========================================

            modal.addComponents(

                new ActionRowBuilder()
                    .addComponents(titleInput),

                new ActionRowBuilder()
                    .addComponents(descriptionInput),

                new ActionRowBuilder()
                    .addComponents(colorInput),

                new ActionRowBuilder()
                    .addComponents(imageInput),

                new ActionRowBuilder()
                    .addComponents(thumbnailInput)
            );

            // ==========================================
            // SHOW MODAL
            // ==========================================

            await interaction.showModal(modal);

        } catch (error) {

            console.error(
                'Embed edit command error:',
                error
            );

            if (!interaction.replied) {
                await interaction.reply({
                    content:
                        '❌ Could not open the embed editor.\n' +
                        'Check the Message ID and Channel ID.',
                    ephemeral: true
                }).catch(() => {});
            }
        }
    }
};
