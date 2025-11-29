// src/pages/Profile.jsx
import React, { useContext, useState } from "react";
import { useNavigate } from "react-router-dom";
import assets from "../assets/assets";
import { AuthContext } from "../context/AuthContext";

const Profile = () => {
  const { authUser, updateProfile } = useContext(AuthContext);
  const navigate = useNavigate();

  const [selectedImg, setSelectedImg] = useState(null);
  const [name, setName] = useState(authUser.fullName);
  const [bio, setBio] = useState(authUser.bio);

  const submit = async (e) => {
    e.preventDefault();

    if (!selectedImg) {
      await updateProfile({ fullName: name, bio });
      return navigate("/");
    }

    const reader = new FileReader();
    reader.readAsDataURL(selectedImg);

    reader.onload = async () => {
      await updateProfile({
        fullName: name,
        bio,
        profilePic: reader.result,
      });
      navigate("/");
    };
  };

  return (
    <div className="min-h-screen bg-cover bg-center flex items-center justify-center">
      <div className="w-5/6 max-w-4xl backdrop-blur-2xl text-gray-300 border border-gray-600 flex max-sm:flex-col-reverse rounded-lg">
        <form onSubmit={submit} className="flex flex-col gap-5 p-10 flex-1">
          <h3 className="text-lg font-semibold">Profile Details</h3>

          <label className="flex gap-3 cursor-pointer">
            <input
              type="file"
              hidden
              accept="image/*"
              onChange={(e) => setSelectedImg(e.target.files[0])}
            />
            <img
              src={
                selectedImg
                  ? URL.createObjectURL(selectedImg)
                  : authUser.profilePic || assets.avatar_icon
              }
              className="w-16 h-16 rounded-full object-cover"
            />
            Upload profile image
          </label>

          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="p-2 border border-gray-500 rounded-md"
            placeholder="Your name"
          />

          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            required
            rows={4}
            className="p-2 border border-gray-500 rounded-md"
            placeholder="Write bio..."
          />

          <button className="bg-gradient-to-r from-purple-400 to-violet-600 p-2 rounded-full">
            Save
          </button>
        </form>

        <img
          src={authUser.profilePic || assets.avatar_icon}
          className="max-w-44 rounded-full m-10 object-cover"
        />
      </div>
    </div>
  );
};

export default Profile;
