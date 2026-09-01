/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { Gamepad2, ShieldCheck, ChevronLeft, Trophy, Flag, AlertTriangle } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import ArcadeBackground from "./components/ArcadeBackground";
import CarSprite from "./components/CarSprite";

type GameStatus = 'menu' | 'mode_selection' | 'playing' | 'game_over';

interface Question {
  question: string;
  options: string[];
  answer: number;
  photoString?: string | null;
}

/**
 * SQL Schema Representation for Reference:
 * 
 * CREATE TABLE questions (
 *   id INTEGER PRIMARY KEY AUTOINCREMENT,
 *   mode TEXT CHECK(mode IN ('easy', 'hard')),
 *   question TEXT NOT NULL,
 *   option_1 TEXT NOT NULL,
 *   option_2 TEXT NOT NULL,
 *   option_3 TEXT NOT NULL,
 *   option_4 TEXT NOT NULL,
 *   answer_index INTEGER NOT NULL
 * );
 * 
 * INSERT INTO questions (mode, question, option_1, option_2, option_3, option_4, answer_index) VALUES
 * ('easy', '¿Qué significa la bandera roja?', 'Peligro, detener carrera', 'Última vuelta', 'Entrada a pits', 'Carrera terminada', 0),
 * ('easy', '¿Cuál es el color de la bandera de salida?', 'Roja', 'Verde', 'Cuadros', 'Amarilla', 1),
 * ('easy', '¿Qué debe hacer un piloto ante bandera amarilla?', 'Acelerando', 'Reducir velocidad y no rebasar', 'Ir a pits', 'Detener el auto inmediatamente', 1),
 * ('hard', '¿Cuál es el límite de velocidad en el Pit Lane (estándar)?', '60 km/h', '80 km/h', '100 km/h', '50 km/h', 1),
 * ('hard', '¿Qué sistema permite reducir la carga aerodinámica en rectas?', 'ERS', 'KERS', 'DRS', 'DAS', 2);
 */

const db_easy: Question[] = [
  { question: "¿Qué significa la bandera roja?", options: ["Peligro, detener carrera", "Última vuelta", "Entrada a pits", "Carrera terminada"], answer: 0 },
  { question: "¿Cuál es el color de la bandera de salida?", options: ["Roja", "Verde", "Cuadros", "Amarilla"], answer: 1 },
  { question: "¿Qué debe hacer un piloto ante bandera amarilla?", options: ["Acelerando", "Reducir velocidad y no rebasar", "Ir a pits", "Detener el auto inmediatamente"], answer: 1 },
  { question: "¿Dónde se detienen los autos para cambiar llantas?", options: ["En la pista", "En el garaje", "En los pits", "En la meta"], answer: 2 },
  { question: "¿Cuántos pilotos hay en un auto de F1?", options: ["Dos", "Uno", "Cuatro", "Tres"], answer: 1 },
];

const db_hard: Question[] = [
  { question: "¿Cuál es el límite de velocidad en el Pit Lane (estándar)?", options: ["60 km/h", "80 km/h", "100 km/h", "50 km/h"], answer: 1 },
  { question: "¿Qué sistema permite reducir la carga aerodinámica en rectas?", options: ["ERS", "KERS", "DRS", "DAS"], answer: 2 },
  { question: "¿Cuántos puntos recibe el ganador de un GP?", options: ["20", "15", "25", "10"], answer: 2 },
  { question: "¿Qué neumático es el más blando en la gama actual?", options: ["C1", "C3", "C5", "C2"], answer: 2 },
  { question: "¿Quién ostenta el récord de más campeonatos del mundo?", options: ["Hamilton / Schumacher", "Vettel", "Senna", "Prost"], answer: 0 },
];

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
  const [dbEasy, setDbEasy] = useState<Question[]>([]);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    async function fetchQuestions() {
      try {
        const res = await fetch('http://localhost:3001/api/questions/easy');
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

  // ACA ESTA EL GENERADOR DE PREGUNTAS/RESPUESTAS !!!!!
  const getNewQuestion = useCallback(() => {
    // If backend data is loaded for easy, use it; else fallback to hardcoded
    const db = mode === 'easy' ? (dbEasy.length > 0 ? dbEasy : db_easy) : db_hard;

    if (db.length === 0) return;

    const randomIndex = Math.floor(Math.random() * db.length);
    setCurrentQuestion(db[randomIndex]);
    setLightState('red');
  }, [mode, dbEasy]);

  const startGame = (selectedMode: 'easy' | 'hard') => {
    setMode(selectedMode);
    setStatus('playing');
    setLives(1);
    setScore(0);
    setConsecutiveCorrect(0);
    setIsMoving(true);
    setIsCrashed(false);
    setLightState('green');

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
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[150px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-tertiary/10 rounded-full blur-[150px]" />
        <div className="absolute inset-0 opacity-[0.03] bg-[linear-gradient(to_right,var(--color-on-surface)_1px,transparent_1px),linear-gradient(to_bottom,var(--color-on-surface)_1px,transparent_1px)] bg-[size:40px_40px]" />
      </div>

      {/* Top Navigation Bar */}
      <header className="fixed top-0 left-0 w-full glass-panel z-50 border-b border-white/5">
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
            className="w-full aspect-video relative rounded-2xl border border-white/10 bg-surface-container-lowest/40 backdrop-blur-sm overflow-hidden game-sector-glow group shadow-[0_32px_64px_-16px_rgba(0,0,0,0.6)]"
          >
            {/* Infinite Runner View */}
            {status === 'playing' && (
              <div className="absolute inset-0 z-0">
                {/* Arcade Tiled Background */}
                <ArcadeBackground isMoving={isMoving} />

                {/* GUI Stoplight */}
                <div className="absolute top-6 right-6 z-40">
                  <div className="glass-panel p-2 rounded-xl flex flex-col gap-2 border-white/10 bg-slate-950/80 shadow-2xl">
                    <div className={`w-8 h-8 rounded-full ${lightState === 'red' ? 'bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.8)]' : 'bg-red-950/40'}`} />
                    <div className={`w-8 h-8 rounded-full ${lightState === 'yellow' ? 'bg-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.8)]' : 'bg-yellow-950/40'}`} />
                    <div className={`w-8 h-8 rounded-full ${lightState === 'green' ? 'bg-green-500 shadow-[0_0_15px_rgba(34,197,94,0.8)]' : 'bg-green-950/40'}`} />
                  </div>
                </div>

                {/* The Car — Pixel Grid Sprite */}
                <motion.div
                  animate={{
                    y: 0,
                    rotate: isCrashed ? (prefersReducedMotion ? 0 : [0, 60, 120]) : 0,
                    x: isCrashed ? (prefersReducedMotion ? 0 : [0, 40]) : 0,
                    filter: isCrashed ? "blur(2px) brightness(0.5)" : "none"
                  }}
                  transition={{
                    rotate: { duration: 0.6, ease: "easeIn" },
                    x: { duration: 0.6, ease: "easeIn" }
                  }}
                  className="absolute bottom-1/4 left-1/4 -translate-x-1/2 z-20"
                >
                  <div className="relative group">
                    <div className="transition-all duration-700 w-28 h-16">
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
                        className="absolute -top-4 left-1/2 -translate-x-1/2 w-8 h-8 bg-slate-400 rounded-full blur-xl"
                      />
                    )}

                    {isMoving && !isCrashed && (
                      <motion.div
                        animate={prefersReducedMotion ? { opacity: 1 } : { opacity: [0.5, 1, 0.5], x: [-10, -15, -10] }}
                        transition={{ repeat: Infinity, duration: 0.1 }}
                        className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-full w-8 h-4 bg-gradient-to-r from-orange-500 to-transparent blur-sm rounded-full"
                      />
                    )}

                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 flex gap-1">
                      {Array.from({ length: 5 }, (_, i) => (
                        <div
                          key={i}
                          className={`w-3 h-3 rounded-full ${i < lives ? "bg-red-500" : "bg-white/10"}`}
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
                      className="px-12 py-4 bg-primary text-on-primary font-black uppercase tracking-[0.2em] rounded-xl hover:scale-105 active:scale-95 transition-all shadow-[0_0_30px_rgba(142,213,255,0.4)]"
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
                        className="glass-panel px-10 py-5 rounded-xl border border-white/10 hover:border-primary/50 hover:bg-primary/10 transition-all flex flex-col items-center gap-3 w-48"
                      >
                        <Flag className="w-8 h-8 text-green-400" />
                        <span className="font-bold text-white uppercase tracking-widest">Fácil</span>
                      </button>
                      <button
                        onClick={() => startGame('hard')}
                        className="glass-panel px-10 py-5 rounded-xl border border-white/10 hover:border-red-500/50 hover:bg-red-500/10 transition-all flex flex-col items-center gap-3 w-48"
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
                    <div className="glass-panel p-6 rounded-3xl border-primary/20 shadow-2xl relative overflow-hidden backdrop-blur-3xl ring-1 ring-white/10">
                      <div className="flex flex-col sm:flex-row items-center gap-6">
                        <div className="flex-grow text-left">
                          {currentQuestion.photoString && (
                            <div className="mb-4">
                              <img
                                src={`data:image/jpeg;base64,${currentQuestion.photoString}`}
                                alt="Question reference"
                                className="max-h-48 rounded-xl border border-white/10 shadow-lg object-contain bg-black/20"
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
                              className="glass-panel p-3 rounded-xl border border-white/5 hover:border-primary/40 hover:bg-primary/5 transition-all text-xs font-medium text-on-surface text-center hover:scale-[1.02] active:scale-[0.98]"
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
                    <div className="w-24 h-24 bg-red-500/10 rounded-full flex items-center justify-center mb-6 border border-red-500/20">
                      <Trophy className="w-12 h-12 text-red-500" />
                    </div>
                    <h2 className="text-4xl sm:text-6xl font-black text-white uppercase mb-2" style={{ fontFamily: "var(--font-pixel)" }}>¡GAME OVER!</h2>
                    <p className="text-lg text-primary font-bold uppercase tracking-[0.2em] mb-12" style={{ fontFamily: "var(--font-pixel)", fontSize: "14px" }}>
                      Puntaje Final: {score}
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4">
                      <button
                        onClick={() => startGame(mode)}
                        className="px-10 py-4 bg-primary text-on-primary font-black uppercase tracking-widest rounded-xl hover:scale-105 transition-all"
                        style={{ fontFamily: "var(--font-pixel)", fontSize: "12px" }}
                      >
                        Reintentar
                      </button>
                      <button
                        onClick={() => setStatus('menu')}
                        className="px-10 py-4 glass-panel border border-white/10 text-white font-black uppercase tracking-widest rounded-xl hover:bg-white/5 transition-all"
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
                  <span className="text-[10px] uppercase font-bold text-primary/60 tracking-widest mb-1" style={{ fontFamily: "var(--font-pixel)" }}>Score</span>
                  <span className="text-2xl font-black text-white leading-none" style={{ fontFamily: "var(--font-pixel)" }}>{score}</span>
                </div>
                <div className="h-10 w-px bg-white/10" />
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase font-bold text-primary/60 tracking-widest mb-1" style={{ fontFamily: "var(--font-pixel)" }}>Combo</span>
                  <span className="text-2xl font-black text-primary leading-none" style={{ fontFamily: "var(--font-pixel)" }}>x{consecutiveCorrect}</span>
                </div>
              </div>
            )}

            {/* Internal View Scanlines Overlay */}
            <div className="absolute inset-0 scanline opacity-[0.08] pointer-events-none" />

            {/* Subtle Vignette */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_40%,rgba(0,0,0,0.4)_100%)] pointer-events-none" />
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
            className="glass-panel p-2.5 rounded-lg flex flex-col items-center justify-center border-white/5 shadow-xl backdrop-blur-2xl ring-1 ring-white/5 pointer-events-auto min-w-[120px]"
          >
            <p className="text-primary font-black tracking-tight text-[10px] sm:text-[12px]">Desarrollado por el Equipo Foxtrot</p>
            <div className="h-px w-8 bg-gradient-to-r from-transparent via-primary/30 to-transparent my-1" />
            <p className="text-[6px] sm:text-[7px] uppercase font-bold tracking-[0.4em] text-on-surface-variant/70">Proyecto Final</p>
          </motion.div>
        </div>
      </footer>

      {/* Global Atmosphere Overlays */}
      <div className="fixed inset-0 pointer-events-none z-[100] scanline opacity-[0.015] mix-blend-overlay" />
      <div className="fixed inset-0 pointer-events-none z-[99] bg-[radial-gradient(circle_at_center,transparent_0%,rgba(10,10,20,0.6)_100%)]" />
    </div>
  );
}
