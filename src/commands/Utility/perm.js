import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { getUserPerms, setUserPerms, loadPerms } from '../../utils/permissionManager.js';

export const data = new SlashCommandBuilder()
    .setName('perm')
    .setDescription('🔐 Manage user permissions for bot commands')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub => sub
        .setName('give')
        .setDescription('Give a user permission')
        .addUserOption(opt => opt
            .setName('user')
            .setDescription('User to give permission to')
            .setRequired(true))
        .addStringOption(opt => opt
            .setName('command')
            .setDescription('Command name or "all"')
            .setRequired(true)
            .setAutocomplete(true)))
    .addSubcommand(sub => sub
        .setName('remove')
        .setDescription('Remove a user permission')
        .addUserOption(opt => opt
            .setName('user')
            .setDescription('User to remove permission from')
            .setRequired(true))
        .addStringOption(opt => opt
            .setName('command')
            .setDescription('Command name')
            .setRequired(true)))
    .addSubcommand(sub => sub
        .setName('list')
        .setDescription('List user permissions')
        .addUserOption(opt => opt
            .setName('user')
            .setDescription('User to check')
            .setRequired(true)))
    .addSubcommand(sub => sub
        .setName('all')
        .setDescription('List all commands'));

export async function autocomplete(interaction) {
    const focusedValue = interaction.options.getFocused();
    const commands = interaction.client.commands.map(cmd => cmd.data.name);
    const filtered = commands.filter(cmd => cmd.startsWith(focusedValue)).slice(0, 25);
    await interaction.respond(filtered.map(cmd => ({ name: cmd, value: cmd })));
}

export async function execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    const user = interaction.options.getUser('user');
    const command = interaction.options.getString('command')?.toLowerCase();
    const allCommands = interaction.client.commands.map(cmd => cmd.data.name);

    if (subcommand === 'give') {
        if (command !== 'all' && !allCommands.includes(command)) {
            return await interaction.reply({
                embeds: [new EmbedBuilder()
                    .setTitle('❌ Invalid Command')
                    .setDescription(`Command \`${command}\` not found!`)
                    .setColor(0xff0000)],
                ephemeral: true
            });
        }

        const currentPerms = await getUserPerms(user.id);
        if (currentPerms.includes(command)) {
            return await interaction.reply({
                embeds: [new EmbedBuilder()
                    .setTitle('ℹ️ Already Has Permission')
                    .setDescription(`${user} already has permission for \`${command}\``)
                    .setColor(0xffa500)]
            });
        }

        currentPerms.push(command);
        await setUserPerms(user.id, currentPerms);

        await interaction.reply({
            embeds: [new EmbedBuilder()
                .setTitle('✅ Permission Given')
                .setDescription(`Gave ${user} permission for \`${command}\``)
                .setColor(0x00ff00)]
        });

    } else if (subcommand === 'remove') {
        const currentPerms = await getUserPerms(user.id);
        if (!currentPerms.includes(command)) {
            return await interaction.reply({
                embeds: [new EmbedBuilder()
                    .setTitle('ℹ️ No Permission')
                    .setDescription(`${user} doesn't have permission for \`${command}\``)
                    .setColor(0xffa500)]
            });
        }

        const newPerms = currentPerms.filter(p => p !== command);
        await setUserPerms(user.id, newPerms);

        await interaction.reply({
            embeds: [new EmbedBuilder()
                .setTitle('✅ Permission Removed')
                .setDescription(`Removed ${user}'s permission for \`${command}\``)
                .setColor(0x00ff00)]
        });

    } else if (subcommand === 'list') {
        const perms = await getUserPerms(user.id);
        await interaction.reply({
            embeds: [new EmbedBuilder()
                .setTitle(`📋 Permissions for ${user.username}`)
                .setDescription(perms.length > 0 ? perms.map(p => `• \`${p}\``).join('\n') : 'No permissions')
                .setColor(perms.length > 0 ? 0x00ff00 : 0xff0000)
                .setFooter({ text: 'Admins have all permissions' })]
        });

    } else if (subcommand === 'all') {
        const sortedCommands = [...allCommands].sort();
        await interaction.reply({
            embeds: [new EmbedBuilder()
                .setTitle('📚 All Bot Commands')
                .setDescription(sortedCommands.map(cmd => `• \`${cmd}\``).join('\n'))
                .setColor(0x0099ff)
                .setFooter({ text: 'Use /perm give @user <command>' })]
        });
    }
}
