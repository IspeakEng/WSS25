import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PERMS_FILE = path.join(__dirname, '../data/user_perms.json');

// Load all permissions from file
export async function loadPerms() {
    try {
        const data = await fs.readFile(PERMS_FILE, 'utf-8');
        return JSON.parse(data);
    } catch {
        return {};
    }
}

// Save permissions to file
export async function savePerms(perms) {
    await fs.mkdir(path.dirname(PERMS_FILE), { recursive: true });
    await fs.writeFile(PERMS_FILE, JSON.stringify(perms, null, 4));
}

// Get permissions for a specific user
export async function getUserPerms(userId) {
    const perms = await loadPerms();
    return perms[userId] || [];
}

// Set permissions for a specific user
export async function setUserPerms(userId, permsList) {
    const allPerms = await loadPerms();
    if (permsList.length > 0) {
        allPerms[userId] = permsList;
    } else {
        delete allPerms[userId];
    }
    await savePerms(allPerms);
}

// Check if user has permission for a command
export async function hasPermission(userId, commandName, client) {
    // Bot owner has all permissions
    const ownerId = process.env.OWNER_ID;
    if (userId === ownerId) return true;
    
    const userPerms = await getUserPerms(userId);
    return userPerms.includes(commandName) || userPerms.includes('all');
}
