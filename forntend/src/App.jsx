import React, { useEffect, useRef, lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import io from "socket.io-client";

// ─── Eager (tiny, always needed) ───────────────────────────────────────────
import SingUp        from "./pages/SingUp";
import SingIn        from "./pages/SingIn";
import Home          from "./pages/Home";
import ForgotPassword from "./pages/ForgotPassword";

// ─── Lazy (split into separate chunks) ─────────────────────────────────────
const Upload      = lazy(() => import("./pages/Uplod"));
const Profile     = lazy(() => import("./pages/profile"));
const Loop        = lazy(() => import("./pages/Loop"));
const Story       = lazy(() => import("./pages/Story"));
const EditProfile = lazy(() => import("./pages/EditProfile"));
const Massage     = lazy(() => import("./componesnsts/Massage"));
const Conv        = lazy(() => import("./pages/Conv"));
const Surch       = lazy(() => import("./pages/Surch"));
const Notification = lazy(() => import("./pages/Notification"));
const VideoCall   = lazy(() => import("./pages/VidioCall.jsx"));
const NotFound    = lazy(() => import("./pages/NotFound"));

// ─── Hooks ──────────────────────────────────────────────────────────────────
import useGetCurrentUser    from "./hooks/getCurrentUser";
import getSuggestedUser     from "./hooks/getSugestedUser";
import getAllStory           from "./hooks/getAllStory";
import useMyStory           from "./hooks/getMyStory";
import getAllPost            from "./hooks/getAllPost";
import getAllLoop            from "./hooks/getAllLoop";
import getPriviusUsers      from "./hooks/getPriviusUsers";
import getAllNotification    from "./hooks/getAllNotification";

// ─── Redux ──────────────────────────────────────────────────────────────────
import { setOnlineUser, setSockets } from "./redux/socketSlice";
import { setNotification }           from "./redux/userSlice";

export const url = "https://vybe-backend-8yqs.onrender.com";

// Reusable auth guards — avoids JSX duplication and re-renders
const Private = ({ children }) => {
  const userData = useSelector((s) => s.user.userData);
  return userData ? children : <Navigate to="/singin" replace />;
};

const Guest = ({ children }) => {
  const userData = useSelector((s) => s.user.userData);
  return !userData ? children : <Navigate to="/" replace />;
};

// Minimal spinner shown while lazy chunks download
const PageLoader = () => (
  <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
    <span style={{ fontSize: 24, opacity: 0.4 }}>Loading…</span>
  </div>
);

function App() {
  const dispatch = useDispatch();

  // Only subscribe to what we actually need
  const userData     = useSelector((s) => s.user.userData);
  const notification = useSelector((s) => s.user.notification);
  const socket       = useSelector((s) => s.socket.socket);

  // Stable ref so the notification listener never needs to be torn down/re-added
  const notificationRef = useRef(notification);
  useEffect(() => { notificationRef.current = notification; }, [notification]);

  /* ─── Load current user ─────────────────────────────────────────────────── */
  useGetCurrentUser();
  useMyStory();

  /* ─── Load app data once userData is ready ──────────────────────────────── */
  useEffect(() => {
    if (!userData) return;

    getSuggestedUser();
    getAllStory();
    getAllPost();
    getAllLoop();
    getPriviusUsers();
    getAllNotification();
  }, [userData?._id]); // depend on the ID, not the whole object — avoids extra calls

  /* ─── Socket connection ──────────────────────────────────────────────────── */
  useEffect(() => {
    if (!userData) return;

    const socketIo = io(url, {
      query: { userId: userData._id },
      // Reconnection tuning — reduces unnecessary round-trips
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    dispatch(setSockets(socketIo));

    socketIo.on("getOnlineUser", (users) => {
      dispatch(setOnlineUser(users));
    });

    return () => socketIo.close();
  }, [userData?._id, dispatch]); // stable dep — won't reconnect unless the user changes

  /* ─── Real-time notifications ────────────────────────────────────────────── */
  useEffect(() => {
    if (!socket) return;

    // Use the ref so this effect never needs to re-run when notification changes
    const handler = (n) => {
      dispatch(setNotification([...notificationRef.current, n]));
    };

    socket.on("newNotification", handler);
    return () => socket.off("newNotification", handler);
  }, [socket, dispatch]); // ← notification removed from deps — no more listener thrash

  /* ─── Routes ─────────────────────────────────────────────────────────────── */
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/"               element={<Private><Home /></Private>} />
        <Route path="/singup"         element={<Guest><SingUp /></Guest>} />
        <Route path="/singin"         element={<Guest><SingIn /></Guest>} />
        <Route path="/resetpassword"  element={<Guest><ForgotPassword /></Guest>} />
        <Route path="/uplod"          element={<Private><Upload /></Private>} />
        <Route path="/profile/:userName" element={<Private><Profile /></Private>} />
        <Route path="/loop"           element={<Private><Loop /></Private>} />
        <Route path="/story/:userName" element={<Private><Story /></Private>} />
        <Route path="/editprofile"    element={<Private><EditProfile /></Private>} />
        <Route path="/massage"        element={<Private><Massage /></Private>} />
        <Route path="/conv"           element={<Private><Conv /></Private>} />
        <Route path="/search"         element={<Private><Surch /></Private>} />
        <Route path="/notification"   element={<Private><Notification /></Private>} />
        <Route path="/video-call"     element={<Private><VideoCall /></Private>} />
        <Route path="*"               element={<Private><NotFound /></Private>} />
      </Routes>
    </Suspense>
  );
}

export default App;
