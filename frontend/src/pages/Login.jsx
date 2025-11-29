// src/pages/Login.jsx
import React, { useState, useContext } from "react";
import assets from "../assets/assets";
import { AuthContext } from "../context/AuthContext";

const Login = () => {
  const [currState, setCurrState] = useState("Sign up");
  const [fullName, setFullName] = useState("");
    const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [bio, setBio] = useState("");
  const [isDataSubmitted, setIsDataSubmitted] = useState(false);

  const { login } = useContext(AuthContext);

  const onSubmit = (e) => {
    e.preventDefault();

    if (currState === "Sign up" && !isDataSubmitted) {
      setIsDataSubmitted(true);
      return;
    }

    if (currState === "Sign up") {
      const payload = { fullName, username, email, password, bio };
      login("signup", payload);
    } else {
      const payload = { email, password };
      login("login", payload);
    }
  };

  return (
    <div className="min-h-screen bg-cover bg-center flex items-center justify-center gap-8 sm:justify-evenly max-sm:flex-col backdrop-blur-2xl">
      <img src={assets.logo} className="w-[min(30vw,250px)]" />

      <form
        onSubmit={onSubmit}
        className="border-2 bg-white/8 text-white border-gray-500 p-6 flex flex-col gap-6 rounded-lg shadow-lg"
      >
        <h2 className="font-medium text-2xl flex justify-between">
          {currState}
          {isDataSubmitted && (
            <img
              onClick={() => setIsDataSubmitted(false)}
              src={assets.arrow_icon}
              className="w-5 cursor-pointer"
            />
          )}
        </h2>

        {currState === "Sign up" && !isDataSubmitted && (
 <>
            <input
              onChange={(e) => setFullName(e.target.value)}
              value={fullName}
              type="text"
              className="p-2 border border-gray-500 rounded-md focus:outline-none"
              placeholder="Full Name"
              required
            />

            <input
              onChange={(e) => setUsername(e.target.value)}
              value={username}
              type="text"
              className="p-2 border border-gray-500 rounded-md focus:outline-none"
              placeholder="Username (unique)"
              required
            />
          </>
        )}


        {!isDataSubmitted && (
          <>
            <input
              type="email"
              placeholder="Email Address"
              required
              className="p-2 border border-gray-500 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <input
              type="password"
              placeholder="Password"
              required
              className="p-2 border border-gray-500 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </>
        )}

        {currState === "Sign up" && isDataSubmitted && (
          <textarea
            placeholder="Write bio"
            rows={4}
            required
            className="p-2 border border-gray-500 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
          />
        )}

        <button className="py-3 bg-gradient-to-r from-purple-400 to-violet-600 rounded-md">
          {currState === "Sign up" ? "Create Account" : "Login Now"}
        </button>

        <p className="text-sm text-gray-500">
          By continuing, you agree to terms & privacy policy.
        </p>

        <p className="text-sm text-gray-600">
          {currState === "Sign up" ? (
            <>
              Already have an account?{" "}
              <span
                className="text-violet-500 cursor-pointer"
                onClick={() => {
                  setCurrState("Login");
                  setIsDataSubmitted(false);
                }}
              >
                Login here
              </span>
            </>
          ) : (
            <>
              Create an account{" "}
              <span
                className="text-violet-500 cursor-pointer"
                onClick={() => setCurrState("Sign up")}
              >
                Click here
              </span>
            </>
          )}
        </p>
      </form>
    </div>
  );
};

export default Login;
