// controllers/usercontroller.js
import bcrypt from "bcrypt";
import User from "../models/user.js";
import cloudinary from "../lib/cloudinary.js";
import { generateToken } from "../lib/utils.js";

// SIGNUP
export const signup = async (req, res) => {
  try {
    const { fullName, email, password, bio, username } = req.body;

    if (!fullName || !email || !password || !bio || !username) {
      return res.json({ success: false, message: "Missing details" });
    }

    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return res.json({ success: false, message: "Email already registered" });
    }

    const existingUsername = await User.findOne({
      username: username.toLowerCase(),
    });
    if (existingUsername) {
      return res.json({ success: false, message: "Username taken" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = await User.create({
      fullName,
      email: email.toLowerCase(),
      password: hashedPassword,
      bio,
      username: username.toLowerCase(),
    });

    const token = generateToken(newUser._id);

    res.json({
      success: true,
      userData: newUser,
      token,
      message: "Account created successfully",
    });
  } catch (error) {
    console.error("Signup error:", error.message);
    res.json({ success: false, message: error.message });
  }
};

// LOGIN
export const login = async (req, res) => {
  try {
    const { email, password, username } = req.body;

    let userData = null;

    if (email) {
      userData = await User.findOne({ email: email.toLowerCase() });
    } else if (username) {
      userData = await User.findOne({ username: username.toLowerCase() });
    }

    if (!userData) {
      return res.json({ success: false, message: "User not found" });
    }

    const isPasswordCorrect = await bcrypt.compare(
      password,
      userData.password
    );
    if (!isPasswordCorrect) {
      return res.json({ success: false, message: "Invalid credentials" });
    }

    const token = generateToken(userData._id);

    res.json({
      success: true,
      userData,
      token,
      message: "Login successfully",
    });
  } catch (error) {
    console.error("Login error:", error.message);
    res.json({ success: false, message: error.message });
  }
};

// CHECK AUTH
export const checkAuth = (req, res) => {
  res.json({ success: true, user: req.user });
};

// UPDATE PROFILE
export const updateProfile = async (req, res) => {
  try {
    const { profilePic, bio, fullName } = req.body;
    const userId = req.user._id;
    let updatedUser;

    if (!profilePic) {
      updatedUser = await User.findByIdAndUpdate(
        userId,
        { bio, fullName },
        { new: true }
      );
    } else {
      const upload = await cloudinary.uploader.upload(profilePic);
      updatedUser = await User.findByIdAndUpdate(
        userId,
        { profilePic: upload.secure_url, bio, fullName },
        { new: true }
      );
    }

    res.json({ success: true, user: updatedUser });
  } catch (error) {
    console.error("updateProfile error:", error.message);
    res.json({ success: false, message: error.message });
  }
};
