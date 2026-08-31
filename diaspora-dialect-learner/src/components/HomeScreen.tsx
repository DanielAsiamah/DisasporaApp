/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Compass, BookOpen, User, Flame, Star, Heart, Lock, CheckCircle2, ChevronRight, Play, Sparkles, AlertCircle } from "lucide-react";
import { BaseLanguage, DialectCourse, Unit, LessonNode, UserProgress } from "../types";
import { COURSE_CONTENT } from "../data/courses";
import QuizModal from "./QuizModal";
import TutorTab from "./TutorTab";
import ProfileTab from "./ProfileTab";

interface HomeScreenProps {
  course: DialectCourse;
  userProgress: UserProgress;
  onUpdateProgress: (progress: UserProgress) => void;
  onChangeCourse: () => void;
  onResetProgress: () => void;
}

export default function HomeScreen({
  course,
  userProgress,
  onUpdateProgress,
  onChangeCourse,
  onResetProgress
}: HomeScreenProps) {
  const [activeTab, setActiveTab] = useState<"learn" | "coach" | "profile">("learn");
  const [selectedLesson, setSelectedLesson] = useState<LessonNode | null>(null);
  const [isQuizActive, setIsQuizActive] = useState(false);

  const units = COURSE_CONTENT[course.id] || [];

  // Helper to check lesson status
  const getLessonStatus = (lessonId: string, idxInCourse: number, totalPrevCompleted: number): "locked" | "available" | "completed" => {
    if (userProgress.completedLessons.includes(lessonId)) {
      return "completed";
    }
    if (idxInCourse === 0 || idxInCourse <= totalPrevCompleted) {
      return "available";
    }
    return "locked";
  };

  const allLessons: { lesson: LessonNode; unitId: string; overallIndex: number }[] = [];
  units.forEach((unit) => {
    unit.lessons.forEach((l) => {
      allLessons.push({
        lesson: l,
        unitId: unit.id,
        overallIndex: allLessons.length
      });
    });
  });

  const totalCompleted = userProgress.completedLessons.length;

  const handleSelectNode = (lesson: LessonNode, status: "locked" | "available" | "completed") => {
    if (status === "locked") return;
    setSelectedLesson(lesson);
  };

  const handleStartQuiz = () => {
    if (selectedLesson) {
      setIsQuizActive(true);
    }
  };

  const handleCompleteQuiz = (xpGained: number) => {
    if (!selectedLesson) return;

    const updatedCompleted = [...userProgress.completedLessons];
    if (!updatedCompleted.includes(selectedLesson.id)) {
      updatedCompleted.push(selectedLesson.id);
    }

    const nextXp = userProgress.xp + xpGained + 15; // +15 bonus!
    const nextLevel = Math.floor(nextXp / 100) + 1;

    onUpdateProgress({
      ...userProgress,
      xp: nextXp,
      streak: userProgress.streak === 0 ? 1 : userProgress.streak,
      completedLessons: updatedCompleted,
      level: nextLevel
    });

    setIsQuizActive(false);
    setSelectedLesson(null);
  };

  const handleLoseHeart = () => {
    if (userProgress.hearts > 0) {
      onUpdateProgress({
        ...userProgress,
        hearts: userProgress.hearts - 1
      });
    }
  };

  const handleRestoreHearts = () => {
    onUpdateProgress({
      ...userProgress,
      hearts: 5
    });
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-zinc-950 text-white select-none relative overflow-hidden">
      
      {/* Top Fixed Header stats bar */}
      <div className="px-5 py-3 bg-zinc-950 border-b-2 border-zinc-900 flex items-center justify-between sticky top-0 z-30 font-sans">
        
        {/* Selected Course flag selector with offset border */}
        <button
          onClick={onChangeCourse}
          className="flex items-center space-x-2 bg-zinc-900 hover:bg-zinc-850 border-2 border-zinc-800 px-3 py-1 rounded-full transition-all active:translate-y-[1px] shadow-[2px_2px_0px_0px_rgba(0,0,0,0.5)]"
          title="Change Dialect"
        >
          <span className="text-lg filter drop-shadow">{course.flag}</span>
          <span className="text-[11px] font-black tracking-wide text-zinc-100 uppercase">{course.name}</span>
        </button>

        {/* Counters panel */}
        <div className="flex items-center space-x-2.5">
          {/* Flame streak */}
          <div className="flex items-center space-x-1 px-2 py-0.5 bg-zinc-900 border border-zinc-800 rounded-md font-mono" title="Daily Streak">
            <Flame className="w-3.5 h-3.5 text-brand-red fill-brand-red animate-pulse" />
            <span className="text-[11px] font-bold text-brand-red">{userProgress.streak}</span>
          </div>

          {/* Star XP */}
          <div className="flex items-center space-x-1 px-2 py-0.5 bg-zinc-900 border border-zinc-800 rounded-md font-mono" title="Total XP">
            <Star className="w-3.5 h-3.5 text-brand-gold fill-brand-gold" />
            <span className="text-[11px] font-bold text-brand-gold">{userProgress.xp}</span>
          </div>

          {/* Hearts info bar */}
          <button
            onClick={handleRestoreHearts}
            className="flex items-center space-x-1 px-2 py-0.5 bg-zinc-900 border border-zinc-800 rounded-md hover:border-brand-red transition-all font-mono"
            title="Click to Restore Hearts"
          >
            <Heart className={`w-3.5 h-3.5 text-brand-red fill-brand-red ${userProgress.hearts === 0 ? "animate-bounce" : ""}`} />
            <span className="text-[11px] font-bold text-brand-red">{userProgress.hearts}</span>
          </button>
        </div>
      </div>

      {/* Main Tab Content viewports */}
      <div className="flex-1 overflow-y-auto pb-20 relative">
        <AnimatePresence mode="wait">
          
          {/* LEARN TAB - The Winding Map path */}
          {activeTab === "learn" && (
            <motion.div
              key="learn"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6 pb-6"
            >
              
              {/* Unit Headers & Nodes Loops */}
              {units.map((unit) => {
                return (
                  <div key={unit.id} className="space-y-5 pt-4">
                    
                    {/* Unit banner design - Artistic block style */}
                    <div className="mx-4 p-4 rounded-xl bg-zinc-900 border-2 border-brand-green shadow-[4px_4px_0px_0px_#009E49] text-white relative overflow-hidden">
                      <div className="absolute right-[-10px] bottom-[-20px] text-7xl text-brand-green/10 pointer-events-none select-none font-display uppercase">
                        {unit.number}
                      </div>
                      <div className="relative z-10 space-y-1.5">
                        <span className="text-[9px] font-bold uppercase tracking-wider bg-brand-green text-zinc-950 px-2 py-0.5 rounded font-mono border border-zinc-950">
                          UNIT {unit.number}
                        </span>
                        <h4 className="text-xl font-display uppercase tracking-wide leading-none text-zinc-100">
                          {unit.title}
                        </h4>
                        <p className="text-[11px] text-zinc-400 max-w-[90%] leading-normal font-sans">
                          {unit.description}
                        </p>
                      </div>
                    </div>

                    {/* Winding layout container */}
                    <div className="relative flex flex-col items-center py-6 min-h-[220px] overflow-hidden">
                      {/* Connector Line behind nodes */}
                      <div className="absolute top-0 bottom-0 w-[4px] bg-zinc-900 border-dashed border-zinc-800 border-l" />

                      {/* Lesson nodes layout loops */}
                      <div className="space-y-8 relative z-10 w-full max-w-xs flex flex-col items-center">
                        {unit.lessons.map((lesson) => {
                          const matchedLinear = allLessons.find((al) => al.lesson.id === lesson.id);
                          const overallIndex = matchedLinear ? matchedLinear.overallIndex : 0;
                          const status = getLessonStatus(lesson.id, overallIndex, totalCompleted);

                          // Oscillate coordinates
                          let transformClass = "translate-x-0";
                          if (overallIndex % 4 === 1) transformClass = "translate-x-12";
                          else if (overallIndex % 4 === 3) transformClass = "-translate-x-12";

                          const isSelected = selectedLesson?.id === lesson.id;

                          return (
                            <div
                              key={lesson.id}
                              className={`flex flex-col items-center transition-transform duration-300 ${transformClass}`}
                            >
                              {/* Pulsing wrapper for available node */}
                              <div className="relative">
                                {status === "available" && (
                                  <span className="absolute inset-0 rounded-full bg-brand-gold/20 border-2 border-brand-gold/40 animate-ping" />
                                )}

                                <button
                                  id={`node-${lesson.id}`}
                                  onClick={() => handleSelectNode(lesson, status)}
                                  className={`w-14 h-14 rounded-full border-2 flex items-center justify-center font-bold text-base relative transition-all active:scale-90 ${
                                    status === "completed"
                                      ? "bg-brand-green border-zinc-950 text-zinc-950 hover:bg-emerald-400 shadow-[3px_3px_0px_0px_#FCD116]"
                                      : status === "available"
                                      ? "bg-zinc-900 border-brand-gold text-brand-gold hover:bg-zinc-850 shadow-[3px_3px_0px_0px_#009E49]"
                                      : "bg-zinc-900 border-zinc-850 text-zinc-700 cursor-not-allowed"
                                  }`}
                                >
                                  {status === "completed" ? (
                                    <CheckCircle2 className="w-6 h-6 fill-zinc-950 text-white stroke-[2.5]" />
                                  ) : status === "available" ? (
                                    <span className="text-lg filter drop-shadow">🧭</span>
                                  ) : (
                                    <Lock className="w-4 h-4 text-zinc-700" />
                                  )}
                                </button>
                              </div>

                              {/* Label under node */}
                              <span className={`text-[10px] font-bold mt-2 tracking-wide uppercase font-sans ${
                                status === "locked" ? "text-zinc-600" : "text-zinc-300"
                              }`}>
                                {lesson.title}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Floating Lesson Selector Popover at the bottom of map */}
              <AnimatePresence>
                {selectedLesson && (
                  <motion.div
                    initial={{ y: 80, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 80, opacity: 0 }}
                    className="fixed bottom-20 inset-x-5 bg-zinc-950 border-2 border-brand-gold p-5 rounded-xl shadow-[5px_5px_0px_0px_#CE1126] z-45 max-w-[390px] mx-auto flex flex-col space-y-4 font-sans"
                  >
                    <div className="flex justify-between items-start gap-4">
                      <div className="space-y-1">
                        <span className="text-[9px] uppercase font-bold text-brand-gold tracking-widest font-mono flex items-center gap-1">
                          <Sparkles className="w-3 h-3" /> DIALECT UNIT LESSON
                        </span>
                        <h4 className="font-display text-lg uppercase tracking-wide text-zinc-100">{selectedLesson.title}</h4>
                        <p className="text-xs text-zinc-400 leading-relaxed">{selectedLesson.description}</p>
                      </div>
                      <button
                        onClick={() => setSelectedLesson(null)}
                        className="text-[9px] font-bold text-zinc-400 hover:text-white px-2 py-1 bg-zinc-900 border border-zinc-800 rounded font-mono uppercase tracking-wider"
                      >
                        CLOSE
                      </button>
                    </div>

                    {userProgress.hearts === 0 ? (
                      <div className="bg-brand-red/10 border-2 border-brand-red p-3 rounded-lg flex items-center space-x-2 text-brand-red">
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                        <div className="flex-1 text-[10px] leading-snug">
                          <p className="font-bold">No Hearts Remaining!</p>
                          <button onClick={handleRestoreHearts} className="underline text-brand-gold font-bold block mt-0.5 font-mono">
                            Restore 5 hearts instantly
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        id="btn-start-lesson"
                        onClick={handleStartQuiz}
                        className="w-full bg-brand-gold hover:bg-yellow-400 text-zinc-950 font-bold py-3 rounded-lg text-xs border-2 border-zinc-950 shadow-[3px_3px_0px_0px_#CE1126] active:translate-y-[1px] active:shadow-none transition-all flex items-center justify-center space-x-1.5 uppercase tracking-wider"
                      >
                        <Play className="w-3.5 h-3.5 fill-zinc-950 text-zinc-950" />
                        <span>START LESSON (+10 XP)</span>
                      </button>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

            </motion.div>
          )}

          {/* COACH TAB - Speak with Kojo */}
          {activeTab === "coach" && (
            <motion.div
              key="coach"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="h-full flex flex-col"
            >
              <TutorTab courseId={course.id} courseName={course.name} />
            </motion.div>
          )}

          {/* PROFILE TAB - Stats & badges */}
          {activeTab === "profile" && (
            <motion.div
              key="profile"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="h-full"
            >
              <ProfileTab
                course={course}
                xp={userProgress.xp}
                streak={userProgress.streak}
                completedCount={userProgress.completedLessons.length}
                onReset={onResetProgress}
                onChangeCourse={onChangeCourse}
              />
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* Bottom Sticky Tab Navigation Bar */}
      <div className="absolute bottom-0 inset-x-0 h-16 bg-zinc-950 border-t-2 border-zinc-900 z-30 flex items-center justify-around px-4">
        {/* Map Learn Tab */}
        <button
          id="tab-learn"
          onClick={() => setActiveTab("learn")}
          className={`flex flex-col items-center justify-center space-y-1 py-1 px-4 rounded-lg transition-all ${
            activeTab === "learn" ? "text-brand-green bg-zinc-900 border border-zinc-800" : "text-zinc-500 hover:text-zinc-300"
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span className="text-[9px] font-bold tracking-widest uppercase font-mono">Learn</span>
        </button>

        {/* Coach Tab */}
        <button
          id="tab-coach"
          onClick={() => setActiveTab("coach")}
          className={`flex flex-col items-center justify-center space-y-1 py-1 px-4 rounded-lg transition-all ${
            activeTab === "coach" ? "text-brand-gold bg-zinc-900 border border-zinc-800" : "text-zinc-500 hover:text-zinc-300"
          }`}
        >
          <Compass className="w-4 h-4" />
          <span className="text-[9px] font-bold tracking-widest uppercase font-mono">Coach</span>
        </button>

        {/* Profile Tab */}
        <button
          id="tab-profile"
          onClick={() => setActiveTab("profile")}
          className={`flex flex-col items-center justify-center space-y-1 py-1 px-4 rounded-lg transition-all ${
            activeTab === "profile" ? "text-brand-red bg-zinc-900 border border-zinc-800" : "text-zinc-500 hover:text-zinc-300"
          }`}
        >
          <User className="w-4 h-4" />
          <span className="text-[9px] font-bold tracking-widest uppercase font-mono">Profile</span>
        </button>
      </div>

      {/* Quiz Player Fullscreen Overlays */}
      <AnimatePresence>
        {isQuizActive && selectedLesson && (
          <QuizModal
            lesson={selectedLesson}
            onClose={() => setIsQuizActive(false)}
            onComplete={handleCompleteQuiz}
            hearts={userProgress.hearts}
            onLoseHeart={handleLoseHeart}
            onRestoreHearts={handleRestoreHearts}
          />
        )}
      </AnimatePresence>

    </div>
  );
}
