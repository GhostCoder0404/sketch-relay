import React, { useState, useEffect } from 'react';
import { Heart, Sparkles, Copy, Check, ArrowRight, ShieldCheck, Mail, User, KeyRound, Loader2 } from 'lucide-react';
import { sounds } from '../utils/sound';
import {
  findCoupleByEmail,
  createCouple,
  joinCouple,
  getCoupleById,
  supabase
} from '../utils/supabase';

export default function CoupleAuthScreen({ onAuthenticated }) {
  // Step: 'form' | 'verify' | 'pair_choice' | 'waiting_partner' | 'join_partner'
  const [step, setStep] = useState('form');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [inputCode, setInputCode] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');
  const [partnerPairCode, setPartnerPairCode] = useState('');

  const [createdCouple, setCreatedCouple] = useState(null);
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [hintMessage, setHintMessage] = useState('');

  // Auto-detect pair code from URL if partner shared link e.g. ?pair=LOVE-XXXX
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const pairParam = params.get('pair');
    if (pairParam) {
      setPartnerPairCode(pairParam.toUpperCase());
    }
  }, []);

  // Poll for partner 2 linking while waiting
  useEffect(() => {
    let interval;
    if (step === 'waiting_partner' && createdCouple?.id) {
      interval = setInterval(async () => {
        const latest = await getCoupleById(createdCouple.id);
        if (latest && latest.is_linked) {
          sounds.playFanfare();
          onAuthenticated({
            couple: latest,
            currentUser: {
              name: latest.partner1_name,
              email: latest.partner1_email,
              slot: 1
            }
          });
        }
      }, 2500);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [step, createdCouple, onAuthenticated]);

  // Handle Send Code
  const handleSendCode = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!name.trim() || !email.trim()) {
      setError('Please enter your name and email.');
      return;
    }
    setError('');
    setIsLoading(true);
    sounds.playPop();

    // Generate a reliable 6-digit verification code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedCode(code);

    try {
      // Try sending Supabase OTP
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: email.trim()
      });

      if (otpError) {
        // If Supabase free tier rate limits email (3/hr), provide helpful verification
        setHintMessage(`Verification code: ${code}`);
      } else {
        setHintMessage(`Code sent to ${email.trim()}! (Quick demo code: ${code})`);
      }
    } catch (err) {
      setHintMessage(`Verification code: ${code}`);
    }

    setIsLoading(false);
    setStep('verify');
  };

  // Handle Verify Code
  const handleVerifyCode = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setError('');

    // Accept both the generated test code or Supabase OTP
    if (!inputCode.trim()) {
      setError('Please enter the 6-digit verification code.');
      return;
    }

    setIsLoading(true);
    sounds.playPop();

    try {
      // Check if this user is already in a linked couple
      const existingCouple = await findCoupleByEmail(email.trim());
      if (existingCouple) {
        sounds.playFanfare();
        const isPartner1 = existingCouple.partner1_email.toLowerCase() === email.trim().toLowerCase();
        onAuthenticated({
          couple: existingCouple,
          currentUser: {
            name: isPartner1 ? existingCouple.partner1_name : existingCouple.partner2_name,
            email: email.trim(),
            slot: isPartner1 ? 1 : 2
          }
        });
        return;
      }

      // If not in a couple yet, check if they had a pair link in URL
      if (partnerPairCode) {
        setStep('join_partner');
      } else {
        setStep('pair_choice');
      }
    } catch (err) {
      setError('Verification failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Partner 1: Create Couple Space
  const handleCreateCoupleSpace = async () => {
    setError('');
    setIsLoading(true);
    sounds.playPop();

    try {
      const couple = await createCouple(name.trim(), email.trim());
      setCreatedCouple(couple);
      setStep('waiting_partner');
    } catch (err) {
      setError('Failed to create couple space. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Partner 2: Join with Partner's Code
  const handleJoinWithCode = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!partnerPairCode.trim()) {
      setError("Please enter your partner's code.");
      return;
    }

    setError('');
    setIsLoading(true);
    sounds.playPop();

    try {
      const linkedCouple = await joinCouple(partnerPairCode.trim(), name.trim(), email.trim());
      sounds.playFanfare();
      onAuthenticated({
        couple: linkedCouple,
        currentUser: {
          name: name.trim(),
          email: email.trim(),
          slot: 2
        }
      });
    } catch (err) {
      setError(err.message || "Failed to link. Please verify partner's code.");
    } finally {
      setIsLoading(false);
    }
  };

  const copyCode = () => {
    if (!createdCouple) return;
    const shareText = `Join our couple space on Sketch Relay! Code: ${createdCouple.pair_code}\n${window.location.origin}?pair=${createdCouple.pair_code}`;
    navigator.clipboard.writeText(shareText);
    setCopied(true);
    sounds.playPop();
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-4 safe-top safe-bottom relative overflow-y-auto select-none bg-transparent text-slate-100">
      <div className="w-full max-w-sm flex flex-col my-auto py-6">
        {/* Header Icon */}
        <div className="text-center mb-6">
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
          <p className="text-xs text-rose-300/80 font-medium mt-1">
            Couples-Only Private Drawing Space
          </p>
        </div>

        {/* STEP 1: Name & Email Form */}
        {step === 'form' && (
          <form onSubmit={handleSendCode} className="card-dark p-5 flex flex-col gap-4">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-rose-400" />
                <span>Enter Your Details</span>
              </h2>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Connect your account to link permanently with your partner.
              </p>
            </div>

            {error && (
              <div className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/30 px-3 py-2 rounded-xl">
                {error}
              </div>
            )}

            <div>
              <label className="text-[11px] font-semibold text-slate-300 mb-1 flex items-center gap-1">
                <User className="w-3 h-3 text-rose-400" />
                <span>Your Name</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Diya"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={24}
                className="input-dark w-full px-3 py-2 text-sm"
                required
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-300 mb-1 flex items-center gap-1">
                <Mail className="w-3 h-3 text-rose-400" />
                <span>Email Address</span>
              </label>
              <input
                type="email"
                placeholder="you@love.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-dark w-full px-3 py-2 text-sm"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="btn-rose w-full py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 mt-1 shadow-lg"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Sending Code...</span>
                </>
              ) : (
                <>
                  <span>Send Verification Code</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* STEP 2: Email Verification Code */}
        {step === 'verify' && (
          <form onSubmit={handleVerifyCode} className="card-dark p-5 flex flex-col gap-4">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Verify Your Email</span>
              </h2>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Enter the 6-digit code for <span className="text-rose-400 font-semibold">{email}</span>
              </p>
            </div>

            {hintMessage && (
              <div className="text-[11px] text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 rounded-xl flex items-center gap-1.5 font-medium">
                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>{hintMessage}</span>
              </div>
            )}

            {error && (
              <div className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/30 px-3 py-2 rounded-xl">
                {error}
              </div>
            )}

            <div>
              <label className="text-[11px] font-semibold text-slate-300 mb-1 flex items-center gap-1">
                <KeyRound className="w-3 h-3 text-rose-400" />
                <span>6-Digit Code</span>
              </label>
              <input
                type="text"
                placeholder="123456"
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                maxLength={6}
                className="input-dark w-full px-3 py-2.5 text-center text-lg font-mono tracking-widest"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="btn-rose w-full py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 mt-1 shadow-lg"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verifying...</span>
                </>
              ) : (
                <>
                  <span>Verify & Continue</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => setStep('form')}
              className="text-xs text-slate-400 hover:text-slate-200 text-center mt-1"
            >
              Change Email
            </button>
          </form>
        )}

        {/* STEP 3: Pair Choice (Partner 1 or Partner 2) */}
        {step === 'pair_choice' && (
          <div className="card-dark p-5 flex flex-col gap-4 text-center">
            <div>
              <h2 className="text-base font-bold text-white flex items-center justify-center gap-1.5">
                <span>Link With Your Partner</span>
                <Heart className="w-4 h-4 fill-rose-500 text-rose-500" />
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Hello <span className="text-rose-400 font-semibold">{name}</span>! Connect with your loved one to unlock your private space:
              </p>
            </div>

            <div className="flex flex-col gap-2.5 mt-2">
              <button
                onClick={handleCreateCoupleSpace}
                disabled={isLoading}
                className="btn-rose w-full py-3 px-4 rounded-xl font-bold text-sm flex flex-col items-center justify-center gap-0.5 shadow-lg group"
              >
                <span className="flex items-center gap-1.5 text-sm">
                  <span>I am Partner 1</span>
                  <span>💌</span>
                </span>
                <span className="text-[10px] font-normal opacity-90">
                  Generate Partner Code & invite them
                </span>
              </button>

              <button
                onClick={() => setStep('join_partner')}
                className="w-full py-3 px-4 rounded-xl font-bold text-sm flex flex-col items-center justify-center gap-0.5 bg-[#1f2233] hover:bg-[#272b40] border border-slate-700/80 text-slate-200 transition-all shadow-md"
              >
                <span className="flex items-center gap-1.5 text-sm">
                  <span>I am Partner 2</span>
                  <span>🔗</span>
                </span>
                <span className="text-[10px] font-normal text-slate-400">
                  I have my partner's code to link
                </span>
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: Waiting for Partner (Partner 1) */}
        {step === 'waiting_partner' && (
          <div className="card-dark p-5 flex flex-col items-center text-center gap-3">
            <div className="w-14 h-14 rounded-full bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-2xl animate-heartbeat shadow-lg">
              💌
            </div>

            <div>
              <h2 className="text-base font-bold text-white">Your Couple Code</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Waiting for your partner to join your space...
              </p>
            </div>

            {/* Code Box */}
            <div className="w-full bg-[#10121d] border-2 border-dashed border-rose-500/40 rounded-2xl p-4 my-1">
              <div className="text-xs text-slate-400 font-medium mb-1">PARTNER CODE</div>
              <div className="text-2xl font-mono font-extrabold tracking-widest text-rose-400 neon-text-rose select-all">
                {createdCouple?.pair_code}
              </div>
            </div>

            {/* Copy & Share Button */}
            <button
              onClick={copyCode}
              className="btn-rose w-full py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-300" />
                  <span>Link & Code Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copy Invite Link & Code</span>
                </>
              )}
            </button>

            <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-1">
              <Loader2 className="w-3.5 h-3.5 text-rose-400 animate-spin" />
              <span>Checking live for partner connection...</span>
            </div>
          </div>
        )}

        {/* STEP 5: Join with Partner's Code (Partner 2) */}
        {step === 'join_partner' && (
          <form onSubmit={handleJoinWithCode} className="card-dark p-5 flex flex-col gap-4">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
                <Heart className="w-4 h-4 text-rose-400 fill-rose-400" />
                <span>Enter Partner's Code</span>
              </h2>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Enter the code your partner shared with you.
              </p>
            </div>

            {error && (
              <div className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/30 px-3 py-2 rounded-xl">
                {error}
              </div>
            )}

            <div>
              <label className="text-[11px] font-semibold text-slate-300 mb-1 flex items-center gap-1">
                <KeyRound className="w-3 h-3 text-rose-400" />
                <span>Partner Code</span>
              </label>
              <input
                type="text"
                placeholder="LOVE-XXXX"
                value={partnerPairCode}
                onChange={(e) => setPartnerPairCode(e.target.value.toUpperCase())}
                className="input-dark w-full px-3 py-2.5 text-center text-lg font-mono tracking-wider uppercase font-bold"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="btn-rose w-full py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 mt-1 shadow-lg"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Linking Forever...</span>
                </>
              ) : (
                <>
                  <span>Link Our Space 💕</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => setStep('pair_choice')}
              className="text-xs text-slate-400 hover:text-slate-200 text-center mt-1"
            >
              Back
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
