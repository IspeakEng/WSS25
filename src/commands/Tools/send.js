import {
    SlashCommandBuilder,
    AttachmentBuilder,
    MessageFlags,
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
                .setDescription('Image, GIF, video, or other file')
                .setRequired(false)
        )

        .addStringOption(option =>
            option
                .setName('sticker_id')
                .setDescription('Sticker ID to send')
                .setRequired(false)
        )

        .addAttachmentOption(option =>
            option
                .setName('voice')
                .setDescription('Audio file to send as a voice message')
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
        const voice = interaction.options.getAttachment('voice');

        if (!message && !file && !stickerId && !voice) {
            return interaction.reply({
                content: '❌ Give me a message, file, sticker, or voice.',
                ephemeral: true
            });
        }

        try {
            await interaction.channel.sendTyping();

            await new Promise(resolve =>
                setTimeout(resolve, 1500)
            );

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

            // Voice message
            if (voice) {
                const voiceAttachment = new AttachmentBuilder(
                    voice.url,
                    {
                        name: 'voice-message.ogg'
                    }
                );

                // Discord voice messages require duration
                // and waveform metadata.
                voiceAttachment.setDuration(1);

                // Temporary waveform.
                // Discord expects a base64 encoded waveform.
                const waveform = Buffer.from(
                    new Uint8Array(256).fill(128)
                ).toString('base64');

                voiceAttachment.setWaveform(waveform);

                payload.files = [
                    voiceAttachment
                ];

                payload.flags = MessageFlags.IsVoiceMessage;
            }

            const sentMessage =
                await interaction.channel.send(payload);

            await interaction.reply({
                content:
                    `✅ Message sent.\n\n**Message ID:** \`${sentMessage.id}\``,
                ephemeral: true
            });

        } catch (error) {
            console.error(
                'Send command error:',
                error
            );

            await interaction.reply({
                content:
                    '❌ Failed to send the message.',
                ephemeral: true
            });
        }
    }
};
