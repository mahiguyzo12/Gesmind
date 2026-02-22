
import React from 'react';

interface GesmindLogoProps {
  className?: string;
  withText?: boolean;
}

export const GesmindLogo: React.FC<GesmindLogoProps> = ({ className = "w-32 h-32", withText = true }) => {
  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <svg viewBox="0 0 500 500" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-xl">
        <defs>
          <linearGradient id="gradCyan" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style={{ stopColor: '#2dd4bf', stopOpacity: 1 }} />
            <stop offset="100%" style={{ stopColor: '#0ea5e9', stopOpacity: 1 }} />
          </linearGradient>
          <linearGradient id="gradBlue" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style={{ stopColor: '#1e3a8a', stopOpacity: 1 }} />
            <stop offset="100%" style={{ stopColor: '#3b82f6', stopOpacity: 1 }} />
          </linearGradient>
          <linearGradient id="gradGreen" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style={{ stopColor: '#4ade80', stopOpacity: 1 }} />
            <stop offset="100%" style={{ stopColor: '#16a34a', stopOpacity: 1 }} />
          </linearGradient>
        </defs>

        {/* --- MAIN TRIANGLE STRUCTURE (Rounded Loop) --- */}
        
        {/* Top Segment (Cyan) */}
        <path 
          d="M 250 50 C 280 50, 350 150, 400 220 L 330 260 C 290 200, 250 130, 250 130 C 250 130, 210 200, 170 260 L 100 220 C 150 150, 220 50, 250 50 Z" 
          fill="url(#gradCyan)" 
        />
        
        {/* Right Segment (Green) */}
        <path 
          d="M 400 220 C 430 270, 450 350, 420 400 C 390 450, 300 450, 250 450 L 250 370 C 290 370, 340 370, 360 340 C 380 310, 330 260, 330 260 Z" 
          fill="url(#gradGreen)" 
        />

        {/* Left Segment (Blue) */}
        <path 
          d="M 100 220 C 70 270, 50 350, 80 400 C 110 450, 200 450, 250 450 L 250 370 C 210 370, 160 370, 140 340 C 120 310, 170 260, 170 260 Z" 
          fill="url(#gradBlue)" 
        />

        {/* --- ICONS INSIDE SEGMENTS --- */}

        {/* Top Icon: Barcode (White) */}
        <g transform="translate(190, 100) scale(0.8)" fill="white" opacity="0.9">
           <rect x="10" y="10" width="5" height="40" />
           <rect x="20" y="10" width="2" height="40" />
           <rect x="25" y="10" width="8" height="40" />
           <rect x="38" y="10" width="3" height="40" />
           <rect x="45" y="10" width="6" height="40" />
           <rect x="55" y="10" width="4" height="40" />
           <rect x="65" y="10" width="10" height="40" />
           <text x="40" y="65" fontSize="10" textAnchor="middle" fontWeight="bold">||||||</text>
        </g>

        {/* Right Icon: Gear (White) */}
        <g transform="translate(350, 300) scale(0.6)" fill="white" opacity="0.9">
           <path d="M40 0 L50 0 L55 15 A25 25 0 0 1 65 20 L80 15 L85 25 L75 35 A25 25 0 0 1 75 45 L85 55 L80 65 L65 60 A25 25 0 0 1 55 65 L50 80 L40 80 L35 65 A25 25 0 0 1 25 60 L10 65 L5 55 L15 45 A25 25 0 0 1 15 35 L5 25 L10 15 L25 20 A25 25 0 0 1 35 15 L40 0 Z M 45 30 A 15 15 0 1 0 45 60 A 15 15 0 1 0 45 30 Z" />
        </g>

        {/* Left Icon: Card Payment / Handshake (White) */}
        <g transform="translate(90, 300) scale(0.6)" fill="white" opacity="0.9">
           {/* Stylized Handshake */}
           <path d="M10 40 L30 60 L60 30 L50 20 L30 40 L20 30 Z" />
           <path d="M40 70 L60 50 L80 70" stroke="white" strokeWidth="5" fill="none" />
        </g>

        {/* --- CENTER ICON: SHOPPING CART --- */}
        <g transform="translate(210, 230) scale(1.5)">
           {/* Cart Body */}
           <path d="M10 10 L20 10 L30 40 L55 40 L60 20 L25 20" stroke="#0f172a" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
           {/* Euro Symbol inside */}
           <text x="40" y="35" fontSize="20" fontWeight="bold" fill="#0ea5e9" textAnchor="middle">€</text>
           {/* Wheels */}
           <circle cx="30" cy="45" r="3" fill="#0f172a" />
           <circle cx="55" cy="45" r="3" fill="#0f172a" />
        </g>

      </svg>
      
      {withText && (
        <div className="text-center -mt-4">
          <h1 className="font-sans text-3xl font-extrabold text-slate-800 tracking-tight">
            Gesmind
          </h1>
          <p className="font-sans text-xs text-slate-500 font-medium tracking-widest uppercase mt-1">
            Smart Business Hub
          </p>
        </div>
      )}
    </div>
  );
};
