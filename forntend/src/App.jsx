import React from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import SingUp from './pages/SingUp'
import SingIn from './pages/SingIn'
import Home from './pages/Home';
import ForgotPassword from './pages/ForgotPassword';
import useGetCurrentUser from './hooks/getCurrentUser';
import { useDispatch, useSelector } from 'react-redux';
import getSuggestedUser from './hooks/getSugestedUser';
import getAllStory from './hooks/getAllStory';
import Upload from './pages/Uplod';
import useMyStory from './hooks/getMyStory';
import getAllPost from './hooks/getAllPost';
import Profile from './pages/profile';
import Loop from './pages/Loop';
import getAllLoop from './hooks/getAllLoop';
import Story from './pages/Story';
import EditProfile from './pages/EditProfile';
import Massage from './componesnsts/Massage';
import Conv from './pages/Conv';
import io from "socket.io-client";
import { useEffect } from 'react';
import { setOnlineUser, setSockets } from './redux/socketSlice';
import getPriviusUsers from './hooks/getPriviusUsers';
import Surch from './pages/Surch';
import NotFound from './pages/NotFound';
import getAllNotification from './hooks/getAllNotification';
import Notification from './pages/Notification';
import { setNotification } from './redux/userSlice';
import VideoCall from './pages/VidioCall.jsx';

export const url = "https://vybe-backend-8yqs.onrender.com";
function App() {
  useGetCurrentUser();
  getSuggestedUser();
  useMyStory();
  getAllStory();
  getAllPost();
  getAllLoop();
  getPriviusUsers();
  getAllNotification();
  
  const { userData } = useSelector(state => state.user);
  const { notification } = useSelector(state => state.user);
  const dispatch = useDispatch();
  const { socket } = useSelector(state => state.socket);
  useEffect(() => {
    if (userData) {
      const socketIo = io(url, {
        query: {
          userId: userData._id
        }
      });
      dispatch(setSockets(socketIo));

      socketIo.on('getOnlineUser',(users)=>{
        dispatch(setOnlineUser(users));
      });


      return () => socketIo.close();
    }
    else{
      if(socket){
        socket.close();
        dispatch(setSockets(null));
      }
    }
  }, [userData]);

  useEffect(() => {
    if(!socket) return;

    socket.on("newNotification",(n)=>{
      dispatch(setNotification([...notification,n]));
    });

    return () => socket.off("newNotification");
  }, [socket, dispatch]);


  return (
    <Routes>
      <Route path='/' element={userData ? <Home/>:<Navigate to="/singin" replace />}/>
      <Route path='/singup' element={!userData ? <SingUp/>:<Navigate to="/" replace/>}/>
      <Route path="/singin" element={!userData ? <SingIn/>:<Navigate to="/" replace/>}/>
      <Route path="/resetpassword" element={!userData ? <ForgotPassword/>:<Navigate to="/" replace/>}/>
      <Route path='/uplod' element={userData ? <Upload/> : <Navigate to="/singin" replace />}/>
      <Route path="/profile/:userName"element={userData ? <Profile /> :<Navigate to="/singin" replace />}/>
      <Route path="/loop" element={userData ? <Loop /> : <Navigate to="/singin" replace />}/>
      <Route path="/story/:userName" element={userData ? <Story/> : <Navigate to="/singin" replace />}/> 
      <Route path="/editprofile" element={userData ? <EditProfile /> : <Navigate to="/singin" replace />}/>
      <Route path="/massage" element={userData ? <Massage /> : <Navigate to="/singin" replace />}/>
      <Route path='/conv' element={userData ? <Conv /> : <Navigate to="/singin" replace />}/>
      <Route path="/search" element={userData ? <Surch /> : <Navigate to="/singin" replace />}/>
      <Route path="/notification" element={userData ? <Notification /> : <Navigate to="/singin" replace />}/>
      <Route path="/video-call" element={userData ? <VideoCall /> : <Navigate to="/singin" replace />}/>
      <Route path="*" element={userData ? <NotFound /> : <Navigate to="/singin" replace />}/>
    </Routes>
  )
}

export default App;
