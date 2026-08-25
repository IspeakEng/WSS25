// src/handlers/interactionHandlers/embedEditButton.js
import {
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder
} from 'discord.js';

const OWNER_ID = '1054967242497982476';

export default {
    name: 'embed_edit_button',

    async execute(interaction, client) {
        // ==========================================
        // OWNER CHECK
        // ==========================================
        if (interaction.user.id !== OWNER_ID) {
            return interaction.reply({
                content: '❌ Only the bot owner can use this.',
                ephemeral: true
            });
        }

        try {
            // ==========================================
            // PARSE CUSTOM ID
            // ==========================================
            const [, messageId, channelId] = interaction.customId.split('_');

            // ==========================================
            // FETCH MESSAGE
            // ==========================================
            const channel = await client.channels.fetch(channelId);
            if (!channel?.isTextBased()) {
                return interaction.reply({
                    content: '❌ Channel not found.',
                    ephemeral: true
                });
            }

            const message = await channel.messages.fetch(messageId);
            if (!message) {
                return interaction.reply({
                    content: '❌ Message not found.',
                    ephemeral: true
                });
            }

            const currentEmbed = message.embeds?.[0];
            if (!currentEmbed) {
                return interaction.reply({
                    content: '❌ No embed found in this message.',
                    ephemeral: true
                });
            }

            // ==========================================
            // GET CURRENT VALUES
            // ==========================================
            const currentTitle = currentEmbed.title || '';
            const currentDescription = currentEmbed.description || '';
            const currentColor = currentEmbed.color ? 
                `#${currentEmbed.color.toString(16).padStart(6, '0')}` : '';
            const currentImage = currentEmbed.image?.url || '';
            const currentThumbnail = currentEmbed.thumbnail?.url || '';

            // ==========================================
            // CREATE MODAL
            // ==========================================
            const modal = new ModalBuilder()
                .setCustomId(`embed_edit:${messageId}:${channelId}`)
                .setTitle('Edit Embed');

            const titleInput = new TextInputBuilder()
                .setCustomId('title')
                .setLabel('Title')
                .setStyle(TextInputStyle.Short)
                .setValue(currentTitle)
                .setRequired(false);

            const descriptionInput = new TextInputBuilder()
                .setCustomId('description')
                .setLabel('Description')
                .setStyle(TextInputStyle.Paragraph)
                .setValue(currentDescription)
                .setRequired(false);

            const colorInput = new TextInputBuilder()
                .setCustomId('color')
                .setLabel('Color (e.g., #ff0000)')
                .setStyle(TextInputStyle.Short)
                .setValue(currentColor)
                .setRequired(false);

            const imageInput = new TextInputBuilder()
                .setCustomId('image')
                .setLabel('Image URL')
                .setStyle(TextInputStyle.Short)
                .setValue(currentImage)
                .setRequired(false);

            const thumbnailInput = new TextInputBuilder()
                .setCustomId('thumbnail')
                .setLabel('Thumbnail URL')
                .setStyle(TextInputStyle.Short)
                .setValue(currentThumbnail)
                .setRequired(false);

            const row1 = new ActionRowBuilder().addComponents(titleInput);
            const row2 = new ActionRowBuilder().addComponents(descriptionInput);
            const row3 = new ActionRowBuilder().addComponents(colorInput);
            const row4 = new ActionRowBuilder().addComponents(imageInput);
            const row5 = new ActionRowBuilder().addComponents(thumbnailInput);

            modal.addComponents(row1, row2, row3, row4, row5);

            await interaction.showModal(modal);

        } catch (error) {
            console.error('❌ Edit button error:', error);
            
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({
                    content: `❌ Error: ${error.message}`,
                    ephemeral: true
                }).catch(() => {});
            } else {
                await interaction.reply({
                    content: `❌ Error: ${error.message}`,
                    ephemeral: true
                }).catch(() => {});
            }
        }
    }
};
