"use client";
import { motion } from "framer-motion";
import type { ReactNode } from "react";

export default function PageTransition({ 
  children 
}: { 
  children: ReactNode 
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ 
        duration: 0.4, 
        ease: [0.25, 0.46, 0.45, 0.94] 
      }}
      style={{
        touchAction: "pan-y",
        minHeight: "100%",
      }}
    >
      {children}
    </motion.div>
  );
}
