import React, { useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import SimplePeerModule from 'simple-peer/simplepeer.min.js';
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  PhoneOff,
  Phone,
} from 'lucide-react';

const SimplePeer = SimplePeerModule.default || SimplePeerModule;

// ─── TIMER HOOK ───────────────────────────────────────────────────────────────
function useCallTimer(active) {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    if (!active) { setSeconds(0); return; }
    const id = setInterval(() => setSeconds(s => s + 1), 1000);
    return () => clearInterval(id);
  }, [active]);
  const m = String(Math.floor(seconds / 60)).padStart(2, '0');
  const s = String(seconds % 60).padStart(2, '0');
  return `${m}:${s}`;
}

// ─── AVATAR ───────────────────────────────────────────────────────────────────
function Avatar({ src, name, size = 'lg' }) {
  const sizes = {
    sm: 'w-12 h-12 text-lg',
    lg: 'w-20 h-20 text-3xl',
  };
  if (src) return (
    <img src={src} alt={name}
      className={`${sizes[size]} rounded-full object-cover border-2 border-white/10`} />
  );
  return (
    <div className={`${sizes[size]} rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-white`}>
      {name?.[0]?.toUpperCase()}
    </div>
  );
}

// ─── CONTROL BUTTON ──────────────────────────────────────────────────────────
function CtrlBtn({ onClick, active, danger, children, title }) {
  let cls = 'w-13 h-13 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95 ';
  if (danger)       cls += 'bg-red-500 hover:bg-red-600 text-white w-16 h-16';
  else if (active)  cls += 'bg-indigo-500 text-white border border-indigo-400';
  else              cls += 'bg-white/10 text-white border border-white/10 hover:bg-white/20';
  return (
    <button onClick={onClick} title={title}
      className={cls} style={{ width: danger ? 64 : 52, height: danger ? 64 : 52 }}>
      {children}
    </button>
  );
}

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────
/**
 * VideoCall — two ways to use:
 *
 * 1. OUTGOING (from Conv.jsx):
 *    <VideoCall targetUser={selectedUser} onClose={() => setShowCall(false)} />
 *
 * 2. INCOMING (from App.jsx):
 *    <VideoCall incomingCallData={{ from, signal, callerInfo }} onClose={...} />
 */
export default function VideoCall({ targetUser, incomingCallData, onClose }) {
  const { sockets: socket } = useSelector(state => state.socket);
  const { userData }        = useSelector(state => state.user);

  const [callState, setCallState]             = useState(incomingCallData ? 'incoming' : 'idle');
  const [isMuted, setIsMuted]                 = useState(false);
  const [isVideoOff, setIsVideoOff]           = useState(false);
  const [remoteConnected, setRemoteConnected] = useState(false);

  const myVideoRef     = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerRef        = useRef(null);
  const streamRef      = useRef(null);

  const timer = useCallTimer(callState === 'active');

  // ── Socket listeners ──
  useEffect(() => {
    if (!socket) return;
    socket.on('call-accepted', (signal) => peerRef.current?.signal(signal));
    socket.on('call-ended', () => cleanUp(false));
    return () => {
      socket.off('call-accepted');
      socket.off('call-ended');
    };
  }, [socket]);

  // ── Auto-start outgoing call ──
  useEffect(() => {
    if (!incomingCallData && targetUser) startCall();
  }, []);

  const getStream = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    streamRef.current = stream;
    if (myVideoRef.current) myVideoRef.current.srcObject = stream;
    return stream;
  };

  const startCall = async () => {
    if (!socket || !targetUser) return;
    setCallState('calling');
    try {
      const stream = await getStream();
      const peer = new SimplePeer({ initiator: true, trickle: false, stream });
      peer.on('signal', (signal) => {
        socket.emit('call-user', {
          to: targetUser._id,
          from: userData._id,
          signal,
          callerInfo: { userName: userData.userName, profilePicture: userData.profilePicture }
        });
      });
      peer.on('stream', (remoteStream) => {
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream;
        setRemoteConnected(true);
        setCallState('active');
      });
      peer.on('error', () => cleanUp(false));
      peerRef.current = peer;
    } catch (err) {
      console.error('Camera/mic error:', err);
      cleanUp(false);
    }
  };

  const answerCall = async () => {
    if (!socket || !incomingCallData) return;
    try {
      const stream = await getStream();
      const peer = new SimplePeer({ initiator: false, trickle: false, stream });
      peer.on('signal', (signal) => {
        socket.emit('answer-call', { to: incomingCallData.from, signal });
      });
      peer.on('stream', (remoteStream) => {
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream;
        setRemoteConnected(true);
        setCallState('active');
      });
      peer.on('error', () => cleanUp(false));
      peer.signal(incomingCallData.signal);
      peerRef.current = peer;
    } catch (err) {
      console.error('Camera/mic error:', err);
      cleanUp(false);
    }
  };

  const cleanUp = (notifyRemote = true) => {
    if (notifyRemote && socket) {
      const remoteId = incomingCallData ? incomingCallData.from : targetUser?._id;
      if (remoteId) socket.emit('end-call', { to: remoteId });
    }
    peerRef.current?.destroy();
    peerRef.current = null;
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    if (myVideoRef.current)     myVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    setCallState('idle');
    setRemoteConnected(false);
    onClose?.();
  };

  const toggleMute = () => {
    streamRef.current?.getAudioTracks().forEach(t => { t.enabled = !t.enabled; });
    setIsMuted(m => !m);
  };

  const toggleVideo = () => {
    streamRef.current?.getVideoTracks().forEach(t => { t.enabled = !t.enabled; });
    setIsVideoOff(v => !v);
  };

  const remoteInfo   = incomingCallData?.callerInfo || targetUser;
  const remoteName   = remoteInfo?.userName || 'User';
  const remoteAvatar = remoteInfo?.profilePicture;

  // ── INCOMING CALL TOAST ──────────────────────────────────────────────────────
  if (callState === 'incoming') {
    return (
      <div className="fixed bottom-6 right-6 z-[10000] bg-[#111] border border-white/10 rounded-2xl p-4 flex items-center gap-4 shadow-2xl min-w-[280px] animate-[slideUp_0.3s_ease]"
        style={{ animation: 'slideUp 0.3s ease' }}>

        <style>{`@keyframes slideUp { from { transform: translateY(16px); opacity:0 } to { transform: translateY(0); opacity:1 } }`}</style>

        <Avatar src={remoteAvatar} name={remoteName} size="sm" />

        <div className="flex-1">
          <p className="text-[11px] uppercase tracking-widest text-white/30 mb-0.5">Incoming video call</p>
          <p className="text-white font-semibold text-sm">{remoteName}</p>
        </div>

        <div className="flex gap-2">
          {/* Answer */}
          <button onClick={answerCall}
            className="w-11 h-11 rounded-full bg-green-500 hover:bg-green-400 flex items-center justify-center text-white transition-all hover:scale-110 active:scale-95">
            <Phone size={18} />
          </button>
          {/* Decline */}
          <button onClick={() => cleanUp(true)}
            className="w-11 h-11 rounded-full bg-red-500 hover:bg-red-400 flex items-center justify-center text-white transition-all hover:scale-110 active:scale-95">
            <PhoneOff size={18} />
          </button>
        </div>
      </div>
    );
  }

  // ── ACTIVE / CALLING MODAL ───────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-xl flex items-center justify-center">
      <div className="bg-[#0a0a0a] border border-white/10 rounded-3xl w-[90%] max-w-3xl overflow-hidden shadow-2xl">

        {/* Video area */}
        <div className="relative w-full bg-black aspect-video overflow-hidden">

          {/* Remote video */}
          <video
            ref={remoteVideoRef}
            autoPlay playsInline
            className="w-full h-full object-cover"
            style={{ display: remoteConnected ? 'block' : 'none' }}
          />

          {/* Placeholder while connecting */}
          {!remoteConnected && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
              <div className="rounded-full p-1 border-2 border-white/10 animate-pulse">
                <Avatar src={remoteAvatar} name={remoteName} size="lg" />
              </div>
              <p className="text-white/30 text-xs uppercase tracking-widest">
                {callState === 'calling' ? 'Calling…' : 'Connecting…'}
              </p>
            </div>
          )}

          {/* My video — picture in picture */}
          <video
            ref={myVideoRef}
            autoPlay muted playsInline
            className="absolute bottom-3 right-3 w-32 h-22 rounded-xl object-cover border-2 border-white/10 shadow-lg"
            style={{ height: 90 }}
          />
        </div>

        {/* Info bar */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-white/5">
          <span className="text-white font-semibold text-sm">{remoteName}</span>
          <span className="text-white/30 text-xs font-mono tracking-wider">
            {callState === 'active' ? timer : callState === 'calling' ? 'Calling…' : 'Connecting…'}
          </span>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-4 px-5 py-4 border-t border-white/5">

          <CtrlBtn onClick={toggleMute} active={isMuted} title={isMuted ? 'Unmute' : 'Mute'}>
            {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
          </CtrlBtn>

          <CtrlBtn onClick={toggleVideo} active={isVideoOff} title={isVideoOff ? 'Camera on' : 'Camera off'}>
            {isVideoOff ? <VideoOff size={20} /> : <Video size={20} />}
          </CtrlBtn>

          <CtrlBtn onClick={() => cleanUp(true)} danger title="End call">
            <PhoneOff size={22} />
          </CtrlBtn>

        </div>
      </div>
    </div>
  );
}