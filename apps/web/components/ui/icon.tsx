import type { SVGProps } from "react";

const paths = {
  ai: "M12 3l1.8 4.2L18 9l-4.2 1.8L12 15l-1.8-4.2L6 9l4.2-1.8L12 3Zm6 11 .9 2.1L21 17l-2.1.9L18 20l-.9-2.1L15 17l2.1-.9L18 14Z",
  arrow: "m9 18 6-6-6-6",
  chevron: "m9 18 6-6-6-6",
  download: "M12 3v12m0 0 5-5m-5 5-5-5M5 21h14",
  elements: "M4 4h6v6H4V4Zm10 0h6v6h-6V4ZM4 14h6v6H4v-6Zm10 0h6v6h-6v-6Z",
  file: "M6 3h8l4 4v14H6V3Zm8 0v5h5",
  folder: "M3 6h6l2 2h10v11H3V6Z",
  grid: "M4 4h6v6H4V4Zm10 0h6v6h-6V4ZM4 14h6v6H4v-6Zm10 0h6v6h-6v-6Z",
  home: "m3 11 9-8 9 8v10h-6v-6H9v6H3V11Z",
  image: "M4 5h16v14H4V5Zm0 10 4-4 4 4 2-2 6 6M15 9h.01",
  layers: "m12 3 9 5-9 5-9-5 9-5Zm-9 10 9 5 9-5m-18 5 9 5 9-5",
  menu: "M4 7h16M4 12h16M4 17h16",
  plus: "M12 5v14M5 12h14",
  redo: "M20 7v6h-6M4 17a8 8 0 0 1 14-5l2 1",
  search: "m21 21-4.4-4.4m2.4-5.1a7.5 7.5 0 1 1-15 0 7.5 7.5 0 0 1 15 0Z",
  settings:
    "M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm0-12v2m0 13v2m8.5-8.5h-2m-13 0h-2m14.5-6-1.5 1.5m-9 9L6 18m12 0-1.5-1.5m-9-9L6 6",
  text: "M5 5h14M12 5v14m-4 0h8",
  undo: "M4 7v6h6m10 4a8 8 0 0 0-14-5l-2 1",
  upload: "M12 21V9m0 0-5 5m5-5 5 5M5 3h14",
  user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-8 9a8 8 0 0 1 16 0",
};

export type IconName = keyof typeof paths;

export function Icon({
  name,
  ...props
}: { name: IconName } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d={paths[name]} />
    </svg>
  );
}
