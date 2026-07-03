import type { SVGProps } from "react";

type SportsIconProps = SVGProps<SVGSVGElement>;

const strokeProps = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const
};

export function FootballIcon(props: SportsIconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...strokeProps} {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="m12 7 4.2 3.1-1.6 4.9H9.4l-1.6-4.9L12 7Z" />
      <path d="m12 7 .2-3.8" />
      <path d="m16.2 10.1 3.6-1.1" />
      <path d="m14.6 15 2.2 3" />
      <path d="m9.4 15-2.2 3" />
      <path d="M7.8 10.1 4.2 9" />
    </svg>
  );
}
