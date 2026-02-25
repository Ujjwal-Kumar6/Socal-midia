import User from "../Module/userModle.js";
import Loop from "../Module/loopModle.js";
import uplodOnCloudnery from "../confige/cloudnery.js";
import { io,getSocketId } from "../socket.js";
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

        await User.findByIdAndUpdate(req.userId, { $push: { loops: loop._id } });

        const populateLoop = await Loop.findById(loop._id)
            .populate("author", "name userName profilePic");

        return res.status(201).json(populateLoop);
    } catch (error) {
        console.error("Uplod Loop error:", error);
        return res.status(500).json({ message: `Uplod Loop error: ${error.message}` });
    }
};

export const getAllLoop = async (req, res) => {
    try {
        const loop = await Loop.find({})
            .sort({ createdAt: -1 }) // newest first
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
            return res.status(400).json({ message: 'Loop Not found or already deleted' });
        }

        const alreadyLike = loop.likes.some(id => id.toString() == req.userId.toString());
        if (alreadyLike) {
            loop.likes = loop.likes.filter(id => id.toString() != req.userId.toString());
        } else {
            loop.likes.push(req.userId);
            if (loop.author._id != req.userId){
                const notification = await Notification.create({
                    sender: req.userId,
                    reciver: loop.author._id,
                    type: "like",
                    message: "liked your loop",
                    loop: loop._id
                });
                const populatedNotification = await Notification.findById(notification._id).populate("sender reciver loop");
                const reciverSocketId = getSocketId(loop.author._id);
                if (reciverSocketId) {
                    io.to(reciverSocketId).emit("newNotification", populatedNotification);
                } else {
                    console.log("reciver socket ID not found");
                }
            }
        }

        await loop.save();
        await loop.populate("author", "name userName profilePic");

        // ✅ FIXED: Changed 'post.likes' to 'loop.likes'
        io.emit("likeLoop", { 
            loopId: loop._id,
            likes: loop.likes
        });

        return res.status(200).json(loop);
    } catch (error) {
        console.error("Liked error:", error);
        return res.status(500).json({ message: `Liked error: ${error.message}` });
    }
};

try {
    const { message } = req.body;
    const loopId = req.params.loopId;

    if (!message?.trim()) {
        return res.status(400).json({ message: "Comment message is required" });
    }

    const loop = await Loop.findById(loopId);
    if (!loop) {
        return res.status(400).json({ message: 'Loop Not found or already deleted' });
    }

    loop.comments.push({
        author: req.userId,
        message,
        createdAt: new Date()
    });

    if (loop.author._id.toString() !== req.userId.toString()) {
        const notification = await Notification.create({
            sender: req.userId,
            receiver: loop.author._id,
            type: "comment",
            message: "commented on your loop",
            loop: loop._id
        });

        const populatedNotification = await Notification.findById(notification._id)
            .populate("sender receiver loop");

        const receiverSocketId = getSocketId(loop.author._id);
        if (receiverSocketId) {
            io.to(receiverSocketId).emit("newNotification", populatedNotification);
        } else {
            console.log("Receiver socket ID not found");
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
    return res.status(500).json({ message: `Comment error: ${error.message}` });
}


export const deleteComment = async (req, res) => {
    try {
        const { commentId } = req.params;
        const loopId = req.params.loopId;

        const loop = await Loop.findById(loopId);
        if (!loop) {
            return res.status(400).json({ message: 'Loop Not found or already deleted' });
        }

        const commentIndex = loop.comments.findIndex(comment => comment._id.toString() === commentId);
        if (commentIndex === -1) {
            return res.status(400).json({ message: 'Comment Not found or already deleted' });
        }

        const comment = loop.comments[commentIndex];
        if (comment.author.toString() !== req.userId.toString()) {
            return res.status(400).json({ message: 'You are not authorized to delete this comment' });
        }

        loop.comments.splice(commentIndex, 1);
        await loop.save();
        await loop.populate("author", "name userName profilePic");
        await loop.populate("comments.author", "name userName profilePic");

        return res.status(200).json(loop);
    } catch (error) {
        console.error("Delete comment error:", error);
        return res.status(500).json({ message: `Delete comment error: ${error.message}` });
    }
};

export const deleteLoop = async (req, res) => {
  try {
    const { loopId } = req.params;

    console.log("DELETE REQUEST RECEIVED");
    console.log("Loop ID:", loopId);
    console.log("User ID:", req.userId);

    const raw = await Loop.findOne({ _id: loopId });
    console.log("RAW LOOP:", raw);

    if (!raw) {
      return res.status(404).json({
        message: "Loop not found in database",
        loopId
      });
    }

    if (raw.author.toString() !== req.userId.toString()) {
      return res.status(403).json({
        message: "Author mismatch",
        author: raw.author,
        user: req.userId
      });
    }

    await raw.deleteOne();

    return res.status(200).json({ message: "Loop deleted successfully" });

  } catch (err) {
    console.error("DELETE ERROR:", err);
    return res.status(500).json({ message: err.message });
  }
};
