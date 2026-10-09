import http from "node:http";
import { io as ioc } from "socket.io-client";
import request from "supertest";
import { app, bearer, seedAdmin, seedCustomer, setupIntegrationDb } from "./helpers/integrationHarness.js";
import { closeChatSocket, initChatSocket } from "../realtime/chatSocket.js";

setupIntegrationDb();

function waitForEvent(socket, event, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timed out waiting for ${event}`)), timeoutMs);
    socket.once(event, (payload) => {
      clearTimeout(timer);
      resolve(payload);
    });
  });
}

describe("support live chat realtime", () => {
  let server;
  let port;

  beforeAll(async () => {
    server = http.createServer(app);
    initChatSocket(server);
    await new Promise((resolve) => server.listen(0, resolve));
    port = server.address().port;
  });

  afterAll(async () => {
    await closeChatSocket();
    await new Promise((resolve) => server.close(resolve));
  });

  test("customer and agent exchange realtime messages without refresh", async () => {
    const customer = await seedCustomer();
    const admin = await seedAdmin({ permissions: ["support.read", "support.write"] });

    const started = await request(app)
      .post("/api/v1/me/support/live-chat")
      .set("Authorization", bearer(customer.token))
      .send({ message: "Hello" });
    expect(started.status).toBe(201);
    const ticketId = String(started.body.data._id);

    const customerSocket = ioc(`http://127.0.0.1:${port}/chat`, {
      auth: { token: customer.token },
      transports: ["websocket"],
      forceNew: true
    });
    const agentSocket = ioc(`http://127.0.0.1:${port}/chat`, {
      auth: { token: admin.token },
      transports: ["websocket"],
      forceNew: true
    });

    await Promise.all([
      waitForEvent(customerSocket, "connect"),
      waitForEvent(agentSocket, "connect")
    ]);

    const customerJoin = await new Promise((resolve) => {
      customerSocket.emit("support:join", { ticketId }, resolve);
    });
    expect(customerJoin.ok).toBe(true);

    const agentJoin = await new Promise((resolve) => {
      agentSocket.emit("support:join", { ticketId }, resolve);
    });
    expect(agentJoin.ok).toBe(true);

    const agentSeesCustomerMessage = waitForEvent(agentSocket, "support:ticket_updated");
    const customerSend = await new Promise((resolve) => {
      customerSocket.emit(
        "support:send",
        { ticketId, message: "Hello", clientMessageId: "rt-customer-1" },
        resolve
      );
    });
    expect(customerSend.ok).toBe(true);
    const agentUpdate = await agentSeesCustomerMessage;
    expect(agentUpdate.ticket.lastMessage).toBe("Hello");

    const customerSeesAgentMessage = waitForEvent(customerSocket, "support:ticket_updated");
    const agentSend = await new Promise((resolve) => {
      agentSocket.emit(
        "support:send",
        { ticketId, message: "Hi, how can I help you?", clientMessageId: "rt-agent-1" },
        resolve
      );
    });
    expect(agentSend.ok).toBe(true);
    const customerUpdate = await customerSeesAgentMessage;
    expect(customerUpdate.ticket.lastMessage).toBe("Hi, how can I help you?");

    const duplicate = await new Promise((resolve) => {
      customerSocket.emit(
        "support:send",
        { ticketId, message: "Hello", clientMessageId: "rt-customer-1" },
        resolve
      );
    });
    expect(duplicate.ok).toBe(true);
    expect(duplicate.ticket.responses.filter((item) => item.clientMessageId === "rt-customer-1")).toHaveLength(1);

    customerSocket.disconnect();
    agentSocket.disconnect();
  }, 20000);
});
