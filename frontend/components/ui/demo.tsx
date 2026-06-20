import React from "react";

export const Component = ({ children }: { children?: React.ReactNode }) => {
  return (
    <div className="min-h-screen w-full bg-white relative overflow-hidden flex flex-col"> 
      {/* Light Sky Blue Glow */}
      <div 
        className="absolute inset-0 z-0 pointer-events-none" 
        style={{
          backgroundImage: `
            radial-gradient(circle at center, #93c5fd, transparent)
          `,
        }} 
      />
      <div className="relative z-10 flex flex-col flex-1">
        {children}
      </div>
    </div>
  );
};

export default Component;
