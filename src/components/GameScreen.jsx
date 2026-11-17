import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  Paintbrush,
  Eraser,
  PaintBucket,
  Undo2,
  Redo2,
  SkipForward,
  Pause,
  Play,
  Wifi,
  Send,
  MessageCircle,
  Clock,
  Heart,
  X,
  ListOrdered
} from 'lucide-react';
import { floodFill } from '../utils/floodFill';
import { sounds } from '../utils/sound';

const QUICK_COLORS = [
  { name: 'Pitch Black', hex: '#000000' },
  { name: 'White', hex: '#FFFFFF' },
  { name: 'Blush Pink', hex: '#FF6B8B' },
  { name: 'Rose Red', hex: '#F43F5E' },
  { name: 'Sunset Orange', hex: '#FB923C' },
  { name: 'Sunshine Yellow', hex: '#FACC15' },
  { name: 'Pastel Mint', hex: '#34D399' },
  { name: 'Sky Blue', hex: '#38BDF8' },
  { name: 'Lilac Purple', hex: '#C084FC' },
  { name: 'Warm Brown', hex: '#A16207' },
];

const EMOJI_REACTIONS = ['💖', '🥺', '😂', '🔥', '✨', '👏', '🎨', '😍'];

export default function GameScreen({
  socket,
  roomCode,
  mySlot,
  myNickname,
  gameState,
  ping,
  onEndGame
}) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  const [activeTool, setActiveTool] = useState('brush');
  const [selectedColor, setSelectedColor] = useState('#FF6B8B');
  const [brushSize, setBrushSize] = useState(6);
  const [isDrawing, setIsDrawing] = useState(false);
  const currentStrokeRef = useRef([]);

  const [localHistory, setLocalHistory] = useState(gameState.canvasHistory || []);
  const redoStackRef = useRef([]);
  const [redoAvailable, setRedoAvailable] = useState(false);
  const [isSkipping, setIsSkipping] = useState(false);

  const [chatOpen, setChatOpen] = useState(false);
  const [chatText, setChatText] = useState('');
  const [chatList, setChatList] = useState(gameState.chatMessages || []);
  const [floatingToast, setFloatingToast] = useState(null);
  const chatScrollRef = useRef(null);

  const [showStepsModal, setShowStepsModal] = useState(false);
  const [turnBanner, setTurnBanner] = useState(null);

  const currentTurn = gameState.currentTurn || 1;
  const totalTurns = gameState.totalTurns || 6;
  const timeLeft = gameState.timeLeft ?? 40;
  const isPaused = gameState.isPaused;
  const pauseReason = gameState.pauseReason;
  const activeSlot = gameState.activeSlot || (currentTurn % 2 === 1 ? 1 : 2);
  const isMyTurn = mySlot === activeSlot;
  const prompt = gameState.prompt || 'Couple Sketch Relay';
  const promptSteps = gameState.promptSteps || [];
  const currentStep = gameState.currentStep || promptSteps[currentTurn - 1] || `Step ${currentTurn}`;

  const partnerSlot = mySlot === 1 ? 2 : 1;
  const partnerPlayer = gameState.players?.[partnerSlot];
  const partnerNickname = partnerPlayer?.nickname || 'Partner';

  // Sound cues on timer
  useEffect(() => {
    if (timeLeft <= 5 && timeLeft > 0 && !isPaused) {
      sounds.playTick();
    }
  }, [timeLeft, isPaused]);

  // Sound, state resets, and canvas turn notification banner on turn change
  useEffect(() => {
    sounds.playTurnChange();
    redoStackRef.current = [];
    setRedoAvailable(false);
    setIsSkipping(false);

    const isMine = mySlot === activeSlot;
    const bannerTitle = isMine ? 'Your Turn to Sketch! ✏️' : `${partnerNickname}'s Turn! 👀`;
    const bannerSubtitle = currentStep || `Turn ${currentTurn} of ${totalTurns}`;

    setTurnBanner({ isMine, title: bannerTitle, subtitle: bannerSubtitle });
    const timer = setTimeout(() => {
      setTurnBanner(null);
    }, 2000);

    return () => clearTimeout(timer);
  }, [currentTurn]);

  // Canvas setup
  const setupCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const rect = container.getBoundingClientRect();
    const size = Math.floor(Math.min(rect.width, rect.height));

    if (canvas.width !== size || canvas.height !== size) {
      canvas.width = size;
      canvas.height = size;
      redrawEntireCanvas(localHistory, size);
    }
  }, [localHistory]);

  useEffect(() => {
    setupCanvas();
    window.addEventListener('resize', setupCanvas);
    return () => window.removeEventListener('resize', setupCanvas);
  }, [setupCanvas]);

  const redrawEntireCanvas = (history, size) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const targetSize = size || canvas.width;

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, targetSize, targetSize);

    history.forEach((action) => {
      executeActionOnCanvas(ctx, action, targetSize);
    });
  };

  const executeActionOnCanvas = (ctx, action, size) => {
    if (action.type === 'clear') {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, size, size);
    } else if (action.type === 'brush' || action.type === 'eraser') {
      if (!action.points || action.points.length < 2) return;
      ctx.beginPath();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = (action.size || 6) * (size / 360);
      ctx.strokeStyle = action.type === 'eraser' ? '#FFFFFF' : (action.color || '#000000');

      const p0 = action.points[0];
      ctx.moveTo(p0.x * size, p0.y * size);
      for (let i = 1; i < action.points.length; i++) {
        const pt = action.points[i];
        ctx.lineTo(pt.x * size, pt.y * size);
      }
      ctx.stroke();
    } else if (action.type === 'fill') {
      const x = Math.floor(action.x * size);
      const y = Math.floor(action.y * size);
      floodFill(ctx, x, y, action.color, 36);
    }
  };

  // Remote strokes
  useEffect(() => {
    const handleRemoteDraw = (action) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });

      if (action.type === 'clear') {
        setLocalHistory([]);
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.width);
      } else if (action.type === 'undo') {
        setLocalHistory(prev => {
          const next = prev.slice(0, -1);
          redrawEntireCanvas(next, canvas.width);
          return next;
        });
      } else {
        setLocalHistory(prev => [...prev, action]);
        executeActionOnCanvas(ctx, action, canvas.width);
      }
    };

    socket.on('draw_action_received', handleRemoteDraw);
    return () => socket.off('draw_action_received', handleRemoteDraw);
  }, [socket]);

  // Chat
  useEffect(() => {
    const handleNewMessage = (msg) => {
      setChatList(prev => [...prev, msg]);
      sounds.playPop();

      setFloatingToast(msg);
      setTimeout(() => {
        setFloatingToast(curr => (curr?.id === msg.id ? null : curr));
      }, 2600);

      if (chatScrollRef.current) {
        chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
      }
    };

    socket.on('new_chat_message', handleNewMessage);
    return () => socket.off('new_chat_message', handleNewMessage);
  }, [socket]);

  const getCoordinates = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
    return { x, y };
  };

  const handlePointerDown = (e) => {
    if (!isMyTurn || isPaused) return;
    e.preventDefault();

    const canvas = canvasRef.current;
    if (!canvas) return;
    const { x, y } = getCoordinates(e);

    if (activeTool === 'bucket') {
      sounds.playPop();
      const fillAction = { type: 'fill', x, y, color: selectedColor };
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      executeActionOnCanvas(ctx, fillAction, canvas.width);
      setLocalHistory(prev => [...prev, fillAction]);
      redoStackRef.current = [];
      setRedoAvailable(false);
      socket.emit('draw_action', { code: roomCode, action: fillAction });
      return;
    }

    setIsDrawing(true);
    currentStrokeRef.current = [{ x, y }];

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.beginPath();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = brushSize * (canvas.width / 360);
    ctx.strokeStyle = activeTool === 'eraser' ? '#FFFFFF' : selectedColor;
    ctx.moveTo(x * canvas.width, y * canvas.height);
  };

  const handlePointerMove = (e) => {
    if (!isDrawing || !isMyTurn || isPaused) return;
    e.preventDefault();

    const canvas = canvasRef.current;
    if (!canvas) return;
    const { x, y } = getCoordinates(e);
    currentStrokeRef.current.push({ x, y });

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.lineTo(x * canvas.width, y * canvas.height);
    ctx.stroke();
  };

  const handlePointerUp = (e) => {
    if (!isDrawing || !isMyTurn) return;
    if (e) e.preventDefault();
    setIsDrawing(false);

    if (currentStrokeRef.current.length > 0) {
      const strokeAction = {
        type: activeTool === 'eraser' ? 'eraser' : 'brush',
        points: currentStrokeRef.current,
        color: selectedColor,
        size: brushSize
      };

      setLocalHistory(prev => [...prev, strokeAction]);
      redoStackRef.current = [];
      setRedoAvailable(false);
      socket.emit('draw_action', { code: roomCode, action: strokeAction });
      currentStrokeRef.current = [];
    }
  };

  const handleUndo = () => {
    if (!isMyTurn || isPaused || localHistory.length === 0) return;
    sounds.playPop();
    const newHistory = localHistory.slice(0, -1);
    const undone = localHistory[localHistory.length - 1];
    redoStackRef.current = [...redoStackRef.current, undone];
    setRedoAvailable(true);
    setLocalHistory(newHistory);
    const canvas = canvasRef.current;
    if (canvas) redrawEntireCanvas(newHistory, canvas.width);
    socket.emit('draw_action', { code: roomCode, action: { type: 'undo' } });
  };

  const handleRedo = () => {
    if (!isMyTurn || isPaused || redoStackRef.current.length === 0) return;
    sounds.playPop();
    const stack = redoStackRef.current;
    const action = stack[stack.length - 1];
    redoStackRef.current = stack.slice(0, -1);
    setRedoAvailable(redoStackRef.current.length > 0);

    setLocalHistory(prev => [...prev, action]);
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      executeActionOnCanvas(ctx, action, canvas.width);
    }
    socket.emit('draw_action', { code: roomCode, action });
  };

  const handleSkip = () => {
    if (!isMyTurn || isPaused || isSkipping) return;
    sounds.playPop();
    setIsSkipping(true);
    socket.emit('skip_turn', { code: roomCode, slot: mySlot }, () => {
      setIsSkipping(false);
    });
    setTimeout(() => setIsSkipping(false), 2000);
  };

  const handleTogglePause = () => {
    sounds.playPop();
    socket.emit('toggle_pause', { code: roomCode });
  };

  const handleSendChat = (e) => {
    e.preventDefault();
    if (!chatText.trim()) return;
    socket.emit('send_chat', { code: roomCode, text: chatText.trim(), isReaction: false });
    setChatText('');
  };

  const handleSendReaction = (emoji) => {
    sounds.playPop();
    socket.emit('send_chat', { code: roomCode, text: emoji, isReaction: true });
  };

  return (
    <div className="w-full h-full flex flex-col justify-between safe-top safe-bottom relative overflow-hidden select-none bg-[#0d0e15] text-slate-100">
      {/* ===== TOP BAR ===== */}
      <header className="w-full px-3 pt-1.5 pb-1.5 flex flex-col gap-1.5 shrink-0 z-10 border-b border-slate-800/80 bg-[#12141f]/95 backdrop-blur-md">
        {/* Row 1: Status & Turns Progress & Timer */}
        <div className="flex items-center justify-between">
          {/* Left: Room code & Ping */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-mono font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-lg border border-rose-500/20">
              {roomCode}
            </span>
            <div className="flex items-center gap-1 text-[11px] text-slate-400 font-medium">
              <Wifi className={`w-3 h-3 ${ping < 100 ? 'text-emerald-400' : 'text-amber-400'}`} />
              <span>{ping > 0 ? `${ping}ms` : ''}</span>
            </div>
          </div>

          {/* Middle: 6 Turns Progress */}
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5, 6].map((turnNum) => {
              const isPast = turnNum < currentTurn;
              const isCurrent = turnNum === currentTurn;
              const isSlot1 = turnNum % 2 === 1;
              const drawerNick = isSlot1 ? gameState.players?.[1]?.nickname : gameState.players?.[2]?.nickname;
              return (
                <div
                  key={turnNum}
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${
                    isCurrent
                      ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white ring-2 ring-rose-400 shadow-sm animate-pulse'
                      : isPast
                      ? 'bg-emerald-500 text-white'
                      : 'bg-[#1e2232] text-slate-500 border border-slate-700'
                  }`}
                  title={`Turn ${turnNum}: ${drawerNick || 'Partner'}`}
                >
                  {isPast ? '✓' : turnNum}
                </div>
              );
            })}
          </div>

          {/* Right: Pause & Countdown */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleTogglePause}
              className={`p-1 rounded-lg border transition-all ${
                isPaused
                  ? 'bg-emerald-600 text-white border-emerald-500'
                  : 'bg-[#1b1e2e] text-slate-300 border-slate-700 hover:bg-[#252a3f]'
              }`}
              title={isPaused ? 'Resume' : 'Pause'}
            >
              {isPaused ? <Play className="w-3.5 h-3.5 fill-current" /> : <Pause className="w-3.5 h-3.5" />}
            </button>

            <div
              className={`flex items-center gap-1 px-2.5 py-0.5 rounded-lg font-mono text-xs font-bold border ${
                timeLeft <= 10
                  ? 'bg-rose-500 text-white border-rose-600 animate-pulse'
                  : 'bg-[#1b1e2e] text-slate-200 border-slate-700'
              }`}
            >
              <Clock className="w-3 h-3 text-rose-400" />
              <span>{timeLeft}s</span>
            </div>
          </div>
        </div>

        {/* Row 2: Prompt + Active Turn Banner + Pass Turn Button */}
        <div className={`flex items-center justify-between px-2.5 py-1 rounded-xl border transition-all ${
          isMyTurn ? 'bg-[#1a1827] border-rose-500/40 active-turn-glow' : 'bg-[#151825] border-slate-800'
        }`}>
          <div className="flex items-center gap-1.5 truncate max-w-[55%]">
            <span className="text-xs">🎨</span>
            <span className="text-xs font-bold text-white truncate" title={prompt}>
              {prompt}
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {isMyTurn ? (
              <>
                <button
                  type="button"
                  onClick={handleSkip}
                  disabled={isSkipping}
                  className="btn-couple-primary px-2.5 py-1 text-[11px] font-bold rounded-lg shadow-sm active:scale-95 transition"
                  title="Pass the canvas to your partner early"
                >
                  <SkipForward className="w-3 h-3" />
                  <span>{isSkipping ? 'Passing...' : 'Pass Turn ⏭'}</span>
                </button>
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-300 bg-rose-500/20 border border-rose-500/30 px-2 py-0.5 rounded-lg">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                  Your Turn ✏️
                </span>
              </>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-300 bg-[#1e2232] border border-slate-700 px-2.5 py-0.5 rounded-lg">
                <Heart className="w-3 h-3 fill-rose-500 text-rose-500 animate-heartbeat" />
                <span>{partnerNickname}'s Turn 👀</span>
              </span>
            )}
          </div>
        </div>

        {/* Row 3: Step Blueprint Button */}
        <button
          type="button"
          onClick={() => setShowStepsModal(!showStepsModal)}
          className="w-full flex items-center justify-between px-2.5 py-1 rounded-lg bg-[#161824] border border-slate-800 text-left hover:border-rose-500/30 transition"
        >
          <div className="flex items-center gap-2 truncate">
            <span className="px-1.5 py-0.5 rounded bg-rose-600 text-white text-[10px] font-bold shrink-0">
              Step {currentTurn}/6
            </span>
            <span className="text-xs font-medium text-slate-300 truncate">
              {currentStep}
            </span>
          </div>
          <span className="text-[10px] text-rose-400 font-semibold shrink-0 ml-1 flex items-center gap-0.5">
            <ListOrdered className="w-3 h-3" />
            <span>Steps</span>
          </span>
        </button>
      </header>

      {/* ===== CANVAS AREA ===== */}
      <main
        ref={containerRef}
        className="flex-1 w-full flex items-center justify-center p-2 relative overflow-hidden"
      >
        <div className="w-full max-w-[370px] aspect-square relative flex items-center justify-center">
          <canvas
            ref={canvasRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            className={`whiteboard-surface w-full h-full ${
              isMyTurn && !isPaused ? 'cursor-crosshair' : 'cursor-not-allowed pointer-events-none'
            }`}
          />

          {/* Turn Handover Popup Banner (Over Canvas) */}
          {turnBanner && (
            <div className="absolute inset-0 flex items-center justify-center p-4 pointer-events-none z-30 animate-fade-in">
              <div className={`px-4 py-3 rounded-2xl shadow-2xl border text-center backdrop-blur-md transition-all max-w-[280px] ${
                turnBanner.isMine
                  ? 'bg-rose-950/90 border-rose-500/60 text-white rose-glow ring-2 ring-rose-500/40'
                  : 'bg-slate-900/90 border-slate-700 text-white shadow-black/80'
              }`}>
                <div className="inline-flex items-center justify-center w-8 h-8 rounded-full mb-1 bg-white/10 text-base">
                  {turnBanner.isMine ? '✏️' : '👀'}
                </div>
                <h3 className="text-xs font-extrabold tracking-tight">
                  {turnBanner.title}
                </h3>
                <p className="text-[10px] font-medium text-slate-300 mt-0.5 line-clamp-2 leading-snug">
                  {turnBanner.subtitle}
                </p>
              </div>
            </div>
          )}

          {/* Pause overlay */}
          {isPaused && (
            <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/60 backdrop-blur-xs z-10">
              <div className="bg-[#1b1e2e] border border-rose-500/30 px-4 py-2.5 rounded-xl shadow-xl text-center">
                <span className="text-xl">⏸️</span>
                <p className="text-xs font-bold text-white mt-1">
                  {pauseReason === 'disconnect' ? 'Partner Reconnecting...' : 'Game Paused'}
                </p>
              </div>
            </div>
          )}

          {/* Floating chat toast */}
          {floatingToast && (
            <div className="absolute bottom-3 left-3 animate-toast pointer-events-none z-30">
              <div className="px-3 py-1.5 rounded-xl bg-[#1a1d2d] border border-rose-500/30 text-white shadow-xl text-xs font-medium flex items-center gap-1.5 max-w-[220px]">
                <span className="text-rose-400 shrink-0 font-bold">{floatingToast.sender}:</span>
                <span className={`truncate ${floatingToast.isReaction ? 'text-lg' : 'text-xs'}`}>
                  {floatingToast.text}
                </span>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ===== DRAWING TOOLS SECTION ===== */}
      <section className="w-full px-3 py-1.5 bg-[#12141f] border-t border-slate-800 shrink-0 z-10">
        {isMyTurn ? (
          <div className="max-w-md mx-auto flex flex-col gap-1.5">
            {/* Top Toolbar: Tools | Slider | Undo/Redo | Pass */}
            <div className="flex items-center justify-between gap-1.5">
              {/* Tool Buttons */}
              <div className="flex items-center gap-0.5 bg-[#1a1d2c] p-0.5 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => { setActiveTool('brush'); sounds.playPop(); }}
                  className={`p-1.5 rounded-lg transition-all ${
                    activeTool === 'brush'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="Brush"
                >
                  <Paintbrush className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => { setActiveTool('eraser'); sounds.playPop(); }}
                  className={`p-1.5 rounded-lg transition-all ${
                    activeTool === 'eraser'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="Eraser"
                >
                  <Eraser className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => { setActiveTool('bucket'); sounds.playPop(); }}
                  className={`p-1.5 rounded-lg transition-all ${
                    activeTool === 'bucket'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="Fill Bucket"
                >
                  <PaintBucket className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Brush Size Slider with Live Indicator Dot */}
              <div className="flex items-center gap-1.5 px-2 py-1 bg-[#1a1d2c] rounded-xl border border-slate-800" title={`Brush size: ${brushSize}px`}>
                <span
                  className="rounded-full bg-rose-500 shrink-0 shadow-xs"
                  style={{
                    width: `${Math.max(4, Math.min(16, brushSize))}px`,
                    height: `${Math.max(4, Math.min(16, brushSize))}px`
                  }}
                />
                <input
                  type="range"
                  min="2"
                  max="28"
                  value={brushSize}
                  onChange={(e) => setBrushSize(Number(e.target.value))}
                  className="brush-slider w-16 sm:w-20"
                />
                <span className="text-[10px] font-mono text-slate-400 w-3 text-right">
                  {brushSize}
                </span>
              </div>

              {/* Undo & Redo & Pass */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleUndo}
                  disabled={localHistory.length === 0}
                  className="p-1.5 rounded-xl border border-slate-800 bg-[#1a1d2c] text-slate-300 hover:bg-[#25293d] active:scale-95 disabled:opacity-30 disabled:pointer-events-none"
                  title="Undo"
                >
                  <Undo2 className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={handleRedo}
                  disabled={!redoAvailable}
                  className="p-1.5 rounded-xl border border-slate-800 bg-[#1a1d2c] text-slate-300 hover:bg-[#25293d] active:scale-95 disabled:opacity-30 disabled:pointer-events-none"
                  title="Redo"
                >
                  <Redo2 className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={handleSkip}
                  disabled={isSkipping}
                  className="p-1.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 hover:bg-rose-500/20 active:scale-95 flex items-center gap-1"
                  title="Pass turn to partner"
                >
                  <SkipForward className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-bold">Pass</span>
                </button>
              </div>
            </div>

            {/* ROUND Color Swatches (Circular) */}
            <div className="flex items-center justify-between gap-1 overflow-x-auto py-0.5 no-scrollbar">
              {QUICK_COLORS.map(c => (
                <button
                  key={c.hex}
                  type="button"
                  onClick={() => { setSelectedColor(c.hex); sounds.playPop(); }}
                  className={`w-7 h-7 rounded-full shrink-0 transition-all active:scale-90 ${
                    selectedColor === c.hex
                      ? 'scale-115 ring-2 ring-rose-500 ring-offset-2 ring-offset-[#12141f] border-2 border-white shadow-md'
                      : 'border border-white/20 hover:scale-105'
                  }`}
                  style={{ backgroundColor: c.hex }}
                  title={c.name}
                />
              ))}

              {/* ROUND Custom Color Picker Button */}
              <label
                className="relative w-7 h-7 rounded-full shrink-0 cursor-pointer overflow-hidden border border-rose-500/40 bg-[#1a1d2c] flex items-center justify-center text-xs font-bold text-rose-400 hover:bg-[#252a3f] active:scale-90 transition shadow-xs"
                title="Custom color picker"
              >
                <span>+</span>
                <input
                  type="color"
                  value={selectedColor}
                  onChange={(e) => setSelectedColor(e.target.value)}
                  className="absolute opacity-0 w-0 h-0 cursor-pointer"
                />
              </label>
            </div>
          </div>
        ) : (
          /* Spectator Quick Reaction Bar */
          <div className="max-w-md mx-auto flex items-center justify-between py-1">
            <span className="text-xs font-semibold text-rose-400 flex items-center gap-1">
              <Heart className="w-3 h-3 fill-rose-500 text-rose-500 animate-heartbeat" />
              <span>Cheer {partnerNickname}:</span>
            </span>
            <div className="flex items-center gap-1">
              {EMOJI_REACTIONS.map(emoji => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => handleSendReaction(emoji)}
                  className="text-base p-1 rounded-lg hover:bg-[#1f2335] active:scale-125 transition-transform"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* ===== BOTTOM CHAT BAR ===== */}
      <footer className="w-full px-3 py-1.5 bg-[#0f111a] border-t border-slate-800 shrink-0 z-20">
        <div className="max-w-md mx-auto flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setChatOpen(!chatOpen)}
            className="p-2 rounded-xl bg-[#191c2b] border border-slate-800 text-rose-400 hover:bg-[#22263a] transition relative shrink-0"
            title="Chat History"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            {chatList.length > 0 && (
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-rose-500" />
            )}
          </button>

          <form onSubmit={handleSendChat} className="flex-1 flex items-center gap-1.5">
            <input
              type="text"
              maxLength={70}
              value={chatText}
              onChange={(e) => setChatText(e.target.value)}
              placeholder={`Message ${partnerNickname}... 💕`}
              className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-800 bg-[#161824] focus:outline-none focus:border-rose-500 text-white placeholder-slate-500 transition"
            />
            <button
              type="submit"
              disabled={!chatText.trim()}
              className="p-2 rounded-xl btn-couple-primary disabled:opacity-40 shrink-0"
            >
              <Send className="w-3 h-3" />
            </button>
          </form>
        </div>
      </footer>

      {/* ===== STEPS MODAL ===== */}
      {showStepsModal && (
        <div className="absolute inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="card-dark p-4 max-w-xs w-full bg-[#161824] shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-2">
              <span className="text-xs font-bold text-white flex items-center gap-1">
                <span>🎨 6-Step Blueprint</span>
              </span>
              <button onClick={() => setShowStepsModal(false)} className="p-1 rounded-lg text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs font-bold text-rose-400 mb-2">{prompt}</p>

            <div className="space-y-1.5 max-h-60 overflow-y-auto no-scrollbar py-1">
              {promptSteps.map((step, idx) => {
                const turnNum = idx + 1;
                const isPast = turnNum < currentTurn;
                const isCurrent = turnNum === currentTurn;
                const isSlot1 = turnNum % 2 === 1;
                const drawerNick = isSlot1 ? gameState.players?.[1]?.nickname : gameState.players?.[2]?.nickname;

                return (
                  <div
                    key={idx}
                    className={`p-2 rounded-xl border text-xs transition-all flex items-start gap-2 ${
                      isCurrent
                        ? 'bg-rose-500/10 border-rose-500/40 text-rose-200 font-medium'
                        : isPast
                        ? 'bg-[#12141e] border-slate-800 text-slate-500'
                        : 'bg-[#191c2b] border-slate-800/60 text-slate-300'
                    }`}
                  >
                    <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5 ${
                      isCurrent ? 'bg-rose-500 text-white' : isPast ? 'bg-emerald-500 text-white' : 'bg-slate-700 text-slate-300'
                    }`}>
                      {isPast ? '✓' : turnNum}
                    </span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-semibold text-rose-400/80">
                          {drawerNick || `Partner ${isSlot1 ? 1 : 2}`}
                        </span>
                        {isCurrent && (
                          <span className="text-[9px] font-bold text-white bg-rose-600 px-1.5 py-0.2 rounded-full">
                            Now
                          </span>
                        )}
                      </div>
                      <p className="text-xs leading-tight mt-0.5">{step}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              onClick={() => setShowStepsModal(false)}
              className="w-full btn-couple-primary py-2 text-xs font-bold mt-3"
            >
              Back to Canvas 💕
            </button>
          </div>
        </div>
      )}

      {/* ===== CHAT DRAWER ===== */}
      {chatOpen && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-xs z-40 flex flex-col justify-end">
          <div className="bg-[#161824] rounded-t-2xl p-4 max-h-[60%] flex flex-col shadow-2xl border-t border-rose-500/30">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Heart className="w-3.5 h-3.5 fill-rose-500 text-rose-500" />
                <span>Couple Live Chat 💕</span>
              </span>
              <button onClick={() => setChatOpen(false)} className="p-1 rounded-lg text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div ref={chatScrollRef} className="flex-1 overflow-y-auto py-2 space-y-2 max-h-48 text-xs">
              {chatList.length === 0 ? (
                <p className="text-center text-slate-500 py-4 text-xs">
                  No messages yet. Send a cute thought! 🌸
                </p>
              ) : (
                chatList.map((m) => {
                  const isMe = m.slot === mySlot;
                  return (
                    <div key={m.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                      <span className="text-[10px] text-slate-400 px-1">{m.sender}</span>
                      <div className={`px-3 py-1.5 rounded-xl max-w-[80%] font-medium ${
                        isMe
                          ? 'bg-gradient-to-r from-rose-600 to-pink-600 text-white'
                          : 'bg-[#1e2232] text-slate-200 border border-slate-700'
                      } ${m.isReaction ? 'text-lg bg-transparent border-0 p-0' : 'text-xs'}`}>
                        {m.text}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <form onSubmit={handleSendChat} className="flex items-center gap-1.5 pt-2 border-t border-slate-800 mt-1">
              <input
                type="text"
                maxLength={70}
                value={chatText}
                onChange={(e) => setChatText(e.target.value)}
                placeholder="Say something sweet... 💕"
                className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-slate-700 bg-[#10121a] text-white focus:outline-none focus:border-rose-500"
              />
              <button
                type="submit"
                disabled={!chatText.trim()}
                className="p-1.5 rounded-xl btn-couple-primary disabled:opacity-40"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
