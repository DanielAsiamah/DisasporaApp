/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Send, Volume2, Sparkles, MessageSquare, Info } from "lucide-react";
import { KOJO_CHAT_RESPONSES } from "../data/courses";

interface TutorTabProps {
  courseId: string;
  courseName: string;
}

interface Message {
  id: string;
  sender: "user" | "kojo";
  text: string;
  timestamp: string;
}

export default function TutorTab({ courseId, courseName }: TutorTabProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "m-welcome",
      sender: "kojo",
      text: `Wah gwaan! Bienvenue! I am Kojo, your interactive Diaspora Dialect Companion. 🦜 Ask me any question about ${courseName} vocabulary, pronunciation, or cultural origins!`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const PRESETS = [
    { label: "🤝 Greet elders", query: "How do I greet elders vs friends in this dialect?" },
    { label: "🔥 3 cool slangs", query: "What are 3 popular street slangs I can use right now?" },
    { label: "🌍 African roots", query: "What are the West African connections of this dialect?" },
    { label: "🍲 Food words", query: "What are some essential traditional food terms?" }
  ];

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const handleSendMessage = (text: string) => {
    if (!text.trim()) return;

    const userMsg: Message = {
      id: `m-user-${Date.now()}`,
      sender: "user",
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setMessages((prev) => [...prev, userMsg]);
    setInputValue("");
    setIsTyping(true);

    setTimeout(() => {
      const responses = KOJO_CHAT_RESPONSES[courseId] || [
        "That's an excellent question! Dialect forms are deeply expressive and rooted in rich ancestral resilience.",
        "Keep practicing! Repetition and speaking out loud is the secret to mastering the flow.",
        "I love your energy! Preserving these languages builds a bridge across generations."
      ];

      let replyText = "";
      const lowerQuery = text.toLowerCase();
      if (lowerQuery.includes("greet") || lowerQuery.includes("hello")) {
        if (courseId === "en-patois") replyText = "Greetings depend on vibe! To friends: 'Wah gwaan?' (What's going on?) or 'How yuh deh?' To elders: 'Good mawnin' with a polite nod. Patois blends African respect with Caribbean warmth!";
        else if (courseId === "fr-haitian") replyText = "In Haitian Creole, we say 'Sak pase?' to friends, answered with 'N ap boule!'. For respectful elders, use 'Bonjou, kouman ou ye?' (Hello, how are you?).";
        else replyText = `For ${courseName}, standard friendly greetings are the door-opener. For elders, always greet with extra warmth and polite attention. Try asking 'Habari!' or its equivalent!`;
      } else if (lowerQuery.includes("slang") || lowerQuery.includes("street")) {
        if (courseId === "en-patois") replyText = "Try these 3! 1) 'Yardie' (Jamaican person), 2) 'Chaka-chaka' (disorganized), 3) 'Lickle more' (see you later!).";
        else if (courseId === "fr-nouchi") replyText = "Abidjan street style! 1) 'Choco' (fancy/elegant), 2) 'Kpakpato' (gossip), 3) 'Ça gâte pas' (it's all good!).";
        else replyText = `In ${courseName}, street dialects are dynamic! They evolve rapidly in urban music, cooking hubs, and local markets to foster code-switching.`;
      } else if (lowerQuery.includes("root") || lowerQuery.includes("african") || lowerQuery.includes("connection")) {
        if (courseId === "en-patois") replyText = "Deep roots! The plural marker 'dem' matches Yoruba pluralizing grammar. Also, pronouns like 'Unnu' come straight from Igbo 'unu' (you plural)!";
        else if (courseId === "en-gullah") replyText = "The Gullah language preserves intact Bantu grammar structures, and features direct African vocabulary like 'oona' (you plural, from Igbo) and 'cooter' (turtle, from Mandinka).";
        else replyText = `Almost all Atlantic creoles and dialects retain West African grammatical syntax (Fon, Yoruba, Igbo, Wolof) mapped onto English or French vocabularies.`;
      } else {
        const randomIdx = Math.floor(Math.random() * responses.length);
        replyText = responses[randomIdx];
      }

      const kojoMsg: Message = {
        id: `m-kojo-${Date.now()}`,
        sender: "kojo",
        text: replyText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages((prev) => [...prev, kojoMsg]);
      setIsTyping(false);
    }, 1200);
  };

  const speakPhonetics = (text: string) => {
    const synth = window.speechSynthesis;
    if (synth) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      synth.speak(utterance);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-zinc-950 text-white relative">
      
      {/* Wave pattern banner */}
      <div className="p-4 bg-zinc-950 border-b-2 border-zinc-900 flex items-center justify-between sticky top-0 z-10 font-sans">
        <div className="flex items-center space-x-2.5">
          <div className="w-9 h-9 bg-zinc-900 border border-zinc-800 rounded-full flex items-center justify-center text-xl shadow-md">
            <span>🦜</span>
          </div>
          <div>
            <div className="flex items-center space-x-1">
              <h4 className="font-display text-sm uppercase tracking-wider text-zinc-100">Kojo Chat Companion</h4>
              <span className="text-[8px] bg-brand-green/20 text-brand-green px-1.5 py-0.5 rounded font-mono font-bold uppercase tracking-wider border border-brand-green/30">AI COACH</span>
            </div>
            <p className="text-[9px] text-zinc-500 font-mono">Preservation & Guidance</p>
          </div>
        </div>
        <div className="flex items-center space-x-1 text-[10px] text-brand-gold bg-zinc-900 px-2.5 py-1 rounded-full border border-zinc-800 font-mono font-bold">
          <Sparkles className="w-3 h-3 text-brand-gold animate-pulse" />
          <span>{courseName}</span>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        
        {/* Culture note info banner styled as a themed post card */}
        <div className="p-3 bg-zinc-900 border border-zinc-850 rounded-xl flex items-start space-x-2.5">
          <Info className="w-4 h-4 text-brand-gold flex-shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="text-[10px] font-bold text-zinc-200 uppercase tracking-wider font-mono">Interactive Oral Practice</p>
            <p className="text-[10px] text-zinc-400 leading-relaxed">
              Preserving spoken dialects is an oral tradition! Tap the speaker icon to hear Kojo's phonetic response.
            </p>
          </div>
        </div>

        {messages.map((msg) => {
          const isKojo = msg.sender === "kojo";
          return (
            <div
              key={msg.id}
              className={`flex items-start space-x-2 ${!isKojo ? "flex-row-reverse space-x-reverse" : ""}`}
            >
              {isKojo && (
                <div className="w-7 h-7 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-base flex-shrink-0">
                  🦜
                </div>
              )}
              <div className="space-y-1 max-w-[78%]">
                <div className={`p-3 rounded-xl text-xs leading-relaxed font-medium relative border ${
                  isKojo
                    ? "bg-zinc-900 border-zinc-800 text-zinc-200 rounded-tl-none shadow-[2.5px_2.5px_0px_0px_rgba(0,0,0,0.5)]"
                    : "bg-brand-green border-zinc-950 text-zinc-950 font-bold rounded-tr-none shadow-[2.5px_2.5px_0px_0px_#FCD116]"
                }`}>
                  {msg.text}

                  {isKojo && (
                    <button
                      onClick={() => speakPhonetics(msg.text)}
                      className="absolute -bottom-2 -right-2 p-1 bg-zinc-950 text-brand-green hover:text-brand-gold rounded-full border border-zinc-800 shadow-sm active:scale-90"
                      title="Phonetic Play"
                    >
                      <Volume2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
                <p className={`text-[8px] font-mono text-zinc-500 ${!isKojo ? "text-right" : ""}`}>
                  {msg.timestamp}
                </p>
              </div>
            </div>
          );
        })}

        {isTyping && (
          <div className="flex items-start space-x-2">
            <div className="w-7 h-7 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-base flex-shrink-0">
              🦜
            </div>
            <div className="bg-zinc-900 border border-zinc-800 p-3 rounded-xl rounded-tl-none">
              <div className="flex space-x-1.5 items-center">
                <div className="w-1.5 h-1.5 bg-brand-green rounded-full animate-bounce" />
                <div className="w-1.5 h-1.5 bg-brand-gold rounded-full animate-bounce [animation-delay:0.15s]" />
                <div className="w-1.5 h-1.5 bg-brand-red rounded-full animate-bounce [animation-delay:0.3s]" />
              </div>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Quick Suggestion Presets */}
      <div className="px-4 py-2 border-t-2 border-zinc-900 bg-zinc-950 sticky bottom-0 z-20 font-sans">
        <div className="flex space-x-2 overflow-x-auto pb-2 max-w-full scrollbar-none">
          {PRESETS.map((preset, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(preset.query)}
              className="flex-shrink-0 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 hover:border-brand-gold rounded-full text-[9px] font-bold text-zinc-300 font-mono transition-colors uppercase tracking-wider"
            >
              {preset.label}
            </button>
          ))}
        </div>

        {/* TextInput Box */}
        <div className="flex items-center space-x-2 pt-1 pb-3">
          <input
            type="text"
            placeholder={`Ask about ${courseName} syntax...`}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSendMessage(inputValue)}
            className="flex-1 bg-zinc-900 border-2 border-zinc-800 rounded-lg px-3 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-brand-green transition-colors font-sans"
          />
          <button
            onClick={() => handleSendMessage(inputValue)}
            className="p-3 bg-brand-gold hover:bg-yellow-400 text-zinc-950 rounded-lg border-2 border-zinc-950 shadow-[2px_2px_0px_0px_#CE1126] transition-all active:translate-y-0.5 active:shadow-none flex-shrink-0"
          >
            <Send className="w-3.5 h-3.5 stroke-[2.5]" />
          </button>
        </div>
      </div>
    </div>
  );
}
