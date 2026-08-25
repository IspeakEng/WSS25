import { logger } from '../utils/logger.js';
import { getReactionRoleKey, getReactionRolesPrefix } from '../utils/database/keys.js';

// ========== SAVE REACTION ROLE ==========
export async function saveReactionRole(client, guildId, messageId, emoji, roleId, channelId, exclusiveGroup = null) {
    try {
        const key = getReactionRoleKey(guildId, messageId);
        let data = await client.db.get(key) || { roles: {}, exclusive: {} };
        
        data.roles[emoji] = roleId;
        data.channelId = channelId;
        data.guildId = guildId;
        data.messageId = messageId;
        
        if (exclusiveGroup) {
            if (!data.exclusive) data.exclusive = {};
            if (!data.exclusive[exclusiveGroup]) {
                data.exclusive[exclusiveGroup] = [];
            }
            if (!data.exclusive[exclusiveGroup].includes(emoji)) {
                data.exclusive[exclusiveGroup].push(emoji);
            }
        }
        
        await client.db.set(key, data);
        logger.info(`✅ Reaction role saved: ${emoji} -> ${roleId}`);
        return true;
    } catch (error) {
        logger.error('Error saving reaction role:', error);
        return false;
    }
}

// ========== GET REACTION ROLES ==========
export async function getReactionRoles(client, guildId, messageId) {
    try {
        const key = getReactionRoleKey(guildId, messageId);
        return await client.db.get(key) || null;
    } catch (error) {
        logger.error('Error getting reaction roles:', error);
        return null;
    }
}

// ========== REMOVE REACTION ROLE ==========
export async function removeReactionRole(client, guildId, messageId, emoji) {
    try {
        const key = getReactionRoleKey(guildId, messageId);
        let data = await client.db.get(key);
        if (!data) return false;
        
        delete data.roles[emoji];
        
        if (data.exclusive) {
            for (const [group, emojis] of Object.entries(data.exclusive)) {
                data.exclusive[group] = emojis.filter(e => e !== emoji);
                if (data.exclusive[group].length === 0) {
                    delete data.exclusive[group];
                }
            }
        }
        
        if (Object.keys(data.roles).length === 0) {
            await client.db.delete(key);
        } else {
            await client.db.set(key, data);
        }
        
        logger.info(`✅ Reaction role removed: ${emoji}`);
        return true;
    } catch (error) {
        logger.error('Error removing reaction role:', error);
        return false;
    }
}

// ========== GET EXCLUSIVE GROUP ==========
export function getExclusiveGroup(data, emoji) {
    if (!data?.exclusive) return null;
    for (const [group, emojis] of Object.entries(data.exclusive)) {
        if (emojis.includes(emoji)) {
            return { group, emojis };
        }
    }
    return null;
}

// ========== RECONCILE REACTION ROLES ==========
export async function reconcileReactionRoleMessages(client) {
    const summary = {
        scannedMessages: 0,
        removedMessages: 0,
        errors: 0
    };

    try {
        const guilds = client.guilds.cache;
        
        for (const [guildId] of guilds) {
            const prefix = getReactionRolesPrefix(guildId);
            let keys = [];
            
            try {
                const result = await client.db.list(prefix);
                if (Array.isArray(result)) {
                    keys = result;
                } else if (result?.value && Array.isArray(result.value)) {
                    keys = result.value;
                }
            } catch (e) {
                continue;
            }

            for (const key of keys) {
                summary.scannedMessages++;
                try {
                    const data = await client.db.get(key);
                    if (!data) continue;

                    const guild = client.guilds.cache.get(guildId);
                    if (!guild) {
                        await client.db.delete(key);
                        summary.removedMessages++;
                        continue;
                    }

                    const channel = guild.channels.cache.get(data.channelId);
                    if (!channel) {
                        await client.db.delete(key);
                        summary.removedMessages++;
                        continue;
                    }

                    try {
                        await channel.messages.fetch(data.messageId);
                    } catch (e) {
                        await client.db.delete(key);
                        summary.removedMessages++;
                    }
                } catch (error) {
                    summary.errors++;
                    logger.warn(`Error reconciling reaction role ${key}:`, error.message);
                }
            }
        }
    } catch (error) {
        logger.error('Error in reconcileReactionRoleMessages:', error);
    }

    return summary;
}

// ========== RECONCILE REACTION ROLE PANEL HEALTH ==========
export async function reconcileReactionRolePanelHealth(client) {
    const summary = {
        scannedPanels: 0,
        healthyPanels: 0,
        deletedPanels: 0,
        missingChannels: 0,
        recoveredIds: 0,
        errors: 0
    };

    try {
        const guilds = client.guilds.cache;
        
        for (const [guildId] of guilds) {
            const prefix = getReactionRolesPrefix(guildId);
            let keys = [];
            
            try {
                const result = await client.db.list(prefix);
                if (Array.isArray(result)) {
                    keys = result;
                } else if (result?.value && Array.isArray(result.value)) {
                    keys = result.value;
                }
            } catch (e) {
                continue;
            }

            for (const key of keys) {
                summary.scannedPanels++;
                try {
                    const data = await client.db.get(key);
                    if (!data) continue;

                    const guild = client.guilds.cache.get(guildId);
                    if (!guild) {
                        await client.db.delete(key);
                        summary.deletedPanels++;
                        continue;
                    }

                    const channel = guild.channels.cache.get(data.channelId);
                    if (!channel) {
                        summary.missingChannels++;
                        await client.db.delete(key);
                        summary.deletedPanels++;
                        continue;
                    }

                    try {
                        await channel.messages.fetch(data.messageId);
                        summary.healthyPanels++;
                    } catch (e) {
                        await client.db.delete(key);
                        summary.deletedPanels++;
                    }
                } catch (error) {
                    summary.errors++;
                }
            }
        }
    } catch (error) {
        logger.error('Error in reconcileReactionRolePanelHealth:', error);
    }

    return summary;
}
