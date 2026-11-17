import React, { useEffect, useRef } from 'react';
import { Download, RotateCcw, CheckCircle2, Share2, Heart, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';
import { sounds } from '../utils/sound';

export default function ResultsScreen({ resultData, onPlayAgain, isHost }) {
  const canvasRef = useRef(null);

  const { prompt, promptSteps, canvasHistory, players } = resultData || {};
  const partner1 = players?.[0]?.nickname || 'Partner 1';
  const partner2 = players?.[1]?.nickname || 'Partner 2';

  useEffect(() => {
    confetti({
      particleCount: 85,
      spread: 75,
      origin: { y: 0.6 },
      colors: ['#f43f5e', '#ec4899', '#c084fc', '#38bdf8', '#34d399', '#fbbf24']
    });
    sounds.playFanfare();

    if (canvasRef.current && canvasHistory) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      const size = 600;
      canvas.width = size;
      canvas.height = size;

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, size, size);

      canvasHistory.forEach(action => {
        if (action.type === 'clear') {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, size, size);
        } else if (action.type === 'brush' || action.type === 'eraser') {
          if (!action.points || action.points.length < 2) return;
          ctx.beginPath();
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.lineWidth = action.size || 5;
          ctx.strokeStyle = action.type === 'eraser' ? '#ffffff' : (action.color || '#000000');

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
          floodFillHelper(ctx, x, y, action.color);
        }
      });
    }
  }, [canvasHistory]);

  const handleDownload = () => {
    if (!canvasRef.current) return;
    sounds.playPop();

    const exportCanvas = document.createElement('canvas');
    const width = 640;
    const height = 760;
    exportCanvas.width = width;
    exportCanvas.height = height;
    const ctx = exportCanvas.getContext('2d');

    // Clean background
    ctx.fillStyle = '#10121C';
    ctx.fillRect(0, 0, width, height);

    // Frame border
    ctx.strokeStyle = '#F43F5E';
    ctx.lineWidth = 3;
    ctx.strokeRect(16, 16, width - 32, height - 32);

    // Header
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(prompt || 'Couple Sketch', width / 2, 55);

    ctx.fillStyle = '#FB7185';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText(`Drawn with 💕 by ${partner1} & ${partner2}`, width / 2, 82);

    // Canvas drawing
    ctx.drawImage(canvasRef.current, 40, 110, 560, 560);

    ctx.strokeStyle = '#2B2F42';
    ctx.lineWidth = 2;
    ctx.strokeRect(40, 110, 560, 560);

    // Footer
    ctx.fillStyle = '#94A3B8';
    ctx.font = '12px sans-serif';
    ctx.fillText('Sketch Relay 💕 Couple Drawing Game • 6 Turns Complete', width / 2, 715);

    const link = document.createElement('a');
    link.download = `couple-sketch-${Date.now()}.png`;
    link.href = exportCanvas.toDataURL('image/png');
    link.click();
  };

  const handleShare = async () => {
    sounds.playPop();
    const text = `We just finished drawing "${prompt}" together on Sketch Relay 💕 — ${partner1} & ${partner2}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Our Couple Sketch 💕', text });
      } catch (_) {}
    } else {
      navigator.clipboard.writeText(text).catch(() => {});
    }
  };

  return (
    <div className="w-full h-full flex flex-col justify-between p-4 safe-top safe-bottom bg-[#0d0e15] text-slate-100 overflow-hidden select-none">
      {/* Header */}
      <div className="text-center pt-1">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 text-rose-300 font-semibold text-xs border border-rose-500/20 mb-1">
          <Sparkles className="w-3.5 h-3.5 text-rose-400" />
          <span>Relay Finished! 6 Turns Done</span>
        </div>
        <h1 className="text-xl font-bold text-white mt-1">
          Our Masterpiece <span className="neon-text-rose">🎨💕</span>
        </h1>
        <p className="text-xs text-slate-400 mt-0.5 flex items-center justify-center gap-1.5">
          <span className="font-semibold text-rose-400">{partner1}</span>
          <Heart className="w-3 h-3 fill-rose-500 text-rose-500 animate-heartbeat" />
          <span className="font-semibold text-purple-400">{partner2}</span>
        </p>

        {/* Prompt Card */}
        <div className="mt-2 mx-auto max-w-sm px-3 py-1.5 rounded-xl bg-[#161824] border border-rose-500/20 flex items-center justify-between">
          <span className="text-[11px] font-bold text-rose-400 uppercase tracking-wider">Prompt:</span>
          <span className="text-xs font-bold text-white truncate ml-2">{prompt}</span>
        </div>
      </div>

      {/* Artwork Display */}
      <div className="flex-1 flex flex-col items-center justify-center my-2 max-h-[48vh]">
        <div className="p-2 bg-white rounded-2xl border-2 border-rose-500/40 shadow-xl max-w-[310px] w-full aspect-square flex items-center justify-center rose-glow">
          <canvas
            ref={canvasRef}
            className="w-full h-full rounded-xl object-contain bg-white"
          />
        </div>
      </div>

      {/* Steps checklist */}
      {promptSteps && promptSteps.length > 0 && (
        <div className="w-full max-w-sm mx-auto mb-2">
          <div className="card-dark p-2.5">
            <div className="flex items-center gap-1.5 mb-1 text-xs font-semibold text-rose-300">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>6/6 Process Steps Completed</span>
            </div>
            <div className="grid grid-cols-2 gap-1 text-[10px] text-slate-400">
              {promptSteps.map((step, i) => (
                <div key={i} className="flex items-start gap-1 truncate">
                  <span className="text-emerald-400 font-semibold shrink-0">✓</span>
                  <span className="truncate">{step}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="w-full max-w-sm mx-auto space-y-2 pb-1">
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={handleDownload}
            className="btn-couple-secondary py-2.5 text-xs font-bold"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Save Artwork 📸</span>
          </button>

          <button
            onClick={handleShare}
            className="btn-couple-secondary py-2.5 text-xs font-bold"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Share 💌</span>
          </button>
        </div>

        <button
          onClick={() => { sounds.playPop(); onPlayAgain(); }}
          className="w-full btn-couple-primary py-2.5 text-xs font-bold"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Play Again! (New Prompt) 🎨</span>
        </button>
      </div>
    </div>
  );
}

function floodFillHelper(ctx, startX, startY, fillColorHex) {
  const width = ctx.canvas.width;
  const height = ctx.canvas.height;
  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;

  let c = fillColorHex.replace('#', '');
  if (c.length === 3) c = c.split('').map(x => x + x).join('');
  const num = parseInt(c, 16);
  const targetR = (num >> 16) & 255;
  const targetG = (num >> 8) & 255;
  const targetB = num & 255;

  const startIndex = (startY * width + startX) * 4;
  const sr = data[startIndex];
  const sg = data[startIndex + 1];
  const sb = data[startIndex + 2];

  if (Math.abs(sr - targetR) + Math.abs(sg - targetG) + Math.abs(sb - targetB) < 10) return;

  const visited = new Uint8Array(width * height);
  const queueX = new Int32Array(width * height);
  const queueY = new Int32Array(width * height);
  let head = 0, tail = 0;

  queueX[tail] = startX;
  queueY[tail] = startY;
  tail++;
  visited[startY * width + startX] = 1;

  while (head < tail) {
    const x = queueX[head];
    const y = queueY[head];
    head++;

    const idx = (y * width + x) * 4;
    data[idx] = targetR;
    data[idx + 1] = targetG;
    data[idx + 2] = targetB;
    data[idx + 3] = 255;

    const neighbors = [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]];
    for (let i = 0; i < 4; i++) {
      const nx = neighbors[i][0];
      const ny = neighbors[i][1];
      if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
        const nIdx = ny * width + nx;
        if (!visited[nIdx]) {
          visited[nIdx] = 1;
          const pIdx = nIdx * 4;
          if (
            Math.abs(data[pIdx] - sr) <= 30 &&
            Math.abs(data[pIdx + 1] - sg) <= 30 &&
            Math.abs(data[pIdx + 2] - sb) <= 30
          ) {
            queueX[tail] = nx;
            queueY[tail] = ny;
            tail++;
          }
        }
      }
    }
  }

  ctx.putImageData(imgData, 0, 0);
}
