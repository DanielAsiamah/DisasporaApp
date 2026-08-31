/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Trophy, Award, Flame, Star, Settings, RotateCcw, ArrowLeftRight, GraduationCap, Database, Copy, Check, X } from "lucide-react";
import { DialectCourse } from "../types";
import { generateFirestoreSeedData } from "../services/seedGenerator";

interface ProfileTabProps {
  course: DialectCourse;
  xp: number;
  streak: number;
  completedCount: number;
  onReset: () => void;
  onChangeCourse: () => void;
}

export default function ProfileTab({
  course,
  xp,
  streak,
  completedCount,
  onReset,
  onChangeCourse
}: ProfileTabProps) {
  const [showSeedModal, setShowSeedModal] = useState(false);
  const [copied, setCopied] = useState(false);
  
  // Custom badges awarded based on courses
  const BADGES = [
    {
      id: "b-pioneer",
      title: `${course.name} Pioneer`,
      desc: "Preserved your first dialect lesson successfully.",
      icon: "🎖️",
      unlocked: completedCount > 0,
      borderColor: "border-brand-green",
      shadowColor: "shadow-[3px_3px_0px_0px_#009E49]"
    },
    {
      id: "b-streak",
      title: "Resilient Flame",
      desc: "Kept a daily learning streak active to honor history.",
      icon: "🔥",
      unlocked: streak > 0,
      borderColor: "border-brand-red",
      shadowColor: "shadow-[3px_3px_0px_0px_#CE1126]"
    },
    {
      id: "b-expert",
      title: "Dialect Guardian",
      desc: "Earned 50+ XP in cultural translation tasks.",
      icon: "👑",
      unlocked: xp >= 50,
      borderColor: "border-brand-gold",
      shadowColor: "shadow-[3px_3px_0px_0px_#FCD116]"
    },
    {
      id: "b-ambassador",
      title: "Ambassador",
      desc: "Unlocked ancestral roots across borders.",
      icon: "🌍",
      unlocked: xp >= 20,
      borderColor: "border-zinc-400",
      shadowColor: "shadow-[3px_3px_0px_0px_rgba(255,255,255,0.1)]"
    }
  ];

  // Level calculator
  const currentLevel = Math.floor(xp / 100) + 1;
  const nextLevelXp = currentLevel * 100;
  const xpProgressPercent = Math.min(((xp % 100) / 100) * 100, 100);

  return (
    <div className="flex-1 flex flex-col h-full bg-zinc-950 text-white p-5 space-y-5 overflow-y-auto font-sans relative">
      <div className="pattern-bg" />

      {/* Top Profile Header with offset border */}
      <div className="flex items-center space-x-4 relative z-10">
        <div className="relative">
          <div className="w-16 h-16 bg-zinc-900 border-2 border-brand-green rounded-xl flex items-center justify-center text-3xl shadow-[3px_3px_0px_0px_#009E49] font-bold">
            👤
          </div>
          <span className="absolute -bottom-1 -right-1 bg-brand-gold text-zinc-950 text-[9px] font-bold font-mono px-1.5 py-0.5 rounded border-2 border-zinc-950 shadow-[1.5px_1.5px_0px_0px_#CE1126]">
            LVL {currentLevel}
          </span>
        </div>

        <div className="space-y-0.5">
          <h3 className="text-xl font-display uppercase tracking-wide text-zinc-100">Preserver Profile</h3>
          <p className="text-[10.5px] text-zinc-400 flex items-center">
            <GraduationCap className="w-3.5 h-3.5 text-brand-green mr-1" />
            Lingo: <span className="font-bold text-brand-green ml-1">{course.name}</span>
          </p>
        </div>
      </div>

      {/* XP Progress Bar styled as an offset block */}
      <div className="bg-zinc-900 border-2 border-zinc-800 p-4 rounded-xl space-y-2 relative z-10 shadow-[3px_3px_0px_0px_rgba(0,0,0,0.4)]">
        <div className="flex justify-between text-[10px] font-bold font-mono">
          <span className="text-zinc-400 tracking-wider">XP STATUS</span>
          <span className="text-brand-gold">{xp} / {nextLevelXp} XP</span>
        </div>
        <div className="h-3 bg-zinc-950 rounded border border-zinc-800 overflow-hidden p-[1px]">
          <div className="h-full bg-brand-gold rounded" style={{ width: `${xpProgressPercent}%` }} />
        </div>
        <p className="text-[9px] font-mono text-zinc-500"> preservation points needed for LVL {currentLevel + 1}</p>
      </div>

      {/* Gamified Core Stats Grid */}
      <div className="grid grid-cols-3 gap-3 relative z-10">
        <div className="bg-zinc-900 border-2 border-zinc-800 p-3 rounded-xl text-center space-y-0.5 shadow-[3px_3px_0px_0px_rgba(0,0,0,0.5)]">
          <Flame className="w-4.5 h-4.5 text-brand-red mx-auto animate-pulse" />
          <p className="text-xl font-display text-white">{streak}</p>
          <span className="text-[8px] font-mono font-bold text-zinc-500 block uppercase tracking-wider">Streak</span>
        </div>

        <div className="bg-zinc-900 border-2 border-zinc-800 p-3 rounded-xl text-center space-y-0.5 shadow-[3px_3px_0px_0px_rgba(0,0,0,0.5)]">
          <Star className="w-4.5 h-4.5 text-brand-gold mx-auto" />
          <p className="text-xl font-display text-white">{xp}</p>
          <span className="text-[8px] font-mono font-bold text-zinc-500 block uppercase tracking-wider">Total XP</span>
        </div>

        <div className="bg-zinc-900 border-2 border-zinc-800 p-3 rounded-xl text-center space-y-0.5 shadow-[3px_3px_0px_0px_rgba(0,0,0,0.5)]">
          <Trophy className="w-4.5 h-4.5 text-brand-green mx-auto" />
          <p className="text-xl font-display text-white">{completedCount}</p>
          <span className="text-[8px] font-mono font-bold text-zinc-500 block uppercase tracking-wider">Completed</span>
        </div>
      </div>

      {/* Trophy / Badges Section */}
      <div className="space-y-2.5 relative z-10">
        <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center font-mono">
          <Award className="w-4 h-4 text-brand-gold mr-1" /> Badge Collection
        </h4>

        <div className="grid grid-cols-2 gap-3">
          {BADGES.map((badge) => (
            <div
              key={badge.id}
              className={`border-2 p-3 rounded-xl relative overflow-hidden flex flex-col justify-between h-24 transition-all ${
                badge.unlocked
                  ? `bg-zinc-900 ${badge.borderColor} ${badge.shadowColor}`
                  : "bg-zinc-950/40 border-zinc-900/60 opacity-30 select-none"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-2xl filter drop-shadow">{badge.icon}</span>
                {badge.unlocked && (
                  <span className="w-1 h-1 rounded-full bg-brand-green animate-ping" />
                )}
              </div>
              <div className="space-y-0.5">
                <h5 className="text-[10.5px] font-bold uppercase tracking-wider text-zinc-100 truncate leading-tight">{badge.title}</h5>
                <p className="text-[9px] text-zinc-400 leading-tight line-clamp-2">{badge.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Advanced Control Settings */}
      <div className="space-y-2.5 pt-1 relative z-10">
        <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center font-mono">
          <Settings className="w-4 h-4 text-zinc-500 mr-1" /> Quick Actions
        </h4>

        <div className="space-y-2">
          {/* Seeding Registry Database Trigger */}
          <button
            onClick={() => {
              setCopied(false);
              setShowSeedModal(true);
            }}
            className="w-full bg-zinc-900 hover:bg-zinc-850 border-2 border-zinc-800 hover:border-brand-green px-4 py-3 rounded-xl text-[10.5px] font-bold text-zinc-200 flex items-center justify-between transition-all active:translate-y-0.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.5)]"
          >
            <div className="flex items-center space-x-2">
              <Database className="w-4 h-4 text-brand-gold" />
              <span className="uppercase tracking-wider font-mono">Firestore Seeding Registry</span>
            </div>
            <span className="text-[8px] bg-brand-gold/20 text-brand-gold px-1.5 py-0.5 rounded font-bold uppercase font-mono">SCHEMA</span>
          </button>

          {/* Switch Course Action */}
          <button
            onClick={onChangeCourse}
            className="w-full bg-zinc-900 hover:bg-zinc-850 border-2 border-zinc-800 hover:border-brand-gold px-4 py-3 rounded-xl text-[10.5px] font-bold text-zinc-200 flex items-center justify-between transition-all active:translate-y-0.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.5)]"
          >
            <div className="flex items-center space-x-2">
              <ArrowLeftRight className="w-4 h-4 text-brand-green" />
              <span className="uppercase tracking-wider font-mono">Swap Native Language / Dialect</span>
            </div>
            <span className="text-[8px] bg-brand-green/20 text-brand-green px-1.5 py-0.5 rounded font-bold uppercase font-mono">SWAP</span>
          </button>

          {/* Reset Progress Action */}
          <button
            onClick={onReset}
            className="w-full bg-zinc-900 hover:bg-zinc-850 border-2 border-zinc-800 hover:border-brand-red px-4 py-3 rounded-xl text-[10.5px] font-bold text-brand-red flex items-center justify-between transition-all active:translate-y-0.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.5)]"
          >
            <div className="flex items-center space-x-2">
              <RotateCcw className="w-4 h-4 text-brand-red" />
              <span className="uppercase tracking-wider font-mono">Reset Path Progress</span>
            </div>
            <span className="text-[8px] bg-brand-red/20 text-brand-red px-1.5 py-0.5 rounded font-bold uppercase font-mono">RESET</span>
          </button>
        </div>
      </div>

      {/* Folklore snippet footer */}
      <div className="p-3 bg-zinc-900 border-2 border-dashed border-zinc-800 rounded-xl text-[9.5px] text-zinc-500 leading-normal text-center relative z-10 font-mono">
        📖 Creole languages are complete structures developed through historical cultural integration. Keep preserving!
      </div>

      {/* FULLSCREEN SEED GENERATION SCHEMATIC MODAL OVERLAY */}
      <AnimatePresence>
        {showSeedModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-zinc-950/95 z-50 flex flex-col p-5 font-sans overflow-hidden"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800 mb-4">
              <div className="flex items-center space-x-2.5">
                <Database className="w-5 h-5 text-brand-gold" />
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider">FIRESTORE SEED SCHEMATIC</h3>
                  <p className="text-[9px] text-zinc-400 font-mono">Workbook → Unit → Lesson → Steps</p>
                </div>
              </div>
              <button
                onClick={() => setShowSeedModal(false)}
                className="p-1 hover:bg-zinc-900 rounded-lg text-zinc-400 hover:text-white transition-colors border border-zinc-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Explainer Banner */}
            <div className="p-3 bg-zinc-900/60 border border-zinc-800 rounded-xl space-y-1 mb-4">
              <p className="text-[10px] text-zinc-300 font-semibold leading-relaxed">
                This utility generates the precise Firestore seeding payload from the active master curriculum workbook. Each step matches the step array model required by the upgraded Duolingo-style player flow.
              </p>
              <div className="flex items-center space-x-1 text-brand-green text-[9px] font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-green animate-ping inline-block mr-1" />
                <span>SCHEMA VERSION 2.0.0 (STEPS-ARRAY COMPLIANT)</span>
              </div>
            </div>

            {/* Code Schematic Stage */}
            <div className="flex-1 overflow-y-auto bg-zinc-900 border-2 border-zinc-850 rounded-xl p-4 font-mono text-[9px] relative select-text">
              <div className="absolute top-3 right-3 flex items-center space-x-2">
                <button
                  onClick={() => {
                    const dataStr = JSON.stringify(generateFirestoreSeedData(), null, 2);
                    navigator.clipboard.writeText(dataStr);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="px-2.5 py-1.5 bg-zinc-950 hover:bg-zinc-800 rounded border border-zinc-800 text-[9px] font-bold text-brand-green transition-all flex items-center space-x-1"
                  title="Copy JSON Payload"
                >
                  {copied ? (
                    <>
                      <Check className="w-3 h-3 text-brand-green" />
                      <span>COPIED!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>COPY SEED JSON</span>
                    </>
                  )}
                </button>
              </div>

              {/* Formatted JSON Preview */}
              <pre className="text-zinc-300 leading-relaxed whitespace-pre-wrap max-w-full">
                {JSON.stringify(generateFirestoreSeedData(), null, 2)}
              </pre>
            </div>

            {/* Close footer button */}
            <div className="pt-4 flex justify-end">
              <button
                onClick={() => setShowSeedModal(false)}
                className="px-4 py-2 bg-brand-green text-zinc-950 text-xs font-black rounded-lg border border-zinc-950 uppercase tracking-wider hover:bg-emerald-400 active:translate-y-0.5"
              >
                Close View
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
