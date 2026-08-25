import {
    SlashCommandBuilder,
    AttachmentBuilder,
    PermissionFlagsBits
} from 'discord.js';

const OWNER_ID = '1054967242497982476';

export default {
    data: new SlashCommandBuilder()
        .setName('send')
        .setDescription('Send a message, file, image, video, GIF, or sticker')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)

        // ==========================================
        // NORMAL MESSAGE (Default Input Style)
        // ==========================================
        .addStringOption(option =>
            option
                .setName('message')
                .setDescription('Normal message to send')
                .setRequired(false)
        )

        // ==========================================
        // FILE UPLOAD (Optional)
        // ==========================================
        .addAttachmentOption(option =>
            option
                .setName('file')
                .setDescription('Upload an image, GIF, video, or other file')
                .setRequired(false)
        )

        // ==========================================
        // STICKER (Optional)
        // ==========================================
        .addStringOption(option =>
            option
                .setName('sticker_id')
                .setDescription('Sticker ID to send')
                .setRequired(false)
        ),

    async execute(interaction) {
        try {
            // ==========================================
            // GET OPTIONS
            // ==========================================
            const message = interaction.options.getString('message');
            const file = interaction.options.getAttachment('file');
            const stickerId = interaction.options.getString('sticker_id');

            // ==========================================
            // CHECK IF SOMETHING WAS PROVIDED
            // ==========================================
            if (!message && !file && !stickerId) {
                return interaction.reply({
                    content: '❌ Please provide a message, file, or sticker to send.',
                    ephemeral: true
                });
            }

            // ==========================================
            // BUILD PAYLOAD
            // ==========================================
            const payload = {};

            if (message) payload.content = message;

            if (file) {
                payload.files = [
                    new AttachmentBuilder(file.url, {
                        name: file.name || 'file'
                    })
                ];
            }

            if (stickerId) {
                try {
                    const sticker = await interaction.client.stickers.fetch(stickerId).catch(() => null);
                    if (sticker) {
                        payload.stickers = [sticker];
                    } else {
                        return interaction.reply({
                            content: '❌ Sticker not found. Make sure the sticker ID is correct.',
                            ephemeral: true
                        });
                    }
                } catch (error) {
                    return interaction.reply({
                        content: '❌ Invalid sticker ID.',
                        ephemeral: true
                    });
                }
            }

            // ==========================================
            // SEND MESSAGE
            // ==========================================
            await interaction.deferReply({ ephemeral: true });
            await interaction.channel.sendTyping();
            await new Promise(resolve => setTimeout(resolve, 500));

            const sentMessage = await interaction.channel.send(payload);

            // ==========================================
            // SUCCESS REPLY
            // ==========================================
            let replyMessage =
                `✅ **Message sent successfully!**\n\n` +
                `**Channel:** ${interaction.channel}\n` +
                `**Message ID:** \`${sentMessage.id}\``;

            if (message) replyMessage += `\n**Content:** ${message.substring(0, 100)}${message.length > 100 ? '...' : ''}`;
            if (file) replyMessage += `\n**File:** ${file.name}`;
            if (stickerId) replyMessage += `\n**Sticker:** ${stickerId}`;

            await interaction.editReply({ content: replyMessage });

        } catch (error) {
            console.error('Send command error:', error);
            const errorMessage = '❌ Failed to send the message. Check the bot permissions.';
            if (interaction.deferred || interaction.replied) {
                await interaction.editReply({ content: errorMessage }).catch(() => {});
            } else {
                await interaction.reply({ content: errorMessage, ephemeral: true }).catch(() => {});
            }
        }
    }
};
