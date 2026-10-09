import { createService } from "../../shared/serviceFactory.js";
import { repository } from "./repository.js";
import { domainError } from "../../shared/errors/AppError.js";
import { enqueueInAppAndPush, enqueueNotification } from "../../services/notification.service.js";
import { Admin } from "../admins/model.js";

const baseService = createService({
  collection: "supportTickets",
  repository,
  workflowField: "status",
  workflowMap: "supportTicketStatus",
  ownerField: "userId"
});

const ACTIVE_STATUSES = ["open", "in_progress"];
const CLOSED_STATUSES = ["resolved", "closed"];

function sanitizeMessage(message) {
  const text = String(message ?? "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .trim();
  if (!text) throw domainError("Support response requires a message.");
  if (text.length > 5000) throw domainError("Message is too long (max 5000 characters).");
  return text;
}

function ticketIdOf(ticket) {
  return String(ticket?._id ?? ticket?.id ?? "");
}

function isClosed(ticket) {
  return CLOSED_STATUSES.includes(ticket?.status);
}

function findDuplicateResponse(ticket, clientMessageId) {
  if (!clientMessageId) return null;
  return (ticket.responses || []).find((item) => item.clientMessageId && item.clientMessageId === clientMessageId) || null;
}

async function notifyCustomerSupportMessage(ticket, message) {
  const userId = ticket.userId?._id || ticket.userId;
  if (!userId) return;
  const ticketId = ticketIdOf(ticket);
  await enqueueInAppAndPush({
    userId,
    event: "support_message_received",
    recipient: String(userId),
    templateId: "support_message_received",
    title: "New support message",
    message: message.slice(0, 140),
    notificationType: "support",
    screen: "supportTicketChat",
    entityId: ticketId,
    entityType: "support_ticket",
    dedupeKey: `support_message:${ticketId}:${ticket.lastMessageAt?.toISOString?.() || Date.now()}`,
    payload: {
      title: "New support message",
      message: message.slice(0, 140),
      ticketId,
      referenceId: ticket.referenceId,
      screen: "supportTicketChat",
      screenKey: "supportTicketChat",
      deepLink: `builtglory://supportTicketChat?ticketId=${ticketId}`,
      entityId: ticketId,
      entityType: "support_ticket"
    }
  });
}

async function notifyAgentsSupportMessage(ticket, message) {
  const ticketId = ticketIdOf(ticket);
  const assignedId = ticket.assignedTo?._id || ticket.assignedTo;
  const admins = assignedId
    ? await Admin.find({ _id: assignedId, isActive: true }).select("_id").lean()
    : await Admin.find({ isActive: true, permissions: "support.read" }).select("_id").limit(25).lean();

  await Promise.all(
    admins.map((admin) =>
      enqueueNotification({
        adminId: admin._id,
        event: "support_message_received",
        channel: "in_app",
        recipient: String(admin._id),
        templateId: "support_message_received",
        title: ticket.channel === "live_chat" ? "New live chat message" : "New support ticket message",
        message: message.slice(0, 140),
        notificationType: "support",
        entityId: ticketId,
        entityType: "support_ticket",
        dedupeKey: `support_agent_message:${ticketId}:${admin._id}:${ticket.lastMessageAt?.toISOString?.() || Date.now()}`,
        payload: {
          title: ticket.channel === "live_chat" ? "New live chat message" : "New support ticket message",
          message: message.slice(0, 140),
          ticketId,
          referenceId: ticket.referenceId,
          channel: ticket.channel,
          entityId: ticketId,
          entityType: "support_ticket"
        }
      })
    )
  );
}

export const service = {
  ...baseService,

  async create(data, actor) {
    const message = sanitizeMessage(data.message);
    const channel = data.channel === "live_chat" ? "live_chat" : "ticket";
    return baseService.create(
      {
        ...data,
        message,
        channel,
        userId: actor?.id,
        status: "open",
        lastMessage: message,
        lastMessageAt: new Date(),
        unreadCustomerCount: 0,
        unreadAgentCount: 1,
        slaDeadline: data.slaDeadline || new Date(Date.now() + 24 * 60 * 60 * 1000)
      },
      actor
    );
  },

  async getActiveLiveChat(actor) {
    if (actor?.type !== "customer") throw domainError("Only customers can load their live chat.");
    const result = await repository.list(
      { limit: 1, sort: "newest", status: undefined },
      {
        userId: actor.id,
        channel: "live_chat",
        status: { $in: ACTIVE_STATUSES }
      }
    );
    return result.data?.[0] || null;
  },

  async startLiveChat(data = {}, actor) {
    if (actor?.type !== "customer") throw domainError("Only customers can start a live chat.");
    const existing = await this.getActiveLiveChat(actor);
    if (existing) return existing;

    const opening = sanitizeMessage(data.message || "Hi, I need help.");
    return this.create(
      {
        category: data.category || "general",
        subject: data.subject || "Live Chat",
        message: opening,
        priority: data.priority || "medium",
        channel: "live_chat",
        attachments: data.attachments
      },
      actor
    );
  },

  async addResponse(id, data, actor, req, options = {}) {
    const message = sanitizeMessage(data.message);
    const clientMessageId =
      typeof data.clientMessageId === "string" && data.clientMessageId.trim()
        ? data.clientMessageId.trim().slice(0, 120)
        : undefined;

    const before = await repository.findById(id);
    if (actor?.type === "customer" && String(before.userId?._id || before.userId) !== String(actor.id)) {
      throw domainError("You cannot access this resource.");
    }
    if (isClosed(before) && !data.resolve) {
      throw domainError("This chat is closed. Reopen it to send messages.");
    }

    const duplicate = findDuplicateResponse(before, clientMessageId);
    if (duplicate) return before;

    const now = new Date();
    const responderType = actor?.type === "admin" ? "admin" : actor?.type === "customer" ? "customer" : "system";
    const nextStatus = data.resolve ? "resolved" : before.status === "open" ? "in_progress" : before.status;

    const unreadPatch =
      responderType === "admin"
        ? {
            unreadCustomerCount: (before.unreadCustomerCount || 0) + 1,
            unreadAgentCount: 0
          }
        : {
            unreadAgentCount: (before.unreadAgentCount || 0) + 1,
            unreadCustomerCount: responderType === "customer" ? before.unreadCustomerCount || 0 : before.unreadCustomerCount
          };

    const ticket = await baseService.update(
      id,
      {
        $push: {
          responses: {
            message,
            responderType,
            responderId: actor?.id,
            clientMessageId,
            createdAt: now
          }
        },
        $set: {
          status: nextStatus,
          lastMessage: message,
          lastMessageAt: now,
          ...unreadPatch
        }
      },
      actor,
      req
    );

    if (options.notifyRecipient !== false) {
      if (responderType === "admin") {
        await notifyCustomerSupportMessage(ticket, message).catch(() => undefined);
      } else if (responderType === "customer") {
        await notifyAgentsSupportMessage(ticket, message).catch(() => undefined);
      }
    }

    return ticket;
  },

  async markRead(id, actor) {
    const before = await repository.findById(id);
    if (actor?.type === "customer" && String(before.userId?._id || before.userId) !== String(actor.id)) {
      throw domainError("You cannot access this resource.");
    }
    if (actor?.type === "admin" && actor.role !== "super_admin") {
      const perms = actor.permissions || [];
      if (!perms.includes("support.read") && !perms.includes("support.write") && !perms.includes("*")) {
        throw domainError("You do not have permission to access support chats.");
      }
    }

    const now = new Date();
    const responses = (before.responses || []).map((item) => {
      const plain = typeof item.toObject === "function" ? item.toObject() : { ...item };
      const type = plain.responderType;
      if (actor?.type === "customer" && type === "admin" && !plain.readAt) {
        return { ...plain, readAt: now };
      }
      if (actor?.type === "admin" && type === "customer" && !plain.readAt) {
        return { ...plain, readAt: now };
      }
      return plain;
    });

    const patch =
      actor?.type === "customer"
        ? { responses, unreadCustomerCount: 0 }
        : { responses, unreadAgentCount: 0 };

    return baseService.update(id, patch, actor);
  },

  async closeChat(id, actor, req) {
    const before = await this.get(id, actor);
    if (isClosed(before)) return before;
    const now = new Date();
    return baseService.update(
      id,
      {
        $push: {
          responses: {
            message: "Chat closed.",
            responderType: "system",
            responderId: actor?.id,
            createdAt: now
          }
        },
        $set: {
          status: "closed",
          lastMessage: "Chat closed.",
          lastMessageAt: now
        }
      },
      actor,
      req
    );
  },

  async reopenChat(id, actor, req) {
    const before = await this.get(id, actor);
    if (ACTIVE_STATUSES.includes(before.status)) return before;
    if (before.channel === "live_chat" && actor?.type === "customer") {
      const active = await this.getActiveLiveChat(actor);
      if (active && String(active._id) !== String(before._id)) {
        throw domainError("You already have an active live chat. Close it before reopening another.");
      }
    }
    const now = new Date();
    return baseService.update(
      id,
      {
        $push: {
          responses: {
            message: "Chat reopened.",
            responderType: "system",
            responderId: actor?.id,
            createdAt: now
          }
        },
        $set: {
          status: "open",
          lastMessage: "Chat reopened.",
          lastMessageAt: now
        }
      },
      actor,
      req
    );
  }
};
