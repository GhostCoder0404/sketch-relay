import React, { useState, useEffect } from 'react';
import {
  Heart,
  Sparkles,
  Play,
  Calendar,
  Tag,
  Wifi,
  LogOut,
  Image as ImageIcon,
  ExternalLink,
  X,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { sounds } from '../utils/sound';
import { getCoupleDrawings } from '../utils/supabase';

export default function CoupleHomeScreen({
  socket,
  couple,
  currentUser,
  onRoomReady,
  onLogout,
  ping
}) {
  const [drawings, setDrawings] = useState([]);
  const [loadingDrawings, setLoadingDrawings] = useState(true);
  const [selectedDrawing, setSelectedDrawing] = useState(null);
  const [isStartingGame, setIsStartingGame] = useState(false);
  const [waitingForPartner, setWaitingForPartner] = useState(false);

  const partner1Name = couple?.partner1_name || 'Sweetie';
  const partner2Name = couple?.partner2_name || 'Honey';
  const myName = currentUser?.name || partner1Name;
  const partnerName = currentUser?.slot === 1 ? partner2Name : partner1Name;

  // Fetch drawings from Supabase
  const loadGallery = async () => {
    if (!couple?.id) return;
    setLoadingDrawings(true);
    try {
      const data = await getCoupleDrawings(couple.id);
      setDrawings(data);
    } catch (err) {
      console.error('Error loading gallery:', err);
    } finally {
      setLoadingDrawings(false);
    }
  };

  useEffect(() => {
    loadGallery();
  }, [couple?.id]);

  // Handle Start Game
  const handleStartGame = () => {
    if (!socket || !couple?.pair_code) return;
    setIsStartingGame(true);
    sounds.playPop();

    const roomCode = couple.pair_code;
    const isPartner1 = currentUser?.slot === 1;

    // First try to join if room already exists on server, otherwise create room
    socket.emit('join_room', {
      code: roomCode,
      nickname: myName
    }, (res) => {
      if (res && res.success) {
        setIsStartingGame(false);
        onRoomReady({
          code: roomCode,
          slot: res.slot || (isPartner1 ? 1 : 2),
          myNickname: myName,
          room: res.room
        });
      } else {
        // Room not created yet on server, create it
        socket.emit('create_room', {
          code: roomCode,
          myNickname: myName,
          partnerNickname: partnerName
        }, (createRes) => {
          setIsStartingGame(false);
          if (createRes && createRes.success) {
            onRoomReady({
              code: roomCode,
              slot: 1,
              myNickname: myName,
              room: createRes.room
            });
            setWaitingForPartner(true);
          } else {
            // Room exists or other error, fallback to join
            onRoomReady({
              code: roomCode,
              slot: isPartner1 ? 1 : 2,
              myNickname: myName,
              room: null
            });
          }
        });
      }
    });
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="w-full h-full flex flex-col justify-between p-4 safe-top safe-bottom relative overflow-y-auto select-none bg-transparent text-slate-100">
      {/* Top Header */}
      <header className="w-full flex items-center justify-between pt-1 pb-3 max-w-lg mx-auto shrink-0">
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#161824]/80 backdrop-blur-md border border-slate-800 text-xs text-slate-400 font-medium shadow-sm">
          <Wifi className={`w-3.5 h-3.5 ${ping < 100 ? 'text-emerald-400' : 'text-amber-400'}`} />
          <span>{ping > 0 ? `${ping}ms` : 'Connected'}</span>
        </div>

        {/* Couple Tag */}
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 font-semibold shadow-sm">
          <span>{partner1Name}</span>
          <Heart className="w-3 h-3 fill-rose-500 text-rose-500 animate-heartbeat" />
          <span>{partner2Name}</span>
        </div>

        {/* Logout / Switch button */}
        <button
          onClick={onLogout}
          title="Switch Account"
          className="p-1.5 rounded-full bg-[#161824]/80 hover:bg-rose-500/20 border border-slate-800 hover:border-rose-500/30 text-slate-400 hover:text-rose-400 transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
        </button>
      </header>

      {/* Main Content Area */}
      <div className="w-full max-w-lg mx-auto flex-1 flex flex-col gap-6 my-auto py-2">
        {/* Hero Section */}
        <div className="card-dark p-6 text-center relative overflow-hidden flex flex-col items-center">
          <div className="relative inline-flex items-center justify-center mb-3">
            <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-rose-500/50 shadow-xl rose-glow p-0.5 bg-[#181b28]">
              <img
                src="/icon.jpg"
                alt="Sketch Relay"
                className="w-full h-full object-cover rounded-xl"
              />
            </div>
            <Heart className="w-4 h-4 fill-rose-400 text-rose-400 absolute -top-1 -right-1 animate-heartbeat" />
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center justify-center gap-1.5">
            Sketch Relay <span className="neon-text-rose">💕</span>
          </h1>

          <p className="text-xs text-slate-300 mt-1 max-w-xs mx-auto">
            Playing together: <span className="text-rose-400 font-semibold">{partner1Name}</span> & <span className="text-purple-400 font-semibold">{partner2Name}</span>
          </p>

          {/* Start Relay Game Button */}
          <button
            onClick={handleStartGame}
            disabled={isStartingGame}
            className="btn-rose w-full max-w-xs mt-5 py-3.5 px-6 rounded-2xl font-extrabold text-base flex items-center justify-center gap-2.5 shadow-xl rose-glow hover:scale-[1.02] active:scale-[0.98] transition-transform"
          >
            {isStartingGame ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Connecting Room...</span>
              </>
            ) : (
              <>
                <Play className="w-5 h-5 fill-current" />
                <span>Start Game 🎨</span>
              </>
            )}
          </button>

          {waitingForPartner && (
            <p className="text-xs text-rose-300 mt-2.5 flex items-center gap-1.5 animate-pulse">
              <span>Waiting for {partnerName} to tap Start...</span>
            </p>
          )}

          <div className="text-[11px] text-slate-400 mt-3 flex items-center gap-2">
            <span>6 Turns</span>
            <span>•</span>
            <span>40s per turn</span>
            <span>•</span>
            <span>Auto-saved to scrapbook</span>
          </div>
        </div>

        {/* Previous Drawn Collection (Our Memories Scrapbook) */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-rose-400" />
              <span>Our Masterpiece Collection</span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                {drawings.length}
              </span>
            </h2>

            <button
              onClick={loadGallery}
              disabled={loadingDrawings}
              className="text-xs text-slate-400 hover:text-rose-400 flex items-center gap-1 transition-colors"
            >
              <RefreshCw className={`w-3 h-3 ${loadingDrawings ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>

          {loadingDrawings ? (
            <div className="card-dark p-8 flex flex-col items-center justify-center gap-2 text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin text-rose-400" />
              <span className="text-xs">Loading our scrapbook...</span>
            </div>
          ) : drawings.length === 0 ? (
            <div className="card-dark p-8 text-center flex flex-col items-center justify-center gap-2 border border-dashed border-slate-800">
              <div className="w-12 h-12 rounded-full bg-rose-500/10 flex items-center justify-center text-xl text-rose-400 mb-1">
                🎨
              </div>
              <h3 className="text-sm font-bold text-white">No drawings yet!</h3>
              <p className="text-xs text-slate-400 max-w-xs">
                Tap <strong>Start Game</strong> above to play your first round together and save your masterpiece here.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {drawings.map((d) => (
                <div
                  key={d.id}
                  onClick={() => setSelectedDrawing(d)}
                  className="card-dark p-2 rounded-2xl flex flex-col gap-2 cursor-pointer group hover:border-rose-500/50 transition-all hover:scale-[1.02] shadow-md"
                >
                  {/* Drawing Thumbnail */}
                  <div className="w-full aspect-square rounded-xl overflow-hidden bg-white/95 border border-slate-700/50 relative">
                    <img
                      src={d.image_url}
                      alt={d.prompt}
                      className="w-full h-full object-contain"
                      loading="lazy"
                    />
                  </div>

                  {/* Tags directly below each drawing */}
                  <div className="flex flex-col gap-1 px-1">
                    {/* Prompt tag */}
                    <div className="flex items-start gap-1 text-[11px] font-semibold text-rose-300 line-clamp-2 leading-tight">
                      <Tag className="w-3 h-3 shrink-0 text-rose-400 mt-0.5" />
                      <span>{d.prompt}</span>
                    </div>

                    {/* Date tag */}
                    <div className="flex items-center gap-1 text-[10px] text-slate-400 font-medium">
                      <Calendar className="w-2.5 h-2.5 text-slate-500 shrink-0" />
                      <span>{formatDate(d.created_at)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Fullscreen Drawing Preview Modal */}
      {selectedDrawing && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setSelectedDrawing(null)}
        >
          <div
            className="card-dark max-w-sm w-full p-4 flex flex-col gap-3 relative shadow-2xl border-rose-500/30"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => setSelectedDrawing(null)}
              className="absolute top-3 right-3 p-1.5 rounded-full bg-slate-800 text-slate-300 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Drawing Full View */}
            <div className="w-full aspect-square rounded-xl overflow-hidden bg-white mt-1 border border-slate-700">
              <img
                src={selectedDrawing.image_url}
                alt={selectedDrawing.prompt}
                className="w-full h-full object-contain"
              />
            </div>

            {/* Prompt & Date Info */}
            <div className="flex flex-col gap-1 pt-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-rose-400">
                <Tag className="w-3.5 h-3.5" />
                <span>{selectedDrawing.prompt}</span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                <Calendar className="w-3 h-3 text-slate-500" />
                <span>{formatDate(selectedDrawing.created_at)}</span>
              </div>
            </div>

            <a
              href={selectedDrawing.image_url}
              target="_blank"
              rel="noreferrer"
              className="btn-rose w-full py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 mt-1"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Open Full Image</span>
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
