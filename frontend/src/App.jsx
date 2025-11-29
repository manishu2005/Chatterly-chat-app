// src/App.jsx
import React, { useContext } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Homepage from "./pages/Homepage";
import Login from "./pages/Login";
import Profile from "./pages/Profile";
import CallScreen from "./pages/CallScreen";
import CallListener from "./components/CallListener";
import AddedMe from "./pages/AddedMe";
import Contacts from "./pages/Contacts";
import { Toaster } from "react-hot-toast";
import { AuthContext } from "./context/AuthContext";

const App = () => {
  const { authUser } = useContext(AuthContext);

  return (
    <div className='min-h-screen bg-[url("./src/assets/bgimage.png")] bg-cover bg-center bg-no-repeat'>
      <Toaster />

      {authUser && <CallListener />}

      <Routes>
        <Route path="/" element={authUser ? <Homepage /> : <Navigate to="/login" />} />
        <Route path="/login" element={!authUser ? <Login /> : <Navigate to="/" />} />
        <Route path="/profile" element={authUser ? <Profile /> : <Navigate to="/login" />} />
        <Route path="/call/:roomId" element={authUser ? <CallScreen /> : <Navigate to="/login" />} />
        <Route path="/added-me" element={authUser ? <AddedMe /> : <Navigate to="/login" />} />
        <Route path="/contacts" element={authUser ? <Contacts /> : <Navigate to="/login" />} />
      </Routes>
    </div>
  );
};

export default App;
