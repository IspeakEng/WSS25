import { checkPermission } from './permissionCheck.js';

export default {
    name: 'interactionCreate',
    async execute(interaction) {
        // Only handle slash commands
        if (!interaction.isChatInputCommand()) return;

        const command = interaction.client.commands.get(interaction.commandName);
        if (!command) return;

        // Check permissions before executing
        const hasAccess = await checkPermission(interaction);
        if (!hasAccess) return;

        try {
            await command.execute(interaction);
        } catch (error) {
            console.error(`Error executing ${interaction.commandName}:`, error);
            
            const embed = new EmbedBuilder()
                .setTitle('❌ Error')
                .setDescription('There was an error executing this command!')
                .setColor(0xff0000);
            
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ embeds: [embed], ephemeral: true });
            } else {
                await interaction.reply({ embeds: [embed], ephemeral: true });
            }
        }
    }
};
