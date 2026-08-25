// Reaction Role Add Event - Memory Storage (No Database Needed)

// ========== MEMORY STORAGE ==========
const roleConfigs = new Map();

// ========== EXCLUSIVE GROUPS ==========
// Replace these with your actual role IDs
const exclusiveGroups = [
    // Example: Region roles - user can only have one
    // ['REGION_ROLE_ID_1', 'REGION_ROLE_ID_2', 'REGION_ROLE_ID_3'],
    
    // Example: Color roles
    // ['COLOR_ROLE_ID_1', 'COLOR_ROLE_ID_2', 'COLOR_ROLE_ID_3'],
];

function getExclusiveGroup(roleId) {
    for (const group of exclusiveGroups) {
        if (group.includes(roleId)) {
            return group;
        }
    }
    return null;
}

// ========== SAVE & GET FUNCTIONS (Memory only) ==========
export function saveReactionRole(messageId, emoji, roleId, guildId, channelId) {
    const key = `${messageId}_${emoji}`;
    roleConfigs.set(key, { 
        message_id: messageId, 
        emoji, 
        role_id: roleId, 
        guild_id: guildId, 
        channel_id: channelId 
    });
    console.log(`✅ Reaction role saved in memory: ${key} -> ${roleId}`);
    return true;
}

function getRoleConfig(messageId, emoji) {
    const key = `${messageId}_${emoji}`;
    return roleConfigs.get(key) || null;
}

// ========== MAIN EVENT ==========
export default {
    name: 'messageReactionAdd',
    
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

            // ========== TOGGLE LOGIC ==========
            if (member.roles.cache.has(role.id)) {
                await member.roles.remove(role);
                console.log(`❌ Removed ${role.name} from ${user.tag}`);
            } else {
                // ========== EXCLUSIVE LOGIC ==========
                const exclusiveGroup = getExclusiveGroup(role.id);
                if (exclusiveGroup) {
                    for (const otherRoleId of exclusiveGroup) {
                        if (otherRoleId !== role.id && member.roles.cache.has(otherRoleId)) {
                            await member.roles.remove(otherRoleId);
                            console.log(`❌ Removed old exclusive role ${otherRoleId} from ${user.tag}`);
                        }
                    }
                }
                
                await member.roles.add(role);
                console.log(`✅ Added ${role.name} to ${user.tag}`);
            }
        } catch (error) {
            console.error('❌ Error in messageReactionAdd:', error);
        }
    }
};
