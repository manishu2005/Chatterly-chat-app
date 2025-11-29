import React from "react";
import assets from "../assets/assets";

const SafeImage = ({
  src,
  alt = "",
  className = "",
  fallback = assets.avatar_icon,
  ...props
}) => {
  const validSrc = src && src.trim() !== "" ? src : fallback;

  return (
    <img
      src={validSrc}
      alt={alt}
      className={className}
      onError={(e) => {
        if (e.target.src !== fallback) {
          e.target.src = fallback;
        }
      }}
      {...props}
    />
  );
};

export default SafeImage;
