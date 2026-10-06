// frontend/components/layout/FleetCommsDrawer.js
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../../store/useStore';
import { useTheme } from '../ThemeProvider';
import {
  X,
  Radio,
  Send,
  Phone,
  MessageCircle,
  Truck,
  Users,
  AlertTriangle,
  MapPin,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  CheckCheck,
  Fuel,
  Camera,
  Paperclip,
  Navigation,
  Clock,
  Sparkles,
  Search,
  ChevronRight,
  ShieldAlert
} from 'lucide-react';

const INITIAL_CHANNELS = [
  {
    id: 'broadcast',
    type: 'broadcast',
    name: 'All-Fleet Emergency Broadcast',
    vehicle: 'All Active Units (48 Trucks)',
    status: 'ONLINE',
    unread: 0,
    lastMessage: 'Safety mandate: NH-48 monsoon speed limit 60 km/h enforced.',
    lastTime: '10:45 AM',
    messages: [
      {
        id: 'b-1',
        sender: 'dispatcher',
        senderName: 'Central Dispatch Command',
        text: '📢 Attention all drivers: Toll plaza fastag servers experiencing 5 min latency at Vadodara. Keep cash slips backup.',
        time: '09:30 AM',
        status: 'delivered'
      },
      {
        id: 'b-2',
        sender: 'system',
        senderName: 'Automated Highway Weather Bot',
        text: '⚠️ Dense fog alert along Haryana-Rajasthan border. Visibility below 80m. Maintain 25m distance.',
        time: '10:15 AM',
        status: 'delivered'
      },
      {
        id: 'b-3',
        sender: 'dispatcher',
        senderName: 'Central Dispatch Command',
        text: 'Safety mandate: NH-48 speed limit 60 km/h strictly enforced by highway authority.',
        time: '10:45 AM',
        status: 'delivered'
      }
    ]
  },
  {
    id: 'unit-1',
    type: 'vehicle',
    name: 'Amit Kumar',
    phone: '+91 98112 45871',
    vehicle: 'HR 55 AB 1234',
    model: 'TATA Prima 5530.S (40 FT)',
    route: 'DEL ➔ BLR (NH-48)',
    speed: '72 km/h',
    location: 'Near Vadodara Bypass, Gujarat',
    status: 'ONLINE',
    unread: 2,
    lastMessage: 'Reached Surat toll queue, heavy traffic around 35 mins.',
    lastTime: '11:15 AM',
    messages: [
      {
        id: 'm-1',
        sender: 'driver',
        senderName: 'Amit Kumar',
        text: 'Morning boss. Departed Delhi Hub at 05:00 AM with 22 Ton electronics cargo.',
        time: '05:05 AM',
        status: 'delivered'
      },
      {
        id: 'm-2',
        sender: 'dispatcher',
        senderName: 'Central Dispatch',
        text: 'Noted Amit. Keep vehicle speed monitored under 75 km/h on expressway.',
        time: '05:12 AM',
        status: 'read'
      },
      {
        id: 'm-3',
        sender: 'system',
        senderName: 'Geo-Telemetry Bot',
        text: '⚡ Geo-Fence Alert: HR 55 AB 1234 crossed Udaipur Toll Plaza (Current Speed: 68 km/h).',
        time: '08:40 AM',
        status: 'delivered'
      },
      {
        id: 'm-4',
        sender: 'driver',
        senderName: 'Amit Kumar',
        text: 'Reached Surat toll queue, heavy traffic around 35 mins. Should I take bypass diversion?',
        time: '11:15 AM',
        status: 'delivered'
      }
    ]
  },
  {
    id: 'unit-2',
    type: 'vehicle',
    name: 'Ramesh Dave',
    phone: '+91 98250 11452',
    vehicle: 'GJ 01 EF 9012',
    model: 'Eicher Pro 6028 (24 FT)',
    route: 'AHD ➔ MUM (NE-1)',
    speed: '68 km/h',
    location: 'Surat Northern Ring Road',
    status: 'ONLINE',
    unread: 0,
    lastMessage: 'All clear on express corridor. ETA Mumbai hub 05:45 PM.',
    lastTime: '10:50 AM',
    messages: [
      {
        id: 'm-21',
        sender: 'driver',
        senderName: 'Ramesh Dave',
        text: 'All clear on express corridor. ETA Mumbai hub 05:45 PM as planned.',
        time: '10:50 AM',
        status: 'read'
      }
    ]
  },
  {
    id: 'unit-3',
    type: 'vehicle',
    name: 'Manoj Verma',
    phone: '+91 98231 67123',
    vehicle: 'MH 31 GH 3456',
    model: 'BharatBenz 2823 (32 FT)',
    route: 'NAG ➔ CCU (NH-53)',
    speed: '0 km/h (Halt)',
    location: 'Raipur Bypass Toll Plaza',
    status: 'HALTED',
    unread: 1,
    lastMessage: 'Fuel card declining at HP pump Raipur. Please recharge ₹5,000.',
    lastTime: '11:02 AM',
    messages: [
      {
        id: 'm-31',
        sender: 'driver',
        senderName: 'Manoj Verma',
        text: 'Fuel card declining at HP pump Raipur. Please recharge ₹5,000 for diesel top-up.',
        time: '11:02 AM',
        status: 'delivered'
      }
    ]
  },
  {
    id: 'unit-4',
    type: 'vehicle',
    name: 'Venkatesh Rao',
    phone: '+91 98490 33890',
    vehicle: 'TS 09 IJ 7890',
    model: 'Tata Signa 2823 Reefer (20 FT)',
    route: 'HYD ➔ MAA (NH-16)',
    speed: '12 km/h',
    location: 'Nellore Toll Plaza',
    status: 'ONLINE',
    unread: 0,
    lastMessage: 'Reefer temperature maintained at 3.8°C stable.',
    lastTime: '09:45 AM',
    messages: [
      {
        id: 'm-41',
        sender: 'driver',
        senderName: 'Venkatesh Rao',
        text: 'Reefer temperature maintained at 3.8°C stable throughout corridor.',
        time: '09:45 AM',
        status: 'read'
      }
    ]
  }
];

export default function FleetCommsDrawer() {
  const { isFleetCommsOpen, setFleetCommsOpen } = useStore();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [channels, setChannels] = useState(INITIAL_CHANNELS);
  const [selectedChannelId, setSelectedChannelId] = useState('unit-1');
  const [inputText, setInputText] = useState('');
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isPttActive, setIsPttActive] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const [activeTab, setActiveTab] = useState('active'); // 'active' | 'broadcast'

  const messagesEndRef = useRef(null);

  // Play synthetic radio click sound using Web Audio API
  const playRadioBeep = (freq = 880, duration = 0.08) => {
    if (isAudioMuted || typeof window === 'undefined') return;
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + duration);
    } catch (_) {}
  };

  const selectedChannel = channels.find((c) => c.id === selectedChannelId) || channels[0];

  // Auto-scroll messages to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedChannel?.messages, isFleetCommsOpen]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isFleetCommsOpen) {
        setFleetCommsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFleetCommsOpen, setFleetCommsOpen]);

  const handleSendMessage = (customText = null) => {
    const textToSend = customText || inputText;
    if (!textToSend.trim()) return;

    playRadioBeep(920, 0.06);

    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

    const newMsg = {
      id: `msg-${Date.now()}`,
      sender: 'dispatcher',
      senderName: 'Central Dispatch Command',
      text: textToSend.trim(),
      time: timeStr,
      status: 'delivered'
    };

    setChannels((prev) =>
      prev.map((c) => {
        if (c.id === selectedChannel.id) {
          return {
            ...c,
            lastMessage: textToSend.trim(),
            lastTime: timeStr,
            unread: 0,
            messages: [...c.messages, newMsg]
          };
        }
        return c;
      })
    );

    setInputText('');

    // Simulate driver automated acknowledgement response after 1.5s
    if (selectedChannel.type === 'vehicle') {
      setTimeout(() => {
        playRadioBeep(650, 0.08);
        const replyMsg = {
          id: `reply-${Date.now()}`,
          sender: 'driver',
          senderName: selectedChannel.name,
          text: `Roger that Dispatch. Acknowledged: "${textToSend.slice(0, 32)}..."`,
          time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }),
          status: 'delivered'
        };

        setChannels((prev2) =>
          prev2.map((c) => {
            if (c.id === selectedChannel.id) {
              return {
                ...c,
                lastMessage: replyMsg.text,
                lastTime: replyMsg.time,
                messages: [...c.messages, replyMsg]
              };
            }
            return c;
          })
        );
      }, 1600);
    }
  };

  const handleQuickAction = (text) => {
    handleSendMessage(text);
  };

  // Push to talk voice simulation
  const handlePttDown = () => {
    setIsPttActive(true);
    playRadioBeep(1200, 0.12);
  };

  const handlePttUp = () => {
    if (!isPttActive) return;
    setIsPttActive(false);
    playRadioBeep(440, 0.1);
    handleSendMessage('🎙️ [Voice Audio Transmission - 4.2s recorded & dispatched to truck cabin speaker]');
  };

  const filteredChannels = channels.filter((c) => {
    if (activeTab === 'broadcast') return c.id === 'broadcast';
    if (c.id === 'broadcast') return false;
    const match =
      c.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
      c.vehicle.toLowerCase().includes(searchFilter.toLowerCase()) ||
      (c.route && c.route.toLowerCase().includes(searchFilter.toLowerCase()));
    return match;
  });

  return (
    <div
      className={`fixed inset-0 z-50 overflow-hidden transition-all duration-300 ${
        isFleetCommsOpen ? 'pointer-events-auto visible' : 'pointer-events-none invisible delay-300'
      }`}
    >
      {/* Backdrop overlay */}
      <div
        className={`fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-300 ease-out ${
          isFleetCommsOpen ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={() => setFleetCommsOpen(false)}
      />

      {/* Right Drawer Panel */}
      <div
        className={`fixed inset-y-0 right-0 w-full sm:w-[500px] lg:w-[540px] flex flex-col z-50 shadow-2xl border-l transition-transform duration-300 ease-out transform ${
          isFleetCommsOpen ? 'translate-x-0' : 'translate-x-full'
        } ${
          isDark
            ? 'bg-[#090D18] border-slate-800 text-slate-100 shadow-2xl'
            : 'bg-white border-slate-200 text-slate-900 shadow-2xl'
        }`}
      >
        {/* Top Header */}
        <div className={`p-4 border-b flex items-center justify-between shrink-0 ${
          isDark ? 'border-slate-800/80 bg-slate-950/60' : 'border-slate-100 bg-slate-50/70'
        }`}>
          <div className="flex items-center space-x-2.5">
            <div className="relative">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-md shadow-cyan-500/25">
                <Radio className="w-4 h-4" />
              </div>
              <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-slate-950 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-sm font-black tracking-tight">Fleet Communication Channel</h2>
                <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-full bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 font-mono">
                  Live Radar
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Direct cabin walkie-talkie & driver dispatch comms
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-1.5">
            {/* Audio Chirp Toggle */}
            <button
              onClick={() => setIsAudioMuted(!isAudioMuted)}
              className={`p-2 rounded-xl border text-xs transition-colors ${
                isAudioMuted
                  ? 'border-rose-500/40 text-rose-400 bg-rose-500/10'
                  : isDark
                  ? 'border-slate-800 text-slate-300 hover:text-white bg-slate-900/60'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-100 bg-white'
              }`}
              title={isAudioMuted ? 'Radio Muted (Click to un-mute)' : 'Radio Sound Active'}
            >
              {isAudioMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
            </button>

            {/* Close Button */}
            <button
              onClick={() => setFleetCommsOpen(false)}
              className={`p-2 rounded-xl border transition-colors ${
                isDark
                  ? 'border-slate-800 text-slate-400 hover:text-white bg-slate-900/60 hover:bg-slate-800'
                  : 'border-slate-200 text-slate-500 hover:text-slate-900 bg-white hover:bg-slate-100'
              }`}
              title="Close Fleet Channel (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Top Channel Navigation Tabs */}
        <div className={`px-4 pt-3 pb-2 border-b space-y-2.5 shrink-0 ${
          isDark ? 'border-slate-800/80 bg-slate-950/30' : 'border-slate-100 bg-slate-50/30'
        }`}>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                setActiveTab('active');
                if (selectedChannel.id === 'broadcast') {
                  setSelectedChannelId('unit-1');
                }
              }}
              className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 ${
                activeTab === 'active'
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                  : isDark
                  ? 'bg-slate-900 text-slate-400 hover:text-white'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Truck className="w-3.5 h-3.5" />
              <span>Active Vehicles ({channels.length - 1})</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('broadcast');
                setSelectedChannelId('broadcast');
              }}
              className={`py-1.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 ${
                activeTab === 'broadcast'
                  ? 'bg-cyan-500 text-slate-950 font-black shadow-sm shadow-cyan-500/30'
                  : isDark
                  ? 'bg-slate-900 text-slate-400 hover:text-white'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Fleet Broadcast</span>
            </button>
          </div>

          {/* Quick Vehicle Search if in active tab */}
          {activeTab === 'active' && (
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Search driver, vehicle number, corridor..."
                className={`w-full pl-8 pr-3 py-1.5 rounded-xl border text-xs focus:outline-none transition-all ${
                  isDark
                    ? 'bg-slate-900/80 border-slate-800 text-white placeholder-slate-500 focus:border-cyan-400'
                    : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-blue-500'
                }`}
              />
            </div>
          )}

          {/* Horizontal Vehicle Unit Selector Chips */}
          {activeTab === 'active' && (
            <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-none">
              {filteredChannels.map((c) => {
                const isSelected = c.id === selectedChannelId;
                return (
                  <button
                    key={c.id}
                    onClick={() => {
                      setSelectedChannelId(c.id);
                      setChannels((prev) =>
                        prev.map((item) => (item.id === c.id ? { ...item, unread: 0 } : item))
                      );
                    }}
                    className={`shrink-0 px-2.5 py-1.5 rounded-xl border text-left transition-all ${
                      isSelected
                        ? isDark
                          ? 'bg-cyan-950/40 border-cyan-500/60 text-white'
                          : 'bg-blue-50 border-blue-400 text-blue-900'
                        : isDark
                        ? 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center space-x-1.5">
                      <span className="font-mono font-bold text-[11px] text-cyan-400">
                        {c.vehicle}
                      </span>
                      {c.unread > 0 && (
                        <span className="w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center">
                          {c.unread}
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-400 truncate max-w-[120px]">
                      {c.name}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Selected Channel Metadata Banner */}
        <div className={`p-3 px-4 border-b flex items-center justify-between shrink-0 ${
          isDark ? 'bg-[#0B1020]/90 border-slate-800' : 'bg-slate-50/80 border-slate-200'
        }`}>
          <div className="flex items-center space-x-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-black uppercase ${
              selectedChannel.type === 'broadcast'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                : 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
            }`}>
              {selectedChannel.type === 'broadcast' ? (
                <Radio className="w-4 h-4" />
              ) : (
                <Truck className="w-4 h-4" />
              )}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-mono font-black text-xs text-cyan-400">
                  {selectedChannel.vehicle}
                </span>
                <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full border ${
                  selectedChannel.status === 'ONLINE'
                    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                    : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                }`}>
                  {selectedChannel.status}
                </span>
                {selectedChannel.speed && (
                  <span className="text-[10px] font-mono text-slate-400">
                    • {selectedChannel.speed}
                  </span>
                )}
              </div>
              <div className="text-xs font-semibold text-slate-200 truncate flex items-center gap-1.5 mt-0.5">
                <span>{selectedChannel.name}</span>
                {selectedChannel.location && (
                  <span className="text-[10px] text-slate-400 flex items-center gap-0.5 truncate max-w-[180px]">
                    <MapPin className="w-3 h-3 text-cyan-400 shrink-0" />
                    {selectedChannel.location}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Quick Direct Call & WhatsApp buttons if vehicle */}
          {selectedChannel.phone && (
            <div className="flex items-center space-x-1.5">
              <a
                href={`tel:${selectedChannel.phone}`}
                className="p-1.5 rounded-lg border border-slate-700 bg-slate-800 text-slate-300 hover:text-emerald-400 hover:border-emerald-500/40 transition-colors"
                title={`Call Driver (${selectedChannel.phone})`}
              >
                <Phone className="w-3.5 h-3.5" />
              </a>
              <a
                href={`https://wa.me/${selectedChannel.phone.replace(/[^0-9]/g, '')}`}
                target="_blank"
                rel="noreferrer"
                className="p-1.5 rounded-lg border border-slate-700 bg-slate-800 text-slate-300 hover:text-emerald-400 hover:border-emerald-500/40 transition-colors"
                title="Open Driver WhatsApp"
              >
                <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
              </a>
            </div>
          )}
        </div>

        {/* Message Thread Scroll Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5 select-text">
          {selectedChannel.messages.map((msg) => {
            const isMe = msg.sender === 'dispatcher';
            const isSystem = msg.sender === 'system';

            if (isSystem) {
              return (
                <div key={msg.id} className="flex justify-center my-2">
                  <div className={`max-w-[90%] px-3 py-2 rounded-xl border text-[11px] font-medium flex items-start space-x-2 ${
                    isDark
                      ? 'bg-cyan-950/20 border-cyan-500/30 text-cyan-300'
                      : 'bg-blue-50 border-blue-200 text-blue-900'
                  }`}>
                    <Sparkles className="w-3.5 h-3.5 shrink-0 mt-0.5 text-cyan-400" />
                    <div>
                      <p>{msg.text}</p>
                      <span className="text-[9px] opacity-70 block mt-1 font-mono">{msg.time}</span>
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
              >
                <div className="flex items-center space-x-1 text-[10px] text-slate-400 mb-0.5 px-1 font-medium">
                  <span>{msg.senderName}</span>
                  <span>•</span>
                  <span>{msg.time}</span>
                </div>
                <div
                  className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed shadow-sm ${
                    isMe
                      ? 'bg-blue-600 text-white rounded-tr-xs'
                      : isDark
                      ? 'bg-slate-800 border border-slate-700/80 text-slate-100 rounded-tl-xs'
                      : 'bg-slate-100 border border-slate-200 text-slate-900 rounded-tl-xs'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.text}</p>
                  <div className={`flex items-center justify-end space-x-1 mt-1 text-[9px] ${
                    isMe ? 'text-blue-200' : 'text-slate-400'
                  }`}>
                    <span>{msg.time}</span>
                    {isMe && <CheckCheck className="w-3 h-3 text-cyan-300" />}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Dispatch Presets Strip */}
        <div className={`p-2.5 border-t border-b overflow-x-auto shrink-0 flex items-center space-x-2 scrollbar-none ${
          isDark ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-50 border-slate-200'
        }`}>
          <span className="text-[10px] font-bold text-slate-400 shrink-0 uppercase tracking-wider pl-1">
            Quick Actions:
          </span>
          <button
            onClick={() => handleQuickAction('🚨 Request Immediate GPS Location Ping & Speed Telemetry')}
            className="shrink-0 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 transition-colors flex items-center space-x-1"
          >
            <Navigation className="w-3 h-3" />
            <span>Ping GPS</span>
          </button>
          <button
            onClick={() => handleQuickAction('⛽ Fuel Advance ₹5,000 Approved & Loaded on Fleet Card')}
            className="shrink-0 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 transition-colors flex items-center space-x-1"
          >
            <Fuel className="w-3 h-3" />
            <span>Approve Diesel</span>
          </button>
          <button
            onClick={() => handleQuickAction('📸 Please capture and upload signed POD receipt before exit')}
            className="shrink-0 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 transition-colors flex items-center space-x-1"
          >
            <Camera className="w-3 h-3" />
            <span>Request POD</span>
          </button>
          <button
            onClick={() => handleQuickAction('⚠️ Highway Alert: Heavy Traffic Congestion Reported 20km ahead')}
            className="shrink-0 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition-colors flex items-center space-x-1"
          >
            <AlertTriangle className="w-3 h-3" />
            <span>Caution Traffic</span>
          </button>
        </div>

        {/* Input Bar */}
        <div className={`p-3.5 border-t shrink-0 ${
          isDark ? 'border-slate-800 bg-slate-950/80' : 'border-slate-200 bg-white'
        }`}>
          {isPttActive && (
            <div className="mb-2 p-2 rounded-xl bg-rose-500/20 border border-rose-500 text-rose-300 text-xs font-bold flex items-center justify-center space-x-2 animate-pulse">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
              <span>Transmitting live voice message over truck cabin audio... Release to send.</span>
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center space-x-2"
          >
            {/* Push To Talk (PTT) Mic Button */}
            <button
              type="button"
              onMouseDown={handlePttDown}
              onMouseUp={handlePttUp}
              onTouchStart={handlePttDown}
              onTouchEnd={handlePttUp}
              className={`p-2.5 rounded-xl border text-xs font-bold transition-all select-none active:scale-95 ${
                isPttActive
                  ? 'bg-rose-600 text-white border-rose-500 shadow-md shadow-rose-600/40 ring-2 ring-rose-400'
                  : isDark
                  ? 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white hover:border-slate-700'
                  : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
              }`}
              title="Push-and-Hold to talk / send voice transmission"
            >
              <Mic className="w-4 h-4" />
            </button>

            {/* Input field */}
            <div className="relative flex-1">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={
                  selectedChannel.type === 'broadcast'
                    ? 'Broadcast message to all 48 fleet trucks...'
                    : `Message ${selectedChannel.name} (${selectedChannel.vehicle})...`
                }
                className={`w-full px-4 py-2.5 rounded-xl border text-xs focus:outline-none transition-all ${
                  isDark
                    ? 'bg-slate-900 border-slate-800 text-white placeholder-slate-500 focus:border-cyan-400'
                    : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-blue-500'
                }`}
              />
            </div>

            {/* Send Button */}
            <button
              type="submit"
              disabled={!inputText.trim()}
              className={`p-2.5 rounded-xl transition-all font-bold flex items-center justify-center ${
                inputText.trim()
                  ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/30 active:scale-95'
                  : isDark
                  ? 'bg-slate-900 border border-slate-800 text-slate-600 cursor-not-allowed'
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed'
              }`}
              title="Send message (Enter)"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>

          <div className="flex items-center justify-between text-[10px] text-slate-400 mt-2 px-1">
            <span>Press Enter to send • Hold Mic for cabin voice broadcast</span>
            <span className="font-mono text-cyan-400">Radio Freq: 462.5625 MHz</span>
          </div>
        </div>
      </div>
    </div>
  );
}
