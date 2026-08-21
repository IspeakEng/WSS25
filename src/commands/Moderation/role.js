import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
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
    const botMember = interaction.guild.members.me;

    if (role.id === interaction.guild.id) {
      const embed = new EmbedBuilder()
        .setColor(0x000000)
        .setTitle('❌ Role Error')
        .setDescription('You cannot give or remove the `@everyone` role.')
        .setTimestamp();

      return interaction.reply({
        embeds: [embed],
        ephemeral: true,
      });
    }

    if (role.position >= botMember.roles.highest.position) {
      const embed = new EmbedBuilder()
        .setColor(0x000000)
        .setTitle('❌ Role Hierarchy Error')
        .setDescription(
          `I cannot manage **${role.name}** because this role is higher than or equal to my highest role.`
        )
        .setTimestamp();

      return interaction.reply({
        embeds: [embed],
        ephemeral: true,
      });
    }

    if (subcommand === 'give') {
      if (member.roles.cache.has(role.id)) {
        const embed = new EmbedBuilder()
          .setColor(0x000000)
          .setTitle('⚠️ Role Already Assigned')
          .setDescription(
            `<@${user.id}> already has the **${role.name}** role.`
          )
          .setTimestamp();

        return interaction.reply({
          embeds: [embed],
          ephemeral: true,
        });
      }

      try {
        await member.roles.add(role);

        const embed = new EmbedBuilder()
          .setColor(0x000000)
          .setTitle('Role Given')
          .setDescription(
            `Successfully gave **${role.name}** to <@${user.id}>.`
          )
          .addFields(
            {
              name: 'Member',
              value: `<@${user.id}>`,
              inline: true,
            },
            {
              name: 'Role',
              value: `<@&${role.id}>`,
              inline: true,
            },
            {
              name: 'Moderator',
              value: `<@${interaction.user.id}>`,
              inline: true,
            }
          )
          .setTimestamp();

        return interaction.reply({
          embeds: [embed],
        });
      } catch (error) {
        console.error(error);

        const embed = new EmbedBuilder()
          .setColor(0x000000)
          .setTitle('❌ Failed to Give Role')
          .setDescription(
            'I could not give this role. Please check my **Manage Roles** permission and role hierarchy.'
          )
          .setTimestamp();

        return interaction.reply({
          embeds: [embed],
          ephemeral: true,
        });
      }
    }

    if (subcommand === 'remove') {
      if (!member.roles.cache.has(role.id)) {
        const embed = new EmbedBuilder()
          .setColor(0x000000)
          .setTitle('⚠️ Role Not Found')
          .setDescription(
            `<@${user.id}> does not have the **${role.name}** role.`
          )
          .setTimestamp();

        return interaction.reply({
          embeds: [embed],
          ephemeral: true,
        });
      }

      try {
        await member.roles.remove(role);

        const embed = new EmbedBuilder()
          .setColor(0x000000)
          .setTitle('Role Removed')
          .setDescription(
            `Successfully removed **${role.name}** from <@${user.id}>.`
          )
          .addFields(
            {
              name: 'Member',
              value: `<@${user.id}>`,
              inline: true,
            },
            {
              name: 'Role',
              value: `<@&${role.id}>`,
              inline: true,
            },
            {
              name: 'Moderator',
              value: `<@${interaction.user.id}>`,
              inline: true,
            }
          )
          .setTimestamp();

        return interaction.reply({
          embeds: [embed],
        });
      } catch (error) {
        console.error(error);

        const embed = new EmbedBuilder()
          .setColor(0x000000)
          .setTitle('❌ Failed to Remove Role')
          .setDescription(
            'I could not remove this role. Please check my **Manage Roles** permission and role hierarchy.'
          )
          .setTimestamp();

        return interaction.reply({
          embeds: [embed],
          ephemeral: true,
        });
      }
    }
  },
};
