import {
    SlashCommandBuilder,
    EmbedBuilder,
    PermissionFlagsBits
} from 'discord.js';

const OWNER_ID = '1054967242497982476';

export default {
    data: new SlashCommandBuilder()
        .setName('embed-create')
        .setDescription('Create and send an embed message in the current channel')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)

        // ==========================================
        // EMBED TITLE
        // ==========================================
        .addStringOption(option =>
            option
                .setName('title')
                .setDescription('Embed title (Unicode emojis work: 😊, 🎉)')
                .setRequired(false)
        )

        // ==========================================
        // EMBED DESCRIPTION
        // ==========================================
        .addStringOption(option =>
            option
                .setName('description')
                .setDescription('Embed description (Unicode emojis work: 😊, 🎉)')
                .setRequired(false)
        )

        // ==========================================
        // EMBED IMAGE URL
        // ==========================================
        .addStringOption(option =>
            option
                .setName('image')
                .setDescription('Image or GIF URL for the embed')
                .setRequired(false)
        )

        // ==========================================
        // EMBED THUMBNAIL
        // ==========================================
        .addStringOption(option =>
            option
                .setName('thumbnail')
                .setDescription('Thumbnail image URL')
                .setRequired(false)
        )

        // ==========================================
        // EMBED COLOR
        // ==========================================
        .addStringOption(option =>
            option
                .setName('color')
                .setDescription('Embed color, example: #000000')
                .setRequired(false)
        )

        // ==========================================
        // EMBED FOOTER
        // ==========================================
        .addStringOption(option =>
            option
                .setName('footer')
                .setDescription('Embed footer text (Unicode emojis work: 😊, 🎉)')
                .setRequired(false)
        ),

    async execute(interaction) {
        try {
            // ==========================================
            // GET OPTIONS
            // ==========================================
            let title = interaction.options.getString('title');
            let description = interaction.options.getString('description');
            const image = interaction.options.getString('image');
            const thumbnail = interaction.options.getString('thumbnail');
            const color = interaction.options.getString('color');
            let footer = interaction.options.getString('footer');

            // ==========================================
            // CHECK IF SOMETHING WAS PROVIDED
            // ==========================================
            if (!title && !description && !image && !thumbnail && !footer) {
                return interaction.reply({
                    content: '❌ Please provide at least title, description, or other embed content.',
                    ephemeral: true
                });
            }

            // ==========================================
            // CHECK IF IN GUILD
            // ==========================================
            if (!interaction.guild) {
                return interaction.reply({
                    content: '❌ This command can only be used in a server.',
                    ephemeral: true
                });
            }

            // ==========================================
            // PERMISSION CHECK
            // ==========================================
            const isBotOwner = interaction.user.id === OWNER_ID;
            const isServerOwner = interaction.user.id === interaction.guild.ownerId;

            if (!isBotOwner && !isServerOwner) {
                return interaction.reply({
                    content: '❌ Only the bot owner or this server\'s owner can use this command.',
                    ephemeral: true
                });
            }

            // ==========================================
            // CHECK CHANNEL PERMISSIONS
            // ==========================================
            const targetChannel = interaction.channel;

            if (!targetChannel.isTextBased()) {
                return interaction.reply({
                    content: '❌ This channel cannot receive messages.',
                    ephemeral: true
                });
            }

            const botMember = await interaction.guild.members.fetchMe();
            const permissions = targetChannel.permissionsFor(botMember);

            if (!permissions?.has('SendMessages')) {
                return interaction.reply({
                    content: '❌ I do not have **Send Messages** permission in this channel.',
                    ephemeral: true
                });
            }

            // ==========================================
            // PROCESS CUSTOM EMOJIS
            // ==========================================
            async function processCustomEmojis(text) {
                if (!text) return text;
                
                const emojiRegex = /<(a?):(\w+):(\d+)>/g;
                const matches = text.matchAll(emojiRegex);
                
                let processedText = text;
                
                for (const match of matches) {
                    const fullMatch = match[0];
                    const animated = match[1] === 'a';
                    const name = match[2];
                    const id = match[3];
                    
                    const emoji = interaction.guild.emojis.cache.get(id);
                    
                    if (emoji) {
                        const emojiUrl = `https://cdn.discordapp.com/emojis/${id}.${animated ? 'gif' : 'png'}?size=64`;
                        processedText = processedText.replace(fullMatch, `[${name}](${emojiUrl})`);
                    } else {
                        processedText = processedText.replace(fullMatch, `:${name}:`);
                    }
                }
                
                return processedText;
            }

            // ==========================================
            // PROCESS EMOJIS
            // ==========================================
            if (title) title = await processCustomEmojis(title);
            if (description) description = await processCustomEmojis(description);
            if (footer) footer = await processCustomEmojis(footer);

            // ==========================================
            // DEFER REPLY
            // ==========================================
            await interaction.deferReply({ ephemeral: true });

            // ==========================================
            // BUILD EMBED
            // ==========================================
            const embed = new EmbedBuilder();

            if (title) embed.setTitle(title);
            if (description) embed.setDescription(description);
            if (image) embed.setImage(image);
            if (thumbnail) embed.setThumbnail(thumbnail);
            if (footer) embed.setFooter({ text: footer });

            // Color
            if (color) {
                const cleanColor = color.replace('#', '');
                if (/^[0-9A-Fa-f]{6}$/.test(cleanColor)) {
                    embed.setColor(`#${cleanColor}`);
                } else {
                    return interaction.editReply({
                        content: '❌ Invalid color. Use a HEX color like `#000000`.'
                    });
                }
            }

            // ==========================================
            // SEND EMBED
            // ==========================================
            await targetChannel.sendTyping();
            await new Promise(resolve => setTimeout(resolve, 1000));

            const sentMessage = await targetChannel.send({ embeds: [embed] });

            // ==========================================
            // SUCCESS REPLY
            // ==========================================
            let replyMessage =
                `✅ **Embed sent successfully!**\n\n` +
                `**Channel:** ${targetChannel}\n` +
                `**Message ID:** \`${sentMessage.id}\``;

            if (title) replyMessage += `\n**Title:** ${title}`;
            if (description) replyMessage += `\n**Description:** ${description.substring(0, 100)}${description.length > 100 ? '...' : ''}`;

            await interaction.editReply({ content: replyMessage });

        } catch (error) {
            console.error('Embed create error:', error);
            const errorMessage = '❌ Failed to send the embed. Check the image URLs and bot permissions.';
            if (interaction.deferred || interaction.replied) {
                await interaction.editReply({ content: errorMessage }).catch(() => {});
            } else {
                await interaction.reply({ content: errorMessage, ephemeral: true }).catch(() => {});
            }
        }
    }
};
