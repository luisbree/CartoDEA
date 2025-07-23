
import type { SVGProps } from 'react';

export function StreetViewIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      stroke="currentColor"
      strokeWidth="0.5"
      {...props}
    >
      <circle cx="12" cy="4" r="2.5" />
      <path d="M14 22V15h-4v7h-2V13a4 4 0 0 1 4-4 4 4 0 0 1 4 4v9h-2Z" />
    </svg>
  );
}
