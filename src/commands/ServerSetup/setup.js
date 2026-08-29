const {
    SlashCommandBuilder,
    ChannelType,
    PermissionFlagsBits
} = require("discord.js");

const structure = [
    {
        category: "INFORMATION",
        channels: [
            ["rules", ChannelType.GuildText],
            ["announcements", ChannelType.GuildText],
            ["welcome", ChannelType.GuildText]
        ]
    },
    {
        category: "COMMUNITY",
        channels: [
            ["general", ChannelType.GuildText],
            ["chat", ChannelType.GuildText],
            ["shitpost", ChannelType.GuildText],
            ["moments", ChannelType.GuildText]
        ]
    },
    {
        category: "MEDIA",
        channels: [
            ["gallery", ChannelType.GuildText],
            ["clips", ChannelType.GuildText],
            ["links", ChannelType.GuildText]
        ]
    },
    {
        category: "VOICE",
        channels: [
            ["General", ChannelType.GuildVoice],
            ["Gaming", ChannelType.GuildVoice],
            ["Chill", ChannelType.GuildVoice],
            ["AFK", ChannelType.GuildVoice]
        ]
    }
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName("setup")
        .setDescription("Automatically create the WSS'25 server structure")
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const guild = interaction.guild;

        await interaction.deferReply({ ephemeral: true });

        if (!guild.members.me.permissions.has(PermissionFlagsBits.ManageChannels)) {
            return interaction.editReply(
                "❌ I need the **Manage Channels** permission."
            );
        }

        let created = 0;
        let skipped = 0;

        try {
            for (const section of structure) {

                // Find existing category
                let category = guild.channels.cache.find(
                    c =>
                        c.type === ChannelType.GuildCategory &&
                        c.name.toLowerCase() === section.category.toLowerCase()
                );

                // Create category
                if (!category) {
                    category = await guild.channels.create({
                        name: section.category,
                        type: ChannelType.GuildCategory
                    });

                    created++;
                }

                // Create channels
                for (const [name, type] of section.channels) {

                    const exists = guild.channels.cache.find(
                        c =>
                            c.parentId === category.id &&
                            c.name.toLowerCase() === name.toLowerCase() &&
                            c.type === type
                    );

                    if (exists) {
                        skipped++;
                        continue;
                    }

                    await guild.channels.create({
                        name: name,
                        type: type,
                        parent: category.id
                    });

                    created++;
                }
            }

            await interaction.editReply(
                `✅ **Server setup complete!**\n\n` +
                `📁 Channels/Categories created: **${created}**\n` +
                `⏭️ Already existed: **${skipped}**`
            );

        } catch (error) {
            console.error(error);

            await interaction.editReply(
                "❌ Something went wrong while creating the channels."
            );
        }
    }
};
