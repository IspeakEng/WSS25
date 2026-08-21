import {
  SlashCommandBuilder,
  PermissionFlagsBits,
} from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('role')
    .setDescription('Give or remove a role from a member')
    .addSubcommand(subcommand =>
      subcommand
        .setName('give')
        .setDescription('Give a role to a member')
        .addUserOption(option =>
          option
            .setName('user')
            .setDescription('The member to give the role to')
            .setRequired(true)
        )
        .addRoleOption(option =>
          option
            .setName('role')
            .setDescription('The role to give')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('remove')
        .setDescription('Remove a role from a member')
        .addUserOption(option =>
          option
            .setName('user')
            .setDescription('The member to remove the role from')
            .setRequired(true)
        )
        .addRoleOption(option =>
          option
            .setName('role')
            .setDescription('The role to remove')
            .setRequired(true)
        )
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    const user = interaction.options.getUser('user');
    const role = interaction.options.getRole('role');

    const member = await interaction.guild.members.fetch(user.id);

    // Bot-এর নিজের highest role
    const botMember = interaction.guild.members.me;

    // @everyone role
    if (role.id === interaction.guild.id) {
      return interaction.reply({
        content: '❌ You cannot give/remove the @everyone role.',
        ephemeral: true,
      });
    }

    // Bot role hierarchy check
    if (role.position >= botMember.roles.highest.position) {
      return interaction.reply({
        content: `❌ I can't manage **${role.name}** because this role is higher than or equal to my highest role.`,
        ephemeral: true,
      });
    }

    // Check if user already has the role
    if (subcommand === 'give') {
      if (member.roles.cache.has(role.id)) {
        return interaction.reply({
          content: `⚠️ <@${user.id}> already has **${role.name}**.`,
          ephemeral: true,
        });
      }

      await member.roles.add(role);

      return interaction.reply({
        content: `✅ Gave **${role.name}** to <@${user.id}>.`,
      });
    }

    if (subcommand === 'remove') {
      if (!member.roles.cache.has(role.id)) {
        return interaction.reply({
          content: `⚠️ <@${user.id}> doesn't have **${role.name}**.`,
          ephemeral: true,
        });
      }

      await member.roles.remove(role);

      return interaction.reply({
        content: `✅ Removed **${role.name}** from <@${user.id}>.`,
      });
    }
  },
};
