// src/pages/Homepage.jsx
import React from "react";
import Sidebar from "../components/Sidebar";
import Chatcontainer from "../components/Chatcontainer";

const Homepage = () => {
  return (
    <div className="w-full h-screen sm:px-[5%] sm:py-[3%]">
      <div
        className={`h-full w-full backdrop-blur-2xl bg-white/5 border border-white/20 shadow-xl 
        rounded-2xl overflow-hidden transition-all duration-300
        grid grid-cols-1 md:grid-cols-[300px_1fr]`}
      >
        <Sidebar />
        <Chatcontainer />
      </div>
    </div>
  );
};

export default Homepage;
