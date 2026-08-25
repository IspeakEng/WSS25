import { logger } from '../utils/logger.js';
import { createError, ErrorTypes } from '../utils/errorHandler.js';
import {
    getReactionRoleKey,
    getReactionRolesPrefix
} from '../utils/database/keys.js';

const MAX_ROLES_PER_MESSAGE = 25;

const DANGEROUS_PERMISSIONS = [
    'Administrator',
    'ManageGuild',
    'ManageRoles',
    'ManageChannels',
    'ManageWebhooks',
    'BanMembers',
    'KickMembers'
];

function validateGuildId(guildId) {
    if (!guildId || typeof guildId !== 'string' || !/^\d{17,19}$/.test(guildId)) {
        throw createError(
            `Invalid guild ID: ${guildId}`,
            ErrorTypes.VALIDATION,
            'Invalid server ID provided.',
            { guildId }
        );
    }
}

function validateMessageId(messageId) {
    if (!messageId || typeof messageId !== 'string' || !/^\d{17,19}$/.test(messageId)) {
        throw createError(
            `Invalid message ID: ${messageId}`,
            ErrorTypes.VALIDATION,
            'Invalid message ID provided.',
            { messageId }
        );
    }
}

function validateRoleId(roleId) {
    if (!roleId || typeof roleId !== 'string' || !/^\d{17,19}$/.test(roleId)) {
        throw createError(
            `Invalid role ID: ${roleId}`,
            ErrorTypes.VALIDATION,
            'Invalid role ID provided.',
            { roleId }
        );
    }
}

export function hasDangerousPermissions(role) {
    if (!role || !role.permissions) return false;

    for (const permission of DANGEROUS_PERMISSIONS) {
        if (role.permissions.has(permission)) {
            return true;
        }
    }

    return false;
}

async function validateRoleSafety(client, guildId, roleId) {
    const guild =
        client.guilds?.cache?.get(guildId) ||
        await client.guilds?.fetch?.(guildId).catch(() => null);

    if (!guild) {
        throw createError(
            `Guild not found: ${guildId}`,
            ErrorTypes.VALIDATION,
            'Server not found while validating reaction roles.',
            { guildId, roleId }
        );
    }

    const role =
        guild.roles.cache.get(roleId) ||
        await guild.roles.fetch(roleId).catch(() => null);

    if (!role) {
        throw createError(
            `Role not found: ${roleId}`,
            ErrorTypes.VALIDATION,
            'The selected role does not exist.',
            { guildId, roleId }
        );
    }

    if (role.managed) {
        throw createError(
            `Managed role: ${roleId}`,
            ErrorTypes.PERMISSION,
            'Managed/bot roles cannot be used for reaction roles.',
            { guildId, roleId }
        );
    }

    if (hasDangerousPermissions(role)) {
        throw createError(
            `Dangerous role permission: ${roleId}`,
            ErrorTypes.PERMISSION,
            'High-privilege roles cannot be assigned through reaction roles.',
            { guildId, roleId }
        );
    }

    if (role.id === guild.id) {
        throw createError(
            '@everyone role',
            ErrorTypes.VALIDATION,
            'The @everyone role cannot be used.',
            { guildId, roleId }
        );
    }

    const botHighestRole = guild.members.me?.roles?.highest;

    if (!botHighestRole || role.position >= botHighestRole.position) {
        throw createError(
            `Role above bot hierarchy: ${roleId}`,
            ErrorTypes.PERMISSION,
            'I cannot assign this role because it is equal to or above my highest role.',
            {
                guildId,
                roleId,
                rolePosition: role.position,
                botRolePosition: botHighestRole?.position
            }
        );
    }

    return role;
}

export async function getReactionRoleMessage(client, guildId, messageId) {
    try {
        validateGuildId(guildId);
        validateMessageId(messageId);

        const key = getReactionRoleKey(guildId, messageId);
        const data = await client.db.get(key);

        return data || null;
    } catch (error) {
        if (error.name === 'TitanBotError') {
            throw error;
        }

        logger.error(
            `Error getting reaction role message ${messageId}:`,
            error
        );

        throw createError(
            'Database error retrieving reaction role message',
            ErrorTypes.DATABASE,
            'Failed to retrieve reaction role data.',
            {
                guildId,
                messageId,
                originalError: error.message
            }
        );
    }
}

// ========== NEW: GET ROLE CONFIG ==========
export async function getRoleConfig(client, guildId, messageId, emoji) {
    try {
        const data = await getReactionRoleMessage(client, guildId, messageId);
        
        if (!data || !data.roles || !data.roles[emoji]) {
            return null;
        }

        // Check if this role is in an exclusive group
        let isExclusive = false;
        let exclusiveGroup = null;

        if (data.exclusiveGroups) {
            for (const [groupName, roles] of Object.entries(data.exclusiveGroups)) {
                for (const role of roles) {
                    if (role.roleId === data.roles[emoji] || role.roleId === data.roles[emoji]) {
                        isExclusive = true;
                        exclusiveGroup = groupName;
                        break;
                    }
                }
                if (isExclusive) break;
            }
        }

        return {
            role_id: data.roles[emoji],
            is_exclusive: isExclusive,
            exclusive_group: exclusiveGroup
        };
    } catch (error) {
        logger.error('Error getting role config:', error);
        return null;
    }
}

// ========== NEW: GET EXCLUSIVE GROUP ROLES ==========
export async function getExclusiveGroupRoles(client, guildId, messageId, groupName) {
    try {
        const data = await getReactionRoleMessage(client, guildId, messageId);
        
        if (!data || !data.exclusiveGroups || !data.exclusiveGroups[groupName]) {
            return [];
        }

        return data.exclusiveGroups[groupName];
    } catch (error) {
        logger.error('Error getting exclusive group roles:', error);
        return [];
    }
}

// ========== NEW: CHECK IF ROLE IS EXCLUSIVE ==========
export async function isExclusiveRole(client, guildId, messageId, roleId) {
    try {
        const data = await getReactionRoleMessage(client, guildId, messageId);
        
        if (!data || !data.exclusiveGroups) {
            return null;
        }

        for (const [groupName, roles] of Object.entries(data.exclusiveGroups)) {
            for (const role of roles) {
                if (role.roleId === roleId) {
                    return groupName;
                }
            }
        }

        return null;
    } catch (error) {
        logger.error('Error checking exclusive role:', error);
        return null;
    }
}

// ========== NEW: ADD EXCLUSIVE ROLE ==========
export async function addExclusiveReactionRole(
    client,
    guildId,
    messageId,
    emoji,
    roleId,
    groupName,
    channelId = null
) {
    validateGuildId(guildId);
    validateMessageId(messageId);
    validateRoleId(roleId);

    if (!emoji || typeof emoji !== 'string') {
        throw createError(
            'Invalid emoji',
            ErrorTypes.VALIDATION,
            'You must provide a valid emoji.',
            { emoji }
        );
    }

    if (!groupName || typeof groupName !== 'string') {
        throw createError(
            'Invalid group name',
            ErrorTypes.VALIDATION,
            'You must provide a group name for exclusive roles.',
            { groupName }
        );
    }

    const role = await validateRoleSafety(client, guildId, roleId);

    const key = getReactionRoleKey(guildId, messageId);

    let data = await getReactionRoleMessage(client, guildId, messageId);

    if (!data) {
        data = {
            guildId,
            channelId: channelId || '',
            messageId,
            roles: {},
            unique: false,
            exclusiveGroups: {},
            createdAt: new Date().toISOString()
        };
    }

    if (!data.roles || Array.isArray(data.roles)) {
        data.roles = {};
    }

    if (!data.exclusiveGroups || Array.isArray(data.exclusiveGroups)) {
        data.exclusiveGroups = {};
    }

    // Check if emoji already exists
    if (data.roles[emoji]) {
        throw createError(
            `Emoji already exists: ${emoji}`,
            ErrorTypes.VALIDATION,
            `The emoji ${emoji} is already assigned to a role on this message.`,
            {
                emoji,
                existingRoleId: data.roles[emoji]
            }
        );
    }

    // Check limit
    if (Object.keys(data.roles).length >= MAX_ROLES_PER_MESSAGE) {
        throw createError(
            'Reaction role limit reached',
            ErrorTypes.VALIDATION,
            `This message already has the maximum of ${MAX_ROLES_PER_MESSAGE} reaction roles.`,
            {
                limit: MAX_ROLES_PER_MESSAGE
            }
        );
    }

    // Add role
    data.roles[emoji] = role.id;

    // Add to exclusive group
    if (!data.exclusiveGroups[groupName]) {
        data.exclusiveGroups[groupName] = [];
    }
    data.exclusiveGroups[groupName].push({
        emoji: emoji,
        roleId: role.id
    });

    if (channelId) {
        data.channelId = channelId;
    }

    await client.db.set(key, data);

    logger.info(
        `Added exclusive role ${emoji} -> ${role.name} to group ${groupName} on message ${messageId}`
    );

    return data;
}

// ========== EXISTING FUNCTIONS ==========

export async function createReactionRoleMessage(
    client,
    guildId,
    channelId,
    messageId,
    roles = {}
) {
    validateGuildId(guildId);
    validateMessageId(messageId);

    if (!channelId || !/^\d{17,19}$/.test(channelId)) {
        throw createError(
            `Invalid channel ID: ${channelId}`,
            ErrorTypes.VALIDATION,
            'Invalid channel ID provided.',
            { channelId }
        );
    }

    if (!roles || typeof roles !== 'object' || Array.isArray(roles)) {
        throw createError(
            'Invalid roles object',
            ErrorTypes.VALIDATION,
            'Reaction roles must be stored as an emoji-to-role mapping.',
            { roles }
        );
    }

    const roleEntries = Object.entries(roles);

    if (roleEntries.length > MAX_ROLES_PER_MESSAGE) {
        throw createError(
            `Too many reaction roles: ${roleEntries.length}`,
            ErrorTypes.VALIDATION,
            `A message can have a maximum of ${MAX_ROLES_PER_MESSAGE} reaction roles.`,
            {
                limit: MAX_ROLES_PER_MESSAGE
            }
        );
    }

    for (const [, roleId] of roleEntries) {
        validateRoleId(roleId);
        await validateRoleSafety(client, guildId, roleId);
    }

    const reactionRoleData = {
        guildId,
        channelId,
        messageId,
        roles,
        unique: false,
        exclusiveGroups: {},
        createdAt: new Date().toISOString()
    };

    const key = getReactionRoleKey(guildId, messageId);

    await client.db.set(key, reactionRoleData);

    logger.info(
        `Created reaction role message ${messageId} with ${roleEntries.length} roles`
    );

    return reactionRoleData;
}

export async function addReactionRole(
    client,
    guildId,
    messageId,
    emoji,
    roleId,
    channelId = null
) {
    validateGuildId(guildId);
    validateMessageId(messageId);
    validateRoleId(roleId);

    if (!emoji || typeof emoji !== 'string') {
        throw createError(
            'Invalid emoji',
            ErrorTypes.VALIDATION,
            'You must provide a valid emoji.',
            { emoji }
        );
    }

    const role = await validateRoleSafety(client, guildId, roleId);

    const key = getReactionRoleKey(guildId, messageId);

    let data = await getReactionRoleMessage(client, guildId, messageId);

    if (!data) {
        data = {
            guildId,
            channelId: channelId || '',
            messageId,
            roles: {},
            unique: false,
            exclusiveGroups: {},
            createdAt: new Date().toISOString()
        };
    }

    if (!data.roles || Array.isArray(data.roles)) {
        data.roles = {};
    }

    if (!data.exclusiveGroups || Array.isArray(data.exclusiveGroups)) {
        data.exclusiveGroups = {};
    }

    if (data.roles[emoji]) {
        throw createError(
            `Emoji already exists: ${emoji}`,
            ErrorTypes.VALIDATION,
            `The emoji ${emoji} is already assigned to a role on this message.`,
            {
                emoji,
                existingRoleId: data.roles[emoji]
            }
        );
    }

    if (Object.keys(data.roles).length >= MAX_ROLES_PER_MESSAGE) {
        throw createError(
            'Reaction role limit reached',
            ErrorTypes.VALIDATION,
            `This message already has the maximum of ${MAX_ROLES_PER_MESSAGE} reaction roles.`,
            {
                limit: MAX_ROLES_PER_MESSAGE
            }
        );
    }

    data.roles[emoji] = role.id;

    if (channelId) {
        data.channelId = channelId;
    }

    await client.db.set(key, data);

    logger.info(
        `Added ${emoji} -> ${role.name} on message ${messageId}`
    );

    return data;
}

export async function removeReactionRole(
    client,
    guildId,
    messageId,
    emoji
) {
    validateGuildId(guildId);
    validateMessageId(messageId);

    const key = getReactionRoleKey(guildId, messageId);

    const data = await getReactionRoleMessage(client, guildId, messageId);

    if (!data?.roles?.[emoji]) {
        return false;
    }

    // Also remove from exclusive groups if present
    if (data.exclusiveGroups) {
        for (const [groupName, roles] of Object.entries(data.exclusiveGroups)) {
            const index = roles.findIndex(r => r.emoji === emoji);
            if (index !== -1) {
                roles.splice(index, 1);
                if (roles.length === 0) {
                    delete data.exclusiveGroups[groupName];
                }
                break;
            }
        }
    }

    delete data.roles[emoji];

    if (Object.keys(data.roles).length === 0) {
        await client.db.delete(key);
        logger.info(`Removed last reaction role from ${messageId}`);
    } else {
        await client.db.set(key, data);
        logger.info(`Removed reaction role ${emoji} from ${messageId}`);
    }

    return true;
}

export async function setReactionRoleUnique(
    client,
    guildId,
    messageId,
    enabled = true
) {
    validateGuildId(guildId);
    validateMessageId(messageId);

    const key = getReactionRoleKey(guildId, messageId);

    const data = await getReactionRoleMessage(client, guildId, messageId);

    if (!data) {
        throw createError(
            'Reaction role message not found',
            ErrorTypes.CONFIGURATION,
            'No reaction-role configuration exists for this message.'
        );
    }

    data.unique = Boolean(enabled);

    await client.db.set(key, data);

    logger.info(
        `Reaction role unique mode for ${messageId}: ${data.unique}`
    );

    return data;
}

export async function deleteReactionRoleMessage(
    client,
    guildId,
    messageId
) {
    validateGuildId(guildId);
    validateMessageId(messageId);

    const key = getReactionRoleKey(guildId, messageId);

    const data = await getReactionRoleMessage(client, guildId, messageId);

    if (!data) {
        return true;
    }

    await client.db.delete(key);

    logger.info(
        `Deleted reaction role message ${messageId}`
    );

    return true;
}

export async function getAllReactionRoleMessages(
    client,
    guildId
) {
    validateGuildId(guildId);

    const prefix = getReactionRolesPrefix(guildId);

    let keys;

    try {
        keys = await client.db.list(prefix);

        if (!Array.isArray(keys)) {
            if (keys?.value && Array.isArray(keys.value)) {
                keys = keys.value;
            } else {
                const allKeys = await client.db.list();

                if (Array.isArray(allKeys)) {
                    keys = allKeys.filter(key =>
                        key.startsWith(prefix)
                    );
                } else if (
                    allKeys?.value &&
                    Array.isArray(allKeys.value)
                ) {
                    keys = allKeys.value.filter(key =>
                        key.startsWith(prefix)
                    );
                } else {
                    return [];
                }
            }
        }
    } catch (error) {
        logger.error(
            `Error listing reaction role keys:`,
            error
        );

        throw createError(
            'Database error listing reaction roles',
            ErrorTypes.DATABASE,
            'Failed to retrieve reaction role list.',
            {
                guildId,
                originalError: error.message
            }
        );
    }

    if (!keys?.length) {
        return [];
    }

    const messages = [];

    for (const key of keys) {
        try {
            const data = await client.db.get(key);

            if (!data) continue;

            const actualData = data?.value ?? data;

            if (actualData?.messageId && actualData?.channelId) {
                if (!actualData.roles) {
                    actualData.roles = {};
                }
                if (!actualData.exclusiveGroups) {
                    actualData.exclusiveGroups = {};
                }
                messages.push(actualData);
            }
        } catch (error) {
            logger.warn(
                `Could not read reaction role key ${key}:`,
                error
            );
        }
    }

    return messages;
}

export async function setReactionRoleChannel(
    client,
    guildId,
    messageId,
    channelId
) {
    validateGuildId(guildId);
    validateMessageId(messageId);

    if (!channelId || !/^\d{17,19}$/.test(channelId)) {
        throw createError(
            `Invalid channel ID: ${channelId}`,
            ErrorTypes.VALIDATION,
            'Invalid channel ID provided.',
            { channelId }
        );
    }

    const key = getReactionRoleKey(guildId, messageId);

    const data = await getReactionRoleMessage(client, guildId, messageId) || {
        guildId,
        messageId,
        channelId,
        roles: {},
        unique: false,
        exclusiveGroups: {},
        createdAt: new Date().toISOString()
    };

    data.channelId = channelId;

    await client.db.set(key, data);

    return true;
}

export async function reconcileReactionRoleMessages(
    client,
    guildId = null
) {
    const summary = {
        scannedGuilds: 0,
        scannedMessages: 0,
        removedMessages: 0,
        errors: 0
    };

    const targetGuildIds = guildId
        ? [guildId]
        : Array.from(client.guilds.cache.keys());

    for (const targetGuildId of targetGuildIds) {
        summary.scannedGuilds++;

        let messages = [];

        try {
            messages = await getAllReactionRoleMessages(client, targetGuildId);
        } catch {
            summary.errors++;
            continue;
        }

        const guild = client.guilds.cache.get(targetGuildId) ||
            await client.guilds.fetch(targetGuildId).catch(() => null);

        if (!guild) {
            for (const panel of messages) {
                await client.db.delete(
                    getReactionRoleKey(targetGuildId, panel.messageId)
                );
                summary.removedMessages++;
            }
            continue;
        }

        for (const panel of messages) {
            summary.scannedMessages++;

            try {
                const channel = guild.channels.cache.get(panel.channelId) ||
                    await guild.channels.fetch(panel.channelId).catch(() => null);

                if (!channel?.isTextBased?.()) {
                    await client.db.delete(
                        getReactionRoleKey(targetGuildId, panel.messageId)
                    );
                    summary.removedMessages++;
                    continue;
                }

                const message = await channel.messages
                    .fetch(panel.messageId)
                    .catch(() => null);

                if (!message) {
                    await client.db.delete(
                        getReactionRoleKey(targetGuildId, panel.messageId)
                    );
                    summary.removedMessages++;
                }
            } catch (error) {
                summary.errors++;
                logger.warn(
                    `Failed checking reaction role message ${panel.messageId}:`,
                    error
                );
            }
        }
    }

    logger.info(
        `Reaction role reconciliation complete: ${summary.scannedMessages} messages scanned, ${summary.removedMessages} removed, ${summary.errors} errors`
    );

    return summary;
}
