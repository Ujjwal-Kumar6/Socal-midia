import React, { useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { Video, VideoOff, Mic, MicOff, PhoneOff, Phone } from 'lucide-react';

// SimplePeer is loaded from CDN in index.html → window.SimplePeer

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
  const cls = size === 'sm'
    ? 'w-12 h-12 text-lg flex-shrink-0'
    : 'w-24 h-24 text-4xl md:w-28 md:h-28';

  if (src) return (
    <img src={src} alt={name}
      className={`${cls} rounded-full object-cover border-2 border-white/10`} />
  );
  return (
    <div className={`${cls} rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-white`}>
      {name?.[0]?.toUpperCase()}
    </div>
  );
}

// ─── CONTROL BUTTON ──────────────────────────────────────────────────────────
function CtrlBtn({ onClick, active, danger, children, title }) {
  const base = 'rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95 focus:outline-none';
  if (danger) return (
    <button onClick={onClick} title={title}
      className={`${base} w-14 h-14 md:w-16 md:h-16 bg-red-500 hover:bg-red-400 text-white shadow-lg shadow-red-500/30`}>
      {children}
    </button>
  );
  return (
    <button onClick={onClick} title={title}
      className={`${base} w-12 h-12 md:w-13 md:h-13 border ${active
        ? 'bg-indigo-500 border-indigo-400 text-white shadow-lg shadow-indigo-500/30'
        : 'bg-white/10 border-white/10 text-white hover:bg-white/20'}`}
      style={{ width: 52, height: 52 }}>
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

  // ── Socket listeners ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!socket) return;
    socket.on('call-accepted', (signal) => peerRef.current?.signal(signal));
    socket.on('call-ended', () => cleanUp(false));
    return () => {
      socket.off('call-accepted');
      socket.off('call-ended');
    };
  }, [socket]);

  // ── Auto-start outgoing call on mount ────────────────────────────────────
  useEffect(() => {
    if (!incomingCallData && targetUser) startCall();
  }, []);

  // ── Get camera + mic ─────────────────────────────────────────────────────
  const getStream = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    streamRef.current = stream;
    if (myVideoRef.current) myVideoRef.current.srcObject = stream;
    return stream;
  };

  // ── Start outgoing call ──────────────────────────────────────────────────
  const startCall = async () => {
    if (!socket || !targetUser) return;
    setCallState('calling');
    try {
      const stream = await getStream();
      const peer = new window.SimplePeer({ initiator: true, trickle: false, stream });
      peer.on('signal', (signal) => {
        socket.emit('call-user', {
          to: targetUser._id,
          from: userData._id,
          signal,
          callerInfo: {
            userName: userData.userName,
            profilePicture: userData.profilePicture,
          },
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

  // ── Answer incoming call ─────────────────────────────────────────────────
  const answerCall = async () => {
    if (!socket || !incomingCallData) return;
    try {
      const stream = await getStream();
      const peer = new window.SimplePeer({ initiator: false, trickle: false, stream });
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

  // ── Clean up ─────────────────────────────────────────────────────────────
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

  const toggleMute  = () => {
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

  // ════════════════════════════════════════════════════════════════════════════
  // INCOMING CALL TOAST
  // ════════════════════════════════════════════════════════════════════════════
  if (callState === 'incoming') {
    return (
      <>
        <style>{`
          @keyframes slideUp {
            from { transform: translateY(20px); opacity: 0; }
            to   { transform: translateY(0);    opacity: 1; }
          }
          .vc-toast { animation: slideUp 0.35s cubic-bezier(0.34,1.56,0.64,1); }
        `}</style>

        <div className="vc-toast fixed bottom-5 right-5 z-[10000] flex items-center gap-4 p-4 pr-5 rounded-2xl shadow-2xl border border-white/10 bg-[#111]/95 backdrop-blur-md min-w-[260px] max-w-[320px]">

          {/* Pulsing ring around avatar */}
          <div className="relative flex-shrink-0">
            <span className="absolute inset-0 rounded-full bg-purple-500/30 animate-ping" />
            <Avatar src={remoteAvatar} name={remoteName} size="sm" />
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-[10px] uppercase tracking-[0.15em] text-white/30 mb-0.5">
              Incoming video call
            </p>
            <p className="text-white font-semibold text-sm truncate">{remoteName}</p>
          </div>

          <div className="flex gap-2 flex-shrink-0">
            <button onClick={answerCall}
              className="w-10 h-10 rounded-full bg-green-500 hover:bg-green-400 flex items-center justify-center text-white transition-all hover:scale-110 active:scale-95 shadow-lg shadow-green-500/30">
              <Phone size={17} />
            </button>
            <button onClick={() => cleanUp(true)}
              className="w-10 h-10 rounded-full bg-red-500 hover:bg-red-400 flex items-center justify-center text-white transition-all hover:scale-110 active:scale-95 shadow-lg shadow-red-500/30">
              <PhoneOff size={17} />
            </button>
          </div>
        </div>
      </>
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // ACTIVE / CALLING MODAL
  // ════════════════════════════════════════════════════════════════════════════
  return (
    <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-xl flex items-end md:items-center justify-center p-0 md:p-4">

      <div className="bg-[#0d0d0d] border border-white/[0.07] rounded-t-3xl md:rounded-3xl w-full md:w-[90%] md:max-w-3xl overflow-hidden shadow-2xl">

        {/* ── VIDEO AREA ── */}
        <div className="relative w-full bg-black overflow-hidden"
          style={{ aspectRatio: '16/9', maxHeight: '56vw', minHeight: 200 }}>

          {/* Remote video */}
          <video
            ref={remoteVideoRef}
            autoPlay playsInline
            className="absolute inset-0 w-full h-full object-cover"
            style={{ display: remoteConnected ? 'block' : 'none' }}
          />

          {/* Gradient overlay at bottom (only when connected) */}
          {remoteConnected && (
            <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
          )}

          {/* Placeholder while waiting */}
          {!remoteConnected && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-gradient-to-b from-[#0d0d0d] to-black">
              {/* Pulsing rings */}
              <div className="relative flex items-center justify-center">
                <span className="absolute w-36 h-36 rounded-full border border-purple-500/20 animate-ping" style={{ animationDuration: '2s' }} />
                <span className="absolute w-28 h-28 rounded-full border border-indigo-500/30 animate-ping" style={{ animationDuration: '1.5s' }} />
                <Avatar src={remoteAvatar} name={remoteName} size="lg" />
              </div>
              <div className="text-center">
                <p className="text-white font-semibold text-base md:text-lg">{remoteName}</p>
                <p className="text-white/30 text-xs uppercase tracking-widest mt-1">
                  {callState === 'calling' ? 'Calling…' : 'Connecting…'}
                </p>
              </div>
            </div>
          )}

          {/* My video — PiP */}
          <video
            ref={myVideoRef}
            autoPlay muted playsInline
            className="absolute bottom-3 right-3 rounded-xl object-cover border border-white/10 shadow-xl z-10"
            style={{ width: 90, height: 64 }}
          />
        </div>

        {/* ── INFO BAR ── */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-white/[0.06]">
          <div>
            <p className="text-white font-semibold text-sm">{remoteName}</p>
            {callState === 'active' && (
              <p className="text-white/30 text-[11px] mt-0.5">Connected</p>
            )}
          </div>
          <span className="text-white/30 text-xs font-mono tracking-widest tabular-nums">
            {callState === 'active'
              ? timer
              : callState === 'calling'
              ? 'Calling…'
              : 'Connecting…'}
          </span>
        </div>

        {/* ── CONTROLS ── */}
        <div className="flex items-center justify-center gap-5 px-5 py-5 border-t border-white/[0.06]">

          {/* Mute */}
          <div className="flex flex-col items-center gap-1.5">
            <CtrlBtn onClick={toggleMute} active={isMuted} title={isMuted ? 'Unmute' : 'Mute'}>
              {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
            </CtrlBtn>
            <span className="text-white/30 text-[10px]">{isMuted ? 'Unmute' : 'Mute'}</span>
          </div>

          {/* End call — centre, bigger */}
          <div className="flex flex-col items-center gap-1.5">
            <CtrlBtn onClick={() => cleanUp(true)} danger title="End call">
              <PhoneOff size={22} />
            </CtrlBtn>
            <span className="text-white/30 text-[10px]">End</span>
          </div>

          {/* Camera */}
          <div className="flex flex-col items-center gap-1.5">
            <CtrlBtn onClick={toggleVideo} active={isVideoOff} title={isVideoOff ? 'Camera on' : 'Camera off'}>
              {isVideoOff ? <VideoOff size={20} /> : <Video size={20} />}
            </CtrlBtn>
            <span className="text-white/30 text-[10px]">{isVideoOff ? 'Camera on' : 'Camera off'}</span>
          </div>

        </div>

      </div>
    </div>
  );
}