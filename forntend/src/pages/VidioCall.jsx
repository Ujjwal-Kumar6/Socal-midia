import React, { useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import SimplePeer from 'simple-peer';

// ─── STYLES ──────────────────────────────────────────────────────────────────
const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&display=swap');

  .vc-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.85);
    backdrop-filter: blur(12px);
    z-index: 9999;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: 'Syne', sans-serif;
  }

  .vc-modal {
    background: #0a0a0a;
    border: 1px solid #1f1f1f;
    border-radius: 24px;
    width: 90%;
    max-width: 860px;
    overflow: hidden;
    box-shadow: 0 40px 80px rgba(0,0,0,0.6);
    position: relative;
  }

  .vc-videos {
    position: relative;
    width: 100%;
    background: #050505;
    aspect-ratio: 16/9;
    overflow: hidden;
  }

  .vc-remote {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  .vc-local {
    position: absolute;
    bottom: 16px;
    right: 16px;
    width: 130px;
    height: 90px;
    object-fit: cover;
    border-radius: 12px;
    border: 2px solid #222;
    box-shadow: 0 8px 24px rgba(0,0,0,0.5);
    z-index: 2;
  }

  .vc-placeholder {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    color: #333;
  }

  .vc-avatar-ring {
    width: 88px;
    height: 88px;
    border-radius: 50%;
    border: 2px solid #222;
    display: flex;
    align-items: center;
    justify-content: center;
    animation: vc-pulse 2s infinite;
  }

  @keyframes vc-pulse {
    0%, 100% { box-shadow: 0 0 0 0 rgba(99,102,241,0.3); }
    50%       { box-shadow: 0 0 0 12px rgba(99,102,241,0); }
  }

  .vc-avatar-img {
    width: 80px;
    height: 80px;
    border-radius: 50%;
    object-fit: cover;
  }

  .vc-avatar-fallback {
    width: 80px;
    height: 80px;
    border-radius: 50%;
    background: linear-gradient(135deg, #6366f1, #8b5cf6);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 32px;
    font-weight: 700;
    color: white;
  }

  .vc-status-text {
    font-size: 13px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: #444;
  }

  .vc-info-bar {
    padding: 14px 20px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-top: 1px solid #111;
  }

  .vc-name {
    font-size: 15px;
    font-weight: 700;
    color: #e5e5e5;
    letter-spacing: 0.02em;
  }

  .vc-timer {
    font-size: 13px;
    color: #555;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    letter-spacing: 0.05em;
  }

  .vc-controls {
    padding: 16px 20px 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 14px;
    border-top: 1px solid #111;
  }

  .vc-btn {
    width: 52px;
    height: 52px;
    border-radius: 50%;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
    transition: all 0.2s ease;
    outline: none;
  }

  .vc-btn:hover { transform: scale(1.08); }
  .vc-btn:active { transform: scale(0.95); }

  .vc-btn-mute  { background: #1a1a1a; color: #ccc; border: 1px solid #2a2a2a; }
  .vc-btn-mute.active  { background: #6366f1; color: white; border-color: #6366f1; }
  .vc-btn-video { background: #1a1a1a; color: #ccc; border: 1px solid #2a2a2a; }
  .vc-btn-video.active { background: #6366f1; color: white; border-color: #6366f1; }
  .vc-btn-end   { background: #ef4444; color: white; width: 60px; height: 60px; font-size: 22px; }
  .vc-btn-end:hover { background: #dc2626; }

  /* ── Incoming call toast ── */
  .vc-incoming {
    position: fixed;
    bottom: 28px;
    right: 28px;
    z-index: 10000;
    background: #111;
    border: 1px solid #222;
    border-radius: 20px;
    padding: 18px 20px;
    display: flex;
    align-items: center;
    gap: 14px;
    box-shadow: 0 20px 60px rgba(0,0,0,0.5);
    font-family: 'Syne', sans-serif;
    animation: vc-slide-up 0.3s ease;
    min-width: 280px;
  }

  @keyframes vc-slide-up {
    from { transform: translateY(20px); opacity: 0; }
    to   { transform: translateY(0);    opacity: 1; }
  }

  .vc-incoming-avatar {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    object-fit: cover;
    flex-shrink: 0;
  }

  .vc-incoming-avatar-fallback {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    background: linear-gradient(135deg, #6366f1, #8b5cf6);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 18px;
    font-weight: 700;
    color: white;
    flex-shrink: 0;
  }

  .vc-incoming-info { flex: 1; }
  .vc-incoming-label {
    font-size: 11px;
    color: #555;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    margin-bottom: 3px;
  }
  .vc-incoming-name {
    font-size: 15px;
    font-weight: 700;
    color: #e5e5e5;
  }

  .vc-incoming-actions { display: flex; gap: 8px; }

  .vc-btn-answer {
    width: 44px; height: 44px;
    border-radius: 50%;
    border: none;
    background: #22c55e;
    color: white;
    font-size: 18px;
    cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    transition: all 0.2s;
  }
  .vc-btn-answer:hover { background: #16a34a; transform: scale(1.08); }

  .vc-btn-decline {
    width: 44px; height: 44px;
    border-radius: 50%;
    border: none;
    background: #ef4444;
    color: white;
    font-size: 18px;
    cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    transition: all 0.2s;
  }
  .vc-btn-decline:hover { background: #dc2626; transform: scale(1.08); }
`;

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

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
/**
 * VideoCall
 *
 * Props:
 *   targetUser  — the user object you want to call: { _id, userName, profilePicture }
 *   onClose     — callback to unmount / hide this component
 *
 * Usage (e.g. inside Conv.jsx or Massage.jsx):
 *   const [showCall, setShowCall] = useState(false);
 *   {showCall && <VideoCall targetUser={otherUser} onClose={() => setShowCall(false)} />}
 */
export default function VideoCall({ targetUser, onClose }) {
  // ── Redux ──
  const { sockets: socket } = useSelector(state => state.socket);
  const { userData }        = useSelector(state => state.user);

  // ── State ──
  const [callState, setCallState]       = useState('idle');   // idle | calling | active | incoming
  const [incomingData, setIncomingData] = useState(null);     // { from, signal, callerInfo }
  const [isMuted, setIsMuted]           = useState(false);
  const [isVideoOff, setIsVideoOff]     = useState(false);
  const [remoteConnected, setRemoteConnected] = useState(false);

  // ── Refs ──
  const myVideoRef     = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerRef        = useRef(null);
  const streamRef      = useRef(null);

  const timer = useCallTimer(callState === 'active');

  // ── Inject styles once ──
  useEffect(() => {
    if (document.getElementById('vc-styles')) return;
    const tag = document.createElement('style');
    tag.id = 'vc-styles';
    tag.textContent = styles;
    document.head.appendChild(tag);
    return () => tag.remove();
  }, []);

  // ── Socket listeners ──
  useEffect(() => {
    if (!socket) return;

    // Someone is calling US
    socket.on('incoming-call', ({ from, signal, callerInfo }) => {
      setIncomingData({ from, signal, callerInfo });
      setCallState('incoming');
    });

    // Our call was accepted
    socket.on('call-accepted', (signal) => {
      peerRef.current?.signal(signal);
    });

    // Other side hung up
    socket.on('call-ended', () => {
      cleanUp();
    });

    return () => {
      socket.off('incoming-call');
      socket.off('call-accepted');
      socket.off('call-ended');
    };
  }, [socket]);

  // ── Get user media helper ──
  const getStream = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    streamRef.current = stream;
    if (myVideoRef.current) myVideoRef.current.srcObject = stream;
    return stream;
  };

  // ── Start a call ──
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

      peer.on('error', (err) => { console.error('Peer error', err); cleanUp(); });

      peerRef.current = peer;
    } catch (err) {
      console.error('Could not get camera/mic', err);
      setCallState('idle');
    }
  };

  // ── Answer incoming call ──
  const answerCall = async () => {
    if (!socket || !incomingData) return;

    try {
      const stream = await getStream();

      const peer = new SimplePeer({ initiator: false, trickle: false, stream });

      peer.on('signal', (signal) => {
        socket.emit('answer-call', { to: incomingData.from, signal });
      });

      peer.on('stream', (remoteStream) => {
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream;
        setRemoteConnected(true);
        setCallState('active');
      });

      peer.on('error', (err) => { console.error('Peer error', err); cleanUp(); });

      peer.signal(incomingData.signal);
      peerRef.current = peer;
    } catch (err) {
      console.error('Could not get camera/mic', err);
      setCallState('idle');
    }
  };

  // ── End / clean up ──
  const cleanUp = (notifyRemote = false) => {
    if (notifyRemote && socket) {
      const remoteId = callState === 'incoming' ? incomingData?.from : targetUser?._id;
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
    setIncomingData(null);
    setIsMuted(false);
    setIsVideoOff(false);
    onClose?.();
  };

  const hangUp = () => cleanUp(true);

  // ── Toggle mic ──
  const toggleMute = () => {
    if (!streamRef.current) return;
    streamRef.current.getAudioTracks().forEach(t => { t.enabled = !t.enabled; });
    setIsMuted(m => !m);
  };

  // ── Toggle camera ──
  const toggleVideo = () => {
    if (!streamRef.current) return;
    streamRef.current.getVideoTracks().forEach(t => { t.enabled = !t.enabled; });
    setIsVideoOff(v => !v);
  };

  // ── Caller/callee info helpers ──
  const remoteUser    = callState === 'incoming' ? incomingData?.callerInfo : targetUser;
  const remoteName    = remoteUser?.userName   || 'User';
  const remoteAvatar  = remoteUser?.profilePicture;
  const statusLabel   = callState === 'calling' ? 'Calling…' : callState === 'active' ? 'Connected' : '';

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER: Incoming call toast (shown even when overlay is closed)
  // ─────────────────────────────────────────────────────────────────────────────
  if (callState === 'incoming') {
    return (
      <div className="vc-incoming">
        {remoteAvatar
          ? <img src={remoteAvatar} className="vc-incoming-avatar" alt={remoteName} />
          : <div className="vc-incoming-avatar-fallback">{remoteName[0].toUpperCase()}</div>
        }
        <div className="vc-incoming-info">
          <div className="vc-incoming-label">Incoming video call</div>
          <div className="vc-incoming-name">{remoteName}</div>
        </div>
        <div className="vc-incoming-actions">
          <button className="vc-btn-answer"  onClick={answerCall} title="Answer">📹</button>
          <button className="vc-btn-decline" onClick={hangUp}     title="Decline">📵</button>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER: Main call modal
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="vc-overlay">
      <div className="vc-modal">

        {/* ── Video area ── */}
        <div className="vc-videos">
          {/* Remote video — shown once connected */}
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="vc-remote"
            style={{ display: remoteConnected ? 'block' : 'none' }}
          />

          {/* Placeholder while waiting */}
          {!remoteConnected && (
            <div className="vc-placeholder">
              <div className="vc-avatar-ring">
                {remoteAvatar
                  ? <img src={remoteAvatar} className="vc-avatar-img" alt={remoteName} />
                  : <div className="vc-avatar-fallback">{remoteName[0].toUpperCase()}</div>
                }
              </div>
              <span className="vc-status-text">
                {callState === 'calling' ? 'Calling…' : 'Connecting…'}
              </span>
            </div>
          )}

          {/* Local (my) video — small picture-in-picture */}
          <video
            ref={myVideoRef}
            autoPlay
            muted
            playsInline
            className="vc-local"
            style={{ display: streamRef.current ? 'block' : 'none' }}
          />
        </div>

        {/* ── Info bar ── */}
        <div className="vc-info-bar">
          <span className="vc-name">{remoteName}</span>
          <span className="vc-timer">
            {callState === 'active' ? timer : statusLabel}
          </span>
        </div>

        {/* ── Controls ── */}
        <div className="vc-controls">
          <button
            className={`vc-btn vc-btn-mute ${isMuted ? 'active' : ''}`}
            onClick={toggleMute}
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? '🔇' : '🎙️'}
          </button>

          <button
            className={`vc-btn vc-btn-video ${isVideoOff ? 'active' : ''}`}
            onClick={toggleVideo}
            title={isVideoOff ? 'Turn camera on' : 'Turn camera off'}
          >
            {isVideoOff ? '📵' : '📹'}
          </button>

          <button
            className="vc-btn vc-btn-end"
            onClick={callState === 'idle' ? startCall : hangUp}
            title={callState === 'idle' ? 'Start Call' : 'End Call'}
          >
            {callState === 'idle' ? '📹' : '📵'}
          </button>
        </div>

      </div>
    </div>
  );
}