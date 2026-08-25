// src/commands/Tools/embed-edit.js
import {
    SlashCommandBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder
} from 'discord.js';

const OWNER_ID = '1054967242497982476';

export default {
    data: new SlashCommandBuilder()
        .setName('embed-edit')
        .setDescription('Edit an embed in a message')
        .addStringOption(option =>
            option
                .setName('message_id')
                .setDescription('The ID of the message containing the embed')
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName('channel_id')
                .setDescription('Channel ID (leave empty for current channel)')
                .setRequired(false)
        ),

    async execute(interaction) {
        // ==========================================
        // REGISTER MODAL HANDLER
        // ==========================================
        if (!interaction.client.modals.has('embed_edit')) {
            const modalHandler = await import('../../handlers/interactionHandlers/embedEditModal.js');
            interaction.client.modals.set('embed_edit', modalHandler.default);
            console.log('✅ Registered embed_edit modal handler');
        }

        // ==========================================
        // REGISTER BUTTON HANDLER
        // ==========================================
        if (!interaction.client.buttons.has('embed_edit_button')) {
            const buttonHandler = await import('../../handlers/interactionHandlers/embedEditButton.js');
            interaction.client.buttons.set('embed_edit_button', buttonHandler.default);
            console.log('✅ Registered embed_edit_button handler');
        }

        // ==========================================
        // OWNER CHECK
        // ==========================================
        if (interaction.user.id !== OWNER_ID) {
            return interaction.reply({
                content: '❌ Only the bot owner can use this command.',
                ephemeral: true
            });
        }

        // ==========================================
        // GET OPTIONS
        // ==========================================
        const messageId = interaction.options.getString('message_id');
        const channelId = interaction.options.getString('channel_id');

        try {
            let targetChannel;

            if (channelId) {
                targetChannel = await interaction.client.channels.fetch(channelId);
                if (!targetChannel?.isTextBased()) {
                    return interaction.reply({
                        content: '❌ Invalid channel ID.',
                        ephemeral: true
                    });
                }
            } else {
                if (!interaction.channel) {
                    return interaction.reply({
                        content: '❌ No channel found.',
                        ephemeral: true
                    });
                }
                targetChannel = interaction.channel;
            }

            // ==========================================
            // FETCH MESSAGE
            // ==========================================
            const message = await targetChannel.messages.fetch(messageId);
            
            if (message.author.id !== interaction.client.user.id) {
                return interaction.reply({
                    content: '❌ I can only edit messages sent by me.',
                    ephemeral: true
                });
            }

            if (!message.embeds.length) {
                return interaction.reply({
                    content: '❌ This message does not contain an embed.',
                    ephemeral: true
                });
            }

            // ==========================================
            // GET CURRENT EMBED VALUES
            // ==========================================
            const currentEmbed = message.embeds[0];
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
                .setCustomId(`embed_edit:${message.id}:${targetChannel.id}`)
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
            console.error('❌ Embed edit command error:', error);
            
            if (error.code === 10008) {
                return interaction.reply({
                    content: '❌ Message not found. Make sure the ID is correct.',
                    ephemeral: true
                });
            }

            await interaction.reply({
                content: `❌ Error: ${error.message}`,
                ephemeral: true
            });
        }
    }
};
