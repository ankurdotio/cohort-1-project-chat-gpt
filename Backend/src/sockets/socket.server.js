const { Server } = require("socket.io");
const cookie = require("cookie")
const jwt = require("jsonwebtoken");
const userModel = require("../models/user.model");
const aiService = require("../services/ai.service")
const messageModel = require("../models/message.model");
const { createMemory, queryMemory } = require("../services/vector.service")


function initSocketServer(httpServer) {

    const io = new Server(httpServer, {
        cors: {
            origin: "http://localhost:5173",
            allowedHeaders: [ "Content-Type", "Authorization" ],
            credentials: true
        }
    })

    io.use(async (socket, next) => {

        const cookies = cookie.parse(socket.handshake.headers?.cookie || "");

        if (!cookies.token) {
            next(new Error("Authentication error: No token provided"));
        }

        try {

            const decoded = jwt.verify(cookies.token, process.env.JWT_SECRET);

            const user = await userModel.findById(decoded.id);

            socket.user = user

            next()

        } catch (err) {
            next(new Error("Authentication error: Invalid token"));
        }

    })

    io.on("connection", (socket) => {
        // Join a chat room
        socket.on("join-chat", (chatId) => {
            if (chatId) {
                socket.join(chatId);
            }
        });

        socket.on("ai-message", async (messagePayload) => {
            /* messagePayload = { chat:chatId,content:message text } */
            try {
                const [ message, vectors ] = await Promise.all([
                    messageModel.create({
                        chat: messagePayload.chat,
                        user: socket.user._id,
                        content: messagePayload.content,
                        role: "user"
                    }),
                    aiService.generateVector(messagePayload.content),
                ])

                await createMemory({
                    vectors,
                    messageId: message._id,
                    metadata: {
                        chat: messagePayload.chat,
                        user: socket.user._id,
                        text: messagePayload.content
                    }
                })

                const [ memory, chatHistory ] = await Promise.all([
                    queryMemory({
                        queryVector: vectors,
                        limit: 3,
                        metadata: {
                            user: socket.user._id
                        }
                    }),
                    messageModel.find({
                        chat: messagePayload.chat
                    }).sort({ createdAt: -1 }).limit(20).lean().then(messages => messages.reverse())
                ])

                const stm = chatHistory.map(item => {
                    return {
                        role: item.role,
                        parts: [ { text: item.content } ]
                    }
                })

                const ltm = [
                    {
                        role: "user",
                        parts: [ {
                            text: `
                            these are some previous messages from the chat, use them to generate a response
                            ${memory.map(item => item.metadata.text).join("\n")}
                            ` } ]
                    }
                ]

                // Check if socket is still connected before generating response
                if (socket.disconnected) {
                    messageModel.create({
                        chat: messagePayload.chat,
                        user: socket.user?._id,
                        content: 'Error occurred: failed to process your request.',
                        role: "model"
                    });
                    return;
                }

                const response = await aiService.generateResponse([ ...ltm, ...stm ])

                // Check again after AI response (in case disconnect happened during processing)
                if (socket.disconnected) {
                    messageModel.create({
                        chat: messagePayload.chat,
                        user: socket.user?._id,
                        content: 'Error occurred: failed to process your request.',
                        role: "model"
                    });
                    return;
                }

                // Emit to the chat room, not just the sender
                io.to(messagePayload.chat).emit('ai-response', {
                    content: response,
                    chat: messagePayload.chat
                })

                const [ responseMessage, responseVectors ] = await Promise.all([
                    messageModel.create({
                        chat: messagePayload.chat,
                        user: socket.user._id,
                        content: response,
                        role: "model"
                    }),
                    aiService.generateVector(response)
                ])

                await createMemory({
                    vectors: responseVectors,
                    messageId: responseMessage._id,
                    metadata: {
                        chat: messagePayload.chat,
                        user: socket.user._id,
                        text: response
                    }
                })
            } catch (err) {
                // Save error message to DB as a model message
                messageModel.create({
                    chat: messagePayload.chat,
                    user: socket.user?._id,
                    content: 'Error occurred: failed to process your request.',
                    role: "model"
                });
                // Do NOT emit error to socket here
            }
        });
    });
}


module.exports = initSocketServer;