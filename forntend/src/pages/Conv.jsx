import React, { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { MdOutlineKeyboardBackspace } from 'react-icons/md';
import { IoSend } from 'react-icons/io5';
import { HiOutlinePhotograph } from 'react-icons/hi';
import { MdVideoCall } from 'react-icons/md';
import { useNavigate } from 'react-router-dom';
import dp from '../assets/dp.jpg';
import axios from 'axios';
import { url } from '../App';
import { BiLoader } from 'react-icons/bi';
import { setMessages, clearSelectedUser } from '../redux/massageSlice';
import SenderMassage from '../componesnsts/SenderMassage';
import ReciverMassage from '../componesnsts/ReciverMassage';
import VideoCall from './VidioCall.jsx';

function Conv() {
  const { selectedUser, messages } = useSelector(state => state.message);
  const { onlineUser } = useSelector(state => state.socket);
  const { sockets } = useSelector(state => state.socket);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [messagesLoading, setMessagesLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const dispatch = useDispatch();
  const imageInput = useRef(null);
  const [backendImage, setBackendImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const bottomRef = useRef(null);

  // ── Video call state ──
  const [showVideoCall, setShowVideoCall] = useState(false);

  const isOnline = onlineUser?.includes(selectedUser?._id);

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleImage = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError('Image size should be less than 5MB');
      return;
    }
    setBackendImage(file);
    setPreview(URL.createObjectURL(file));
    setError('');
  };

  const removeImage = () => {
    if (preview) {
      try {
        URL.revokeObjectURL(preview);
      } catch (err) {
        console.error('Error revoking object URL:', err);
      }
    }
    setBackendImage(null);
    setPreview(null);
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!message.trim() && !backendImage) return;

    setLoading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('message', message);
      if (backendImage) formData.append('image', backendImage);

      const res = await axios.post(
        `${url}/api/massage/send/${selectedUser._id}`,
        formData,
        { withCredentials: true }
      );

      dispatch(setMessages([...(messages || []), res.data]));
      setMessage('');
      removeImage();
      scrollToBottom();

    } catch (error) {
      setError(error.response?.data?.message || 'Failed to send message');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(e);
    }
  };

  const getAllMessages = async () => {
    setMessagesLoading(true);
    try {
      const res = await axios.get(
        `${url}/api/massage/get/${selectedUser._id}`,
        { withCredentials: true }
      );
      dispatch(setMessages(res.data));
    } catch {
      setError('Failed to load messages');
    } finally {
      setMessagesLoading(false);
      scrollToBottom();
    }
  };

  useEffect(() => {
    if (selectedUser?._id) {
      getAllMessages();
    }
  }, [selectedUser?._id]);

  useEffect(() => {
    return () => {
      dispatch(clearSelectedUser());
    };
  }, [dispatch]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Socket listener for new messages
  useEffect(() => {
    if (!sockets) return;

    const handleNewMessage = (mes) => {
      const currentMessages = messages || [];
      dispatch(setMessages([...currentMessages, mes]));
    };

    sockets.on("newMassage", handleNewMessage);

    return () => {
      sockets.off("newMassage", handleNewMessage);
    };
  }, [sockets, dispatch, messages]);

  // Socket listener for message deletion
  useEffect(() => {
    if (!sockets) return;

    const handleMessageDeleted = (deletedMessageId) => {
      const updatedMessages = messages?.filter(msg => msg._id !== deletedMessageId) || [];
      dispatch(setMessages(updatedMessages));
    };

    sockets.on("messageDeleted", handleMessageDeleted);

    return () => {
      sockets.off("messageDeleted", handleMessageDeleted);
    };
  }, [sockets, dispatch, messages]);

  // Socket listener for conversation deletion
  useEffect(() => {
    if (!sockets) return;

    const handleConversationDeleted = ({ conversationId, otherUserId }) => {
      if (selectedUser?._id === otherUserId) {
        dispatch(setMessages([]));
        navigate(-1);
      }
    };

    sockets.on("conversationDeleted", handleConversationDeleted);

    return () => {
      sockets.off("conversationDeleted", handleConversationDeleted);
    };
  }, [sockets, dispatch, selectedUser, navigate]);

  return (
    <div className="w-full h-screen bg-black text-white flex flex-col">

      {/* ── Header ── */}
      <div className="fixed top-0 left-0 w-full h-[60px] flex items-center gap-3 px-4 border-b border-gray-800 bg-black z-50">
        <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-gray-800">
          <MdOutlineKeyboardBackspace size={24} />
        </button>

        <div className="relative cursor-pointer" onClick={() => navigate(`/profile/${selectedUser?.userName}`)}>
          <img
            src={selectedUser?.profilePic || dp}
            className="w-9 h-9 rounded-full object-cover"
            alt=""
          />
          {isOnline && (
            <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-black" />
          )}
        </div>

        <div className='cursor-pointer flex-1' onClick={() => navigate(`/profile/${selectedUser?.userName}`)}>
          <p className="text-sm font-semibold">{selectedUser?.userName}</p>
          <p className="text-xs text-gray-400">{isOnline ? 'Online' : 'Offline'}</p>
        </div>

        {/* ── Video Call Button ── */}
        <button
          onClick={() => setShowVideoCall(true)}
          className="p-2 rounded-full hover:bg-gray-800 text-purple-400 hover:text-purple-300 transition-colors"
          title="Start video call"
        >
          <MdVideoCall size={28} />
        </button>
      </div>

      {/* ── Messages ── */}
      <div className="flex-1 pt-[70px] pb-[140px] px-4 overflow-y-auto">
        {messagesLoading ? (
          <div className="flex justify-center items-center h-full">
            <BiLoader className="animate-spin text-purple-500" size={40} />
          </div>
        ) : Array.isArray(messages) && messages?.length ? (
          messages.map((msg, index) =>
            msg.receiver === selectedUser._id
              ? <SenderMassage key={msg._id || index} message={msg} />
              : <ReciverMassage key={msg._id || index} message={msg} />
          )
        ) : (
          <p className="text-center text-gray-500">No messages yet</p>
        )}
        <div ref={bottomRef} />
      </div>

      {preview && (
        <div className="fixed bottom-[80px] left-4">
          <img src={preview} className="w-40 rounded-lg border border-gray-700" alt="preview" />
          <button
            onClick={removeImage}
            className="absolute -top-2 -right-2 bg-red-500 w-6 h-6 rounded-full text-xs"
          >
            ✕
          </button>
        </div>
      )}

      {error && (
        <div className="fixed bottom-[90px] left-1/2 transform -translate-x-1/2 bg-red-500 text-white px-4 py-2 rounded-lg">
          {error}
        </div>
      )}

      {/* ── Message input ── */}
      <div className="fixed bottom-0 left-0 w-full border-t border-gray-800 bg-black px-4 py-3">
        <form onSubmit={handleSend} className="flex items-center gap-3">
          <label className="cursor-pointer">
            <HiOutlinePhotograph size={22} />
            <input
              ref={imageInput}
              type="file"
              hidden
              accept="image/*"
              onChange={handleImage}
            />
          </label>

          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type a message..."
            rows={1}
            className="flex-1 bg-[#1e1e1e] px-4 py-3 rounded-full resize-none"
          />

          <button
            disabled={loading}
            className="w-11 h-11 rounded-full bg-purple-600 flex items-center justify-center disabled:opacity-50"
          >
            {loading ? <BiLoader className="animate-spin" /> : <IoSend />}
          </button>
        </form>
      </div>

      {/* ── VideoCall component ── */}
      {showVideoCall && (
        <VideoCall
          targetUser={selectedUser}
          onClose={() => setShowVideoCall(false)}
        />
      )}

    </div>
  );
}

export default Conv;