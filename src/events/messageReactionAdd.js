// Reaction Role Add Event - Database Storage with Ephemeral DM

import { 
    getRoleConfig, 
    getExclusiveGroupRoles
} from '../services/reactionRoleService.js';

export default {
    name: 'messageReactionAdd',
    
    async execute(reaction, user) {
        if (user.bot) return;

        try {
            // Fetch partial data
            if (reaction.partial) await reaction.fetch();
            if (reaction.message.partial) await reaction.message.fetch();

            // Get role configuration from database
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

            // ========== TOGGLE LOGIC ==========
            if (member.roles.cache.has(role.id)) {
                // Remove role (toggle off)
                await member.roles.remove(role);
                console.log(`❌ Removed ${role.name} from ${user.tag}`);
                
                // ========== SEND EPHEMERAL DM ==========
                await sendEphemeralMessage(user, `❌ **${role.name}** role has been removed from you.`);
                return;
            }

            // ========== EXCLUSIVE LOGIC ==========
            let removedRoles = [];
            if (config.is_exclusive && config.exclusive_group) {
                // Get all roles in this exclusive group
                const groupRoles = await getExclusiveGroupRoles(config.exclusive_group);
                
                // Remove all other roles from the same group
                for (const groupRole of groupRoles) {
                    if (groupRole.role_id !== config.role_id) {
                        const otherRole = reaction.message.guild.roles.cache.get(groupRole.role_id);
                        if (otherRole && member.roles.cache.has(otherRole.id)) {
                            await member.roles.remove(otherRole);
                            removedRoles.push(otherRole.name);
                            console.log(`❌ Removed exclusive role ${otherRole.name} from ${user.tag}`);
                            
                            // Also remove the reaction if it exists on the message
                            try {
                                const message = reaction.message;
                                const reactions = message.reactions.cache;
                                for (const [emoji, msgReaction] of reactions) {
                                    if (msgReaction.emoji.name === groupRole.emoji || msgReaction.emoji.id === groupRole.emoji) {
                                        await msgReaction.users.remove(user.id);
                                    }
                                }
                            } catch (e) {
                                // Ignore reaction removal errors
                            }
                        }
                    }
                }
            }

            // Add the new role
            await member.roles.add(role);
            console.log(`✅ Added ${role.name} to ${user.tag}`);

            // ========== SEND EPHEMERAL DM ==========
            let messageText = `✅ **${role.name}** role has been added to you.`;
            if (removedRoles.length > 0) {
                messageText += `\n\n🔄 Removed exclusive roles: **${removedRoles.join(', ')}**`;
            }
            await sendEphemeralMessage(user, messageText);

        } catch (error) {
            console.error('❌ Error in messageReactionAdd:', error);
        }
    }
};

// ========== HELPER FUNCTION ==========
async function sendEphemeralMessage(user, content) {
    try {
        // Try to send DM
        await user.send(content);
        console.log(`📨 Sent ephemeral message to ${user.tag}`);
    } catch (error) {
        // User has DMs disabled or bot can't DM
        console.log(`⚠️ Could not send DM to ${user.tag}: ${error.message}`);
        
        // Optionally, try to send as a follow-up if in a channel context
        // This requires the interaction context which we don't have here
        // So we just log it
    }
}
