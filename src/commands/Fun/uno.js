import {
  SlashCommandBuilder,
  ChannelType,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
} from 'discord.js';

const games = new Map();
const unoChannels = new Map();

const MAX_PLAYERS = 10;
const COLORS = ['red', 'yellow', 'green', 'blue'];

const COLOR_EMOJI = {
  red: '🔴',
  yellow: '🟡',
  green: '🟢',
  blue: '🔵',
  wild: '🌈',
};

const COLOR_NAMES = {
  red: 'Red',
  yellow: 'Yellow',
  green: 'Green',
  blue: 'Blue',
};

const CARD_NAMES = {
  skip: 'Skip',
  reverse: 'Reverse',
  draw2: '+2',
  wild: 'Wild',
  wild4: '+4',
};

function shuffle(array) {
  const result = [...array];

  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result;
}

function createDeck() {
  const deck = [];

  for (const color of COLORS) {
    deck.push({ color, value: '0' });

    for (let number = 1; number <= 9; number++) {
      deck.push({ color, value: String(number) });
      deck.push({ color, value: String(number) });
    }

    for (let i = 0; i < 2; i++) {
      deck.push({ color, value: 'skip' });
      deck.push({ color, value: 'reverse' });
      deck.push({ color, value: 'draw2' });
    }
  }

  for (let i = 0; i < 4; i++) {
    deck.push({ color: 'wild', value: 'wild' });
    deck.push({ color: 'wild', value: 'wild4' });
  }

  return shuffle(deck);
}

function cardText(card) {
  if (!card) return 'None';

  if (card.color === 'wild') {
    return `${COLOR_EMOJI.wild} ${CARD_NAMES[card.value]}`;
  }

  return `${COLOR_EMOJI[card.color]} ${
    CARD_NAMES[card.value] || card.value
  }`;
}

function cardLabel(card) {
  if (card.color === 'wild') {
    return CARD_NAMES[card.value];
  }

  return `${COLOR_NAMES[card.color]} ${
    CARD_NAMES[card.value] || card.value
  }`;
}

function canPlay(card, topCard, currentColor) {
  if (!card || !topCard) return false;

  if (card.color === 'wild') return true;

  if (card.color === currentColor) return true;

  if (card.value === topCard.value) return true;

  return false;
}

function createGame(channelId, hostId) {
  const game = {
    channelId,
    hostId,
    players: [],
    hands: new Map(),
    deck: [],
    discard: [],
    currentColor: null,
    turnIndex: 0,
    direction: 1,
    started: false,
    message: null,
    collector: null,
  };

  games.set(channelId, game);

  return game;
}

function currentPlayer(game) {
  return game.players[game.turnIndex];
}

function nextTurn(game, amount = 1) {
  const total = game.players.length;

  game.turnIndex =
    (game.turnIndex + amount * game.direction + total) % total;
}

function reshuffleDiscard(game) {
  if (game.discard.length <= 1) return;

  const topCard = game.discard.pop();

  game.deck = shuffle(game.discard);
  game.discard = [topCard];
}

function drawCards(game, amount) {
  const cards = [];

  for (let i = 0; i < amount; i++) {
    if (game.deck.length === 0) {
      reshuffleDiscard(game);
    }

    if (game.deck.length === 0) break;

    cards.push(game.deck.pop());
  }

  return cards;
}

function dealCards(game) {
  for (const player of game.players) {
    game.hands.set(player, drawCards(game, 7));
  }

  let firstCard;

  while (game.deck.length > 0) {
    firstCard = game.deck.pop();

    if (firstCard.value !== 'wild4') break;

    game.deck.unshift(firstCard);
  }

  game.discard.push(firstCard);

  if (firstCard.color === 'wild') {
    game.currentColor =
      COLORS[Math.floor(Math.random() * COLORS.length)];
  } else {
    game.currentColor = firstCard.color;
  }
}

function buildGameEmbed(game) {
  const topCard = game.discard.at(-1);

  let turnText = 'Waiting...';

  if (game.started) {
    const player = currentPlayer(game);

    turnText =
      player === 'BOT'
        ? '🤖 Bot'
        : `<@${player}>`;
  }

  const players =
    game.players.length > 0
      ? game.players
          .map((player) =>
            player === 'BOT'
              ? '🤖 Bot'
              : `<@${player}>`
          )
          .join('\n')
      : 'Nobody has joined yet.';

  const embed = new EmbedBuilder()
    .setTitle('🃏 UNO')
    .setDescription(
      game.started
        ? [
            `**Top Card:** ${cardText(topCard)}`,
            `**Current Color:** ${
              COLOR_EMOJI[game.currentColor]
            } ${COLOR_NAMES[game.currentColor]}`,
            `**Turn:** ${turnText}`,
          ].join('\n')
        : [
            'Join the game and wait for everyone.',
            '',
            '**1 player:** You vs Bot',
            '**2–10 players:** Humans only',
          ].join('\n')
    )
    .addFields({
      name: `Players (${game.players.length}/${MAX_PLAYERS})`,
      value: players,
    });

  if (game.started) {
    embed.addFields({
      name: 'Cards Remaining',
      value: game.players
        .map((player) => {
          const hand = game.hands.get(player) || [];

          return player === 'BOT'
            ? `🤖 Bot — **${hand.length}** cards`
            : `<@${player}> — **${hand.length}** cards`;
        })
        .join('\n'),
    });
  }

  return embed;
}

function lobbyButtons() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('uno_join')
      .setLabel('Join Game')
      .setEmoji('👤')
      .setStyle(ButtonStyle.Success),

    new ButtonBuilder()
      .setCustomId('uno_start')
      .setLabel('Start Game')
      .setEmoji('▶️')
      .setStyle(ButtonStyle.Primary),

    new ButtonBuilder()
      .setCustomId('uno_cancel')
      .setLabel('Cancel')
      .setEmoji('❌')
      .setStyle(ButtonStyle.Danger)
  );
}

function gameButtons() {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('uno_cards')
        .setLabel('My Cards')
        .setEmoji('🃏')
        .setStyle(ButtonStyle.Primary),

      new ButtonBuilder()
        .setCustomId('uno_draw')
        .setLabel('Draw Card')
        .setEmoji('➕')
        .setStyle(ButtonStyle.Secondary),

      new ButtonBuilder()
        .setCustomId('uno_call')
        .setLabel('UNO!')
        .setEmoji('📢')
        .setStyle(ButtonStyle.Success)
    ),
  ];
}

function cardSelectMenu(game, playerId) {
  const hand = game.hands.get(playerId) || [];
  const topCard = game.discard.at(-1);

  const playable = hand
    .map((card, index) => ({ card, index }))
    .filter(({ card }) =>
      canPlay(card, topCard, game.currentColor)
    );

  if (playable.length === 0) return null;

  const options = playable.slice(0, 25).map(({ card, index }) => ({
    label: cardLabel(card).slice(0, 100),
    value: String(index),
    emoji: COLOR_EMOJI[card.color] || '🃏',
  }));

  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('uno_play')
      .setPlaceholder('Choose a card to play...')
      .addOptions(options)
  );
}

function colorSelectMenu() {
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('uno_color')
      .setPlaceholder('Choose a color...')
      .addOptions(
        COLORS.map((color) => ({
          label: COLOR_NAMES[color],
          value: color,
          emoji: COLOR_EMOJI[color],
        }))
      )
  );
}

async function updateGameMessage(game) {
  if (!game.message) return;

  try {
    await game.message.edit({
      embeds: [buildGameEmbed(game)],
      components: game.started
        ? gameButtons()
        : [lobbyButtons()],
    });
  } catch {}
}

async function endGame(game, text) {
  if (game.collector) {
    game.collector.stop();
  }

  games.delete(game.channelId);

  try {
    await game.message?.edit({
      embeds: [
        new EmbedBuilder()
          .setTitle('🃏 UNO — Game Over')
          .setDescription(text),
      ],
      components: [],
    });
  } catch {}
}

async function startGame(game) {
  if (game.started) return;

  if (game.players.length === 1) {
    game.players.push('BOT');
  }

  if (game.players.length < 2) {
    throw new Error('NOT_ENOUGH_PLAYERS');
  }

  if (game.players.length > MAX_PLAYERS) {
    throw new Error('TOO_MANY_PLAYERS');
  }

  game.started = true;
  game.deck = createDeck();

  dealCards(game);

  game.turnIndex = Math.floor(
    Math.random() * game.players.length
  );

  game.direction = 1;
}

async function playCard(game, playerId, index, interaction) {
  if (currentPlayer(game) !== playerId) {
    return interaction.reply({
      content: '❌ It is not your turn.',
      ephemeral: true,
    });
  }

  const hand = game.hands.get(playerId);
  const card = hand?.[index];

  if (!card) {
    return interaction.reply({
      content: '❌ That card does not exist.',
      ephemeral: true,
    });
  }

  const topCard = game.discard.at(-1);

  if (!canPlay(card, topCard, game.currentColor)) {
    return interaction.reply({
      content: '❌ You cannot play that card.',
      ephemeral: true,
    });
  }

  if (card.color === 'wild') {
    return interaction.reply({
      content: `You played **${cardText(card)}**.\nChoose a color:`,
      components: [colorSelectMenu()],
      ephemeral: true,
    });
  }

  hand.splice(index, 1);
  game.discard.push(card);
  game.currentColor = card.color;

  await finishTurn(game, playerId, card, interaction);
}

async function finishTurn(game, playerId, card, interaction) {
  const hand = game.hands.get(playerId);

  if (hand.length === 0) {
    const winner =
      playerId === 'BOT'
        ? '🤖 **Bot wins!**'
        : `🏆 **<@${playerId}> wins!**`;

    return endGame(game, winner);
  }

  let skip = false;
  let drawAmount = 0;

  if (card.value === 'skip') {
    skip = true;
  }

  if (card.value === 'reverse') {
    if (game.players.length === 2) {
      skip = true;
    } else {
      game.direction *= -1;
    }
  }

  if (card.value === 'draw2') {
    drawAmount = 2;
    skip = true;
  }

  nextTurn(game);

  if (skip) {
    nextTurn(game);
  }

  const nextPlayer = currentPlayer(game);

  if (drawAmount > 0 && nextPlayer !== 'BOT') {
    const cards = drawCards(game, drawAmount);
    game.hands.get(nextPlayer)?.push(...cards);
  }

  await updateGameMessage(game);

  if (nextPlayer === 'BOT') {
    setTimeout(() => botTurn(game), 1200);
  }

  if (!interaction.replied && !interaction.deferred) {
    try {
      await interaction.update({
        embeds: [buildGameEmbed(game)],
        components: gameButtons(),
      });
    } catch {}
  }
}

async function playWild(game, playerId, color, interaction) {
  const hand = game.hands.get(playerId);

  if (!hand || currentPlayer(game) !== playerId) {
    return interaction.update({
      content: '❌ This action is no longer valid.',
      components: [],
    });
  }

  const index = hand.findIndex(
    (card) => card.color === 'wild'
  );

  if (index === -1) {
    return interaction.update({
      content: '❌ Wild card not found.',
      components: [],
    });
  }

  const card = hand.splice(index, 1)[0];

  game.discard.push(card);
  game.currentColor = color;

  await interaction.update({
    content: `🌈 Color changed to **${COLOR_NAMES[color]}**.`,
    components: [],
  });

  await finishTurn(game, playerId, card, {
    replied: true,
    deferred: false,
    update: async (data) => {
      try {
        await game.message.edit(data);
      } catch {}
    },
  });
}

async function botTurn(game) {
  if (!game.started || currentPlayer(game) !== 'BOT') {
    return;
  }

  const hand = game.hands.get('BOT') || [];
  const topCard = game.discard.at(-1);

  let playable = hand
    .map((card, index) => ({ card, index }))
    .filter(({ card }) =>
      canPlay(card, topCard, game.currentColor)
    );

  if (playable.length === 0) {
    const drawn = drawCards(game, 1);

    if (drawn.length > 0) {
      hand.push(drawn[0]);

      if (
        canPlay(
          drawn[0],
          topCard,
          game.currentColor
        )
      ) {
        playable = [
          {
            card: drawn[0],
            index: hand.length - 1,
          },
        ];
      }
    }
  }

  if (playable.length === 0) {
    nextTurn(game);
    await updateGameMessage(game);
    return;
  }

  const normal = playable.filter(
    ({ card }) => card.color !== 'wild'
  );

  const choice =
    normal.length > 0
      ? normal[Math.floor(Math.random() * normal.length)]
      : playable[Math.floor(Math.random() * playable.length)];

  const card = hand.splice(choice.index, 1)[0];

  game.discard.push(card);

  if (card.color === 'wild') {
    const counts = {};

    for (const c of hand) {
      if (c.color !== 'wild') {
        counts[c.color] = (counts[c.color] || 0) + 1;
      }
    }

    game.currentColor =
      Object.entries(counts)
        .sort((a, b) => b[1] - a[1])[0]?.[0] ||
      COLORS[Math.floor(Math.random() * COLORS.length)];
  } else {
    game.currentColor = card.color;
  }

  await finishBotTurn(game, card);
}

async function finishBotTurn(game, card) {
  const hand = game.hands.get('BOT');

  if (hand.length === 0) {
    return endGame(game, '🤖 **Bot wins!**');
  }

  let skip = false;
  let drawAmount = 0;

  if (card.value === 'skip') skip = true;

  if (card.value === 'reverse') {
    if (game.players.length === 2) {
      skip = true;
    } else {
      game.direction *= -1;
    }
  }

  if (card.value === 'draw2') {
    drawAmount = 2;
    skip = true;
  }

  nextTurn(game);

  if (skip) {
    nextTurn(game);
  }

  const nextPlayer = currentPlayer(game);

  if (drawAmount > 0 && nextPlayer !== 'BOT') {
    game.hands
      .get(nextPlayer)
      ?.push(...drawCards(game, drawAmount));
  }

  await updateGameMessage(game);

  if (nextPlayer === 'BOT') {
    setTimeout(() => botTurn(game), 1200);
  }
}

function helpEmbed() {
  return new EmbedBuilder()
    .setTitle('🃏 UNO Help')
    .setDescription(
      [
        '**How to play**',
        '',
        '1️⃣ Use `/uno` to create a game.',
        '2️⃣ Click **Join Game**.',
        '3️⃣ Host clicks **Start Game**.',
        '4️⃣ Match color or number.',
        '5️⃣ Use **Draw Card** when needed.',
        '6️⃣ Press **UNO!** with 1 card.',
        '7️⃣ First player with 0 cards wins.',
        '',
        '**Players**',
        '👤 1 player → You vs 🤖 Bot',
        '👥 2–10 players → Humans only',
        '',
        '**Special Cards**',
        '⏭️ Skip',
        '🔄 Reverse',
        '➕ +2',
        '🌈 Wild',
        '💥 +4',
      ].join('\n')
    );
}

export default {
  data: new SlashCommandBuilder()
    .setName('uno')
    .setDescription('Play UNO')
    .addSubcommand((sub) =>
      sub
        .setName('setup')
        .setDescription('Set the UNO game channel')
        .addChannelOption((option) =>
          option
            .setName('channel')
            .setDescription('Select the UNO channel')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('help')
        .setDescription('Show UNO help')
    ),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'help') {
      return interaction.reply({
        embeds: [helpEmbed()],
        ephemeral: true,
      });
    }

    if (subcommand === 'setup') {
      if (
        !interaction.memberPermissions?.has(
          PermissionFlagsBits.ManageGuild
        )
      ) {
        return interaction.reply({
          content:
            '❌ You need **Manage Server** permission.',
          ephemeral: true,
        });
      }

      const channel =
        interaction.options.getChannel('channel');

      unoChannels.set(
        interaction.guildId,
        channel.id
      );

      return interaction.reply({
        content:
          `✅ UNO channel set to ${channel}.\nUse \`/uno\` there to start a game.`,
        ephemeral: true,
      });
    }

    const selectedChannel =
      unoChannels.get(interaction.guildId);

    if (!selectedChannel) {
      return interaction.reply({
        content:
          '❌ UNO has not been configured yet.\nUse `/uno setup` first.',
        ephemeral: true,
      });
    }

    if (interaction.channelId !== selectedChannel) {
      return interaction.reply({
        content:
          `❌ UNO can only be played in <#${selectedChannel}>.`,
        ephemeral: true,
      });
    }

    if (games.has(interaction.channelId)) {
      return interaction.reply({
        content:
          '❌ There is already an UNO game running here.',
        ephemeral: true,
      });
    }

    const game = createGame(
      interaction.channelId,
      interaction.user.id
    );

    game.players.push(interaction.user.id);

    const message = await interaction.reply({
      embeds: [buildGameEmbed(game)],
      components: [lobbyButtons()],
      fetchReply: true,
    });

    game.message = message;

    const collector =
      message.createMessageComponentCollector({
        time: 30 * 60 * 1000,
      });

    game.collector = collector;

    collector.on('collect', async (component) => {
      try {
        if (component.customId === 'uno_join') {
          if (game.started) {
            return component.reply({
              content: '❌ Game already started.',
              ephemeral: true,
            });
          }

          if (game.players.includes(component.user.id)) {
            return component.reply({
              content: '❌ You already joined.',
              ephemeral: true,
            });
          }

          if (game.players.length >= MAX_PLAYERS) {
            return component.reply({
              content: '❌ Game is full.',
              ephemeral: true,
            });
          }

          game.players.push(component.user.id);

          return component.update({
            embeds: [buildGameEmbed(game)],
            components: [lobbyButtons()],
          });
        }

        if (component.customId === 'uno_start') {
          if (component.user.id !== game.hostId) {
            return component.reply({
              content:
                '❌ Only the host can start the game.',
              ephemeral: true,
            });
          }

          try {
            await startGame(game);

            await component.update({
              embeds: [buildGameEmbed(game)],
              components: gameButtons(),
            });

            if (currentPlayer(game) === 'BOT') {
              setTimeout(() => botTurn(game), 1200);
            }
          } catch {
            await component.reply({
              content:
                '❌ Need at least 2 players.',
              ephemeral: true,
            });
          }

          return;
        }

        if (component.customId === 'uno_cancel') {
          if (component.user.id !== game.hostId) {
            return component.reply({
              content:
                '❌ Only the host can cancel the game.',
              ephemeral: true,
            });
          }

          await endGame(
            game,
            '❌ UNO game cancelled.'
          );

          return component.reply({
            content: '❌ UNO game cancelled.',
            ephemeral: true,
          });
        }

        if (!game.started) {
          return component.reply({
            content: '❌ Game has not started.',
            ephemeral: true,
          });
        }

        if (component.customId === 'uno_cards') {
          if (!game.players.includes(component.user.id)) {
            return component.reply({
              content: '❌ You are not in this game.',
              ephemeral: true,
            });
          }

          const hand =
            game.hands.get(component.user.id) || [];

          const cardList =
            hand.length > 0
              ? hand
                  .map(
                    (card, index) =>
                      `**${index + 1}.** ${cardText(card)}`
                  )
                  .join('\n')
              : 'No cards.';

          const menu = cardSelectMenu(
            game,
            component.user.id
          );

          return component.reply({
            content:
              `### 🃏 Your Cards\n${cardList}\n\n${
                menu
                  ? 'Select a playable card below.'
                  : '❌ No playable cards.'
              }`,
            components: menu ? [menu] : [],
            ephemeral: true,
          });
        }

        if (component.customId === 'uno_play') {
          return playCard(
            game,
            component.user.id,
            Number(component.values[0]),
            component
          );
        }

        if (component.customId === 'uno_color') {
          return playWild(
            game,
            component.user.id,
            component.values[0],
            component
          );
        }

        if (component.customId === 'uno_draw') {
          if (
            currentPlayer(game) !==
            component.user.id
          ) {
            return component.reply({
              content: '❌ It is not your turn.',
              ephemeral: true,
            });
          }

          const drawn = drawCards(game, 1);

          if (drawn.length) {
            game.hands
              .get(component.user.id)
              ?.push(drawn[0]);
          }

          nextTurn(game);

          await component.update({
            embeds: [buildGameEmbed(game)],
            components: gameButtons(),
          });

          if (currentPlayer(game) === 'BOT') {
            setTimeout(() => botTurn(game), 1200);
          }

          return;
        }

        if (component.customId === 'uno_call') {
          const hand =
            game.hands.get(component.user.id);

          if (!hand) {
            return component.reply({
              content:
                '❌ You are not in this game.',
              ephemeral: true,
            });
          }

          if (hand.length !== 1) {
            return component.reply({
              content:
                '❌ You need exactly 1 card to call UNO.',
              ephemeral: true,
            });
          }

          return component.reply({
            content:
              `📢 **UNO!** <@${component.user.id}> has 1 card left!`,
          });
        }
      } catch (error) {
        console.error('UNO interaction error:', error);

        if (
          !component.replied &&
          !component.deferred
        ) {
          await component.reply({
            content:
              '❌ Something went wrong.',
            ephemeral: true,
          });
        }
      }
    });

    collector.on('end', async () => {
      games.delete(game.channelId);

      try {
        await message.edit({
          components: [],
        });
      } catch {}
    });
  },
};
