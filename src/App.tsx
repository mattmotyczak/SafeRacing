/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { Gamepad2, ShieldCheck, ChevronLeft, Trophy, Flag, AlertTriangle } from "lucide-react";
import { useState, useEffect, useCallback, useRef } from "react";
import ArcadeBackground from "./components/ArcadeBackground";
import CarSprite from "./components/CarSprite";
// Offline fallback banks. The online database is the primary source; these keep
// the game playable when the API is down. The same bank backs both paths, so the
// option order a player memorises online is not the order they see offline.
import db_easy from "./data/questions.easy";
import db_hard from "./data/questions.hard";

type GameStatus = 'menu' | 'mode_selection' | 'playing' | 'game_over';

interface Question {
  question: string;
  options: string[];
  answer: number;
  photoString?: string | null;
}

const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

export default function App() {
  const [status, setStatus] = useState<GameStatus>('menu');
  const [mode, setMode] = useState<'easy' | 'hard'>('easy');
  const [lives, setLives] = useState(1);
  const [consecutiveCorrect, setConsecutiveCorrect] = useState(0);
  const [score, setScore] = useState(0);
  const [isMoving, setIsMoving] = useState(false);
  const [isCrashed, setIsCrashed] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [lightState, setLightState] = useState<'red' | 'yellow' | 'green'>('red');

  // Indices of questions already asked in the current run, used to draw without
  // replacement. Refs (not state) because the draw must read them synchronously.
  // lastId additionally guards the lap seam, where askedIds is already reset.
  const askedIds = useRef<number[]>([]);
  const lastId = useRef<number>(-1);
  const [dbEasy, setDbEasy] = useState<Question[]>([]);
  const [dbHard, setDbHard] = useState<Question[]>([]);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    async function fetchQuestions() {
      try {
        const res = await fetch(`${apiBase}/api/questions/easy`);
        const data = await res.json();
        if (data && data.length > 0) {
          console.log("✅ Successfully loaded easy questions from NeonDB!", data);
          setDbEasy(data);
        } else {
          console.warn("⚠️ NeonDB returned empty data. Falling back to local db_easy.");
          setDbEasy(db_easy); // Si la db de neon no tiene preguntas, usa las locales (por si el server falla)
        }
      } catch (err) {
        console.error("❌ Error fetching easy questions (Server might be down). Falling back to local db_easy:", err);
        setDbEasy(db_easy); // Si falla al cargar las preguntas de neon, usa las locales (por si el server falla)
      }
    }
    fetchQuestions();
  }, []);

  useEffect(() => {
    async function fetchQuestions() {
      try {
        const res = await fetch(`${apiBase}/api/questions/hard`);
        const data = await res.json();
        if (data && data.length > 0) {
          console.log("✅ Successfully loaded hard questions from NeonDB!", data);
          setDbHard(data);
        } else {
          console.warn("⚠️ NeonDB returned empty data. Falling back to local db_hard.");
          setDbHard(db_hard);
        }
      } catch (err) {
        console.error("❌ Error fetching hard questions (Server might be down). Falling back to local db_hard:", err);
        setDbHard(db_hard);
      }
    }
    fetchQuestions();
  }, []);

  // ACA ESTA EL GENERADOR DE PREGUNTAS/RESPUESTAS !!!!!
  const getNewQuestion = useCallback(() => {
    // Use backend data for the current mode when loaded; else fall back to the local bank.
    const db = mode === 'easy' ? (dbEasy.length > 0 ? dbEasy : db_easy) : (dbHard.length > 0 ? dbHard : db_hard);

    if (db.length === 0) return;

    // Draw without replacement while candidates remain, so a question never
    // repeats back to back. Once the pool is exhausted, reset it for a new lap
    // — but still exclude the question just served, or the seam of the lap would
    // put the same question on screen twice in a row.
    const exhausted = askedIds.current.length >= db.length;
    let pool: Question[];
    if (!exhausted) {
      pool = db.filter((_, i) => !askedIds.current.includes(i));
    } else if (db.length > 1) {
      pool = db.filter((_, i) => i !== lastId.current);
    } else {
      pool = db; // single-question bank: nothing left to avoid
    }
    if (exhausted) askedIds.current = [];

    const picked = pool[Math.floor(Math.random() * pool.length)];
    const pickedId = db.indexOf(picked);
    if (pickedId !== -1 && !askedIds.current.includes(pickedId)) askedIds.current.push(pickedId);
    lastId.current = pickedId;

    // Shuffle the options so the correct answer is not learnable by position.
    // Remap `answer` to the new index, otherwise shuffling would silently
    // mark correct answers wrong.
    const options = [...picked.options];
    for (let i = options.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [options[i], options[j]] = [options[j], options[i]];
    }

    setCurrentQuestion({ ...picked, options, answer: options.indexOf(picked.options[picked.answer]) });
    setLightState('red');
  }, [mode, dbEasy, dbHard]);

  const startGame = (selectedMode: 'easy' | 'hard') => {
    setMode(selectedMode);
    setStatus('playing');
    setLives(1);
    setScore(0);
    setConsecutiveCorrect(0);
    setIsMoving(true);
    setIsCrashed(false);
    setLightState('green');
    askedIds.current = []; // a new run re-serves the whole bank
    lastId.current = -1;

    // Initial movement
    setTimeout(() => {
      setLightState('yellow');
      setTimeout(() => {
        setIsMoving(false);
        getNewQuestion();
      }, 1000); // 1s yellow
    }, 2000); // 2s green
  };

  const handleAnswer = (index: number) => {
    if (!currentQuestion || isMoving || isCrashed) return;

    const isCorrect = index === currentQuestion.answer;

    if (isCorrect) {
      const nextConsecutive = consecutiveCorrect + 1;
      setConsecutiveCorrect(nextConsecutive);
      setScore(prev => prev + 1);

      if (nextConsecutive % 5 === 0 && lives < 5) {
        setLives(prev => prev + 1);
      }

      setIsMoving(true);
      setCurrentQuestion(null);
      setLightState('green');

      // Move for 3s (2s green + 1s yellow)
      setTimeout(() => {
        setLightState('yellow');
        setTimeout(() => {
          setIsMoving(false);
          getNewQuestion();
        }, 1000);
      }, 2000);
    } else {
      setIsMoving(true);
      setCurrentQuestion(null);
      setLightState('green');

      // Crash at 2s
      setTimeout(() => {
        setIsMoving(false);
        setIsCrashed(true);
        setConsecutiveCorrect(0);
        setLightState('red');

        const newLives = lives - 1;
        setLives(newLives);

        setTimeout(() => {
          if (newLives > 0) {
            setIsCrashed(false);
            setIsMoving(true);
            setLightState('green');
            setTimeout(() => {
              setLightState('yellow');
              setTimeout(() => {
                setIsMoving(false);
                getNewQuestion();
              }, 1000);
            }, 2000);
          } else {
            setStatus('game_over');
          }
        }, 1500);
      }, 2000); // Crash at 2s
    }
  };

  return (
    <div className="relative min-h-screen w-full bg-background flex flex-col font-sans selection:bg-primary/20 overflow-x-hidden">
      {/* Background Ambience & Grid */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Hard pixel corner accents (replaces blurred orbs) */}
        <div className="absolute top-1/4 left-1/4 w-24 h-24 bg-primary/10" />
        <div className="absolute top-[calc(25%+6rem)] left-[calc(25%+6rem)] w-24 h-24 bg-primary/10" />
        <div className="absolute bottom-1/4 right-1/4 w-24 h-24 bg-tertiary/10" />
        <div className="absolute bottom-[calc(25%+6rem)] right-[calc(25%+6rem)] w-24 h-24 bg-tertiary/10" />
        <div className="absolute inset-0 opacity-[0.03] bg-[linear-gradient(to_right,var(--color-on-surface)_1px,transparent_1px),linear-gradient(to_bottom,var(--color-on-surface)_1px,transparent_1px)] bg-[size:40px_40px]" />
      </div>

      {/* Top Navigation Bar */}
      <header className="fixed top-0 left-0 w-full pixel-panel z-50">
        <div className="flex justify-between items-center px-8 h-16 max-w-[1280px] mx-auto w-full">
          <div className="text-xl font-extrabold tracking-tighter text-primary flex items-center gap-3">
            <ShieldCheck className="w-6 h-6 fill-primary/10" />
            <span className="uppercase tracking-tight">SafeRacing</span>
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
            className="w-full aspect-video relative pixel-panel game-sector-glow rounded-none overflow-hidden group"
          >
            {/* Infinite Runner View */}
            {status === 'playing' && (
              <div className="absolute inset-0 z-0">
                {/* Arcade Tiled Background */}
                <ArcadeBackground isMoving={isMoving} />

                {/* GUI Stoplight */}
                <div className="absolute top-6 right-6 z-40">
                  <div className="pixel-panel p-2 flex flex-col gap-2">
                    <div className={`w-8 h-8 rounded-none ${lightState === 'red' ? 'bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.8)]' : 'bg-red-950/40'}`} />
                    <div className={`w-8 h-8 rounded-none ${lightState === 'yellow' ? 'bg-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.8)]' : 'bg-yellow-950/40'}`} />
                    <div className={`w-8 h-8 rounded-none ${lightState === 'green' ? 'bg-green-500 shadow-[0_0_15px_rgba(34,197,94,0.8)]' : 'bg-green-950/40'}`} />
                  </div>
                </div>

                {/* The Car — Pixel Grid Sprite */}
                <motion.div
                  animate={{
                    y: 0,
                    rotate: isCrashed ? (prefersReducedMotion ? 0 : [0, 60, 120]) : 0,
                    x: isCrashed ? (prefersReducedMotion ? 0 : [0, 40]) : 0,
                    filter: isCrashed ? "brightness(0.5)" : "none"
                  }}
                  transition={{
                    rotate: { duration: 0.6, ease: "easeIn" },
                    x: { duration: 0.6, ease: "easeIn" }
                  }}
                  className="absolute bottom-1/4 left-1/4 -translate-x-1/2 z-20"
                >
                  <div className="relative group">
                    <div className="transition-all duration-700 w-32 h-16">
                      <CarSprite
                        isMoving={isMoving}
                        isCrashed={isCrashed}
                        lives={lives}
                        className="w-full h-full"
                      />
                    </div>

                    {isCrashed && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0 }}
                        animate={prefersReducedMotion ? { opacity: 1 } : { opacity: [0, 1, 0], scale: [1, 2.5], y: -50 }}
                        transition={{ repeat: Infinity, duration: 0.5 }}
                        className="absolute -top-10 left-1/2 -translate-x-1/2 flex"
                        aria-hidden
                      >
                        <div className="w-4 h-4 bg-smoke" />
                        <div className="w-4 h-4 bg-smoke -mt-3 ml-1" />
                        <div className="w-4 h-4 bg-smoke -mt-1 ml-2" />
                      </motion.div>
                    )}

                    {isMoving && !isCrashed && (
                      <motion.div
                        animate={prefersReducedMotion ? { opacity: 1 } : { opacity: [0.5, 1, 0.5], x: [-10, -15, -10] }}
                        transition={{ repeat: Infinity, duration: 0.1 }}
                        className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-full flex"
                        aria-hidden
                      >
                        <div className="w-2 h-2 bg-accent-orange" />
                        <div className="w-2 h-2 bg-accent-red -mt-1" />
                        <div className="w-2 h-2 bg-accent-orange -mt-2" />
                      </motion.div>
                    )}

                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 flex gap-1">
                      {Array.from({ length: 5 }, (_, i) => (
                        <div
                          key={i}
                          className={`w-3 h-3 rounded-none ${i < lives ? "bg-red-500" : "bg-white/10"}`}
                        />
                      ))}
                    </div>
                  </div>
                </motion.div>
              </div>
            )}

            {/* UI Layer */}
            <div className="absolute inset-0 z-30 flex flex-col items-center justify-center p-6 text-center">
              <AnimatePresence mode="wait">
                {status === 'menu' && (
                  <motion.div
                    key="menu"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="flex flex-col items-center"
                  >
                    <motion.div
                      animate={prefersReducedMotion ? { rotate: 0 } : { rotate: [0, 5, -5, 0] }}
                      transition={{ repeat: Infinity, duration: 4 }}
                      className="mb-8"
                    >
                      <Gamepad2 className="w-24 h-24 text-primary/40" />
                    </motion.div>
                    <h1 className="text-5xl sm:text-7xl font-black text-white uppercase tracking-tighter mb-8 drop-shadow-2xl" style={{ fontFamily: "var(--font-pixel)" }}>
                      SafeRacing
                    </h1>
                    <button
                      onClick={() => setStatus('mode_selection')}
                      className="px-12 py-4 bg-primary text-on-primary font-black uppercase tracking-[0.2em] hover:scale-105 active:scale-95 transition-all shadow-[4px_4px_0_var(--color-hard-shadow)]"
                      style={{ fontFamily: "var(--font-pixel)", fontSize: "14px" }}
                    >
                      Jugar
                    </button>
                  </motion.div>
                )}

                {status === 'mode_selection' && (
                  <motion.div
                    key="select"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="flex flex-col items-center"
                  >
                    <h2 className="text-3xl sm:text-4xl font-black text-white uppercase tracking-tight mb-12" style={{ fontFamily: "var(--font-pixel)" }}>
                      Seleccione Modalidad
                    </h2>
                    <div className="flex flex-col sm:flex-row gap-6">
                      <button
                        onClick={() => startGame('easy')}
                        className="pixel-panel px-10 py-5 hover:border-primary/50 hover:bg-primary/10 transition-all flex flex-col items-center gap-3 w-48"
                      >
                        <Flag className="w-8 h-8 text-green-400" />
                        <span className="font-bold text-white uppercase tracking-widest">Fácil</span>
                      </button>
                      <button
                        onClick={() => startGame('hard')}
                        className="pixel-panel px-10 py-5 hover:border-red-500/50 hover:bg-red-500/10 transition-all flex flex-col items-center gap-3 w-48"
                      >
                        <AlertTriangle className="w-8 h-8 text-red-500" />
                        <span className="font-bold text-white uppercase tracking-widest">Realista</span>
                      </button>
                    </div>
                    <button
                      onClick={() => setStatus('menu')}
                      className="mt-12 flex items-center gap-2 text-on-surface-variant hover:text-white transition-colors"
                    >
                      <ChevronLeft className="w-5 h-5" />
                      <span className="font-bold uppercase tracking-widest text-sm">Atrás</span>
                    </button>
                  </motion.div>
                )}

                {status === 'playing' && currentQuestion && !isMoving && !isCrashed && (
                  <motion.div
                    key="question"
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 50 }}
                    className="absolute bottom-6 left-6 right-6 z-50"
                  >
                    <div className="pixel-panel p-6 rounded-none relative overflow-hidden">
                      <div className="flex flex-col sm:flex-row items-center gap-6">
                        <div className="flex-grow text-left">
                          {currentQuestion.photoString && (
                            <div className="mb-4">
                              <img
                                src={`data:image/jpeg;base64,${currentQuestion.photoString}`}
                                alt="Question reference"
                                className="max-h-48 border border-white/10 shadow-lg object-contain bg-black/20"
                              />
                            </div>
                          )}
                          <h3 className="text-lg sm:text-xl font-bold text-white mb-4 leading-tight">
                            {currentQuestion.question}
                          </h3>
                        </div>
                        <div className="grid grid-cols-2 gap-3 w-full sm:w-auto min-w-[300px]">
                          {currentQuestion.options.map((opt, i) => (
                            <button
                              key={i}
                              onClick={() => handleAnswer(i)}
                              className="pixel-panel p-3 hover:border-primary/40 hover:bg-primary/5 transition-all text-xs font-medium text-on-surface text-center hover:scale-[1.02] active:scale-[0.98]"
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {status === 'game_over' && (
                  <motion.div
                    key="game_over"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center"
                  >
                    <div className="w-24 h-24 bg-red-500/10 rounded-none flex items-center justify-center mb-6 border border-red-500/20">
                      <Trophy className="w-12 h-12 text-red-500" />
                    </div>
                    <h2 className="text-4xl sm:text-6xl font-black text-white uppercase mb-2" style={{ fontFamily: "var(--font-pixel)" }}>¡GAME OVER!</h2>
                    <p className="text-lg text-primary font-bold uppercase tracking-[0.2em] mb-12" style={{ fontFamily: "var(--font-pixel)", fontSize: "14px" }}>
                      Puntaje Final: {score}
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4">
                      <button
                        onClick={() => startGame(mode)}
                        className="px-10 py-4 bg-primary text-on-primary font-black uppercase tracking-widest hover:scale-105 transition-all"
                        style={{ fontFamily: "var(--font-pixel)", fontSize: "12px" }}
                      >
                        Reintentar
                      </button>
                      <button
                        onClick={() => setStatus('menu')}
                        className="px-10 py-4 pixel-panel text-white font-black uppercase tracking-widest hover:bg-white/5 transition-all"
                        style={{ fontFamily: "var(--font-pixel)", fontSize: "12px" }}
                      >
                        Menú
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Score HUD */}
            {status === 'playing' && (
              <div className="absolute top-6 left-6 z-40 flex items-center gap-6">
                <div className="flex flex-col">
                  <span className="text-xs uppercase font-bold text-primary/60 tracking-widest mb-1" style={{ fontFamily: "var(--font-pixel)" }}>Score</span>
                  <span className="text-2xl font-black text-white leading-none" style={{ fontFamily: "var(--font-pixel)" }}>{score}</span>
                </div>
                <div className="h-10 w-px bg-white/10" />
                <div className="flex flex-col">
                  <span className="text-xs uppercase font-bold text-primary/60 tracking-widest mb-1" style={{ fontFamily: "var(--font-pixel)" }}>Combo</span>
                  <span className="text-2xl font-black text-primary leading-none" style={{ fontFamily: "var(--font-pixel)" }}>x{consecutiveCorrect}</span>
                </div>
              </div>
            )}

            {/* Internal View Scanlines Overlay */}
            <div className="absolute inset-0 scanline opacity-[0.08] pointer-events-none" />

            {/* Subtle Vignette */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_40%,var(--color-vignette)_100%)] pointer-events-none" />
          </motion.div>
        </div>
      </main>

      {/* Footer Branding - Shrunk by 60% */}
      <footer className="fixed bottom-0 left-0 w-full py-6 z-20 pointer-events-none">
        <div className="max-w-[1280px] mx-auto px-8 flex justify-center">
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.8, ease: "circOut" }}
            className="pixel-panel p-2.5 flex flex-col items-center justify-center pointer-events-auto min-w-[120px]"
          >
            <p className="text-primary font-black tracking-tight text-[10px] sm:text-[12px]">Desarrollado por el Equipo Foxtrot</p>
            <div className="h-px w-8 bg-gradient-to-r from-transparent via-primary/30 to-transparent my-1" />
            <p className="text-[6px] sm:text-[7px] uppercase font-bold tracking-[0.4em] text-on-surface-variant/70">Proyecto Final</p>
          </motion.div>
        </div>
      </footer>

      {/* Global Atmosphere Overlays */}
      <div className="fixed inset-0 pointer-events-none z-[100] scanline opacity-[0.015] mix-blend-overlay" />
      <div className="fixed inset-0 pointer-events-none z-[99] bg-[radial-gradient(circle_at_center,transparent_0%,var(--color-atmosphere)_100%)]" />
    </div>
  );
}
