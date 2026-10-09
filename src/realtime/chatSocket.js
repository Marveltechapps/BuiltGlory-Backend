import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { Server } from "socket.io";
import { env } from "../config/env.js";
import { getRedis } from "../config/redis.js";
import { Admin } from "../modules/admins/model.js";
import { User } from "../modules/users/model.js";
import { service as supportTicketService } from "../modules/supportTickets/service.js";
import { service as sellRequestService } from "../modules/sellRequests/service.js";

let io;

/** @type {Map<string, Map<string, { type: string, id: string }>>} */
const roomViewers = new Map();

const tokenHash = (token) => crypto.createHash("sha256").update(token).digest("hex");
const supportRoom = (ticketId) => `support:${ticketId}`;
const sellRoom = (sellRequestId) => `sell:${sellRequestId}`;

function parseToken(socket) {
  const authToken = socket.handshake.auth?.token;
  if (typeof authToken === "string" && authToken.trim()) return authToken.trim();
  const header = socket.handshake.headers?.authorization || "";
  return String(header).replace(/^Bearer\s+/i, "").trim();
}

async function actorFromToken(token) {
  if (!token) throw new Error("Missing access token.");
  if (await getRedis().get("access:blacklist:" + tokenHash(token))) throw new Error("Access token has been revoked.");
  const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET, { issuer: env.JWT_ISSUER, audience: env.JWT_AUDIENCE });
  if (decoded.type === "admin") {
    const admin = await Admin.findById(decoded.sub);
    if (!admin || !admin.isActive) throw new Error("Admin account inactive.");
    return { type: "admin", id: admin._id, role: admin.role, permissions: admin.permissions, sid: decoded.sid };
  }
  const user = await User.findById(decoded.sub);
  if (!user || !user.isActive || user.isBlocked) throw new Error("Customer account unavailable.");
  return { type: "customer", id: user._id, role: user.role, userType: user.userType, sid: decoded.sid };
}

function emitAck(ack, payload) {
  if (typeof ack === "function") ack(payload);
}

function errorPayload(error) {
  return { ok: false, error: error?.message || "Realtime chat request failed." };
}

function trackJoin(roomId, socket) {
  if (!roomViewers.has(roomId)) roomViewers.set(roomId, new Map());
  roomViewers.get(roomId).set(socket.id, { type: socket.actor.type, id: String(socket.actor.id) });
}

function trackLeave(roomId, socket) {
  const viewers = roomViewers.get(roomId);
  if (!viewers) return;
  viewers.delete(socket.id);
  if (!viewers.size) roomViewers.delete(roomId);
}

function roomHasViewerType(roomId, type) {
  const viewers = roomViewers.get(roomId);
  if (!viewers) return false;
  for (const viewer of viewers.values()) {
    if (viewer.type === type) return true;
  }
  return false;
}

function leaveAllTrackedRooms(socket) {
  for (const [roomId, viewers] of roomViewers.entries()) {
    if (viewers.has(socket.id)) {
      viewers.delete(socket.id);
      if (!viewers.size) roomViewers.delete(roomId);
    }
  }
}

export function publishSupportTicket(ticket) {
  if (!io || !ticket?._id) return;
  const payload = { ticket };
  io.of("/chat").to(supportRoom(ticket._id)).emit("support:ticket_updated", payload);
  io.of("/chat").to(supportRoom(ticket._id)).emit("support:chat:status", {
    ticketId: String(ticket._id),
    status: ticket.status,
    unreadCustomerCount: ticket.unreadCustomerCount || 0,
    unreadAgentCount: ticket.unreadAgentCount || 0
  });
}

export function publishSellerActivity(sellRequestId, activity) {
  if (!io || !sellRequestId || !activity) return;
  io.of("/chat").to(sellRoom(sellRequestId)).emit("sell:activity_updated", { activity });
}

export function initChatSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: env.CORS_ORIGINS ? env.CORS_ORIGINS.split(",") : true,
      credentials: true
    },
    transports: ["websocket", "polling"],
    allowEIO3: true,
    pingTimeout: 30000,
    pingInterval: 25000
  });

  const chat = io.of("/chat");
  chat.use(async (socket, next) => {
    try {
      socket.actor = await actorFromToken(parseToken(socket));
      next();
    } catch (error) {
      next(new Error(error?.message || "Unauthorized."));
    }
  });

  chat.on("connection", (socket) => {
    socket.on("support:join", async ({ ticketId } = {}, ack) => {
      try {
        const ticket = await supportTicketService.get(ticketId, socket.actor);
        const roomId = supportRoom(ticket._id);
        socket.join(roomId);
        trackJoin(roomId, socket);
        const marked = await supportTicketService.markRead(ticket._id, socket.actor);
        publishSupportTicket(marked);
        emitAck(ack, { ok: true, ticket: marked });
      } catch (error) {
        emitAck(ack, errorPayload(error));
      }
    });

    socket.on("support:leave", async ({ ticketId } = {}, ack) => {
      try {
        if (ticketId) {
          const roomId = supportRoom(ticketId);
          socket.leave(roomId);
          trackLeave(roomId, socket);
        }
        emitAck(ack, { ok: true });
      } catch (error) {
        emitAck(ack, errorPayload(error));
      }
    });

    socket.on("support:send", async ({ ticketId, message, clientMessageId } = {}, ack) => {
      try {
        const roomId = supportRoom(ticketId);
        const recipientType = socket.actor.type === "admin" ? "customer" : "admin";
        const recipientViewing = roomHasViewerType(roomId, recipientType);
        const ticket = await supportTicketService.addResponse(
          ticketId,
          { message, clientMessageId },
          socket.actor,
          undefined,
          { notifyRecipient: !recipientViewing }
        );
        socket.join(roomId);
        trackJoin(roomId, socket);
        publishSupportTicket(ticket);
        chat.to(roomId).emit("support:message:new", {
          ticketId: String(ticket._id),
          message: ticket.lastMessage,
          clientMessageId: clientMessageId || null,
          senderType: socket.actor.type,
          ticket
        });
        emitAck(ack, { ok: true, ticket });
      } catch (error) {
        emitAck(ack, errorPayload(error));
      }
    });

    socket.on("support:read", async ({ ticketId } = {}, ack) => {
      try {
        const ticket = await supportTicketService.markRead(ticketId, socket.actor);
        publishSupportTicket(ticket);
        chat.to(supportRoom(ticket._id)).emit("support:message:read", {
          ticketId: String(ticket._id),
          readerType: socket.actor.type,
          unreadCustomerCount: ticket.unreadCustomerCount || 0,
          unreadAgentCount: ticket.unreadAgentCount || 0
        });
        emitAck(ack, { ok: true, ticket });
      } catch (error) {
        emitAck(ack, errorPayload(error));
      }
    });

    socket.on("sell:join", async ({ sellRequestId } = {}, ack) => {
      try {
        const activity = await sellRequestService.sellerActivity(sellRequestId, socket.actor);
        socket.join(sellRoom(String(activity.sellRequest?._id ?? sellRequestId)));
        emitAck(ack, { ok: true, activity });
      } catch (error) {
        emitAck(ack, errorPayload(error));
      }
    });

    socket.on("sell:send", async ({ sellRequestId, text } = {}, ack) => {
      try {
        const activity = await sellRequestService.sellerMessage(sellRequestId, { text }, socket.actor);
        const roomId = String(activity.sellRequest?._id ?? sellRequestId);
        socket.join(sellRoom(roomId));
        publishSellerActivity(roomId, activity);
        emitAck(ack, { ok: true, activity });
      } catch (error) {
        emitAck(ack, errorPayload(error));
      }
    });

    socket.on("disconnect", () => {
      leaveAllTrackedRooms(socket);
    });
  });

  return io;
}

export function closeChatSocket() {
  return new Promise((resolve) => {
    if (!io) {
      resolve();
      return;
    }
    const active = io;
    io = undefined;
    roomViewers.clear();
    active.close(() => resolve());
  });
}
