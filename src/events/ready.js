import { Events } from "discord.js";
import { logger, startupLog } from "../utils/logger.js";
import config from "../config/application.js";
import { 
    reconcileReactionRoleMessages,
    reconcileReactionRolePanelHealth 
} from "../services/reactionRoleService.js";
import {
  reconcileTicketPanels,
  reconcileVerificationPanels
} from "../services/panelHealthService.js";
import { initRiffyAfterReady } from "../services/music/riffySetup.js";

export default {
  name: Events.ClientReady,
  once: true,

  async execute(client) {
    try {
      client.user.setPresence(config.bot.presence);

      startupLog(`Ready! Logged in as ${client.user.tag}`);
      startupLog(`Serving ${client.guilds.cache.size} guild(s)`);
      startupLog(`Loaded ${client.commands.size} commands`);

      if (client.config?.features?.music) {
        initRiffyAfterReady(client);
      }

      // Reaction role reconciliation
      try {
        const reconciliationSummary = await reconcileReactionRoleMessages(client);
        startupLog(
          `Reaction role reconciliation: scanned ${reconciliationSummary.scannedMessages}, removed ${reconciliationSummary.removedMessages}, errors ${reconciliationSummary.errors}`
        );
      } catch (error) {
        startupLog(`⚠️ Reaction role reconciliation skipped: ${error.message}`);
      }

      // Ticket panel health
      try {
        const ticketPanelSummary = await reconcileTicketPanels(client);
        startupLog(
          `Ticket panel health: scanned ${ticketPanelSummary.scannedGuilds} guilds, healthy ${ticketPanelSummary.healthyPanels}, deleted ${ticketPanelSummary.deletedPanels}, missing channel ${ticketPanelSummary.missingChannels}, recovered ${ticketPanelSummary.recoveredIds}, errors ${ticketPanelSummary.errors}`
        );
      } catch (error) {
        startupLog(`⚠️ Ticket panel health check skipped: ${error.message}`);
      }

      // Verification panel health
      try {
        const verificationPanelSummary = await reconcileVerificationPanels(client);
        startupLog(
          `Verification panel health: scanned ${verificationPanelSummary.scannedGuilds} guilds, healthy ${verificationPanelSummary.healthyPanels}, deleted ${verificationPanelSummary.deletedPanels}, missing channel ${verificationPanelSummary.missingChannels}, recovered ${verificationPanelSummary.recoveredIds}, errors ${verificationPanelSummary.errors}`
        );
      } catch (error) {
        startupLog(`⚠️ Verification panel health check skipped: ${error.message}`);
      }

      // Reaction role panel health
      try {
        const reactionRolePanelSummary = await reconcileReactionRolePanelHealth(client);
        startupLog(
          `Reaction role panel health: scanned ${reactionRolePanelSummary.scannedPanels} panels, healthy ${reactionRolePanelSummary.healthyPanels}, deleted ${reactionRolePanelSummary.deletedPanels}, missing channel ${reactionRolePanelSummary.missingChannels}, recovered ${reactionRolePanelSummary.recoveredIds}, errors ${reactionRolePanelSummary.errors}`
        );
      } catch (error) {
        startupLog(`⚠️ Reaction role panel health check skipped: ${error.message}`);
      }

    } catch (error) {
      logger.error("Error in ready event:", error);
    }
  },
};
