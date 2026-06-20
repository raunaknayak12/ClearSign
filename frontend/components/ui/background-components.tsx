import React from "react";

export const Component = () => {
  return (
    <div className="min-h-screen w-full relative bg-white">
      {/* Soft Yellow Glow */}
      <div
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: `
            radial-gradient(circle at center, #FFF991 0%, transparent 70%)
          `,
          opacity: 0.6,
          mixBlendMode: "multiply",
        }}
      />
      {/* Your Content/Components */}
    </div>
  );
};
