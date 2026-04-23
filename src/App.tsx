/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion } from "motion/react";
import { Circle, Gamepad2, Info, Gauge, Timer, ShieldCheck } from "lucide-react";
import { useState, useEffect } from "react";

export default function App() {
  const [latency, setLatency] = useState(14);

  // Simple effect to simulate real-time data flicker
  useEffect(() => {
    const interval = setInterval(() => {
      setLatency(prev => {
        const delta = Math.floor(Math.random() * 3) - 1;
        return Math.max(12, Math.min(18, prev + delta));
      });
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative min-h-screen w-full bg-background flex flex-col font-sans selection:bg-primary/20 overflow-x-hidden">
      {/* Background Ambience & Grid */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[150px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-tertiary/10 rounded-full blur-[150px]" />
        <div className="absolute inset-0 opacity-[0.03] bg-[linear-gradient(to_right,#888_1px,transparent_1px),linear-gradient(to_bottom,#888_1px,transparent_1px)] bg-[size:40px_40px]" />
      </div>

      {/* Top Navigation Bar */}
      <header className="fixed top-0 left-0 w-full glass-panel z-50 border-b border-white/5">
        <div className="flex justify-between items-center px-8 h-16 max-w-[1280px] mx-auto w-full">
          <div className="text-xl font-extrabold tracking-tighter text-primary flex items-center gap-3">
            <ShieldCheck className="w-6 h-6 fill-primary/10" />
            <span className="uppercase tracking-tight">SafeRacing</span>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 px-3 py-1 bg-surface-container rounded-full border border-white/5">
              <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
              <span className="text-[10px] uppercase font-bold tracking-widest text-on-surface/60">Live</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content: Dashboard */}
      <main className="flex-grow flex items-center justify-center pt-20 pb-32 px-6 relative z-10">
        <div className="w-full max-w-[1100px] perspective-1000">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
            className="w-full aspect-video relative rounded-2xl border border-white/10 bg-surface-container-lowest/40 backdrop-blur-sm overflow-hidden game-sector-glow group shadow-[0_32px_64px_-16px_rgba(0,0,0,0.6)]"
          >
            {/* Empty Container Placeholder */}
            <div className="absolute inset-0 z-0 flex items-center justify-center border-2 border-dashed border-sky-500/5 rounded-2xl m-6">
              <motion.div 
                animate={{ opacity: [0.2, 0.4, 0.2] }}
                transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                className="text-center"
              >
                <Gamepad2 className="w-20 h-20 text-primary/10 mx-auto mb-6" />
                <p className="text-primary/20 text-lg sm:text-2xl font-black uppercase tracking-[0.3em]">Awaiting Video Stream</p>
              </motion.div>
            </div>

            {/* Interface Overlay */}
            <div className="absolute inset-0 z-10 p-4 sm:p-10 flex flex-col justify-between pointer-events-none">
              <div className="flex justify-between items-start">
                {/* Circuit Status */}
                <motion.div 
                  initial={{ x: -40, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.6, type: "spring", damping: 20 }}
                  className="glass-panel p-4 sm:p-5 rounded-xl flex items-center gap-5 border-white/5 ring-1 ring-white/5 shadow-xl"
                >
                  <div className="w-1.5 h-12 bg-primary rounded-full shadow-[0_0_20px_rgba(142,213,255,0.6)]" />
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <Gauge className="w-3 h-3 text-primary opacity-60" />
                      <p className="text-[10px] text-primary uppercase tracking-[0.2em] font-bold">Circuit Status</p>
                    </div>
                    <p className="text-lg sm:text-2xl font-black text-white tracking-tight uppercase">Interlagos - Dry</p>
                  </div>
                </motion.div>

                {/* Latency Info */}
                <motion.div 
                  initial={{ x: 40, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.7, type: "spring", damping: 20 }}
                  className="glass-panel p-4 sm:p-5 rounded-xl text-right border-white/5 ring-1 ring-white/5 shadow-xl min-w-[120px]"
                >
                  <div className="flex items-center justify-end gap-2 mb-1">
                    <p className="text-[10px] text-primary uppercase tracking-[0.2em] font-bold">Latency</p>
                    <Timer className="w-3 h-3 text-primary opacity-60" />
                  </div>
                  <p className="text-xl sm:text-3xl font-black text-white tracking-tighter">{latency} <span className="text-sm opacity-60">MS</span></p>
                </motion.div>
              </div>

              {/* Bottom Status Indicator */}
              <div className="flex justify-center">
                <motion.div 
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.8 }}
                  className="flex items-center gap-4 px-10 py-4 glass-panel rounded-full border-primary/20 shadow-[0_0_30px_rgba(0,0,0,0.5)] ring-1 ring-white/10"
                >
                  <motion.div
                    animate={{ 
                      scale: [1, 1.3, 1],
                      opacity: [1, 0.6, 1],
                      filter: ["blur(0px)", "blur(2px)", "blur(0px)"]
                    }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className="w-3 h-3 rounded-full bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.8)]"
                  />
                  <span className="text-xs sm:text-sm font-black text-white tracking-[0.3em] uppercase">System Standby</span>
                </motion.div>
              </div>
            </div>

            {/* Corner Decorative Elements */}
            <div className="absolute top-0 left-0 w-20 h-20 border-t-4 border-l-4 border-primary/30 rounded-tl-3xl m-2 opacity-50" />
            <div className="absolute top-0 right-0 w-20 h-20 border-t-4 border-r-4 border-white/10 rounded-tr-3xl m-2 opacity-30" />
            <div className="absolute bottom-0 left-0 w-20 h-20 border-b-4 border-l-4 border-white/10 rounded-bl-3xl m-2 opacity-30" />
            <div className="absolute bottom-0 right-0 w-20 h-20 border-b-4 border-r-4 border-primary/30 rounded-br-3xl m-2 opacity-50" />
            
            {/* Internal View Scanlines Overlay */}
            <div className="absolute inset-0 scanline opacity-[0.08] pointer-events-none" />
            
            {/* Subtle Vignette */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_40%,rgba(0,0,0,0.4)_100%)] pointer-events-none" />
          </motion.div>
        </div>
      </main>

      {/* Footer Branding - Adjusted to fixed height and better centering */}
      <footer className="fixed bottom-0 left-0 w-full py-10 z-20 pointer-events-none">
        <div className="max-w-[1280px] mx-auto px-8 flex justify-center">
          <motion.div 
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.8, ease: "circOut" }}
            className="glass-panel p-6 sm:p-8 rounded-2xl flex flex-col items-center justify-center border-white/5 shadow-2xl backdrop-blur-2xl ring-1 ring-white/5 pointer-events-auto min-w-[320px]"
          >
            <div className="flex items-center gap-3 mb-2">
              <p className="text-primary font-black tracking-tight text-xl sm:text-2xl">Desarrollado por el Equipo Foxtrot</p>
            </div>
            <div className="h-px w-24 bg-gradient-to-r from-transparent via-primary/30 to-transparent mb-2" />
            <p className="text-[10px] sm:text-[11px] uppercase font-bold tracking-[0.5em] text-on-surface-variant/70">Proyecto Final</p>
          </motion.div>
        </div>
      </footer>

      {/* Global Atmosphere Overlays */}
      <div className="fixed inset-0 pointer-events-none z-[100] scanline opacity-[0.015] mix-blend-overlay" />
      <div className="fixed inset-0 pointer-events-none z-[99] bg-[radial-gradient(circle_at_center,transparent_0%,rgba(6,14,32,0.4)_100%)]" />
    </div>
  );
}
