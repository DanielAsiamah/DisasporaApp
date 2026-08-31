/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Globe2, ArrowRight, CheckCircle2, ChevronRight, Languages, BookOpen, Volume2, Sparkles, MapPin } from "lucide-react";
import { BaseLanguage, DialectCourse } from "../types";
import { COURSES_BY_BASE_LANG } from "../data/courses";

interface OnboardingProps {
  onComplete: (baseLang: BaseLanguage, courseId: string) => void;
}

export default function Onboarding({ onComplete }: OnboardingProps) {
  const [step, setStep] = useState<"splash" | "regions" | "speakLang" | "chooseCourse">("splash");
  const [selectedBaseLang, setSelectedBaseLang] = useState<BaseLanguage | null>(null);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);

  // Diaspora Regions list requested by the user
  const DIASPORA_REGIONS = [
    {
      id: "africa",
      title: "Motherland Africa",
      description: "Igbo, Yoruba, Swahili, Wolof, Nouchi. The cradle of syntax, rhythm, and oral traditions.",
      icon: "🌍",
      badge: "Origins",
      borderColor: "border-brand-green",
      textColor: "text-brand-green",
      countries: "Nigeria, Tanzania, Côte d'Ivoire"
    },
    {
      id: "caribbean",
      title: "The Caribbean",
      description: "Jamaican Patois, Haitian Kreyòl. Resilient fusion languages of resistance and freedom.",
      icon: "🏝️",
      badge: "Creole",
      borderColor: "border-brand-gold",
      textColor: "text-brand-gold",
      countries: "Jamaica, Haiti, Bahamas"
    },
    {
      id: "central-america",
      title: "Central America",
      description: "Belizean Kriol (Kriol nation) and Garifuna dialects. Caribbean vibes in the heart of the Isthmus.",
      icon: "🇧🇿",
      badge: "Belize",
      borderColor: "border-brand-red",
      textColor: "text-brand-red",
      countries: "Belize, Honduras"
    },
    {
      id: "north-america",
      title: "North America",
      description: "Gullah Geechee, AAVE, Southern dialects. Deeply preserved traditions of African-Americans.",
      icon: "✊🏾",
      badge: "Black Americans",
      borderColor: "border-zinc-400",
      textColor: "text-zinc-100",
      countries: "Sea Islands, Georgia"
    }
  ];

  // Base languages out of 3 that you can learn from (Duolingo style)
  const BASE_LANGUAGES = [
    {
      id: BaseLanguage.English,
      name: "English",
      nativeName: "I speak English",
      flag: "🇺🇸",
      accentBorder: "group-hover:border-brand-green",
      accentText: "group-hover:text-brand-green",
      description: "Learn Jamaican Patois, Belizean Kriol, Gullah Geechee, Swahili, Igbo, Yoruba."
    },
    {
      id: BaseLanguage.French,
      name: "French / Français",
      nativeName: "Je parle Français",
      flag: "🇫🇷",
      accentBorder: "group-hover:border-brand-red",
      accentText: "group-hover:text-brand-red",
      description: "Apprenez le Créole Haïtien, le Nouchi Ivoirien, le Wolof, le Swahili."
    },
    {
      id: BaseLanguage.Arabic,
      name: "Arabic / العربية",
      nativeName: "أنا أتحدث العربية",
      flag: "🇸🇦",
      accentBorder: "group-hover:border-brand-gold",
      accentText: "group-hover:text-brand-gold",
      description: "تعلم السواحيلية، العامية السودانية، أو اللهجة النوبية العريقة."
    }
  ];

  const handleNextFromSplash = () => setStep("regions");
  const handleNextFromRegions = () => setStep("speakLang");

  const handleSelectBaseLang = (lang: BaseLanguage) => {
    setSelectedBaseLang(lang);
    setStep("chooseCourse");
  };

  const handleSelectCourse = (courseId: string) => {
    setSelectedCourseId(courseId);
  };

  const handleFinishOnboarding = () => {
    if (selectedBaseLang && selectedCourseId) {
      onComplete(selectedBaseLang, selectedCourseId);
    }
  };

  const currentAvailableCourses = selectedBaseLang ? COURSES_BY_BASE_LANG[selectedBaseLang] : [];

  return (
    <div className="flex-1 flex flex-col justify-between h-full bg-zinc-950 text-white relative">
      
      {/* Subtle radial light background */}
      <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-brand-green/10 to-transparent pointer-events-none z-0" />
      
      {/* Progress header bar (Duolingo style) */}
      <div className="relative z-10 px-6 pt-5 flex items-center justify-between">
        <div className="flex items-center space-x-1.5">
          <Globe2 className="w-4 h-4 text-brand-gold" />
          <span className="text-[10px] font-bold uppercase tracking-[2px] font-mono text-zinc-400">DIASPORA LINGO</span>
        </div>
        
        {/* Flat blocky progress steps */}
        <div className="flex space-x-1">
          <div className={`h-1.5 w-6 transition-all duration-300 ${step === "splash" ? "bg-brand-green" : "bg-zinc-800"}`} />
          <div className={`h-1.5 w-6 transition-all duration-300 ${step === "regions" ? "bg-brand-gold" : "bg-zinc-800"}`} />
          <div className={`h-1.5 w-6 transition-all duration-300 ${step === "speakLang" ? "bg-brand-red" : "bg-zinc-800"}`} />
          <div className={`h-1.5 w-6 transition-all duration-300 ${step === "chooseCourse" ? "bg-brand-green" : "bg-zinc-800"}`} />
        </div>
      </div>

      {/* Steps Content inside AnimatePresence */}
      <div className="flex-1 flex flex-col justify-center px-6 py-3 relative z-10 overflow-y-auto">
        <AnimatePresence mode="wait">
          
          {/* STEP 1: SPLASH INTRO */}
          {step === "splash" && (
            <motion.div
              key="splash"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col items-center text-center space-y-6 my-auto"
            >
              {/* Mascot Bubble & Mascot SVG */}
              <div className="relative w-44 h-44 flex items-center justify-center">
                {/* Stylized speech bubble (Artistic offset border look) */}
                <motion.div 
                  initial={{ scale: 0.8, opacity: 0, y: 10 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="absolute -top-6 bg-brand-gold text-zinc-950 font-bold px-3 py-1.5 text-xs uppercase tracking-wider rounded-lg border-2 border-zinc-950 shadow-[3px_3px_0px_0px_#CE1126] z-20 font-mono"
                >
                  Wah gwaan! 👋🏾
                </motion.div>
                
                {/* Cute Parrot Mascot "Kojo" */}
                <div className="w-36 h-36 bg-zinc-900 border-4 border-zinc-800 rounded-full flex items-center justify-center p-3 shadow-xl relative overflow-hidden group">
                  <span className="text-7xl select-none filter drop-shadow-md group-hover:scale-110 transition-transform duration-300">🦜</span>
                  {/* African/Pan-African pan-banner across the container bottom */}
                  <div className="absolute bottom-0 inset-x-0 h-3 bg-gradient-to-r from-brand-red via-brand-gold to-brand-green" />
                </div>
              </div>

              <div className="space-y-3">
                <h2 className="text-4xl font-display uppercase tracking-wide leading-none text-zinc-100">
                  WELCOME TO <br />
                  <span className="text-brand-green block">DIASPORA</span>
                  <span className="text-brand-gold block">DIALECT</span>
                  <span className="text-brand-red block">LEARNER</span>
                </h2>
                <p className="text-xs text-zinc-400 leading-relaxed max-w-sm">
                  Bridge the gap. Discover the beautiful heritages of Creole, Patois, Bantu, and Black dialect heritages in an elegant, game-like experience.
                </p>
              </div>

              <div className="w-full pt-2">
                <button
                  id="btn-get-started"
                  onClick={handleNextFromSplash}
                  className="w-full bg-brand-gold hover:bg-yellow-400 text-zinc-950 font-bold py-3.5 px-6 rounded-xl flex items-center justify-center space-x-2 border-2 border-zinc-950 shadow-[4px_4px_0px_0px_#CE1126] active:translate-y-1 active:shadow-none transition-all text-sm uppercase tracking-wider"
                >
                  <span>GET STARTED</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 2: REGIONS SHOWCASE */}
          {step === "regions" && (
            <motion.div
              key="regions"
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -15 }}
              transition={{ duration: 0.2 }}
              className="space-y-4 my-auto"
            >
              <div className="text-center space-y-1">
                <span className="text-[10px] font-bold text-brand-gold tracking-widest uppercase font-mono">Unified Heritage</span>
                <h3 className="text-3xl font-display uppercase tracking-wide text-zinc-100">CULTURE SPACES</h3>
                <p className="text-xs text-zinc-400">Celebrating connection across four dialect regions:</p>
              </div>

              {/* Regions Cards */}
              <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
                {DIASPORA_REGIONS.map((region) => (
                  <motion.div
                    key={region.id}
                    whileHover={{ scale: 1.01 }}
                    className={`bg-zinc-900/80 border-2 ${region.borderColor} p-3 rounded-xl flex items-start space-x-3 relative overflow-hidden group shadow-[3px_3px_0px_0px_rgba(0,0,0,0.4)]`}
                  >
                    <div className="text-2xl p-1.5 bg-zinc-950 rounded-lg flex-shrink-0 border border-zinc-800">
                      {region.icon}
                    </div>
                    <div className="space-y-0.5 min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-xs uppercase tracking-wider text-zinc-100">
                          {region.title}
                        </h4>
                        <span className={`text-[8px] font-mono font-bold px-1.5 py-0.5 bg-zinc-950 ${region.textColor} rounded border border-zinc-800`}>
                          {region.badge}
                        </span>
                      </div>
                      <p className="text-[10.5px] text-zinc-300 leading-snug">
                        {region.description}
                      </p>
                      <div className="flex items-center space-x-1 text-[9px] text-zinc-500 font-mono pt-0.5">
                        <MapPin className="w-2.5 h-2.5 text-brand-red" />
                        <span className="truncate">{region.countries}</span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              <div className="pt-2">
                <button
                  id="btn-confirm-regions"
                  onClick={handleNextFromRegions}
                  className="w-full bg-brand-green hover:bg-emerald-500 text-white font-bold py-3.5 px-6 rounded-xl flex items-center justify-center space-x-2 border-2 border-zinc-950 shadow-[4px_4px_0px_0px_#FCD116] active:translate-y-1 active:shadow-none transition-all text-xs uppercase tracking-widest"
                >
                  <span>EXPLORE LANGUAGES</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 3: BASE LANGUAGE SPEAKING FLOW */}
          {step === "speakLang" && (
            <motion.div
              key="speakLang"
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -15 }}
              transition={{ duration: 0.2 }}
              className="space-y-4 my-auto"
            >
              <div className="text-center space-y-1">
                <Languages className="w-6 h-6 text-brand-gold mx-auto" />
                <h3 className="text-3xl font-display uppercase tracking-wide text-zinc-100">YOUR NATIVE LANGUAGE</h3>
                <p className="text-xs text-zinc-400">Choose from 3 native languages to adapt translations.</p>
              </div>

              {/* Duolingo style Base Lang cards */}
              <div className="space-y-3 pt-2">
                {BASE_LANGUAGES.map((lang) => (
                  <button
                    key={lang.id}
                    id={`base-lang-${lang.id}`}
                    onClick={() => handleSelectBaseLang(lang.id)}
                    className="w-full bg-zinc-900 border-2 border-zinc-800 hover:border-brand-gold text-left p-4 rounded-xl flex items-center space-x-4 transition-all duration-150 active:scale-[0.98] group relative overflow-hidden shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5)] hover:shadow-[4px_4px_0px_0px_#FCD116]"
                  >
                    <div className="text-3xl filter drop-shadow-md">{lang.flag}</div>
                    <div className="flex-1 space-y-0.5 min-w-0">
                      <div className="font-bold text-sm text-zinc-100 group-hover:text-brand-gold transition-colors font-sans uppercase tracking-wider">
                        {lang.nativeName}
                      </div>
                      <div className="text-[10.5px] text-zinc-400 leading-snug">
                        {lang.description}
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-brand-gold group-hover:translate-x-1 transition-all" />
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* STEP 4: CHOOSE YOUR COURSE (DYNAMIC) */}
          {step === "chooseCourse" && (
            <motion.div
              key="chooseCourse"
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -15 }}
              transition={{ duration: 0.2 }}
              className="space-y-3 my-auto"
            >
              <div className="text-center space-y-1">
                <BookOpen className="w-5 h-5 text-brand-green mx-auto" />
                <h3 className="text-2xl font-display uppercase tracking-wide text-zinc-100">CHOOSE DIALECT</h3>
                <p className="text-xs text-zinc-400">Select a course to start your dialect training.</p>
              </div>

              {/* Dynamic list based on speak lang */}
              <div className="space-y-2.5 max-h-[320px] overflow-y-auto pr-1">
                {currentAvailableCourses.map((course) => {
                  const isSelected = selectedCourseId === course.id;
                  return (
                    <button
                      key={course.id}
                      id={`course-${course.id}`}
                      onClick={() => handleSelectCourse(course.id)}
                      className={`w-full text-left p-3 rounded-xl flex items-center space-x-3 transition-all relative border-2 ${
                        isSelected
                          ? "bg-zinc-900 border-brand-green shadow-[3px_3px_0px_0px_#009E49]"
                          : "bg-zinc-900/60 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900"
                      }`}
                    >
                      <div className="text-2xl p-1.5 bg-zinc-950 rounded-lg relative flex-shrink-0 border border-zinc-850">
                        {course.flag}
                        {isSelected && (
                          <span className="absolute -top-1 -right-1 bg-brand-green rounded-full p-0.5">
                            <CheckCircle2 className="w-2.5 h-2.5 text-zinc-950 fill-zinc-950" />
                          </span>
                        )}
                      </div>
                      <div className="flex-1 space-y-0.5 min-w-0">
                        <div className="flex items-center justify-between">
                          <h4 className="font-bold text-xs text-zinc-100 truncate uppercase tracking-wider">
                            {course.name}
                          </h4>
                          <span className={`text-[8px] font-mono font-bold px-1.5 py-0.5 rounded ${
                            course.difficulty === "Beginner" ? "bg-brand-green/20 text-brand-green" :
                            course.difficulty === "Intermediate" ? "bg-brand-gold/20 text-brand-gold" :
                            "bg-brand-red/20 text-brand-red"
                          }`}>
                            {course.difficulty}
                          </span>
                        </div>
                        <p className="text-[10px] text-zinc-300 leading-snug">
                          {course.tagline}
                        </p>
                        <p className="text-[9px] text-zinc-500 font-mono italic">
                          📍 {course.region}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Back & Forward Button controls */}
              <div className="flex space-x-3 pt-2">
                <button
                  id="btn-back"
                  onClick={() => setStep("speakLang")}
                  className="flex-1 bg-zinc-900 hover:bg-zinc-850 border-2 border-zinc-850 text-zinc-400 font-bold py-2.5 px-3 rounded-lg text-[10px] uppercase tracking-wider transition-colors"
                >
                  BACK
                </button>
                <button
                  id="btn-launch-course"
                  disabled={!selectedCourseId}
                  onClick={handleFinishOnboarding}
                  className={`flex-[2] font-bold py-2.5 px-4 rounded-lg text-[10px] uppercase tracking-widest flex items-center justify-center space-x-1.5 transition-all border-2 ${
                    selectedCourseId
                      ? "bg-brand-gold hover:bg-yellow-400 text-zinc-950 border-zinc-950 shadow-[3px_3px_0px_0px_#CE1126] active:translate-y-0.5 active:shadow-none"
                      : "bg-zinc-800 text-zinc-500 border-zinc-850 cursor-not-allowed"
                  }`}
                >
                  <span>START LEARNING</span>
                  <Sparkles className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
