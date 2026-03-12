import User from "../Module/userModle.js";
import Loop from "../Module/loopModle.js";
import uplodOnCloudnery from "../confige/cloudnery.js";
import { io, getSocketId } from "../socket.js";
import Notification from "../Module/notificationModle.js";

export const uplodLoop = async (req, res) => {
    try {
        const { caption } = req.body;

        if (!req.file) {
            return res.status(400).json({ message: "media is required" });
        }

        const midia = await uplodOnCloudnery(req.file.path);

        const loop = await Loop.create({
            caption,
            midia,
            author: req.userId
        });

        await User.findByIdAndUpdate(req.userId, {
            $push: { loops: loop._id }
        });

        const populateLoop = await Loop.findById(loop._id)
            .populate("author", "name userName profilePic");

        return res.status(201).json(populateLoop);

    } catch (error) {
        console.error("Upload Loop error:", error);
        return res.status(500).json({ message: `Upload Loop error: ${error.message}` });
    }
};

export const getAllLoop = async (req, res) => {
    try {
        const loop = await Loop.find({})
            .sort({ createdAt: -1 })
            .populate("author", "name userName profilePic")
            .populate("comments.author", "name userName profilePic");

        return res.status(200).json(loop);

    } catch (error) {
        console.error("Get all Loop error:", error);
        return res.status(500).json({ message: `Get all Loop error: ${error.message}` });
    }
};

export const like = async (req, res) => {
    try {
        const loopId = req.params.loopId;

        const loop = await Loop.findById(loopId);

        if (!loop) {
            return res.status(400).json({ message: "Loop Not found or already deleted" });
        }

        const alreadyLike = loop.likes.some(
            id => id.toString() === req.userId.toString()
        );

        if (alreadyLike) {
            loop.likes = loop.likes.filter(
                id => id.toString() !== req.userId.toString()
            );
        } else {

            loop.likes.push(req.userId);

            if (loop.author.toString() !== req.userId.toString()) {

                const notification = await Notification.create({
                    sender: req.userId,
                    receiver: loop.author,
                    type: "like",
                    message: "liked your loop",
                    loop: loop._id
                });

                const populatedNotification =
                    await Notification.findById(notification._id)
                        .populate("sender receiver loop");

                const receiverSocketId = getSocketId(loop.author);

                if (receiverSocketId) {
                    io.to(receiverSocketId).emit(
                        "newNotification",
                        populatedNotification
                    );
                }
            }
        }

        await loop.save();

        await loop.populate("author", "name userName profilePic");

        io.emit("likeLoop", {
            loopId: loop._id,
            likes: loop.likes
        });

        return res.status(200).json(loop);

    } catch (error) {
        console.error("Like error:", error);
        return res.status(500).json({ message: `Like error: ${error.message}` });
    }
};

export const comments = async (req, res) => {
    try {

        const { message } = req.body;
        const loopId = req.params.loopId;

        if (!message?.trim()) {
            return res.status(400).json({
                message: "Comment message is required"
            });
        }

        const loop = await Loop.findById(loopId);

        if (!loop) {
            return res.status(400).json({
                message: "Loop Not found or already deleted"
            });
        }

        loop.comments.push({
            author: req.userId,
            message,
            createdAt: new Date()
        });

        if (loop.author.toString() !== req.userId.toString()) {

            const notification = await Notification.create({
                sender: req.userId,
                receiver: loop.author,
                type: "comment",
                message: "commented on your loop",
                loop: loop._id
            });

            const populatedNotification =
                await Notification.findById(notification._id)
                    .populate("sender receiver loop");

            const receiverSocketId = getSocketId(loop.author);

            if (receiverSocketId) {
                io.to(receiverSocketId).emit(
                    "newNotification",
                    populatedNotification
                );
            }
        }

        await loop.save();

        await loop.populate("author", "name userName profilePic");
        await loop.populate("comments.author", "name userName profilePic");

        io.emit("commentLoop", {
            loopId: loop._id,
            comments: loop.comments
        });

        return res.status(200).json(loop);

    } catch (error) {
        console.error("Comment error:", error);
        return res.status(500).json({
            message: `Comment error: ${error.message}`
        });
    }
};

export const deleteComment = async (req, res) => {
    try {

        const { commentId } = req.params;
        const loopId = req.params.loopId;

        const loop = await Loop.findById(loopId);

        if (!loop) {
            return res.status(400).json({
                message: "Loop Not found or already deleted"
            });
        }

        const commentIndex = loop.comments.findIndex(
            comment => comment._id.toString() === commentId
        );

        if (commentIndex === -1) {
            return res.status(400).json({
                message: "Comment Not found or already deleted"
            });
        }

        const comment = loop.comments[commentIndex];

        if (comment.author.toString() !== req.userId.toString()) {
            return res.status(400).json({
                message: "You are not authorized to delete this comment"
            });
        }

        loop.comments.splice(commentIndex, 1);

        await loop.save();

        await loop.populate("author", "name userName profilePic");
        await loop.populate("comments.author", "name userName profilePic");

        return res.status(200).json(loop);

    } catch (error) {
        console.error("Delete comment error:", error);
        return res.status(500).json({
            message: `Delete comment error: ${error.message}`
        });
    }
};

export const deleteLoop = async (req, res) => {
    try {

        const { loopId } = req.params;

        const raw = await Loop.findById(loopId);

        if (!raw) {
            return res.status(404).json({
                message: "Loop not found in database"
            });
        }

        if (raw.author.toString() !== req.userId.toString()) {
            return res.status(403).json({
                message: "You are not authorized to delete this loop"
            });
        }

        await raw.deleteOne();

        return res.status(200).json({
            message: "Loop deleted successfully"
        });

    } catch (err) {
        console.error("DELETE ERROR:", err);
        return res.status(500).json({
            message: err.message
        });
    }
};
