import http from 'http';
import express from 'express';
import { Server } from 'socket.io';

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "https://vybe-ev36.onrender.com",
        methods: ["GET", "POST", "PUT", "DELETE"]
    }
});

const useSocketMap = {}

export const getSocketId = (reciverId) => {
    return useSocketMap[reciverId];
};

io.on("connection", (socket) => {
    const userId = socket.handshake.query.userId;
    if (userId != undefined) {
        useSocketMap[userId] = socket.id;
    }

    io.emit('getOnlineUser', Object.keys(useSocketMap));

    // ─── VIDEO CALL EVENTS ───────────────────────────────────────

    // Step 1: Caller sends offer to recipient
    socket.on("call-user", ({ to, from, signal }) => {
        const recipientSocketId = useSocketMap[to];
        if (recipientSocketId) {
            io.to(recipientSocketId).emit("incoming-call", { from, signal });
        }
    });

    // Step 2: Recipient sends answer back to caller
    socket.on("answer-call", ({ to, signal }) => {
        const callerSocketId = useSocketMap[to];
        if (callerSocketId) {
            io.to(callerSocketId).emit("call-accepted", signal);
        }
    });

    // Step 3: Either side ends the call
    socket.on("end-call", ({ to }) => {
        const otherSocketId = useSocketMap[to];
        if (otherSocketId) {
            io.to(otherSocketId).emit("call-ended");
        }
    });

    // ─────────────────────────────────────────────────────────────

    socket.on('disconnect', () => {
        delete useSocketMap[userId];
        io.emit('getOnlineUser', Object.keys(useSocketMap));
    });
});

export { app, io, server };