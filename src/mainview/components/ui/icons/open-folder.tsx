import { motion, useAnimation } from "motion/react";
import type { HTMLAttributes } from "react";
import { forwardRef, useCallback, useImperativeHandle, useRef } from "react";
import { cn } from "@/lib/utils";

export interface OpenFolderIconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

interface OpenFolderIconProps extends HTMLAttributes<HTMLDivElement> {
  size?: number;
}

const OpenFolderIcon = forwardRef<OpenFolderIconHandle, OpenFolderIconProps>(
  ({ onMouseEnter, onMouseLeave, className, size = 28, ...props }, ref) => {
    const folderControls = useAnimation();
    const isControlledRef = useRef(false);

    useImperativeHandle(ref, () => {
      isControlledRef.current = true;
      return {
        startAnimation: async () => {
          await folderControls.start("animate");
        },
        stopAnimation: async () => {
          await folderControls.start("normal");
        },
      };
    });

    const handleMouseEnter = useCallback(
      async (e: React.MouseEvent<HTMLDivElement>) => {
        if (isControlledRef.current) {
          onMouseEnter?.(e);
        } else {
          await folderControls.start("animate");
        }
      },
      [folderControls, onMouseEnter],
    );

    const handleMouseLeave = useCallback(
      async (e: React.MouseEvent<HTMLDivElement>) => {
        if (isControlledRef.current) {
          onMouseLeave?.(e);
        } else {
          await folderControls.start("normal");
        }
      },
      [folderControls, onMouseLeave],
    );
    return (
      <div
        className={cn(className)}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        {...props}
      >
        <svg
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          width={size}
          height={size}
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
        >
          <path d="M19.283 19.585A2 2 0 0 0 20 18.5V8a2 2 0 0 0-2-2h-5.93a2 2 0 0 1-1.67-.9l-.81-1.2A2 2 0 0 0 7.9 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h14.05a2 2 0 0 0 1.233-.415" />
          <motion.path
            animate={folderControls}
            initial="normal"
            variants={{
              animate: {
                opacity: 1,
                y: 0,
                x: 0,
              },
              normal: {
                opacity: 0,
                y: -4,
                x: -4,
              },
            }}
            d="m7.003 14 1.219-2.9c.132-.324.334-.597.583-.791s.536-.3.83-.309h8.74c.25 0 .494.069.717.203s.418.33.57.57c.152.242.258.523.308.823"
          />
        </svg>
      </div>
    );
  },
);

OpenFolderIcon.displayName = "OpenFolder";

export { OpenFolderIcon };
