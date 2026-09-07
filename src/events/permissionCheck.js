import { EmbedBuilder } from 'discord.js';
import { hasPermission } from '../utils/permissionManager.js';

export async function checkPermission(interaction) {
    // Skip for admin users
    if (interaction.member.permissions.has('Administrator')) {
        return true;
    }

    // Skip for the perm command itself (it has its own checks)
    if (interaction.commandName === 'perm') {
        return true;
    }

    // Check if user has permission for this command
    const hasPerm = await hasPermission(
        interaction.user.id, 
        interaction.commandName, 
        interaction.client
    );

    if (!hasPerm) {
        const embed = new EmbedBuilder()
            .setTitle('❌ Permission Denied')
            .setDescription(`You don't have permission to use \`${interaction.commandName}\`!\n\n**How to get permission:**\nAsk a server admin to run:\n\`/perm give @${interaction.user.username} ${interaction.commandName}\``)
            .setColor(0xff0000)
            .setFooter({ text: 'Admins have all permissions automatically' });
        
        await interaction.reply({ embeds: [embed], ephemeral: true });
        return false;
    }

    return true;
}
