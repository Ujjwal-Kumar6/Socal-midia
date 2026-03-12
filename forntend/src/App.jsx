import React, { useEffect, useRef, lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import io from "socket.io-client";

// ─── Eager (always needed) ──────────────────────────────────────────────────
import SingUp         from "./pages/SingUp";
import SingIn         from "./pages/SingIn";
import Home           from "./pages/Home";
import ForgotPassword from "./pages/ForgotPassword";

// ─── Lazy chunks ────────────────────────────────────────────────────────────
const Upload       = lazy(() => import("./pages/Uplod"));
const Profile      = lazy(() => import("./pages/profile"));
const Loop         = lazy(() => import("./pages/Loop"));
const Story        = lazy(() => import("./pages/Story"));
const EditProfile  = lazy(() => import("./pages/EditProfile"));
const Massage      = lazy(() => import("./componesnsts/Massage"));
const Conv         = lazy(() => import("./pages/Conv"));
const Surch        = lazy(() => import("./pages/Surch"));
const Notification = lazy(() => import("./pages/Notification"));
const VideoCall    = lazy(() => import("./pages/VidioCall.jsx"));
const NotFound     = lazy(() => import("./pages/NotFound"));

// ─── Hooks (ALL must be called at top level) ─────────────────────────────────
import useGetCurrentUser  from "./hooks/getCurrentUser";
import useSuggestedUser   from "./hooks/getSugestedUser";
import useAllStory        from "./hooks/getAllStory";
import useMyStory         from "./hooks/getMyStory";
import useAllPost         from "./hooks/getAllPost";
import useAllLoop         from "./hooks/getAllLoop";
import usePreviousUsers   from "./hooks/getPriviusUsers";
import useAllNotification from "./hooks/getAllNotification";

// ─── Redux ───────────────────────────────────────────────────────────────────
import { setOnlineUser, setSockets } from "./redux/socketSlice";
import { setNotification }           from "./redux/userSlice";

export const url = "https://vybe-backend-8yqs.onrender.com";

const PageLoader = () => (
  <div style={{ display:"flex", justifyContent:"center", alignItems:"center", height:"100vh" }}>
    <span style={{ fontSize:24, opacity:0.4 }}>Loading…</span>
  </div>
);

function App() {
  const dispatch = useDispatch();

  const userData     = useSelector((s) => s.user.userData);
  const notification = useSelector((s) => s.user.notification);
  const socket       = useSelector((s) => s.socket.socket);

  // ─── ALL hooks at top level — never inside useEffect ───────────────────
  // NOTE: each of these hooks must guard internally with: if (!userData) return
  useGetCurrentUser();
  useMyStory();
  useSuggestedUser();
  useAllStory();
  useAllPost();
  useAllLoop();
  usePreviousUsers();
  useAllNotification();

  // Stable ref so notification listener never needs to re-register
  const notificationRef = useRef(notification);
  useEffect(() => { notificationRef.current = notification; }, [notification]);

  /* ─── Socket connection ─────────────────────────────────────────────────── */
  useEffect(() => {
    if (!userData) return;

    const socketIo = io(url, {
      query: { userId: userData._id },
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    dispatch(setSockets(socketIo));
    socketIo.on("getOnlineUser", (users) => dispatch(setOnlineUser(users)));

    return () => socketIo.close();
  }, [userData?._id, dispatch]);

  /* ─── Realtime notifications ────────────────────────────────────────────── */
  useEffect(() => {
    if (!socket) return;

    const handler = (n) => dispatch(setNotification([...notificationRef.current, n]));
    socket.on("newNotification", handler);
    return () => socket.off("newNotification", handler);
  }, [socket, dispatch]);

  /* ─── Auth helpers ──────────────────────────────────────────────────────── */
  const auth  = (page) => userData ? page : <Navigate to="/singin" replace />;
  const guest = (page) => !userData ? page : <Navigate to="/" replace />;

  /* ─── Routes ────────────────────────────────────────────────────────────── */
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/"                  element={auth(<Home />)} />
        <Route path="/singup"            element={guest(<SingUp />)} />
        <Route path="/singin"            element={guest(<SingIn />)} />
        <Route path="/resetpassword"     element={guest(<ForgotPassword />)} />
        <Route path="/uplod"             element={auth(<Upload />)} />
        <Route path="/profile/:userName" element={auth(<Profile />)} />
        <Route path="/loop"              element={auth(<Loop />)} />
        <Route path="/story/:userName"   element={auth(<Story />)} />
        <Route path="/editprofile"       element={auth(<EditProfile />)} />
        <Route path="/massage"           element={auth(<Massage />)} />
        <Route path="/conv"              element={auth(<Conv />)} />
        <Route path="/search"            element={auth(<Surch />)} />
        <Route path="/notification"      element={auth(<Notification />)} />
        <Route path="/video-call"        element={auth(<VideoCall />)} />
        <Route path="*"                  element={auth(<NotFound />)} />
      </Routes>
    </Suspense>
  );
}

export default App;
