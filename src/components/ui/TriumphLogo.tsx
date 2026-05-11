import React from 'react';
import { cn } from '../../lib/utils';

export const TriumphLogo = ({ showText = true, className = "", light = false, size = "auto" }: { showText?: boolean, className?: string, light?: boolean, size?: string }) => {
  const primary = light ? "#ffffff" : "#1a237e";
  
  const height = size === "auto" ? (showText ? "100%" : "100%") : size;

  return (
    <div className={cn("flex items-center justify-center select-none", className)} style={{ height }}>
      <svg 
        viewBox={showText ? "0 0 400 380" : "0 0 400 240"} 
        className="h-full w-auto max-w-full" 
        preserveAspectRatio="xMidYMid meet"
        style={{ color: primary }}
      >
         {/* Flame Base */}
         <path d="M 200 30 C 230 70 230 100 200 100 C 170 100 170 70 200 30 Z" fill="currentColor" />
         <path d="M 200 55 C 215 75 215 90 200 90 C 185 90 185 75 200 55 Z" fill={light ? "#1a237e" : "white"} />

         {/* The "T" Shape */}
         <path d="M 130 115 C 160 110, 240 110, 270 115 C 265 130, 260 180, 255 180 C 225 180, 220 145, 220 140 L 220 220 L 180 220 L 180 140 C 180 145, 175 180, 145 180 C 140 180, 135 130, 130 115 Z" fill="currentColor" />

         {/* Wreath Stems */}
         <g fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round">
            <path d="M 100,210 C 60,190 30,120 70,60" />
            <path d="M 300,210 C 340,190 370,120 330,60" />
         </g>

         {/* Wreath Leaves */}
         <g fill="currentColor">
            {/* Left outer */}
            <path d="M 90 200 Q 75 180 60 190 Q 80 215 90 200" />
            <path d="M 82 170 Q 55 155 45 170 Q 65 190 82 170" />
            <path d="M 70 140 Q 40 120 35 140 Q 55 160 70 140" />
            <path d="M 68 110 Q 30 90 35 105 Q 55 125 68 110" />
            <path d="M 72 80 Q 40 60 45 70 Q 60 90 72 80" />
            {/* Left inner */}
            <path d="M 90 190 Q 110 180 100 160 Q 85 170 90 190" />
            <path d="M 82 160 Q 100 150 90 130 Q 75 140 82 160" />
            <path d="M 75 130 Q 95 120 85 100 Q 70 110 75 130" />
            <path d="M 72 100 Q 90 90 80 70 Q 65 80 72 100" />
            <path d="M 75 70 Q 90 60 85 45 Q 65 55 75 70" />

            {/* Right outer */}
            <path d="M 310 200 Q 325 180 340 190 Q 320 215 310 200" />
            <path d="M 318 170 Q 345 155 355 170 Q 335 190 318 170" />
            <path d="M 330 140 Q 360 120 365 140 Q 345 160 330 140" />
            <path d="M 332 110 Q 370 90 365 105 Q 345 125 332 110" />
            <path d="M 328 80 Q 360 60 355 70 Q 340 90 328 80" />
            {/* Right inner */}
            <path d="M 310 190 Q 290 180 300 160 Q 315 170 310 190" />
            <path d="M 318 160 Q 300 150 310 130 Q 325 140 318 160" />
            <path d="M 325 130 Q 305 120 315 100 Q 330 110 325 130" />
            <path d="M 328 100 Q 310 90 320 70 Q 335 80 328 100" />
            <path d="M 325 70 Q 310 60 315 45 Q 335 55 325 70" />
         </g>

         {showText && (
           <g>
             <text x="200" y="270" fontFamily="Georgia, Times New Roman, serif" fontSize="44" fontWeight="bold" textAnchor="middle" letterSpacing="12" fill="currentColor">TRIUMPH</text>
             <text x="200" y="305" fontFamily="Courier New, monospace" fontSize="20" fontWeight="bold" textAnchor="middle" letterSpacing="2" fill="currentColor">YEARBOOK PUBLISHING</text>

             <path d="M 60 330 L 180 330 M 220 330 L 340 330" stroke="currentColor" strokeWidth="2" />
             <path d="M 60 336 L 180 336 M 220 336 L 340 336" stroke="currentColor" strokeWidth="1" />
             <rect x="194" y="324" width="12" height="12" transform="rotate(45 200 330)" fill="currentColor" />

             <text x="200" y="375" fontFamily="Courier New, monospace" fontSize="18" fontWeight="bold" textAnchor="middle" fill="currentColor">est. 1954</text>
           </g>
         )}
      </svg>
    </div>
  );
};
