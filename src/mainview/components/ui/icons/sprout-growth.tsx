"use client";

import type { Variants } from "motion/react";
import { motion, useAnimation } from "motion/react";
import type { HTMLAttributes } from "react";
import { forwardRef, useCallback, useImperativeHandle, useRef } from "react";
import { cn } from "@/lib/utils";

export interface SproutGrowthIconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

interface SproutGrowthIconProps extends HTMLAttributes<HTMLDivElement> {
  size?: number;
}

const MAIN_STEM_VARIANTS: Variants = {
  normal: {
    scaleY: 1,
    opacity: 1,
  },
  animate: {
    scaleY: 0,
    opacity: 0,
    transition: {
      type: "spring",
      stiffness: 200,
      damping: 20,
      duration: 0.5,
    },
  },
};

const BOTTOM_LEAF_VARIANTS: Variants = {
  normal: {
    scale: 1,
    rotate: 0,
    opacity: 1,
  },
  animate: {
    scale: 0,
    rotate: -15,
    opacity: 0,
    transition: {
      type: "spring",
      stiffness: 200,
      damping: 15,
      delay: 0.2,
    },
  },
};

const SproutGrowthIcon = forwardRef<SproutGrowthIconHandle, SproutGrowthIconProps>(
  ({ onMouseEnter, onMouseLeave, className, size = 28, ...props }, ref) => {
    const controls = useAnimation();
    const isControlledRef = useRef(false);

    useImperativeHandle(ref, () => {
      isControlledRef.current = true;

      return {
        startAnimation: () => controls.start("animate"),
        stopAnimation: () => controls.start("normal"),
      };
    });

    const handleMouseEnter = useCallback(
      async (e: React.MouseEvent<HTMLDivElement>) => {
        if (isControlledRef.current) {
          onMouseEnter?.(e);
        } else {
          await controls.start("animate");
        }
      },
      [controls, onMouseEnter],
    );

    const handleMouseLeave = useCallback(
      async (e: React.MouseEvent<HTMLDivElement>) => {
        if (isControlledRef.current) {
          onMouseLeave?.(e);
        } else {
          await controls.start("normal");
        }
      },
      [controls, onMouseLeave],
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
          <motion.path
            animate={controls}
            d="M14 9.536V7a4 4 0 0 1 4-4h1.5a.5.5 0 0 1 .5.5V5a4 4 0 0 1-4 4 4 4 0 0 0-4 4c0 2 1 3 1 5a5 5 0 0 1-1 3"
            initial="normal"
            style={{ transformOrigin: "14px 21px" }}
            variants={MAIN_STEM_VARIANTS}
          />
          <motion.path
            animate={controls}
            d="M4 9a5 5 0 0 1 8 4 5 5 0 0 1-8-4"
            initial="normal"
            style={{ transformOrigin: "8px 13px" }}
            variants={BOTTOM_LEAF_VARIANTS}
          />
          <path d="M5 21h14" />
        </svg>
      </div>
    );
  },
);

SproutGrowthIcon.displayName = "SproutGrowthIcon";

export { SproutGrowthIcon };
