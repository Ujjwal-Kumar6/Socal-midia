import axios from "axios"
import React, { useEffect, useState } from "react"
import { url } from "../App"
import { useNavigate, useParams } from "react-router-dom"
import { useDispatch, useSelector } from "react-redux"
import { setProfileData, setUserData } from "../redux/userSlice"
import { MdOutlineArrowBack } from "react-icons/md"
import { HiOutlineDotsVertical } from "react-icons/hi"
import { ClipLoader } from "react-spinners"
import dp from "../assets/dp.jpg"
import Nav from "../componesnsts/Nav"
import FollowButon from "../componesnsts/FollowButon"
import Post from "../componesnsts/Post"
import LoopCards from "../componesnsts/LoopCards"
import { setSelectedUser } from "../redux/massageSlice"

function Profile() {
  const { userName } = useParams();
  const dispatch = useDispatch();
  const nav = useNavigate();

  const { profileData, userData } = useSelector(state => state.user);
  const { postData } = useSelector(state => state.post);
  const { loopData } = useSelector(state => state.loop);

  const [loading, setLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("posts");
  const [menuOpen, setMenuOpen] = useState(false);
  
  // Loop playback state
  const [currentLoopIndex, setCurrentLoopIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  // LOGOUT
  const logout = async () => {
    setLoading(true)
    try {
      await axios.get(`${url}/api/auth/signout`, { withCredentials: true })
      dispatch(setUserData(null))
      nav("/singin")
    } catch (err) {
      console.log(err)
    } finally {
      setLoading(false)
    }
  };

  const handleClick = async () => {
    // 🚨 Confirmation Alert
    const confirmDelete = window.confirm(
      "Are you sure you want to delete your account permanently?\nThis action cannot be undone!"
    );

    if (!confirmDelete) return;

    setLoading(true);
    try {
      await axios.delete(
        `${url}/api/auth/delete-account/${userData?._id}`,
        { withCredentials: true }
      );

      dispatch(setUserData(null));
      nav("/singin", { replace: true });
    } catch (error) {
      console.error("Delete Account Error:", error);
    } finally {
      setLoading(false);
    }
  };

  // FETCH PROFILE
  const handleProfile = async () => {
    setProfileLoading(true)
    try {
      const res = await axios.get(
        `${url}/api/user/getprofile/${userName}`,
        { withCredentials: true }
      )
      dispatch(setProfileData(res.data))
    } catch (err) {
      console.log(err)
    } finally {
      setProfileLoading(false)
    }
  }

  // MESSAGE
  const hendleMessage = () => {
    dispatch(setSelectedUser(profileData))
    nav("/conv")
  }

  // Toggle loop playback
  const handleTogglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  // Handle loop update (for real-time updates)
  const handleLoopUpdate = (updatedLoop) => {
    // This will be handled by Redux in LoopCards component
  };

  useEffect(() => {
    handleProfile()
  }, [userName])

  useEffect(() => {
    // Reset loop index when switching to loops tab
    if (activeTab === "loops") {
      setCurrentLoopIndex(0);
      setIsPlaying(false);
    }
  }, [activeTab])

  if (profileLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black text-white">
        <ClipLoader size={40} color="#fff" />
      </div>
    )
  }

  const userPosts =
    postData?.filter(p => p.author?._id === profileData?._id) || []

  const savedPostIds = userData?.saved || []
  const savedPosts =
    postData?.filter(p => savedPostIds?.includes(p._id)) || []

  // Filter loops for this user
  const userLoops = Array.isArray(loopData)
    ? loopData.filter(l => l.author?._id === profileData?._id)
    : []

  return (
    <div className="w-full min-h-screen bg-gradient-to-b from-black via-[#0b0b0b] to-[#121212] text-white">

      {/* HEADER */}
      <div className="sticky top-0 z-50 h-[64px] flex items-center justify-between px-4 border-b border-gray-800 bg-black/60 backdrop-blur">
        <MdOutlineArrowBack
          onClick={() => nav("/")}
          className="text-2xl cursor-pointer hover:text-gray-300"
        />

        <h1 className="text-lg font-semibold">
          {profileData?.userName || "Profile"}
        </h1>

        {/* THREE DOT MENU */}
        <div className="relative">
          <HiOutlineDotsVertical
            onClick={() => setMenuOpen(!menuOpen)}
            className="text-2xl cursor-pointer hover:text-gray-300"
          />

          {menuOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-[#111] border border-gray-700 rounded-xl shadow-lg overflow-hidden">

              <button
                onClick={logout}
                disabled={loading}
                className="w-full text-left px-4 py-3 text-sm hover:bg-gray-800 transition"
              >
                {loading ? "Logging out..." : "Logout"}
              </button>

              <button
                onClick={handleClick}
                className="w-full text-left px-4 py-3 text-sm text-red-500 hover:bg-red-500/10 transition"
              >
                Delete Account (Permanent)
              </button>

              <button
                onClick={() => nav("/massage")}
                className="w-full lg:hidden text-left px-4 py-3 text-sm hover:bg-gray-800 transition"
              >
                Message
              </button>
            </div>
          )}
        </div>
      </div>

      {/* PROFILE SECTION */}
      <div className="max-w-5xl mx-auto px-4 mt-10">
        <div className="flex flex-col lg:flex-row items-center lg:items-start justify-center gap-6 lg:gap-12">
          <div className="w-[140px] h-[140px] rounded-full p-[3px] bg-gradient-to-tr from-purple-500 via-blue-500 to-pink-500">
            <img
              src={profileData?.profilePic || dp}
              alt="profile"
              className="w-full h-full rounded-full object-cover bg-black"
            />
          </div>

          <div className="flex flex-col items-center lg:items-start text-center lg:text-left space-y-2">
            <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
              {profileData?.name || "User"}
            </h2>

            <p className="text-gray-400 text-sm italic">
              {profileData?.profacation || "Hey there! I'm on Vybe ✨"}
            </p>

            {profileData?.bio && (
              <p className="text-gray-300 text-sm max-w-md">
                {profileData.bio}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* STATS */}
      <div className="flex justify-center gap-10 mt-8 pb-6 border-b border-gray-800">
        {[
          { label: "Posts", value: userPosts.length },
          { label: "Loops", value: userLoops.length },
          { label: "Followers", value: profileData?.flowers?.length || 0 },
          { label: "Following", value: profileData?.following?.length || 0 },
        ].map((item, i) => (
          <div key={i} className="text-center">
            <div className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
              {item.value}
            </div>
            <div className="text-xs text-gray-400 uppercase">
              {item.label}
            </div>
          </div>
        ))}
      </div>

      {/* BUTTONS */}
      <div className="flex justify-center gap-4 py-6 border-b border-gray-800">
        {profileData?._id === userData?._id ? (
          <button
            onClick={() => nav("/editprofile")}
            className="px-6 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-blue-500 font-semibold hover:scale-105 transition"
          >
            Edit Profile
          </button>
        ) : (
          <>
            <FollowButon
              targatUserId={profileData?._id}
              tailwind="px-6 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-blue-500 font-semibold hover:scale-105 transition"
            />
            <button
              onClick={hendleMessage}
              className="px-6 py-2 rounded-xl bg-white/10 border border-white/20 hover:bg-white/20 transition"
            >
              Message
            </button>
          </>
        )}
      </div>

      {/* TABS */}
      <div className="flex justify-center gap-10 mt-4 pb-3 border-b border-gray-800">
        {["posts", "loops", "saved"].map(tab =>
          tab === "saved" && profileData?._id !== userData?._id ? null : (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`text-sm font-semibold uppercase pb-2 transition ${activeTab === tab
                ? "text-purple-400 border-b-2 border-purple-500"
                : "text-gray-400 hover:text-white"
                }`}
            >
              {tab}
            </button>
          )
        )}
      </div>

      {/* CONTENT BASED ON ACTIVE TAB */}
      <div className="flex justify-center min-h-[70vh]">
        {activeTab === "loops" ? (
          // LOOPS SECTION
          <div className="w-full max-w-[900px] pt-4 pb-24">
            {userLoops.length > 0 ? (
              <div className="flex flex-col items-center gap-4">
                {userLoops.map((loop, index) => (
                  <LoopCards
                    key={loop._id}
                    loop={loop}
                    isActive={index === currentLoopIndex}
                    isPlaying={isPlaying && index === currentLoopIndex}
                    onTogglePlay={handleTogglePlay}
                    onLoopUpdate={handleLoopUpdate}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center text-gray-500 mt-20">
                No loops yet
              </div>
            )}
          </div>
        ) : (
          // POSTS SECTION
          <div className="w-full max-w-[900px] bg-white sm:rounded-t-[30px] pt-4 pb-24">
            {(activeTab === "posts" ? userPosts : savedPosts).length > 0 ? (
              [...(activeTab === "posts" ? userPosts : savedPosts)]
                .reverse()
                .map(post => <Post key={post._id} post={post} />)
            ) : (
              <div className="text-center text-gray-500 mt-20">
                No {activeTab} yet
              </div>
            )}
          </div>
        )}
      </div>

      <div className="w-full flex justify-center">
        <Nav />
      </div>

    </div>
  )
}

export default Profile;
