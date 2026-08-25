// Reaction Role Add Event

import { 
    getRoleConfig,
    getExclusiveGroupRoles,
    isExclusiveRole
} from '../services/reactionRoleService.js';

export default {
    name: 'messageReactionAdd',
    
    async execute(reaction, user) {
        if (user.bot) return;

        try {
            if (reaction.partial) await reaction.fetch();
            if (reaction.message.partial) await reaction.message.fetch();

            const client = reaction.message.client;
            const guildId = reaction.message.guild.id;
            const messageId = reaction.message.id;
            const emoji = reaction.emoji.name || reaction.emoji.id;

            const config = await getRoleConfig(client, guildId, messageId, emoji);
            
            if (!config) return;

            const member = await reaction.message.guild.members.fetch(user.id);
            const role = reaction.message.guild.roles.cache.get(config.role_id);
            
            if (!role) {
                console.log(`❌ Role ${config.role_id} not found`);
                return;
            }

            // Toggle Logic
            if (member.roles.cache.has(role.id)) {
                await member.roles.remove(role);
                console.log(`❌ Removed ${role.name} from ${user.tag}`);
                await sendEphemeralMessage(user, `❌ **${role.name}** role has been removed from you.`);
                return;
            }

            // Exclusive Logic
            let removedRoles = [];
            const exclusiveGroup = await isExclusiveRole(client, guildId, messageId, role.id);

            if (exclusiveGroup) {
                const groupRoles = await getExclusiveGroupRoles(client, guildId, messageId, exclusiveGroup);

                for (const groupRole of groupRoles) {
                    if (groupRole.roleId !== role.id) {
                        const otherRole = reaction.message.guild.roles.cache.get(groupRole.roleId);
                        if (otherRole && member.roles.cache.has(otherRole.id)) {
                            await member.roles.remove(otherRole);
                            removedRoles.push(otherRole.name);
                            console.log(`❌ Removed exclusive role ${otherRole.name} from ${user.tag}`);
                            
                            try {
                                const msgReaction = reaction.message.reactions.cache.get(groupRole.emoji);
                                if (msgReaction) {
                                    await msgReaction.users.remove(user.id);
                                }
                            } catch (e) {
                                // Ignore
                            }
                        }
                    }
                }
            }

            await member.roles.add(role);
            console.log(`✅ Added ${role.name} to ${user.tag}`);

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

async function sendEphemeralMessage(user, content) {
    try {
        await user.send(content);
        console.log(`📨 Sent ephemeral message to ${user.tag}`);
    } catch (error) {
        console.log(`⚠️ Could not send DM to ${user.tag}: ${error.message}`);
    }
}
