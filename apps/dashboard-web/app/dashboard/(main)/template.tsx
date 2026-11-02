'use client';

import { motion } from 'framer-motion';

// Remounts on every navigation → plays a soft fade/slide-in for each page.
export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
      className="min-h-full"
    >
      {children}
    </motion.div>
  );
}
