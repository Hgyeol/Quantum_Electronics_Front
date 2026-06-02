"use client";

import Image from "next/image";
import { useState } from "react";

const AVATAR_PALETTE = [
  "#3182F6", "#F04452", "#1B64DA", "#F5A623", "#9B59B6",
  "#0DB3A8", "#FF6B35", "#27AE60", "#C0392B", "#8E44AD",
];

function avatarColor(code: string) {
  let h = 0;
  for (const c of code) h = (h * 31 + c.charCodeAt(0)) & 0xffff;
  return AVATAR_PALETTE[h % AVATAR_PALETTE.length];
}

interface Props {
  code: string;
  name: string | null;
  size?: number;
  rounded?: "full" | "xl" | "lg";
  className?: string;
}

export default function StockLogo({ code, name, size = 40, rounded = "xl", className = "" }: Props) {
  const [imgError, setImgError] = useState(false);
  const bg = avatarColor(code);
  const rClass = rounded === "full" ? "rounded-full" : rounded === "xl" ? "rounded-xl" : "rounded-lg";

  if (!imgError) {
    return (
      <span
        className={`inline-flex items-center justify-center shrink-0 overflow-hidden bg-white ${rClass} ${className}`}
        style={{ width: size, height: size }}
      >
        <Image
          src={`/stocks/${code}.png`}
          alt={name ?? code}
          width={size}
          height={size}
          className="object-contain w-full h-full"
          onError={() => setImgError(true)}
          unoptimized
        />
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center justify-center shrink-0 text-white font-bold select-none ${rClass} ${className}`}
      style={{ width: size, height: size, backgroundColor: bg, fontSize: Math.round(size * 0.38) }}
    >
      {(name ?? code).charAt(0)}
    </span>
  );
}
