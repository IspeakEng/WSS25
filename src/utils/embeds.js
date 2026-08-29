// embeds.js

import { EmbedBuilder } from 'discord.js';
import { getColor, botConfig } from '../config/bot.js';

const EMBED_FOOTER_SYMBOL = Symbol('titanbotFooterText');
const EMBED_BASE_DESCRIPTION_SYMBOL = Symbol('titanbotBaseDescription');

/* ============================================================
 * Text Sanitizer
 * ============================================================
 * IMPORTANT:
 * Emojis are intentionally NOT removed.
 *
 * Supports:
 * - Unicode emojis: 🔥 ✨ 😂 ❤️ ⚡
 * - Custom emojis: <:name:id>
 * - Animated emojis: <a:name:id>
 * - Mentions
 * - Markdown
 * ============================================================
 */

function sanitizeEmbedText(text = '') {
  if (typeof text !== 'string') {
    return text;
  }

  return text
    .replace(/[ \t]+/g, ' ')
    .replace(/[ \t]\n/g, '\n')
    .replace(/\n[ \t]/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function sanitizeEmbedField(field) {
  if (!field || typeof field !== 'object') {
    return field;
  }

  return {
    ...field,
    name: sanitizeEmbedText(field.name),
    value: sanitizeEmbedText(field.value),
  };
}

/* ============================================================
 * Footer Helpers
 * ============================================================
 */

function normalizeFooterText(footer) {
  if (!footer) {
    return '';
  }

  if (typeof footer === 'string') {
    return footer.trim();
  }

  if (footer && typeof footer.text === 'string') {
    return footer.text.trim();
  }

  return '';
}

function isImportantFooter(footerText) {
  if (!footerText) {
    return false;
  }

  const normalized = footerText.toLowerCase();

  return /\b(close|closes|closed|expire|expires|available in|page\s+\d+|dashboard closes|ticket id)\b/.test(
    normalized
  );
}

/* ============================================================
 * EmbedBuilder Overrides
 * ============================================================
 */

const originalSetTitle = EmbedBuilder.prototype.setTitle;
const originalSetAuthor = EmbedBuilder.prototype.setAuthor;
const originalAddFields = EmbedBuilder.prototype.addFields;
const originalSetDescription = EmbedBuilder.prototype.setDescription;
const originalSetFooter = EmbedBuilder.prototype.setFooter;
const originalSetTimestamp = EmbedBuilder.prototype.setTimestamp;

/* ---------------- Title ---------------- */

EmbedBuilder.prototype.setTitle = function setSanitizedTitle(title) {
  return originalSetTitle.call(
    this,
    sanitizeEmbedText(title)
  );
};

/* ---------------- Author ---------------- */

EmbedBuilder.prototype.setAuthor = function setSanitizedAuthor(author) {
  if (typeof author === 'string') {
    return originalSetAuthor.call(this, {
      name: sanitizeEmbedText(author),
    });
  }

  if (author && typeof author.name === 'string') {
    return originalSetAuthor.call(this, {
      ...author,
      name: sanitizeEmbedText(author.name),
    });
  }

  return originalSetAuthor.call(this, author);
};

/* ---------------- Fields ---------------- */

EmbedBuilder.prototype.addFields = function addSanitizedFields(...fields) {
  const normalized = fields.flatMap((field) =>
    Array.isArray(field) ? field : [field]
  );

  const sanitized = normalized.map(sanitizeEmbedField);

  return originalAddFields.call(this, sanitized);
};

/* ---------------- Description ---------------- */

EmbedBuilder.prototype.setDescription = function setSanitizedDescription(
  description = ''
) {
  const descString = sanitizeEmbedText(description || '');

  this[EMBED_BASE_DESCRIPTION_SYMBOL] = descString;

  return originalSetDescription.call(this, descString);
};

/* ---------------- Footer ---------------- */

EmbedBuilder.prototype.setFooter = function setSanitizedFooter(footer) {
  const footerText = sanitizeEmbedText(
    normalizeFooterText(footer)
  );

  if (!footerText || !isImportantFooter(footerText)) {
    return this;
  }

  this[EMBED_FOOTER_SYMBOL] = footerText;

  return originalSetFooter.call(this, {
    text: footerText,
  });
};

/* ---------------- Timestamp ---------------- */

EmbedBuilder.prototype.setTimestamp = function () {
  return this;
};

/* ============================================================
 * Create Embed
 * ============================================================
 */

export function createEmbed({
  title = '',
  description = '',
  color = 'primary',
  fields = [],
  author = null,
  footer = null,
  thumbnail = null,
  image = null,
  timestamp = false,
  url = null,
} = {}) {
  const embed = new EmbedBuilder();

  /* ---------------- Title ---------------- */

  if (
    title &&
    typeof title === 'string' &&
    title.length > 0
  ) {
    embed.setTitle(
      title.substring(0, 256)
    );
  }

  /* ---------------- Description ---------------- */

  if (
    description &&
    typeof description === 'string' &&
    description.length > 0
  ) {
    embed.setDescription(
      description.substring(0, 4096)
    );
  }

  /* ---------------- Color ---------------- */

  try {
    const embedColor =
      getColor(color) || '#000000';

    embed.setColor(embedColor);
  } catch (error) {
    embed.setColor('#000000');
  }

  /* ---------------- Fields ---------------- */

  if (
    Array.isArray(fields) &&
    fields.length > 0
  ) {
    const validFields = fields.filter(
      (field) =>
        field &&
        field.name &&
        field.value
    );

    if (validFields.length > 0) {
      embed.addFields(
        validFields.slice(0, 25)
      );
    }
  }

  /* ---------------- Author ---------------- */

  if (author) {
    try {
      if (
        typeof author === 'string' &&
        author.length > 0
      ) {
        embed.setAuthor({
          name: author.substring(0, 256),
        });
      } else if (
        author &&
        typeof author.name === 'string'
      ) {
        embed.setAuthor(author);
      }
    } catch (error) {
      // Ignore invalid author data
    }
  } else if (
    botConfig.embeds?.author?.name
  ) {
    embed.setAuthor({
      name: botConfig.embeds.author.name,

      ...(botConfig.embeds.author.icon
        ? {
            iconURL:
              botConfig.embeds.author.icon,
          }
        : {}),

      ...(botConfig.embeds.author.url
        ? {
            url:
              botConfig.embeds.author.url,
          }
        : {}),
    });
  }

  /* ---------------- Footer ---------------- */

  if (footer) {
    try {
      if (
        typeof footer === 'string' &&
        footer.length > 0
      ) {
        embed.setFooter({
          text: footer.substring(0, 2048),
        });
      } else if (
        footer &&
        typeof footer.text === 'string'
      ) {
        embed.setFooter(footer);
      }
    } catch (error) {
      // Ignore invalid footer data
    }
  } else if (
    botConfig.embeds?.footer?.text
  ) {
    const defaultFooter = {
      text:
        botConfig.embeds.footer.text,

      ...(botConfig.embeds.footer.icon
        ? {
            iconURL:
              botConfig.embeds.footer.icon,
          }
        : {}),
    };

    embed.setFooter(defaultFooter);
  }

  /* ---------------- Thumbnail ---------------- */

  if (thumbnail) {
    try {
      if (
        typeof thumbnail === 'string' &&
        thumbnail.length > 0
      ) {
        embed.setThumbnail(thumbnail);
      } else if (
        thumbnail &&
        typeof thumbnail.url === 'string'
      ) {
        embed.setThumbnail(
          thumbnail.url
        );
      }
    } catch (error) {
      // Ignore invalid thumbnail
    }
  } else if (
    botConfig.embeds?.thumbnail
  ) {
    embed.setThumbnail(
      botConfig.embeds.thumbnail
    );
  }

  /* ---------------- Image ---------------- */

  if (image) {
    try {
      if (
        typeof image === 'string' &&
        image.length > 0
      ) {
        embed.setImage(image);
      } else if (
        image &&
        typeof image.url === 'string'
      ) {
        embed.setImage(image.url);
      }
    } catch (error) {
      // Ignore invalid image
    }
  }

  /* ---------------- Timestamp ---------------- */

  if (timestamp === true) {
    embed.setTimestamp();
  } else if (timestamp instanceof Date) {
    embed.setTimestamp(timestamp);
  }

  /* ---------------- URL ---------------- */

  if (
    url &&
    typeof url === 'string' &&
    url.length > 0
  ) {
    try {
      embed.setURL(url);
    } catch (error) {
      // Ignore invalid URL
    }
  }

  return embed;
}

/* ============================================================
 * Notification Embeds
 * ============================================================
 */

const NOTIFICATION_DEFAULT_TITLES = {
  success: 'Success',
  error: 'Error',
  info: 'Information',
  warning: 'Warning',
  primary: 'Notice',
};

export const USER_ERROR_TITLES = {
  validation: 'Invalid Input',
  permission: 'Permission Denied',
  configuration: 'Configuration Error',
  database: 'Database Error',
  network: 'Network Error',
  discord_api: 'Discord API Error',
  user_input: 'Input Error',
  rate_limit: 'Too Fast',
  unknown: 'Something Went Wrong',
};

const USER_ERROR_COLORS = {
  rate_limit: 'warning',
};

/* ============================================================
 * User Error Embed
 * ============================================================
 */

/**
 * @param {string} errorType
 * @param {string} [description]
 * @param {{ titleOverride?: string }} [options]
 */

export function buildUserErrorEmbed(
  errorType,
  description = '',
  options = {}
) {
  const type =
    errorType || 'unknown';

  const title =
    options.titleOverride ||
    USER_ERROR_TITLES[type] ||
    USER_ERROR_TITLES.unknown;

  const color =
    USER_ERROR_COLORS[type] ||
    'error';

  const body = description
    ? String(description).trim()
    : undefined;

  return createEmbed({
    title,
    description: body,
    color,
  });
}

/* ============================================================
 * Discord Renderable Detection
 * ============================================================
 */

function containsDiscordRenderable(
  content = ''
) {
  return /<@!?&?\d+>|<#\d+>|\b\d{17,19}\b/.test(
    String(content)
  );
}

/* ============================================================
 * Notification Builder
 * ============================================================
 */

function buildNotificationEmbed(
  title,
  body = '',
  color = 'primary'
) {
  const defaultTitle =
    NOTIFICATION_DEFAULT_TITLES[color] ||
    NOTIFICATION_DEFAULT_TITLES.primary;

  let titleText =
    String(title || '').trim();

  let bodyText =
    body
      ? String(body).trim()
      : '';

  if (
    titleText &&
    containsDiscordRenderable(titleText)
  ) {
    bodyText = bodyText
      ? `${titleText}\n\n${bodyText}`
      : titleText;

    titleText = defaultTitle;
  }

  return createEmbed({
    title:
      titleText || defaultTitle,
    description:
      bodyText || undefined,
    color,
  });
}

/* ============================================================
 * Error Embed
 * ============================================================
 */

/**
 * @deprecated Prefer buildUserErrorEmbed
 * or replyUserError from errorHandler.js.
 */

export function errorEmbed(
  title,
  detail = null,
  options = {}
) {
  const {
    showDetails =
      process.env.NODE_ENV !==
      'production',
  } = options;

  let body = detail;

  if (
    detail &&
    showDetails &&
    typeof detail !== 'string'
  ) {
    const detailText =
      detail.message ||
      String(detail);

    body =
      formatCodeBlock(detailText);
  }

  const description =
    body
      ? String(body).trim()
      : '';

  const titleOverride =
    title && title !== 'Error'
      ? title
      : undefined;

  return buildUserErrorEmbed(
    'unknown',
    description,
    {
      titleOverride,
    }
  );
}

/* ============================================================
 * Success Embed
 * ============================================================
 */

/**
 * One argument:
 * successEmbed('🔥 Done!')
 *
 * Two arguments:
 * successEmbed('🔥 Success', 'Everything worked!')
 */

export function successEmbed(
  title,
  body = ''
) {
  if (arguments.length === 1) {
    return buildNotificationEmbed(
      'Success',
      title,
      'success'
    );
  }

  return buildNotificationEmbed(
    title || 'Success',
    body,
    'success'
  );
}

/* ============================================================
 * Info Embed
 * ============================================================
 */

/**
 * One argument:
 * infoEmbed('✨ Information')
 *
 * Two arguments:
 * infoEmbed('✨ Info', 'Something happened')
 */

export function infoEmbed(
  title,
  body = ''
) {
  if (arguments.length === 1) {
    return buildNotificationEmbed(
      'Information',
      title,
      'info'
    );
  }

  return buildNotificationEmbed(
    title || 'Information',
    body,
    'info'
  );
}

/* ============================================================
 * Warning Embed
 * ============================================================
 */

/**
 * One argument:
 * warningEmbed('⚠️ Careful!')
 *
 * Two arguments:
 * warningEmbed('⚠️ Warning', 'Something happened')
 */

export function warningEmbed(
  title,
  body = ''
) {
  if (arguments.length === 1) {
    return buildNotificationEmbed(
      'Warning',
      title,
      'warning'
    );
  }

  return buildNotificationEmbed(
    title || 'Warning',
    body,
    'warning'
  );
}

/* ============================================================
 * Formatting Helpers
 * ============================================================
 */

export function formatUser(user) {
  return `${user} (${user.tag} | ${user.id})`;
}

export function formatDate(date) {
  return `<t:${Math.floor(
    date.getTime() / 1000
  )}:F>`;
}

export function formatRelativeTime(date) {
  return `<t:${Math.floor(
    date.getTime() / 1000
  )}:R>`;
}

export function formatCodeBlock(
  content,
  language = ''
) {
  return `\`\`\`${language}\n${content}\n\`\`\``;
}

export function formatInlineCode(content) {
  return `\`${content}\``;
}

export function formatBold(content) {
  return `**${content}**`;
}

export function formatItalic(content) {
  return `*${content}*`;
}

export function formatUnderline(content) {
  return `__${content}__`;
}

export function formatStrikethrough(content) {
  return `~~${content}~~`;
}

export function formatSpoiler(content) {
  return `||${content}||`;
}

export function formatQuote(content) {
  return `> ${content}`;
}

export function formatList(
  items,
  ordered = false
) {
  return items
    .map(
      (item, index) =>
        (ordered
          ? `${index + 1}.`
          : '•') + `${item}`
    )
    .join('\n');
}

export function formatDuration(ms) {
  if (ms < 0) {
    return '0s';
  }

  const seconds =
    Math.floor(ms / 1000) % 60;

  const minutes =
    Math.floor(
      ms / (1000 * 60)
    ) % 60;

  const hours =
    Math.floor(
      ms / (1000 * 60 * 60)
    ) % 24;

  const days =
    Math.floor(
      ms /
        (1000 * 60 * 60 * 24)
    );

  const parts = [];

  if (days > 0) {
    parts.push(`${days}d`);
  }

  if (hours > 0) {
    parts.push(`${hours}h`);
  }

  if (minutes > 0) {
    parts.push(`${minutes}m`);
  }

  if (
    seconds > 0 ||
    parts.length === 0
  ) {
    parts.push(`${seconds}s`);
  }

  return parts.join('');
}

export function formatProgressBar(
  current,
  max,
  size = 10
) {
  const progress = Math.min(
    Math.max(0, current / max),
    1
  );

  const filled = Math.round(
    size * progress
  );

  const empty =
    size - filled;

  return `[${'█'.repeat(
    filled
  )}${'░'.repeat(
    empty
  )}] ${Math.round(
    progress * 100
  )}%`;
}
