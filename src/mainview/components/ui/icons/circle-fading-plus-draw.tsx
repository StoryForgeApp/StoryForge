"use client";

import { motion, useAnimation } from "motion/react";
import type { HTMLAttributes } from "react";
import { forwardRef, useCallback, useImperativeHandle, useRef } from "react";
import { cn } from "@/lib/utils";

export interface CircleFadingPlusDrawHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

interface CircleFadingPlusDrawProps extends HTMLAttributes<HTMLDivElement> {
  size?: number;
}

const CircleFadingPlusDrawIcon = forwardRef<CircleFadingPlusDrawHandle, CircleFadingPlusDrawProps>(
  ({ onMouseEnter, onMouseLeave, className, size = 28, ...props }, ref) => {
    const segmentControls = useAnimation();
    const plusControls = useAnimation();
    const isControlledRef = useRef(false);

    useImperativeHandle(ref, () => {
      isControlledRef.current = true;

      return {
        startAnimation: async () => {
          await Promise.all([segmentControls.start("animate"), plusControls.start("animate")]);
        },
        stopAnimation: async () => {
          await Promise.all([segmentControls.start("normal"), plusControls.start("normal")]);
        },
      };
    });

    const handleMouseEnter = useCallback(
      async (e: React.MouseEvent<HTMLDivElement>) => {
        if (isControlledRef.current) {
          onMouseEnter?.(e);
        } else {
          await Promise.all([segmentControls.start("animate"), plusControls.start("animate")]);
        }
      },
      [segmentControls, plusControls, onMouseEnter],
    );

    const handleMouseLeave = useCallback(
      async (e: React.MouseEvent<HTMLDivElement>) => {
        if (isControlledRef.current) {
          onMouseLeave?.(e);
        } else {
          await Promise.all([segmentControls.start("normal"), plusControls.start("normal")]);
        }
      },
      [segmentControls, plusControls, onMouseLeave],
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
          height={size}
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          viewBox="0 0 24 24"
          width={size}
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Circle segments with pathLength draw animation */}
          <motion.path
            animate={segmentControls}
            d="M12 2a10 10 0 0 1 7.38 16.75"
            variants={{
              normal: {
                pathLength: 1,
                opacity: 1,
              },
              animate: {
                pathLength: [0, 1],
                opacity: [0, 1, 1],
                transition: {
                  delay: 0,
                  duration: 0.6,
                  ease: "easeInOut",
                },
              },
            }}
          />
          <motion.path
            animate={segmentControls}
            d="M2.5 8.875a10 10 0 0 0-.5 3"
            variants={{
              normal: {
                pathLength: 1,
                opacity: 1,
              },
              animate: {
                pathLength: [0, 1],
                opacity: [0, 1, 1],
                transition: {
                  delay: 0.1,
                  duration: 0.6,
                  ease: "easeInOut",
                },
              },
            }}
          />
          <motion.path
            animate={segmentControls}
            d="M2.83 16a10 10 0 0 0 2.43 3.4"
            variants={{
              normal: {
                pathLength: 1,
                opacity: 1,
              },
              animate: {
                pathLength: [0, 1],
                opacity: [0, 1, 1],
                transition: {
                  delay: 0.2,
                  duration: 0.6,
                  ease: "easeInOut",
                },
              },
            }}
          />
          <motion.path
            animate={segmentControls}
            d="M4.636 5.235a10 10 0 0 1 .891-.857"
            variants={{
              normal: {
                pathLength: 1,
                opacity: 1,
              },
              animate: {
                pathLength: [0, 1],
                opacity: [0, 1, 1],
                transition: {
                  delay: 0.3,
                  duration: 0.6,
                  ease: "easeInOut",
                },
              },
            }}
          />
          <motion.path
            animate={segmentControls}
            d="M8.644 21.42a10 10 0 0 0 7.631-.38"
            variants={{
              normal: {
                pathLength: 1,
                opacity: 1,
              },
              animate: {
                pathLength: [0, 1],
                opacity: [0, 1, 1],
                transition: {
                  delay: 0.4,
                  duration: 0.6,
                  ease: "easeInOut",
                },
              },
            }}
          />

          {/* Plus sign */}
          <g>
            <path d="M12 8v8" />
            <path d="M16 12H8" />
          </g>
        </svg>
      </div>
    );
  },
);

CircleFadingPlusDrawIcon.displayName = "CircleFadingPlusDraw";

export { CircleFadingPlusDrawIcon };
