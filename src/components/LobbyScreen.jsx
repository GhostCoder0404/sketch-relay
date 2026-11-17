import React, { useState, useEffect } from 'react';
import { Copy, Check, ArrowRight, Palette, Heart, Wifi, Bot, Sparkles } from 'lucide-react';
import { sounds } from '../utils/sound';

const CATEGORY_TAGS = [
  { label: 'Romantic 💕', color: 'bg-rose-500/10 text-rose-300 border-rose-500/20' },
  { label: 'Funny 😂', color: 'bg-amber-500/10 text-amber-300 border-amber-500/20' },
  { label: 'Food 🍕', color: 'bg-orange-500/10 text-orange-300 border-orange-500/20' },
  { label: 'Adventure 🚀', color: 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20' },
  { label: 'Nature 🌿', color: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20' },
];

export default function LobbyScreen({ socket, onRoomReady, ping }) {
  const [tab, setTab] = useState('create');
  const [myNickname, setMyNickname] = useState('');
  const [partnerNickname, setPartnerNickname] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [generatedCode, setGeneratedCode] = useState(null);
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [waitingForPartner, setWaitingForPartner] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam) {
      setJoinCode(roomParam.toUpperCase());
      setTab('join');
    }
  }, []);

  const handleCreateRoom = (e, withBot = false) => {
    if (e && e.preventDefault) e.preventDefault();
    const effectiveMyNick = myNickname.trim() || 'Sweetie';
    const effectivePartnerNick = withBot ? 'SweetBot 🤖' : (partnerNickname.trim() || 'Honey');

    setError('');
    setIsLoading(true);
    sounds.playPop();

    socket.emit('create_room', {
      myNickname: effectiveMyNick,
      partnerNickname: effectivePartnerNick
    }, (res) => {
      setIsLoading(false);
      if (res && res.success) {
        setGeneratedCode(res.code);
        onRoomReady({
          code: res.code,
          slot: 1,
          myNickname: effectiveMyNick,
          room: res.room
        });

        if (withBot) {
          socket.emit('add_bot_partner', { code: res.code });
        } else {
          setWaitingForPartner(true);
        }
      } else {
        setError(res?.error || 'Failed to create room. Please try again.');
      }
    });
  };

  const handleAddBotToWaitingRoom = () => {
    if (!generatedCode) return;
    sounds.playPop();
    setIsLoading(true);
    socket.emit('add_bot_partner', { code: generatedCode }, () => {
      setIsLoading(false);
    });
  };

  const handleJoinRoom = (e) => {
    e.preventDefault();
    if (!joinCode.trim()) {
      setError('Please enter the room code');
      return;
    }
    const nick = myNickname.trim() || 'Honey';

    setError('');
    setIsLoading(true);
    sounds.playPop();

    socket.emit('join_room', {
      code: joinCode.trim().toUpperCase(),
      nickname: nick
    }, (res) => {
      setIsLoading(false);
      if (res && res.success) {
        onRoomReady({
          code: res.code,
          slot: 2,
          myNickname: nick,
          room: res.room
        });
      } else {
        setError(res?.error || 'Could not join room. Check code & try again.');
      }
    });
  };

  const copyRoomCode = () => {
    if (!generatedCode) return;
    const shareUrl = `${window.location.origin}?room=${generatedCode}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      sounds.playPop();
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      navigator.clipboard.writeText(generatedCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="w-full h-full flex flex-col items-center justify-between p-4 safe-top safe-bottom relative overflow-hidden select-none bg-[#0d0e15] text-slate-100">
      {/* Top Header */}
      <header className="w-full flex items-center justify-between pt-1 pb-2 max-w-sm mx-auto">
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#161824] border border-slate-800 text-xs text-slate-400 font-medium">
          <Wifi className={`w-3.5 h-3.5 ${ping < 100 ? 'text-emerald-400' : 'text-amber-400'}`} />
          <span>{ping > 0 ? `${ping}ms` : 'Connected'}</span>
        </div>
        <div className="text-xs text-rose-400 font-semibold bg-rose-500/10 border border-rose-500/20 px-3 py-1 rounded-full flex items-center gap-1">
          <Heart className="w-3 h-3 fill-rose-500 text-rose-500 animate-heartbeat" />
          <span>500 Couple Prompts</span>
        </div>
      </header>

      {/* Main Container */}
      <div className="w-full max-w-sm flex-1 flex flex-col justify-center my-auto">
        {/* Logo & Headline */}
        <div className="text-center mb-5">
          <div className="relative inline-flex items-center justify-center mb-3">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-rose-600 via-pink-600 to-purple-600 flex items-center justify-center rose-glow">
              <Palette className="w-7 h-7 text-white" />
            </div>
            <Heart className="w-4 h-4 fill-rose-400 text-rose-400 absolute -top-1 -right-1 animate-heartbeat" />
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center justify-center gap-1.5">
            Sketch Relay <span className="neon-text-rose">💕</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
            Two partners • One sketch • 40s per turn
          </p>

          {/* Category Chips */}
          <div className="flex flex-wrap items-center justify-center gap-1.5 mt-3">
            {CATEGORY_TAGS.map(c => (
              <span key={c.label} className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${c.color}`}>
                {c.label}
              </span>
            ))}
          </div>
        </div>

        {waitingForPartner ? (
          <div className="card-dark p-5 text-center">
            <div className="w-12 h-12 mx-auto rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-xl mb-2 animate-heartbeat">
              💌
            </div>
            <h2 className="text-base font-bold text-white mb-1">Room Created!</h2>
            <p className="text-xs text-slate-400 mb-4">
              Share code with <span className="text-rose-400 font-semibold">{partnerNickname || 'Partner'}</span>:
            </p>

            <div className="bg-[#11131c] border border-rose-500/30 rounded-xl py-3 px-4 mb-4 flex items-center justify-between">
              <span className="text-xl font-mono font-bold tracking-widest text-rose-400">
                {generatedCode}
              </span>
              <button
                onClick={copyRoomCode}
                className="btn-couple-primary px-3 py-1.5 text-xs text-white"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>

            <div className="flex items-center justify-center gap-2 py-2 text-xs text-rose-400 font-medium">
              <div className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
              <span>Waiting for partner to join...</span>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800">
              <button
                onClick={handleAddBotToWaitingRoom}
                disabled={isLoading}
                className="w-full btn-couple-secondary py-2 text-xs font-semibold"
              >
                <Bot className="w-3.5 h-3.5" />
                <span>Play with SweetBot 🤖</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="card-dark p-5">
            {/* Segmented Tab */}
            <div className="grid grid-cols-2 p-1 bg-[#10121a] rounded-xl mb-4 border border-slate-800">
              <button
                type="button"
                onClick={() => { setTab('create'); setError(''); sounds.playPop(); }}
                className={`py-2 text-xs font-bold rounded-lg transition-all ${
                  tab === 'create'
                    ? 'bg-gradient-to-r from-rose-600 to-pink-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Create Room 🎨
              </button>
              <button
                type="button"
                onClick={() => { setTab('join'); setError(''); sounds.playPop(); }}
                className={`py-2 text-xs font-bold rounded-lg transition-all ${
                  tab === 'join'
                    ? 'bg-gradient-to-r from-rose-600 to-pink-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Enter Code 🔑
              </button>
            </div>

            {error && (
              <div className="mb-4 p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-medium text-center">
                {error}
              </div>
            )}

            {tab === 'create' ? (
              <form onSubmit={(e) => handleCreateRoom(e, false)} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Your Nickname 🐻
                  </label>
                  <input
                    type="text"
                    maxLength={15}
                    value={myNickname}
                    onChange={(e) => setMyNickname(e.target.value)}
                    placeholder="e.g. Sweetie, Alex..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-[#10121a] text-white focus:outline-none focus:border-rose-500 text-sm font-medium transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Partner's Nickname 🐰
                  </label>
                  <input
                    type="text"
                    maxLength={15}
                    value={partnerNickname}
                    onChange={(e) => setPartnerNickname(e.target.value)}
                    placeholder="e.g. Honey, Sam..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-[#10121a] text-white focus:outline-none focus:border-rose-500 text-sm font-medium transition"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full btn-couple-primary py-2.5 text-xs font-bold mt-1"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{isLoading ? 'Creating Room...' : 'Start Couple Relay 💕'}</span>
                  <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
                </button>

                <button
                  type="button"
                  onClick={() => handleCreateRoom(null, true)}
                  className="w-full btn-couple-secondary py-2 text-xs font-semibold mt-1"
                >
                  <Bot className="w-3.5 h-3.5" />
                  <span>Solo Practice (with Bot) 🤖</span>
                </button>
              </form>
            ) : (
              <form onSubmit={handleJoinRoom} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Room Code 🔑
                  </label>
                  <input
                    type="text"
                    maxLength={12}
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    placeholder="e.g. SKETCH-42"
                    className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-[#10121a] text-rose-400 font-mono font-bold text-center text-base uppercase focus:outline-none focus:border-rose-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Your Nickname 🌸
                  </label>
                  <input
                    type="text"
                    maxLength={15}
                    value={myNickname}
                    onChange={(e) => setMyNickname(e.target.value)}
                    placeholder="e.g. Honey, Sam..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-[#10121a] text-white focus:outline-none focus:border-rose-500 text-sm font-medium transition"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full btn-couple-primary py-2.5 text-xs font-bold mt-1"
                >
                  <Heart className="w-3.5 h-3.5 fill-white" />
                  <span>{isLoading ? 'Connecting...' : 'Join Partner 💕'}</span>
                  <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
                </button>
              </form>
            )}
          </div>
        )}
      </div>

      <footer className="text-center py-2 text-[11px] text-slate-500 font-medium">
        Made with 💕 for couples • 500 prompts • 40s per turn
      </footer>
    </div>
  );
}
