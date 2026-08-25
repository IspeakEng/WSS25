import {
    SlashCommandBuilder,
    PermissionFlagsBits,
    MessageFlags
} from 'discord.js';

const OWNER_ID = '1054967242497982476';

export default {
    data: new SlashCommandBuilder()
        .setName('wnuke')
        .setDescription('Delete ALL messages in a channel (bypasses 14-day limit)')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addChannelOption(option =>
            option
                .setName('channel')
                .setDescription('The channel to nuke')
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName('reason')
                .setDescription('Reason for the nuke')
                .setRequired(false)
        ),

    async execute(interaction) {
        // ==========================================
        // PERMISSION CHECK
        // ==========================================
        if (interaction.user.id !== OWNER_ID) {
            return interaction.reply({
                content: '❌ Only the bot owner can use this command.',
                ephemeral: true
            });
        }

        const channel = interaction.options.getChannel('channel');
        const reason = interaction.options.getString('reason') || 'No reason provided';

        // ==========================================
        // VALIDATE CHANNEL
        // ==========================================
        if (!channel.isTextBased()) {
            return interaction.reply({
                content: '❌ This is not a text channel.',
                ephemeral: true
            });
        }

        // ==========================================
        // BOT PERMISSION CHECK
        // ==========================================
        const botMember = interaction.guild.members.me;
        const botPermissions = channel.permissionsFor(botMember);

        if (!botPermissions.has(PermissionFlagsBits.ManageMessages)) {
            return interaction.reply({
                content: '❌ I need **Manage Messages** permission in that channel.',
                ephemeral: true
            });
        }

        if (!botPermissions.has(PermissionFlagsBits.ViewChannel)) {
            return interaction.reply({
                content: '❌ I need **View Channel** permission in that channel.',
                ephemeral: true
            });
        }

        // ==========================================
        // CONFIRMATION
        // ==========================================
        await interaction.reply({
            content: `⚠️ **Are you sure?**\n\n` +
                    `You are about to delete **ALL messages** in ${channel}.\n` +
                    `This includes messages older than 14 days.\n` +
                    `**Reason:** ${reason}\n\n` +
                    `Reply with **\`confirm\`** within 30 seconds to proceed.`,
            ephemeral: true
        });

        // ==========================================
        // WAIT FOR CONFIRMATION
        // ==========================================
        const filter = (msg) => 
            msg.author.id === interaction.user.id && 
            msg.content.toLowerCase() === 'confirm';

        try {
            const confirmation = await interaction.channel.awaitMessages({
                filter,
                max: 1,
                time: 30000,
                errors: ['time']
            });

            await interaction.editReply({
                content: `⏳ **Deleting all messages in ${channel}...**`
            });

        } catch (error) {
            return interaction.editReply({
                content: '❌ Command cancelled. No confirmation received.'
            });
        }

        // ==========================================
        // DELETE ALL MESSAGES (BULK + INDIVIDUAL)
        // ==========================================
        let deletedCount = 0;
        let failedCount = 0;

        try {
            // ==========================================
            // METHOD 1: BULK DELETE (MAX 100 AT A TIME)
            // ==========================================
            let lastId = null;
            let hasMore = true;

            while (hasMore) {
                const options = { limit: 100 };
                if (lastId) options.before = lastId;

                const messages = await channel.messages.fetch(options);
                
                if (messages.size === 0) {
                    hasMore = false;
                    break;
                }

                // Filter messages that can be bulk-deleted (less than 14 days old)
                const bulkDeletable = messages.filter(msg => 
                    (Date.now() - msg.createdTimestamp) < 1209600000 // 14 days
                );

                const nonBulkDeletable = messages.filter(msg => 
                    (Date.now() - msg.createdTimestamp) >= 1209600000 // 14 days or older
                );

                // Bulk delete (100 at a time)
                if (bulkDeletable.size > 0) {
                    try {
                        const bulkResult = await channel.bulkDelete(bulkDeletable, true);
                        deletedCount += bulkResult.size;
                    } catch (error) {
                        // If bulk delete fails, delete individually
                        for (const [id, msg] of bulkDeletable) {
                            try {
                                await msg.delete();
                                deletedCount++;
                            } catch (e) {
                                failedCount++;
                            }
                        }
                    }
                }

                // Individually delete older messages (bypasses 14-day limit)
                for (const [id, msg] of nonBulkDeletable) {
                    try {
                        await msg.delete();
                        deletedCount++;
                    } catch (error) {
                        failedCount++;
                    }
                }

                lastId = messages.last()?.id;
                
                // Rate limit protection
                await new Promise(resolve => setTimeout(resolve, 500));
            }

            // ==========================================
            // METHOD 2: CLONE AND DELETE CHANNEL (LAST RESORT)
            // ==========================================
            if (deletedCount === 0 && failedCount === 0) {
                // If no messages deleted, try cloning the channel
                try {
                    const newChannel = await channel.clone({
                        name: channel.name,
                        reason: `Nuke by ${interaction.user.tag}: ${reason}`
                    });

                    await channel.delete(`Nuke by ${interaction.user.tag}: ${reason}`);
                    
                    await interaction.editReply({
                        content: `✅ **Channel nuked successfully!**\n\n` +
                                `**Channel:** ${newChannel}\n` +
                                `**Method:** Channel clone and delete\n` +
                                `**Reason:** ${reason}`
                    });

                    // Send a log message in the new channel
                    await newChannel.send({
                        content: `💥 **Channel nuked by ${interaction.user}**\n` +
                                `**Reason:** ${reason}\n` +
                                `**All messages have been deleted.**`
                    });

                    return;
                } catch (error) {
                    console.error('Clone/delete method failed:', error);
                }
            }

            // ==========================================
            // SUCCESS
            // ==========================================
            let responseMessage = `✅ **Channel nuked successfully!**\n\n`;
            responseMessage += `**Channel:** ${channel}\n`;
            responseMessage += `**Deleted:** ${deletedCount} messages\n`;
            responseMessage += `**Failed:** ${failedCount} messages\n`;
            responseMessage += `**Reason:** ${reason}\n`;

            if (deletedCount === 0) {
                responseMessage += `\n⚠️ No messages were deleted. The channel might be empty or all messages are already gone.`;
            }

            await interaction.editReply({
                content: responseMessage
            });

            // ==========================================
            // LOG IN CHANNEL
            // ==========================================
            if (deletedCount > 0) {
                await channel.send({
                    content: `💥 **Channel nuked by ${interaction.user}**\n` +
                            `**Deleted:** ${deletedCount} messages\n` +
                            `**Reason:** ${reason}`
                });
            }

        } catch (error) {
            console.error('❌ WNuke error:', error);
            
            await interaction.editReply({
                content: `❌ Failed to nuke channel: ${error.message}`
            });
        }
    }
};
