import type { HairLength } from "@/types";

const hairByLength: Record<HairLength["key"], { bottom: number; path: string; highlight: string }> = {
  short: {
    bottom: 82,
    path: "M42 35 C42 7 98 7 98 35 L96 71 C94 81 85 87 70 88 C55 87 46 81 44 71 Z",
    highlight: "M55 20 C49 36 51 61 57 77",
  },
  medium: {
    bottom: 110,
    path: "M42 35 C42 7 98 7 98 35 L96 99 C92 108 83 113 70 114 C57 113 48 108 44 99 Z",
    highlight: "M55 20 C48 42 50 82 57 101",
  },
  long: {
    bottom: 145,
    path: "M42 35 C42 7 98 7 98 35 L95 134 C91 144 82 149 70 150 C58 149 49 144 45 134 Z",
    highlight: "M55 20 C47 50 50 112 57 137",
  },
  "extra-long": {
    bottom: 171,
    path: "M42 35 C42 7 98 7 98 35 L94 162 C90 171 81 176 70 177 C59 176 50 171 46 162 Z",
    highlight: "M55 20 C47 54 50 137 57 164",
  },
};

export function HairLengthIllustration({ length }: { length: HairLength }) {
  const hair = hairByLength[length.key];

  return (
    <svg
      className="hair-length-illustration"
      viewBox="0 0 140 184"
      role="img"
      aria-label={`Referencia de cabello ${length.label.toLowerCase()}: ${length.description.toLowerCase()}`}
    >
      <path className="hair-person" d="M17 184 C18 137 29 101 50 88 L53 66 H87 L90 88 C111 101 122 137 123 184 Z" />
      <path className="body-reference" d="M31 82 H109 M27 110 H113 M35 145 H105" />
      <circle className="hair-head" cx="70" cy="39" r="25" />
      <path className="hair-shape-svg" d={hair.path} />
      <path className="hair-highlight" d={hair.highlight} />
      <line className="length-guide" x1="101" x2="130" y1={hair.bottom} y2={hair.bottom} />
      <circle className="length-guide-dot" cx="130" cy={hair.bottom} r="2.5" />
    </svg>
  );
}
