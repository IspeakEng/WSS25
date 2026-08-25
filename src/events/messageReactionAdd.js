// Reaction Role Add Event - Handles when a user adds a reaction
import { getRoleConfig, getExclusiveGroup } from '../services/reactionRoleService.js';

export const name = 'messageReactionAdd';

export async function execute(reaction, user) {
    // Ignore bot's own reactions
    if (user.bot) return;

    try {
        // Fetch partial data if needed
        if (reaction.partial) await reaction.fetch();
        if (reaction.message.partial) await reaction.message.fetch();

        // Get role configuration for this reaction
        const config = await getRoleConfig(reaction.message.id, reaction.emoji.name || reaction.emoji.id);
        if (!config) return;

        const member = await reaction.message.guild.members.fetch(user.id);
        const role = reaction.message.guild.roles.cache.get(config.roleId);
        if (!role) {
            console.log(`❌ Role ${config.roleId} not found`);
            return;
        }

        // ========== TOGGLE LOGIC ==========
        if (member.roles.cache.has(role.id)) {
            // Remove role if user already has it (toggle off)
            await member.roles.remove(role);
            console.log(`❌ Removed ${role.name} from ${user.tag}`);
            
            // Send feedback if needed
            try {
                await user.send(`❌ Removed **${role.name}** role from you`);
            } catch (e) {
                // User has DMs disabled
            }
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
            
            // Send feedback if needed
            try {
                await user.send(`✅ Added **${role.name}** role to you`);
            } catch (e) {
                // User has DMs disabled
            }
        }
    } catch (error) {
        console.error('❌ Error in messageReactionAdd:', error);
    }
}
