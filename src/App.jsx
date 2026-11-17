import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import CoupleAuthScreen from './components/CoupleAuthScreen';
import CoupleHomeScreen from './components/CoupleHomeScreen';
import GameScreen from './components/GameScreen';
import ResultsScreen from './components/ResultsScreen';
import { sounds } from './utils/sound';

export default function App() {
  const [socket, setSocket] = useState(null);
  const [screen, setScreen] = useState('lobby'); // 'lobby' | 'game' | 'results'
  const [roomCode, setRoomCode] = useState('');
  const [mySlot, setMySlot] = useState(1);
  const [myNickname, setMyNickname] = useState('');
  const [ping, setPing] = useState(0);

  // Couple permanent session
  const [couple, setCouple] = useState(() => {
    try {
      const saved = localStorage.getItem('sketch_relay_couple');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('sketch_relay_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (currentUser?.name) {
      setMyNickname(currentUser.name);
      setMySlot(currentUser.slot || 1);
    }
  }, [currentUser]);

  // Full synchronized game state
  const [gameState, setGameState] = useState({
    status: 'waiting',
    prompt: '',
    promptSteps: [],
    currentStep: '',
    currentTurn: 1,
    totalTurns: 6,
    timeLeft: 40,
    isPaused: false,
    pauseReason: null,
    activeSlot: 1,
    players: { 1: null, 2: null },
    canvasHistory: [],
    chatMessages: []
  });

  const [resultData, setResultData] = useState(null);

  // Initialize socket connection
  useEffect(() => {
    const serverUrl = window.location.hostname === 'localhost' && window.location.port === '5173'
      ? 'http://localhost:3000'
      : window.location.origin;

    const newSocket = io(serverUrl, {
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000
    });

    setSocket(newSocket);

    const pingInterval = setInterval(() => {
      if (newSocket.connected) {
        const start = Date.now();
        newSocket.emit('ping_check', { time: start });
      }
    }, 2500);

    newSocket.on('pong_check', ({ time }) => {
      const rtt = Math.max(1, Math.round((Date.now() - time) / 2));
      setPing(rtt);
    });

    return () => {
      clearInterval(pingInterval);
      newSocket.disconnect();
    };
  }, []);

  // Socket game lifecycle events
  useEffect(() => {
    if (!socket) return;

    socket.on('partner_joined', ({ players }) => {
      setGameState(prev => ({
        ...prev,
        players
      }));

      // Host triggers auto-start on partner join
      if (mySlot === 1 && roomCode) {
        setTimeout(() => {
          socket.emit('start_game', { code: roomCode });
        }, 800);
      }
    });

    // Game Started
    socket.on('game_started', (data) => {
      setGameState(prev => ({
        ...prev,
        status: 'playing',
        prompt: data.prompt,
        promptSteps: data.promptSteps || [],
        currentStep: data.currentStep || data.promptSteps?.[0] || '',
        currentTurn: data.currentTurn,
        totalTurns: data.totalTurns,
        timeLeft: data.timeLeft,
        activeSlot: data.activeSlot,
        players: data.players || prev.players,
        isPaused: false,
        pauseReason: null,
        canvasHistory: []
      }));
      setScreen('game');
    });

    // Timer Tick
    socket.on('timer_tick', ({ timeLeft }) => {
      setGameState(prev => ({
        ...prev,
        timeLeft
      }));
    });

    // Turn Changed (Relay handover!)
    socket.on('turn_changed', (data) => {
      setGameState(prev => ({
        ...prev,
        currentTurn: data.currentTurn,
        totalTurns: data.totalTurns,
        timeLeft: data.timeLeft,
        activeSlot: data.activeSlot,
        currentStep: data.currentStep || prev.promptSteps?.[data.currentTurn - 1] || ''
      }));
    });

    // Pause / Resume Toggled
    socket.on('pause_toggled', (data) => {
      setGameState(prev => ({
        ...prev,
        isPaused: data.isPaused,
        pauseReason: data.pauseReason,
        timeLeft: data.timeLeft !== undefined ? data.timeLeft : prev.timeLeft
      }));
    });

    // Partner Disconnected
    socket.on('partner_disconnected', () => {
      setGameState(prev => ({
        ...prev,
        isPaused: true,
        pauseReason: 'disconnect'
      }));
    });

    // Partner Reconnected
    socket.on('partner_reconnected', (data) => {
      setGameState(prev => ({
        ...prev,
        isPaused: data.isPaused,
        pauseReason: data.pauseReason
      }));
    });

    // Game Finished (6 turns completed)
    socket.on('game_ended', (data) => {
      setResultData(data);
      setGameState(prev => ({
        ...prev,
        status: 'results',
        prompt: data.prompt,
        promptSteps: data.promptSteps || []
      }));
      setScreen('results');
    });

    // On reconnect restore session
    socket.on('connect', () => {
      const savedSession = sessionStorage.getItem('sketchrelay_session');
      if (savedSession) {
        try {
          const sess = JSON.parse(savedSession);
          if (sess.roomCode && sess.mySlot) {
            socket.emit('reconnect_slot', {
              code: sess.roomCode,
              slot: sess.mySlot,
              nickname: sess.myNickname
            }, (res) => {
              if (res && res.success && res.room) {
                setRoomCode(sess.roomCode);
                setMySlot(sess.mySlot);
                setMyNickname(sess.myNickname);
                setGameState(prev => ({
                  ...prev,
                  ...res.room
                }));
                if (res.room.status === 'playing') {
                  setScreen('game');
                } else if (res.room.status === 'results') {
                  setResultData({
                    prompt: res.room.prompt,
                    promptSteps: res.room.promptSteps || [],
                    canvasHistory: res.room.canvasHistory,
                    players: [
                      { slot: 1, nickname: res.room.players?.[1]?.nickname },
                      { slot: 2, nickname: res.room.players?.[2]?.nickname }
                    ]
                  });
                  setScreen('results');
                }
              }
            });
          }
        } catch (e) {}
      }
    });

    return () => {
      socket.off('partner_joined');
      socket.off('game_started');
      socket.off('timer_tick');
      socket.off('turn_changed');
      socket.off('pause_toggled');
      socket.off('partner_disconnected');
      socket.off('partner_reconnected');
      socket.off('game_ended');
    };
  }, [socket, mySlot, roomCode]);

  // When room is ready from Lobby
  const handleRoomReady = ({ code, slot, myNickname, room }) => {
    setRoomCode(code);
    setMySlot(slot);
    setMyNickname(myNickname);

    sessionStorage.setItem('sketchrelay_session', JSON.stringify({
      roomCode: code,
      mySlot: slot,
      myNickname
    }));

    if (room) {
      setGameState(prev => ({
        ...prev,
        players: room.players || prev.players
      }));
    }
  };

  const handlePlayAgain = () => {
    if (!socket || !roomCode) return;
    socket.emit('play_again', { code: roomCode });
  };

  const handleGoHome = () => {
    sessionStorage.removeItem('sketchrelay_session');
    setRoomCode('');
    setResultData(null);
    setGameState({
      status: 'waiting',
      prompt: '',
      promptSteps: [],
      currentStep: '',
      currentTurn: 1,
      totalTurns: 6,
      timeLeft: 40,
      isPaused: false,
      pauseReason: null,
      activeSlot: 1,
      players: { 1: null, 2: null },
      canvasHistory: [],
      chatMessages: []
    });
    setScreen('lobby');
  };

  const handleCoupleAuthenticated = ({ couple: newCouple, currentUser: newUser }) => {
    setCouple(newCouple);
    setCurrentUser(newUser);
    setMyNickname(newUser.name);
    setMySlot(newUser.slot || 1);
    localStorage.setItem('sketch_relay_couple', JSON.stringify(newCouple));
    localStorage.setItem('sketch_relay_user', JSON.stringify(newUser));
  };

  const handleLogout = () => {
    localStorage.removeItem('sketch_relay_couple');
    localStorage.removeItem('sketch_relay_user');
    sessionStorage.removeItem('sketchrelay_session');
    setCouple(null);
    setCurrentUser(null);
    setRoomCode('');
    setScreen('lobby');
  };

  return (
    <div className="w-full h-full flex flex-col overflow-hidden relative font-cute select-none">
      {/* If couple is not authenticated / linked yet, show Couple Auth & Pairing */}
      {(!couple || !couple.is_linked) ? (
        <CoupleAuthScreen onAuthenticated={handleCoupleAuthenticated} />
      ) : (
        <>
          {screen === 'lobby' && (
            <CoupleHomeScreen
              socket={socket}
              couple={couple}
              currentUser={currentUser}
              onRoomReady={handleRoomReady}
              onLogout={handleLogout}
              ping={ping}
            />
          )}

          {screen === 'game' && (
            <GameScreen
              socket={socket}
              roomCode={roomCode}
              mySlot={mySlot}
              myNickname={myNickname}
              gameState={gameState}
              ping={ping}
              onEndGame={() => setScreen('results')}
            />
          )}

          {screen === 'results' && (
            <ResultsScreen
              resultData={resultData}
              onPlayAgain={handlePlayAgain}
              onGoHome={handleGoHome}
              isHost={mySlot === 1}
              coupleId={couple?.id}
            />
          )}
        </>
      )}
    </div>
  );
}
