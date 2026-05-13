import { useEffect, useRef, useState, useCallback } from 'react';
import { 
  CANVAS_WIDTH, 
  CANVAS_HEIGHT, 
  PADDLE_WIDTH, 
  PADDLE_HEIGHT, 
  PADDLE_Y, 
  BALL_RADIUS, 
  INITIAL_BALL_SPEED,
  BRICK_ROWS,
  BRICK_COLS,
  BRICK_HEIGHT,
  BRICK_PADDING,
  BRICK_OFFSET_TOP,
  BRICK_OFFSET_LEFT,
  NEON_COLORS,
  INITIAL_LIVES
} from '../constants';
import { Ball, Paddle, Brick, GameState, GameStatus } from '../types/game';
import { Trophy, RefreshCw, Play, Pause, Heart } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function BreakoutGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(0);
  
  // High score persisted in local storage
  const [highScore, setHighScore] = useState(() => {
    const saved = localStorage.getItem('breakout_highscore');
    return saved ? parseInt(saved, 10) : 42500;
  });

  // Game state that doesn't trigger re-renders
  const ballRef = useRef<Ball>({
    x: CANVAS_WIDTH / 2,
    y: PADDLE_Y - BALL_RADIUS,
    radius: BALL_RADIUS,
    dx: INITIAL_BALL_SPEED,
    dy: -INITIAL_BALL_SPEED,
    speed: INITIAL_BALL_SPEED,
  });
  
  const paddleRef = useRef<Paddle>({
    x: (CANVAS_WIDTH - PADDLE_WIDTH) / 2,
    y: PADDLE_Y,
    width: PADDLE_WIDTH,
    height: PADDLE_HEIGHT,
    speed: 10,
  });
  
  const bricksRef = useRef<Brick[]>([]);
  const keysRef = useRef<{ [key: string]: boolean }>({});
  
  // Game state that triggers UI updates
  const [gameState, setGameState] = useState<GameState>({
    score: 0,
    lives: INITIAL_LIVES,
    status: 'START',
  });

  const initBricks = useCallback(() => {
    const bricks: Brick[] = [];
    const brickWidth = (CANVAS_WIDTH - BRICK_OFFSET_LEFT * 2 - (BRICK_COLS - 1) * BRICK_PADDING) / BRICK_COLS;
    
    for (let r = 0; r < BRICK_ROWS; r++) {
      for (let c = 0; c < BRICK_COLS; c++) {
        bricks.push({
          x: c * (brickWidth + BRICK_PADDING) + BRICK_OFFSET_LEFT,
          y: r * (BRICK_HEIGHT + BRICK_PADDING) + BRICK_OFFSET_TOP,
          width: brickWidth,
          height: BRICK_HEIGHT,
          value: (BRICK_ROWS - r) * 10,
          color: NEON_COLORS[r % NEON_COLORS.length],
          isDestroyed: false,
          padding: BRICK_PADDING,
        });
      }
    }
    bricksRef.current = bricks;
  }, []);

  const resetBall = useCallback(() => {
    ballRef.current = {
      x: paddleRef.current.x + paddleRef.current.width / 2,
      y: PADDLE_Y - BALL_RADIUS - 1,
      radius: BALL_RADIUS,
      dx: INITIAL_BALL_SPEED * (Math.random() > 0.5 ? 1 : -1),
      dy: -INITIAL_BALL_SPEED,
      speed: INITIAL_BALL_SPEED,
    };
  }, []);

  const startGame = () => {
    if (gameState.status === 'GAMEOVER' || gameState.status === 'VICTORY') {
      initBricks();
      setGameState({ score: 0, lives: INITIAL_LIVES, status: 'PLAYING' });
    } else {
      setGameState(prev => ({ ...prev, status: 'PLAYING' }));
    }
    resetBall();
  };

  const pauseGame = () => {
    setGameState(prev => ({ ...prev, status: 'PAUSED' }));
  };

  const update = useCallback(() => {
    if (gameState.status !== 'PLAYING') return;

    const ball = ballRef.current;
    const paddle = paddleRef.current;

    // Paddle movement
    if (keysRef.current['ArrowLeft'] || keysRef.current['a']) {
      paddle.x -= paddle.speed;
    }
    if (keysRef.current['ArrowRight'] || keysRef.current['d']) {
      paddle.x += paddle.speed;
    }

    // Paddle boundary check
    if (paddle.x < 0) paddle.x = 0;
    if (paddle.x + paddle.width > CANVAS_WIDTH) paddle.x = CANVAS_WIDTH - paddle.width;

    // Ball movement
    ball.x += ball.dx;
    ball.y += ball.dy;

    // Wall collisions
    if (ball.x + ball.radius > CANVAS_WIDTH || ball.x - ball.radius < 0) {
      ball.dx = -ball.dx;
    }
    if (ball.y - ball.radius < 0) {
      ball.dy = -ball.dy;
    }

    // Paddle collision
    if (
      ball.y + ball.radius > paddle.y &&
      ball.y - ball.radius < paddle.y + paddle.height &&
      ball.x > paddle.x &&
      ball.x < paddle.x + paddle.width
    ) {
      const impact = (ball.x - (paddle.x + paddle.width / 2)) / (paddle.width / 2);
      ball.dx = impact * ball.speed * 1.5;
      ball.dy = -Math.sqrt(Math.max(0.1, ball.speed ** 2 - ball.dx ** 2));
      ball.y = paddle.y - ball.radius;
    }

    // Brick collisions
    let allBricksDestroyed = true;
    bricksRef.current.forEach(brick => {
      if (brick.isDestroyed) return;
      allBricksDestroyed = false;

      if (
        ball.x + ball.radius > brick.x &&
        ball.x - ball.radius < brick.x + brick.width &&
        ball.y + ball.radius > brick.y &&
        ball.y - ball.radius < brick.y + brick.height
      ) {
        brick.isDestroyed = true;
        setGameState(prev => {
          const newScore = prev.score + brick.value;
          if (newScore > highScore) {
            setHighScore(newScore);
            localStorage.setItem('breakout_highscore', newScore.toString());
          }
          return { ...prev, score: newScore };
        });
        
        const overlapX = Math.min(ball.x + ball.radius - brick.x, brick.x + brick.width - (ball.x - ball.radius));
        const overlapY = Math.min(ball.y + ball.radius - brick.y, brick.y + brick.height - (ball.y - ball.radius));
        
        if (overlapX < overlapY) {
          ball.dx = -ball.dx;
        } else {
          ball.dy = -ball.dy;
        }
        ball.speed += 0.05;
      }
    });

    if (allBricksDestroyed && bricksRef.current.length > 0) {
      setGameState(prev => ({ ...prev, status: 'VICTORY' }));
    }

    if (ball.y + ball.radius > CANVAS_HEIGHT) {
      setGameState(prev => {
        if (prev.lives <= 1) {
          return { ...prev, status: 'GAMEOVER', lives: 0 };
        }
        resetBall();
        return { ...prev, lives: prev.lives - 1 };
      });
    }
  }, [gameState.status, resetBall, highScore]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    ctx.strokeStyle = 'rgba(34, 211, 238, 0.05)';
    ctx.lineWidth = 1;
    for (let i = 0; i < CANVAS_WIDTH; i += 40) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, CANVAS_HEIGHT);
      ctx.stroke();
    }
    for (let i = 0; i < CANVAS_HEIGHT; i += 40) {
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(CANVAS_WIDTH, i);
      ctx.stroke();
    }

    const paddle = paddleRef.current;
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#22d3ee';
    ctx.fillStyle = '#22d3ee';
    ctx.beginPath();
    ctx.roundRect(paddle.x, paddle.y, paddle.width, paddle.height, 6);
    ctx.fill();
    
    const ball = ballRef.current;
    ctx.shadowBlur = 20;
    ctx.shadowColor = '#FFFFFF';
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.fill();

    bricksRef.current.forEach(brick => {
      if (brick.isDestroyed) return;
      ctx.shadowBlur = 10;
      ctx.shadowColor = brick.color;
      ctx.fillStyle = brick.color;
      ctx.beginPath();
      ctx.roundRect(brick.x, brick.y, brick.width, brick.height, 4);
      ctx.fill();
      
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.beginPath();
      ctx.roundRect(brick.x, brick.y, brick.width, 4, 4);
      ctx.fill();
    });

    ctx.shadowBlur = 0;
  }, []);

  const gameLoop = useCallback(() => {
    update();
    draw();
    requestRef.current = requestAnimationFrame(gameLoop);
  }, [update, draw]);

  useEffect(() => {
    initBricks();
    requestRef.current = requestAnimationFrame(gameLoop);
    
    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current[e.key] = true;
      if (e.key === 'Escape' || e.key === 'p') {
        if (gameState.status === 'PLAYING') pauseGame();
        else if (gameState.status === 'PAUSED') startGame();
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => keysRef.current[e.key] = false;
    const handleMouseMove = (e: MouseEvent) => {
      if (!canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const root = document.documentElement;
      const mouseX = e.clientX - rect.left - root.scrollLeft;
      paddleRef.current.x = mouseX - paddleRef.current.width / 2;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    canvasRef.current?.addEventListener('mousemove', handleMouseMove);

    return () => {
      cancelAnimationFrame(requestRef.current);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      canvasRef.current?.removeEventListener('mousemove', handleMouseMove);
    };
  }, [gameLoop, initBricks, gameState.status]);

  const destroyedCount = bricksRef.current.filter(b => b.isDestroyed).length;
  const totalBricks = bricksRef.current.length || 1;
  const progressPercent = (destroyedCount / totalBricks) * 100;

  return (
    <div className="flex items-center justify-center min-h-screen bg-bg relative overflow-hidden font-sans">
      <div className="w-[1024px] h-[768px] flex flex-col p-10 bg-slate-950 relative border border-white/5 shadow-2xl">
        
        {/* Header */}
        <header className="flex justify-between items-end mb-8">
          <div>
            <h1 className="text-6xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-600 uppercase italic neon-text leading-none">
              Neon Breaker
            </h1>
            <p className="text-slate-500 text-[11px] uppercase tracking-[0.3em] font-bold mt-2 ml-1">
              Prototyping Laboratory // V.1.0
            </p>
          </div>

          <div className="flex gap-6">
            <div className="glass-panel rounded-xl px-6 py-3 min-w-[140px] text-center shadow-lg">
              <p className="text-slate-500 text-[10px] uppercase font-bold tracking-widest mb-1">High Score</p>
              <p className="text-3xl arcade-font text-amber-400 tabular-nums">
                {highScore.toString().padStart(6, '0')}
              </p>
            </div>
            <div className="glass-panel rounded-xl px-6 py-3 min-w-[140px] text-center shadow-lg">
              <p className="text-slate-500 text-[10px] uppercase font-bold tracking-widest mb-1">Current Score</p>
              <p className="text-3xl arcade-font text-cyan-400 tabular-nums">
                {gameState.score.toString().padStart(6, '0')}
              </p>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 flex gap-8 items-stretch overflow-hidden">
          {/* Sidebar */}
          <aside className="w-64 flex flex-col gap-6">
            <div className="glass-panel rounded-2xl p-5 flex-1 shadow-inner overflow-hidden">
              <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-6 border-b border-slate-800 pb-2">
                Mission Brief
              </h3>
              
              <div className="space-y-8">
                <div>
                  <div className="flex justify-between text-[10px] font-bold uppercase mb-2">
                    <span className="text-slate-400">Grid Cleared</span>
                    <span className="text-cyan-400">{progressPercent.toFixed(1)}%</span>
                  </div>
                  <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden p-[2px]">
                    <motion.div 
                      className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full" 
                      animate={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[10px] font-bold uppercase mb-2">
                    <span className="text-slate-400">Hull Integrity</span>
                    <span className="text-rose-500">{gameState.lives} Units</span>
                  </div>
                  <div className="flex gap-2">
                    {Array.from({ length: INITIAL_LIVES }).map((_, i) => (
                      <div 
                        key={i}
                        className={`w-8 h-3 rounded-sm transition-all duration-500 ${
                          i < gameState.lives 
                            ? "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.4)]" 
                            : "bg-slate-800"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-12">
                <h4 className="text-[10px] font-bold text-slate-500 uppercase mb-4">Active Modifiers</h4>
                <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-lg">
                  <p className="text-[10px] text-indigo-400 font-bold uppercase leading-tight">Ionized Trail [v2]</p>
                  <p className="text-[9px] text-indigo-300/60 mt-1 uppercase italic">+15% Velocity Boost</p>
                </div>
              </div>
            </div>

            <div className="glass-panel rounded-2xl p-4 flex flex-col items-center justify-center bg-cyan-500/5">
              <div className="text-center font-mono">
                <p className="text-[10px] uppercase font-bold text-cyan-500/50 mb-1">Hardware Status</p>
                <p className="arcade-font text-xs text-cyan-400/80">CONNECTED_ID_882</p>
              </div>
            </div>
          </aside>

          {/* Game View */}
          <section className="flex-1 bg-black rounded-3xl border-4 border-slate-900 shadow-[0_0_50px_rgba(0,0,0,0.5)] relative overflow-hidden flex items-center justify-center">
            <canvas
              ref={canvasRef}
              width={CANVAS_WIDTH}
              height={CANVAS_HEIGHT}
              className="cursor-none"
            />

            {/* Overlays */}
            <AnimatePresence>
              {gameState.status !== 'PLAYING' && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-md z-20"
                >
                  <div className="text-center glass-panel p-10 rounded-3xl border-cyan-500/30 max-w-sm w-full shadow-2xl">
                    {gameState.status === 'START' && (
                      <>
                        <h2 className="text-5xl font-black mb-6 text-white arcade-font uppercase italic tracking-tighter">Ready?</h2>
                        <button 
                          onClick={startGame}
                          className="px-10 py-4 bg-cyan-500 text-black font-black rounded-full hover:scale-105 transition-transform uppercase tracking-widest text-xs"
                        >
                          Begin Mission
                        </button>
                      </>
                    )}

                    {gameState.status === 'PAUSED' && (
                      <>
                        <h2 className="text-5xl font-black mb-6 text-white arcade-font uppercase">Paused</h2>
                        <button 
                          onClick={startGame}
                          className="px-10 py-4 bg-cyan-500 text-black font-black rounded-full hover:scale-105 transition-transform uppercase tracking-widest text-xs"
                        >
                          Resume Mission
                        </button>
                      </>
                    )}

                    {gameState.status === 'GAMEOVER' && (
                      <>
                        <h2 className="text-5xl font-black mb-6 text-rose-500 arcade-font uppercase italic tracking-tighter">Failed</h2>
                        <p className="text-xs font-mono text-slate-400 mb-8 uppercase tracking-[0.2em]">Resource depleted</p>
                        <button 
                          onClick={startGame}
                          className="px-10 py-4 bg-slate-100 text-black font-black rounded-full hover:scale-105 transition-transform uppercase tracking-widest text-xs"
                        >
                          Retry Protocol
                        </button>
                      </>
                    )}

                    {gameState.status === 'VICTORY' && (
                      <>
                        <Trophy className="mx-auto mb-6 text-yellow-400" size={64} />
                        <h2 className="text-5xl font-black mb-6 text-yellow-400 arcade-font uppercase italic tracking-tighter">Success</h2>
                        <p className="text-xs font-mono text-slate-400 mb-8 uppercase tracking-[0.2em]">Mission complete</p>
                        <button 
                          onClick={startGame}
                          className="px-10 py-4 bg-yellow-400 text-black font-black rounded-full hover:scale-105 transition-transform uppercase tracking-widest text-xs"
                        >
                          Restart Mission
                        </button>
                      </>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </section>
        </main>

        {/* Footer */}
        <footer className="mt-8 flex justify-between items-center">
          <div className="flex gap-8">
            <div className="flex items-center gap-3">
              <div className="flex gap-1">
                <span className="w-6 h-6 flex items-center justify-center bg-slate-800 border border-slate-700 rounded text-[10px] font-bold">A</span>
                <span className="w-6 h-6 flex items-center justify-center bg-slate-800 border border-slate-700 rounded text-[10px] font-bold">D</span>
              </div>
              <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Lateral Thrust</span>
            </div>

            <div className="flex items-center gap-3">
              <span className="px-3 h-6 flex items-center justify-center bg-slate-800 border border-slate-700 rounded text-[10px] font-bold uppercase whitespace-nowrap">
                P / ESC
              </span>
              <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest">System Pause</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right font-mono">
              <p className="text-[10px] text-slate-600 leading-none">ENGINE_LOAD: 12.4%</p>
              <p className="text-[10px] text-cyan-600/60 leading-none mt-1 uppercase">Render_Buffer: Clear</p>
            </div>
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
          </div>
        </footer>

      </div>

      {/* Decorative BG element */}
      <div className="absolute -top-24 -right-24 w-64 h-64 bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-purple-500/10 rounded-full blur-[120px] pointer-events-none" />
    </div>
  );
}
