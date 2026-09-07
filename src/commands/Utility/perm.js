import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { getUserPerms, setUserPerms, loadPerms } from '../../utils/permissionManager.js';

export const data = new SlashCommandBuilder()
    .setName('perm')
    .setDescription('🔐 Manage user permissions for bot commands')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub => sub
        .setName('give')
        .setDescription('Give a user permission to use a command')
        .addUserOption(opt => opt
            .setName('user')
            .setDescription('The user to give permission to')
            .setRequired(true))
        .addStringOption(opt => opt
            .setName('command')
            .setDescription('Command name or "all" for everything')
            .setRequired(true)
            .setAutocomplete(true)))
    .addSubcommand(sub => sub
        .setName('remove')
        .setDescription('Remove a user\'s permission')
        .addUserOption(opt => opt
            .setName('user')
            .setDescription('The user to remove permission from')
            .setRequired(true))
        .addStringOption(opt => opt
            .setName('command')
            .setDescription('Command name to remove')
            .setRequired(true)))
    .addSubcommand(sub => sub
        .setName('list')
        .setDescription('List all permissions for a user')
        .addUserOption(opt => opt
            .setName('user')
            .setDescription('The user to check')
            .setRequired(true)))
    .addSubcommand(sub => sub
        .setName('all')
        .setDescription('List all available bot commands'));

// Auto-complete for command names
export async function autocomplete(interaction) {
    const focusedValue = interaction.options.getFocused();
    const commands = interaction.client.commands.map(cmd => cmd.data.name);
    
    const filtered = commands
        .filter(cmd => cmd.startsWith(focusedValue))
        .slice(0, 25);
    
    await interaction.respond(
        filtered.map(cmd => ({ name: cmd, value: cmd }))
    );
}

export async function execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    const user = interaction.options.getUser('user');
    const command = interaction.options.getString('command')?.toLowerCase();

    // Get all bot commands
    const allCommands = interaction.client.commands.map(cmd => cmd.data.name);
    const allPerms = await loadPerms();

    if (subcommand === 'give') {
        // Check if command exists
        if (command !== 'all' && !allCommands.includes(command)) {
            const embed = new EmbedBuilder()
                .setTitle('❌ Invalid Command')
                .setDescription(`Command \`${command}\` not found!\nUse \`/perm all\` to see all commands.`)
                .setColor(0xff0000);
            return await interaction.reply({ embeds: [embed], ephemeral: true });
        }

        // Check if user already has this permission
        const currentPerms = await getUserPerms(user.id);
        if (currentPerms.includes(command)) {
            const embed = new EmbedBuilder()
                .setTitle('ℹ️ Already Has Permission')
                .setDescription(`${user} already has permission for \`${command}\``)
                .setColor(0xffa500);
            return await interaction.reply({ embeds: [embed] });
        }

        // Add permission
        currentPerms.push(command);
        await setUserPerms(user.id, currentPerms);

        const embed = new EmbedBuilder()
            .setTitle('✅ Permission Given')
            .setDescription(`Successfully gave ${user} permission for \`${command}\``)
            .setColor(0x00ff00)
            .setFooter({ text: 'They can now use this command' });
        
        await interaction.reply({ embeds: [embed] });

    } else if (subcommand === 'remove') {
        const currentPerms = await getUserPerms(user.id);
        
        if (!currentPerms.includes(command)) {
            const embed = new EmbedBuilder()
                .setTitle('ℹ️ No Permission')
                .setDescription(`${user} doesn't have permission for \`${command}\``)
                .setColor(0xffa500);
            return await interaction.reply({ embeds: [embed] });
        }

        // Remove permission
        const newPerms = currentPerms.filter(p => p !== command);
        await setUserPerms(user.id, newPerms);

        const embed = new EmbedBuilder()
            .setTitle('✅ Permission Removed')
            .setDescription(`Removed ${user}'s permission for \`${command}\``)
            .setColor(0x00ff00);
        
        await interaction.reply({ embeds: [embed] });

    } else if (subcommand === 'list') {
        const perms = await getUserPerms(user.id);
        
        const embed = new EmbedBuilder()
            .setTitle(`📋 Permissions for ${user.username}`)
            .setDescription(perms.length > 0 
                ? perms.map(p => `• \`${p}\``).join('\n') 
                : '❌ No custom permissions')
            .setColor(perms.length > 0 ? 0x00ff00 : 0xff0000)
            .setFooter({ text: 'Server admins & bot owner have all permissions automatically' });
        
        await interaction.reply({ embeds: [embed] });

    } else if (subcommand === 'all') {
        const sortedCommands = [...allCommands].sort();
        
        const embed = new EmbedBuilder()
            .setTitle('📚 All Bot Commands')
            .setDescription(`Total: **${sortedCommands.length}** commands`)
            .setColor(0x0099ff)
            .addFields({
                name: 'Commands',
                value: sortedCommands.map(cmd => `• \`${cmd}\``).join('\n') || 'No commands found',
                inline: false
            })
            .setFooter({ text: 'Use /perm give @user <command> to grant permissions' });
        
        await interaction.reply({ embeds: [embed] });
    }
}
