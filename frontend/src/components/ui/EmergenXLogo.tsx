import React from 'react';

interface EmergenXLogoProps {
  size?: number;
  className?: string;
}

export const EmergenXLogo: React.FC<EmergenXLogoProps> = ({
  size = 40,
  className = '',
}) => {
  return (
    <div
      className={`relative flex items-center justify-center flex-shrink-0 group ${className}`}
      style={{ width: size, height: size }}
      title="EmergenX Autonomous Emergency Intelligence"
    >
      {/* Ambient Glow Aura */}
      <div className="absolute inset-0 rounded-xl bg-[#2dd48f]/20 blur-md group-hover:bg-[#2dd48f]/35 group-hover:scale-110 transition-all duration-300 pointer-events-none" />

      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 512 512"
        width={size}
        height={size}
        className="relative z-10 w-full h-full drop-shadow-[0_0_10px_rgba(45,212,143,0.4)] transition-transform duration-300 group-hover:scale-105"
      >
        <defs>
          <linearGradient id="emergenx-green" x1="120" y1="90" x2="390" y2="410" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#2dd48f" />
            <stop offset="1" stopColor="#18b979" />
          </linearGradient>
          <filter id="emergenx-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* rear motion bars */}
        <g fill="none" stroke="#2dd48f" strokeLinecap="round">
          <path d="M72 185 H126" strokeWidth="12" opacity=".22">
            <animate attributeName="x1" values="72;48;72" dur="1.1s" repeatCount="indefinite" />
            <animate attributeName="x2" values="126;102;126" dur="1.1s" repeatCount="indefinite" />
            <animate attributeName="opacity" values=".12;.5;.12" dur="1.1s" repeatCount="indefinite" />
          </path>
          <path d="M82 218 H132" strokeWidth="7" opacity=".18">
            <animate attributeName="x1" values="82;55;82" dur=".9s" repeatCount="indefinite" />
            <animate attributeName="x2" values="132;105;132" dur=".9s" repeatCount="indefinite" />
          </path>
        </g>

        {/* single continuous E */}
        <path
          d="M128 120
             C128 103 141 92 158 92
             H300
             L329 121
             H163
             V174
             H277
             L299 197
             L277 220
             H163
             V273
             H329
             L300 302
             H158
             C141 302 128 291 128 274 Z"
          fill="url(#emergenx-green)"
        />

        {/* X formed by two clean forward strokes */}
        <path
          d="M276 120 L335 179 L394 120 H431 L353 197 L431 274 H394 L335 215 L276 274 H239 L317 197 L239 120 Z"
          fill="url(#emergenx-green)"
        />

        {/* central emergency pulse cutout */}
        <path
          d="M166 197
             H199
             L210 197
             L222 181
             L235 215
             L250 164
             L266 207
             L278 197"
          fill="none"
          stroke="#ffffff"
          strokeWidth="8"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="150"
          strokeDashoffset="150"
        >
          <animate
            attributeName="stroke-dashoffset"
            values="150;0;-150"
            dur="1.8s"
            repeatCount="indefinite"
          />
        </path>

        {/* One controlled highlight following the X edge */}
        <path
          d="M276 120 L335 179 L394 120"
          fill="none"
          stroke="#ffffff"
          strokeWidth="3"
          strokeLinecap="round"
          opacity=".0"
        >
          <animate attributeName="opacity" values="0;.75;0" dur="2.4s" repeatCount="indefinite" />
        </path>

        {/* tiny live pulse at the point where E and X meet */}
        <circle cx="335" cy="197" r="5" fill="#ffffff" filter="url(#emergenx-glow)">
          <animate attributeName="r" values="4;8;4" dur="1.2s" repeatCount="indefinite" />
          <animate attributeName="opacity" values=".9;.25;.9" dur="1.2s" repeatCount="indefinite" />
        </circle>

        {/* forward arrow built into the geometry */}
        <path
          d="M402 326 H444 L430 312 M444 326 L430 340"
          fill="none"
          stroke="#2dd48f"
          strokeWidth="7"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="80"
          strokeDashoffset="80"
        >
          <animate
            attributeName="stroke-dashoffset"
            values="80;0;80"
            dur="1.5s"
            repeatCount="indefinite"
          />
        </path>
      </svg>
    </div>
  );
};
