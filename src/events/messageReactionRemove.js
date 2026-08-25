// Reaction Role Remove Event - Handles when a user removes a reaction

// ========== IN-MEMORY CACHE ==========
const roleConfigCache = new Map();

// ========== DATABASE FUNCTIONS ==========
async function getRoleConfig(messageId, emoji) {
    const key = `${messageId}_${emoji}`;
    
    if (roleConfigCache.has(key)) {
        return roleConfigCache.get(key);
    }

    try {
        const { db } = await import('../config/database.js');
        const query = `
            SELECT message_id, emoji, role_id, guild_id, channel_id
            FROM reaction_roles
            WHERE message_id = $1 AND emoji = $2
        `;
        const result = await db.query(query, [messageId, emoji]);
        
        if (result.rows.length > 0) {
            const config = result.rows[0];
            roleConfigCache.set(key, config);
            return config;
        }
        return null;
    } catch (error) {
        console.error('❌ Database error in getRoleConfig:', error);
        return null;
    }
}

// ========== MAIN EVENT ==========
export default {
    name: 'messageReactionRemove',
    
    async execute(reaction, user) {
        if (user.bot) return;

        try {
            if (reaction.partial) await reaction.fetch();
            if (reaction.message.partial) await reaction.message.fetch();

            const config = await getRoleConfig(
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
