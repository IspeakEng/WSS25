// commands/embed-edit.js
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
        if (interaction.user.id !== OWNER_ID) {
            return interaction.reply({
                content: '❌ Only the bot owner can use this command.',
                ephemeral: true
            });
        }

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

            const currentEmbed = message.embeds[0];
            const currentTitle = currentEmbed.title || '';
            const currentDescription = currentEmbed.description || '';
            const currentColor = currentEmbed.color ? 
                `#${currentEmbed.color.toString(16).padStart(6, '0')}` : '';
            const currentImage = currentEmbed.image?.url || '';
            const currentThumbnail = currentEmbed.thumbnail?.url || '';
            const currentFooter = currentEmbed.footer?.text || '';

            // Create modal
            const modal = new ModalBuilder()
                .setCustomId(`embed_edit:${message.id}:${targetChannel.id}`)
                .setTitle('Edit Embed');

            // Title input (Short)
            const titleInput = new TextInputBuilder()
                .setCustomId('title')
                .setLabel('Title')
                .setStyle(TextInputStyle.Short)
                .setValue(currentTitle)
                .setRequired(false);

            // Color input (Short)
            const colorInput = new TextInputBuilder()
                .setCustomId('color')
                .setLabel('Color (e.g., #ff0000)')
                .setStyle(TextInputStyle.Short)
                .setValue(currentColor)
                .setRequired(false);

            // Image URL input (Short)
            const imageInput = new TextInputBuilder()
                .setCustomId('image')
                .setLabel('Image URL')
                .setStyle(TextInputStyle.Short)
                .setValue(currentImage)
                .setRequired(false);

            // Thumbnail input (Short)
            const thumbnailInput = new TextInputBuilder()
                .setCustomId('thumbnail')
                .setLabel('Thumbnail URL')
                .setStyle(TextInputStyle.Short)
                .setValue(currentThumbnail)
                .setRequired(false);

            // Footer input (Short)
            const footerInput = new TextInputBuilder()
                .setCustomId('footer')
                .setLabel('Footer Text')
                .setStyle(TextInputStyle.Short)
                .setValue(currentFooter)
                .setRequired(false);

            // 👇 ৫টা Row, প্রতিটাতে ১টা TextInput (max 5 allowed)
            const row1 = new ActionRowBuilder().addComponents(titleInput);
            const row2 = new ActionRowBuilder().addComponents(colorInput);
            const row3 = new ActionRowBuilder().addComponents(imageInput);
            const row4 = new ActionRowBuilder().addComponents(thumbnailInput);
            const row5 = new ActionRowBuilder().addComponents(footerInput);

            modal.addComponents(row1, row2, row3, row4, row5);

            await interaction.showModal(modal);

        } catch (error) {
            console.error('Embed edit command error:', error);
            
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
