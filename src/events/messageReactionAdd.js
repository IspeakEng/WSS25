// Reaction Role Add Event - Handles when a user adds a reaction

export const name = 'messageReactionAdd';

export async function execute(reaction, user) {
    // Ignore bot's own reactions
    if (user.bot) return;

    try {
        // Fetch partial data if needed
        if (reaction.partial) await reaction.fetch();
        if (reaction.message.partial) await reaction.message.fetch();

        // Get role configuration - using direct database query
        const config = await getRoleConfig(reaction.message.id, reaction.emoji.name || reaction.emoji.id);
        if (!config) return;

        const member = await reaction.message.guild.members.fetch(user.id);
        const role = reaction.message.guild.roles.cache.get(config.role_id);
        if (!role) {
            console.log(`❌ Role ${config.role_id} not found`);
            return;
        }

        // ========== TOGGLE LOGIC ==========
        if (member.roles.cache.has(role.id)) {
            // Remove role if user already has it (toggle off)
            await member.roles.remove(role);
            console.log(`❌ Removed ${role.name} from ${user.tag}`);
        } else {
            // ========== EXCLUSIVE LOGIC ==========
            // Check if this role belongs to an exclusive group
            const exclusiveGroup = getExclusiveGroup(role.id);
            if (exclusiveGroup) {
                // Remove all other roles from the same group
                for (const otherRoleId of exclusiveGroup) {
                    if (otherRoleId !== role.id && member.roles.cache.has(otherRoleId)) {
                        await member.roles.remove(otherRoleId);
                        console.log(`❌ Removed old exclusive role ${otherRoleId} from ${user.tag}`);
                    }
                }
            }
            
            // Add the new role
            await member.roles.add(role);
            console.log(`✅ Added ${role.name} to ${user.tag}`);
        }
    } catch (error) {
        console.error('❌ Error in messageReactionAdd:', error);
    }
}

// ========== HELPER FUNCTIONS (inside same file) ==========

// In-memory cache for configurations
const roleConfigCache = new Map();

// Exclusive groups definition
const exclusiveGroups = [
    // ['ROLE_ID_1', 'ROLE_ID_2', 'ROLE_ID_3'], // Replace with your actual role IDs
    // ['ROLE_ID_4', 'ROLE_ID_5'],
];

function getExclusiveGroup(roleId) {
    for (const group of exclusiveGroups) {
        if (group.includes(roleId)) {
            return group;
        }
    }
    return null;
}

async function getRoleConfig(messageId, emoji) {
    const key = `${messageId}_${emoji}`;
    
    // Check cache first
    if (roleConfigCache.has(key)) {
        return roleConfigCache.get(key);
    }

    // If you have database, use this:
    try {
        // Import database dynamically to avoid circular dependencies
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

// Export save function for commands
export async function saveReactionRole(messageId, emoji, roleId, guildId, channelId) {
    const key = `${messageId}_${emoji}`;
    
    try {
        const { db } = await import('../config/database.js');
        const query = `
            INSERT INTO reaction_roles (message_id, emoji, role_id, guild_id, channel_id, created_at)
            VALUES ($1, $2, $3, $4, $5, NOW())
            ON CONFLICT (message_id, emoji) DO UPDATE 
            SET role_id = $3, updated_at = NOW()
        `;
        await db.query(query, [messageId, emoji, roleId, guildId, channelId]);
        
        // Update cache
        roleConfigCache.set(key, { message_id: messageId, emoji, role_id: roleId, guild_id: guildId, channel_id: channelId });
        console.log(`✅ Reaction role saved: ${key} -> ${roleId}`);
        return true;
    } catch (error) {
        console.error('❌ Error saving reaction role:', error);
        return false;
    }
}
