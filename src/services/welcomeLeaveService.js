import { EmbedBuilder } from 'discord.js';

// ========================================
// Database Functions
// ========================================

export async function setWelcomeChannel(client, guildId, channelId) {
    const key = `welcome_${guildId}`;
    await client.db.set(key, { channelId });
    return true;
}

export async function setLeaveChannel(client, guildId, channelId) {
    const key = `leave_${guildId}`;
    await client.db.set(key, { channelId });
    return true;
}

export async function getWelcomeChannel(client, guildId) {
    const key = `welcome_${guildId}`;
    const data = await client.db.get(key);
    return data?.channelId || null;
}

export async function getLeaveChannel(client, guildId) {
    const key = `leave_${guildId}`;
    const data = await client.db.get(key);
    return data?.channelId || null;
}

// ========================================
// Welcome Embed
// ========================================

export function createWelcomeEmbed(member) {
    const guild = member.guild;
    const user = member.user;

    const bannerURL = 'https://media.discordapp.net/attachments/1527750801462657095/1528001749179306034/server_er_banner.png?ex=6a8ecf05&is=6a8d7d85&hm=82cfdde9ca5670f2bac19279dbbd832088f07bb18d4e4096e2e46e7c35b1d581&=&format=webp&quality=lossless&width=1398&height=559';

    const embed = new EmbedBuilder()
        .setColor('#FFB6C1')
        .setTitle(`☁️ welcome, ${user.username}`)
        .setDescription(
            `▸ ✦ ${guild.name} ✦\n` +
            `▸ ✧ member #${guild.memberCount}\n` +
            `▸ ˚₊‧⁺˖ enjoy your stay ♡`
        )
        .setThumbnail(user.displayAvatarURL({ dynamic: true, size: 256 }))
        .setImage(bannerURL)
        .setFooter({
            text: `₊˚.⋆ ☾ ${guild.name}`,
            iconURL: guild.iconURL({ dynamic: true })
        })
        .setTimestamp();

    return embed;
}

// ========================================
// Leave Embed
// ========================================

export function createLeaveEmbed(member) {
    const guild = member.guild;
    const user = member.user;

    const bannerURL = 'https://media.discordapp.net/attachments/1527750801462657095/1528001749179306034/server_er_banner.png?ex=6a8ecf05&is=6a8d7d85&hm=82cfdde9ca5670f2bac19279dbbd832088f07bb18d4e4096e2e46e7c35b1d581&=&format=webp&quality=lossless&width=1398&height=559';

    const embed = new EmbedBuilder()
        .setColor('#D8B4FE')
        .setTitle(`🌙 ${user.username} left`)
        .setDescription(
            `▸ ✦ ${guild.name} ✦\n` +
            `▸ ✧ ${guild.memberCount} remain\n` +
            `▸ ˚₊‧⁺˖ farewell, space cowboy ♡`
        )
        .setThumbnail(user.displayAvatarURL({ dynamic: true, size: 256 }))
        .setImage(bannerURL)
        .setFooter({
            text: `₊˚.⋆ ☾ ${guild.name}`,
            iconURL: guild.iconURL({ dynamic: true })
        })
        .setTimestamp();

    return embed;
}

// ========================================
// Test Functions
// ========================================

export async function testWelcome(client, guildId, userId) {
    const guild = await client.guilds.fetch(guildId);
    const member = await guild.members.fetch(userId);
    return createWelcomeEmbed(member);
}

export async function testLeave(client, guildId, userId) {
    const guild = await client.guilds.fetch(guildId);
    const member = await guild.members.fetch(userId);
    return createLeaveEmbed(member);
}
