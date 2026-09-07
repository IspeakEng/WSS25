import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PERMS_FILE = path.join(__dirname, '../data/user_perms.json');

// Load permissions
export async function loadPerms() {
    try {
        const data = await fs.readFile(PERMS_FILE, 'utf-8');
        return JSON.parse(data);
    } catch {
        return {};
    }
}

// Save permissions
export async function savePerms(perms) {
    await fs.mkdir(path.dirname(PERMS_FILE), { recursive: true });
    await fs.writeFile(PERMS_FILE, JSON.stringify(perms, null, 4));
}

// Get user permissions
export async function getUserPerms(userId) {
    const perms = await loadPerms();
    return perms[userId] || [];
}

// Set user permissions
export async function setUserPerms(userId, permsList) {
    const allPerms = await loadPerms();
    if (permsList.length > 0) {
        allPerms[userId] = permsList;
    } else {
        delete allPerms[userId];
    }
    await savePerms(allPerms);
}

// Check permission
export async function hasPermission(userId, commandName) {
    const userPerms = await getUserPerms(userId);
    return userPerms.includes(commandName) || userPerms.includes('all');
}
