/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Wifi, Signal, Battery, Compass, Sparkles, MapPin } from "lucide-react";

interface PhoneFrameProps {
  children: React.ReactNode;
}

export default function PhoneFrame({ children }: PhoneFrameProps) {
  const [time, setTime] = useState("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      let hours = now.getHours();
      const minutes = now.getMinutes().toString().padStart(2, "0");
      const ampm = hours >= 12 ? "PM" : "AM";
      hours = hours % 12;
      hours = hours ? hours : 12; // the hour '0' should be '12'
      setTime(`${hours}:${minutes} ${ampm}`);
    };

    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-0 md:p-6 select-none overflow-hidden relative font-sans">
      {/* Background radial gradient & patterns from Artistic Flair */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,#18181b_0%,#09090b_100%)] pointer-events-none z-0" />
      <div className="pattern-bg z-0" />

      {/* Decorative vertical sidebar-text on the left (Artistic Flair requirement) */}
      <div className="hidden xl:flex flex-col justify-between absolute left-8 top-0 bottom-0 py-12 border-r border-zinc-800/60 pr-8 z-10">
        <h2 className="font-display text-[72px] tracking-[6px] text-zinc-900 leading-none uppercase select-none rotate-180 sidebar-text-vertical">
          DIASPORA
        </h2>
        <h2 className="font-display text-[72px] tracking-[6px] text-zinc-900/60 leading-none uppercase select-none rotate-180 sidebar-text-vertical">
          LINGO
        </h2>
      </div>

      {/* Left branding blurb */}
      <div className="hidden lg:flex flex-col absolute left-28 top-1/2 -translate-y-1/2 max-w-[280px] space-y-4 text-zinc-300 z-10">
        <div className="inline-flex items-center space-x-2 bg-brand-gold/10 border border-brand-gold/20 px-3 py-1 rounded-full text-xs font-semibold text-brand-gold w-fit">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Artistic Flair Theme</span>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white leading-tight">
          Diaspora Language <br />
          <span className="text-brand-gold font-display text-4xl block mt-1 tracking-wide">
            & Dialect Learner
          </span>
        </h1>
        <p className="text-xs text-zinc-400 leading-relaxed">
          Inspired by Duolingo. Master Jamaican Patois, Swahili, Gullah Geechee, Belizean Creole, Ivorian Nouchi, Igbo, Yoruba, and Haitian Creole in a highly interactive, beautifully designed mobile experience.
        </p>
        <div className="flex items-center space-x-2 text-[10px] text-zinc-500 font-mono">
          <div className="w-2 h-2 rounded-full bg-brand-green animate-pulse" />
          <span>IPHONE 17 PRO MAX PREVIEW</span>
        </div>
      </div>

      {/* iPhone 17 Pro Max Frame Container */}
      <div className="relative w-full max-w-[430px] md:h-[880px] h-screen bg-black md:rounded-[56px] md:shadow-[0_0_0_12px_#18181b,0_30px_70px_rgba(0,0,0,0.9)] border-4 border-zinc-900 overflow-hidden flex flex-col transition-all duration-300 z-20">
        
        {/* Physical Button Mockups */}
        <div className="hidden md:block absolute -left-[6px] top-40 w-[3px] h-10 bg-zinc-800 rounded-r" />
        <div className="hidden md:block absolute -left-[6px] top-56 w-[3px] h-16 bg-zinc-800 rounded-r" />
        <div className="hidden md:block absolute -left-[6px] top-76 w-[3px] h-16 bg-zinc-800 rounded-r" />
        <div className="hidden md:block absolute -right-[6px] top-56 w-[3px] h-20 bg-zinc-800 rounded-l" />

        {/* Dynamic Island Screen Header */}
        <div className="absolute top-0 inset-x-0 h-14 bg-zinc-950 z-50 flex items-center justify-between px-7 pointer-events-none border-b border-zinc-900/40">
          {/* Left: Time */}
          <div className="text-[13px] font-bold text-zinc-100 flex items-center tracking-tight font-mono">
            {time || "9:41 AM"}
          </div>

          {/* Center: Dynamic Island */}
          <div className="absolute left-1/2 -translate-x-1/2 top-2.5 w-[110px] h-7 bg-black rounded-full flex items-center justify-center transition-all duration-500 hover:w-[130px] group">
            <div className="w-2.5 h-2.5 rounded-full bg-zinc-900 border border-zinc-800/80 mr-auto ml-3" />
            <div className="w-1.5 h-1.5 rounded-full bg-blue-900/40 mr-3" />
          </div>

          {/* Right: Signal, Wifi, Battery */}
          <div className="flex items-center space-x-1.5 text-zinc-100">
            <Signal className="w-3.5 h-3.5 text-zinc-400" />
            <Wifi className="w-3.5 h-3.5 text-zinc-400" />
            <div className="flex items-center space-x-0.5">
              <span className="text-[10px] font-bold font-mono">100%</span>
              <Battery className="w-4 h-4 fill-brand-green text-brand-green" />
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 pt-14 pb-5 overflow-y-auto bg-zinc-950 flex flex-col relative">
          {children}
        </div>

        {/* Bottom Home Indicator */}
        <div className="absolute bottom-1 inset-x-0 h-4 bg-transparent z-50 pointer-events-none flex items-center justify-center">
          <div className="w-32 h-[4px] bg-zinc-800 rounded-full" />
        </div>
      </div>

      {/* Interactive tag-cloud & custom branding slogan on the right side */}
      <div className="hidden lg:flex flex-col absolute right-12 top-1/2 -translate-y-1/2 max-w-[280px] space-y-5 z-10 border-l border-zinc-800/60 pl-8">
        <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5 font-mono">
          <Compass className="w-4 h-4 text-brand-gold" />
          <span>DIASPORA SPACES</span>
        </h4>
        
        {/* Dynamic Tag Cloud from Artistic Flair */}
        <div className="flex flex-wrap gap-2 pt-1">
          {["Belize", "Jamaica", "Nigeria", "Senegal", "Haiti", "Bahamas", "Ethiopia", "Congo"].map((tag, idx) => (
            <span key={idx} className="px-3 py-1 bg-zinc-900/50 border border-zinc-800 rounded-full text-[10px] font-bold uppercase tracking-wider text-zinc-400">
              {tag}
            </span>
          ))}
          <span className="px-3 py-1 bg-brand-gold/10 border border-brand-gold/30 rounded-full text-[10px] font-bold uppercase tracking-wider text-brand-gold">
            New: Black American Dialect
          </span>
        </div>

        {/* One People, Many Voices Slogan from design */}
        <div className="pt-6 border-t border-zinc-800/40">
          <div className="font-display text-[44px] leading-[0.85] text-brand-red tracking-wide">
            ONE<br />PEOPLE.
          </div>
          <div className="font-display text-[44px] leading-[0.85] text-brand-gold tracking-wide mt-1">
            MANY<br />VOICES.
          </div>
        </div>

        <div className="bg-zinc-900/60 border border-zinc-800/60 p-4 rounded-2xl space-y-2 text-[11px] text-zinc-400">
          <p className="font-semibold text-zinc-200">💡 Diaspora Learning Principle:</p>
          <p className="leading-relaxed">
            By mapping multiple base languages to our modular courses, learners can appreciate the intercontinental history of Creole, Patois, and African Bantu dialects.
          </p>
        </div>
      </div>
    </div>
  );
}

