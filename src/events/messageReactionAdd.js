module.exports = {
    name: 'messageReactionAdd',
    async execute(reaction, user) {
        // বটের নিজের রিয়্যাকশন ইগনোর
        if (user.bot) return;

        // পার্শিয়াল ডাটা ফেচ করুন
        if (reaction.partial) await reaction.fetch();
        if (reaction.message.partial) await reaction.message.fetch();

        // আপনার রোল কনফিগ এখানে লোড করুন
        // (আপনার ডাটাবেস বা ম্যাপ থেকে)
        const roleConfig = await getRoleConfig(reaction.message.id, reaction.emoji.name);
        if (!roleConfig) return;

        const member = await reaction.message.guild.members.fetch(user.id);
        const role = reaction.message.guild.roles.cache.get(roleConfig.roleId);
        if (!role) return;

        // ========== টগল লজিক ==========
        if (member.roles.cache.has(role.id)) {
            // রোল থাকলে রিমুভ করো
            await member.roles.remove(role);
            console.log(`❌ ${user.tag} থেকে ${role.name} রিমুভ করা হলো`);
        } else {
            // ========== এক্সক্লুসিভ লজিক ==========
            // এই গ্রুপের অন্য রোলগুলো রিমুভ করো
            const exclusiveGroup = getExclusiveGroup(role.id);
            if (exclusiveGroup) {
                for (const otherRoleId of exclusiveGroup) {
                    if (otherRoleId !== role.id && member.roles.cache.has(otherRoleId)) {
                        await member.roles.remove(otherRoleId);
                        console.log(`❌ পুরোনো রোল রিমুভ করা হলো: ${otherRoleId}`);
                    }
                }
            }
            
            // নতুন রোল অ্যাড করো
            await member.roles.add(role);
            console.log(`✅ ${user.tag} কে ${role.name} রোল দেওয়া হলো`);
        }
    }
};
