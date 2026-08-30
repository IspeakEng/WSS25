import {
    SlashCommandBuilder,
    PermissionFlagsBits,
    ChannelType
} from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('delete')
        .setDescription('Delete a specific channel or category')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)

        .addChannelOption(option =>
            option
                .setName('channel')
                .setDescription('The channel to delete')
                .addChannelTypes(
                    ChannelType.GuildText,
                    ChannelType.GuildVoice,
                    ChannelType.GuildAnnouncement,
                    ChannelType.GuildStageVoice,
                    ChannelType.GuildForum
                )
        )

        .addChannelOption(option =>
            option
                .setName('category')
                .setDescription('The category to delete')
                .addChannelTypes(ChannelType.GuildCategory)
        ),

    async execute(interaction) {
        // Extra permission check
        if (!interaction.memberPermissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({
                content: '❌ You need Administrator permission to use this command.',
                ephemeral: true
            });
        }

        const channel = interaction.options.getChannel('channel');
        const category = interaction.options.getChannel('category');

        // Must provide exactly one
        if (!channel && !category) {
            return interaction.reply({
                content: '❌ Please select either a **channel** or a **category**.',
                ephemeral: true
            });
        }

        if (channel && category) {
            return interaction.reply({
                content: '❌ Please select only **one**: channel or category.',
                ephemeral: true
            });
        }

        // Delete channel
        if (channel) {
            try {
                const channelName = channel.name;

                await channel.delete('Deleted using /delete command');

                return interaction.reply({
                    content: `✅ Channel **#${channelName}** has been deleted.`,
                    ephemeral: true
                });
            } catch (error) {
                console.error('Channel delete error:', error);

                return interaction.reply({
                    content: '❌ I could not delete that channel. Check my permissions.',
                    ephemeral: true
                });
            }
        }

        // Delete category
        if (category) {
            try {
                const categoryName = category.name;

                // Get all channels inside category
                const childChannels = interaction.guild.channels.cache.filter(
                    ch => ch.parentId === category.id
                );

                // Delete channels first
                for (const childChannel of childChannels.values()) {
                    await childChannel.delete(
                        `Category "${categoryName}" deleted using /delete command`
                    );
                }

                // Delete category itself
                await category.delete(
                    'Deleted using /delete command'
                );

                return interaction.reply({
                    content:
                        `✅ Category **${categoryName}** and **${childChannels.size} channel(s)** inside it have been deleted.`,
                    ephemeral: true
                });

            } catch (error) {
                console.error('Category delete error:', error);

                return interaction.reply({
                    content: '❌ I could not delete the category. Check my permissions.',
                    ephemeral: true
                });
            }
        }
    }
};
