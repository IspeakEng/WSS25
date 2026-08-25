// Reaction Role Remove Event - Memory Storage

// ========== MEMORY STORAGE ==========
const roleConfigs = new Map();

function getRoleConfig(messageId, emoji) {
    const key = `${messageId}_${emoji}`;
    return roleConfigs.get(key) || null;
}

// ========== MAIN EVENT ==========
export default {
    name: 'messageReactionRemove',
    
    async execute(reaction, user) {
        if (user.bot) return;

        try {
            if (reaction.partial) await reaction.fetch();
            if (reaction.message.partial) await reaction.message.fetch();

            const config = getRoleConfig(
                reaction.message.id, 
                reaction.emoji.name || reaction.emoji.id
            );
            
            if (!config) return;

            const member = await reaction.message.guild.members.fetch(user.id);
            const role = reaction.message.guild.roles.cache.get(config.role_id);
            
            if (!role) {
                console.log(`❌ Role ${config.role_id} not found`);
                return;
            }

            if (member.roles.cache.has(role.id)) {
                await member.roles.remove(role);
                console.log(`❌ Removed ${role.name} from ${user.tag} (reaction removed)`);
            }
        } catch (error) {
            console.error('❌ Error in messageReactionRemove:', error);
        }
    }
};
