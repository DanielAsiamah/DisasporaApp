/**
 * @license
 * SPDX-License-Identifier: Apache-2.5
 */

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  X, Heart, Shield, CheckCircle2, AlertCircle, Volume2, 
  Trophy, ArrowRight, RefreshCw, Sparkles, BookOpen, HelpCircle, 
  Info, CornerDownRight 
} from "lucide-react";
import { LessonNode, LessonStep } from "../types";
import { generateFallbackSteps } from "../services/seedGenerator";

interface QuizModalProps {
  lesson: LessonNode;
  onClose: () => void;
  onComplete: (xpGained: number) => void;
  hearts: number;
  onLoseHeart: () => void;
  onRestoreHearts: () => void;
}

export default function QuizModal({
  lesson,
  onClose,
  onComplete,
  hearts,
  onLoseHeart,
  onRestoreHearts
}: QuizModalProps) {
  // Retrieve steps or dynamically generate them using the master workbook schema
  const steps: LessonStep[] = lesson.steps && lesson.steps.length > 0 
    ? lesson.steps 
    : generateFallbackSteps(lesson);

  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [selectedWordBank, setSelectedWordBank] = useState<string[]>([]);
  const [isAnswered, setIsAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [lessonFinished, setLessonFinished] = useState(false);
  const [xpGained, setXpGained] = useState(0);
  
  // State for the linguistic "Explain my mistake" overlay drawer
  const [showExplanationDrawer, setShowExplanationDrawer] = useState(false);

  const step: LessonStep = steps[currentStepIdx];

  // Reset answer states on step change
  useEffect(() => {
    setSelectedOption(null);
    setSelectedWordBank([]);
    setIsAnswered(false);
    setIsCorrect(false);
    setShowExplanationDrawer(false);
  }, [currentStepIdx]);

  // Voice Speech synthesis
  const speakVoice = (text: string) => {
    const synth = window.speechSynthesis;
    if (synth) {
      synth.cancel(); // cancel any active speech
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.85;
      synth.speak(utterance);
    }
  };

  // Auto-speak teaching slide when it mounts
  useEffect(() => {
    if (step && step.type === "teaching" && step.conceptTitle) {
      // Speak the title and explanation cleanly
      const textToSpeak = step.audioKey || `${step.conceptTitle}. ${step.conceptExplanation?.replace(/<[^>]*>/g, "")}`;
      speakVoice(textToSpeak);
    }
  }, [currentStepIdx]);

  const handleWordBankToggle = (word: string) => {
    if (isAnswered) return;
    if (selectedWordBank.includes(word)) {
      setSelectedWordBank(selectedWordBank.filter((w) => w !== word));
    } else {
      setSelectedWordBank([...selectedWordBank, word]);
    }
  };

  const handleOptionSelect = (option: string) => {
    if (isAnswered) return;
    setSelectedOption(option);
  };

  const handleCheckAnswer = () => {
    if (isAnswered) return;

    let correct = false;
    if (step.type === "choice") {
      correct = selectedOption === step.correctAnswer;
    } else if (step.type === "translate") {
      const userSentence = selectedWordBank.join(",");
      correct = userSentence === step.correctAnswer;
    }

    setIsCorrect(correct);
    setIsAnswered(true);

    if (correct) {
      setXpGained((prev) => prev + 10);
      // Play a quick satisfying check audio tone via standard audio synthesize
      try {
        const synth = window.speechSynthesis;
        if (synth) {
          const satisfaction = new SpeechSynthesisUtterance("Correct!");
          satisfaction.volume = 0.3;
          satisfaction.rate = 1.2;
          synth.speak(satisfaction);
        }
      } catch (e) {}
    } else {
      onLoseHeart();
      // Play brief incorrect signal
      try {
        const synth = window.speechSynthesis;
        if (synth) {
          const signal = new SpeechSynthesisUtterance("Not quite.");
          signal.volume = 0.3;
          signal.rate = 1.2;
          synth.speak(signal);
        }
      } catch (e) {}
    }
  };

  const handleNextStep = () => {
    if (currentStepIdx + 1 < steps.length) {
      setCurrentStepIdx((prev) => prev + 1);
    } else {
      setLessonFinished(true);
    }
  };

  const handleFinish = () => {
    onComplete(xpGained);
  };

  // Generate customized, deep linguistic explanation for mistakes dynamically
  const getLinguisticMistakeExplanation = (): string => {
    if (!step) return "";
    
    // Provide a rich cultural or grammatical explanation if available, fallback below
    if (step.explanation) return step.explanation;

    const answerStr = step.correctAnswer ? step.correctAnswer.replace(/,/g, " ") : "";
    
    if (step.type === "translate") {
      return `Creole languages feature structural and semantic rules carried directly from Niger-Congo families. To translate correctly, place the pronoun first ('Mi'), followed by the copular verb ('deh'), and the location modifier ('yah').`;
    }
    
    return `Dialect grammar simplifies European colonial roots but maps them onto sophisticated West African syntactic rules. The expected form here is: "${answerStr}". Practice speaking it aloud to capture the oral cadence!`;
  };

  const progressPercent = (currentStepIdx / steps.length) * 100;

  // Render character component
  const renderCharacterCutscene = (char: NonNullable<LessonStep["character"]>, text: string, isTeach: boolean) => {
    return (
      <div className="flex flex-col space-y-4 pt-2">
        <div className="flex items-start space-x-4">
          {/* Tactile 3D Character Avatar Card */}
          <div className="flex flex-col items-center flex-shrink-0">
            <div className="w-16 h-16 rounded-2xl bg-[#1F2E35] border-2 border-[#37464F] shadow-[3px_3px_0px_0px_rgba(0,0,0,0.5)] flex items-center justify-center text-4xl filter drop-shadow relative">
              <span>{char.avatar}</span>
              <span className="absolute -bottom-1 bg-brand-gold text-zinc-950 font-mono font-bold text-[8px] px-1 py-0.2 rounded border border-zinc-950 uppercase">
                {char.role.split(" ")[0]}
              </span>
            </div>
            <span className="text-[10px] font-bold text-zinc-400 mt-2 tracking-wide text-center">{char.name}</span>
          </div>

          {/* Duolingo Style Speech Bubble with triangular pointer tail */}
          <div className="flex-1 bg-[#1F2E35] border-2 border-[#37464F] rounded-2xl p-4 relative shadow-[3px_3px_0px_0px_rgba(0,0,0,0.3)]">
            {/* The Pointer Triangle */}
            <div className="absolute left-[-9px] top-6 w-0 h-0 border-t-[8px] border-t-transparent border-r-[10px] border-r-[#1F2E35] border-b-[8px] border-b-transparent filter drop-shadow">
              {/* Outer border representation */}
              <div className="absolute left-[-2px] top-[-10px] w-0 h-0 border-t-[10px] border-t-transparent border-r-[12px] border-r-[#37464F] border-b-[10px] border-b-transparent -z-10" />
            </div>

            <div className="space-y-2">
              {isTeach ? (
                <>
                  <div className="flex items-center space-x-2">
                    <span className="text-[9px] font-black uppercase tracking-widest text-brand-gold bg-brand-gold/10 px-2 py-0.5 rounded border border-brand-gold/20">
                      CULTURAL INSIGHT
                    </span>
                    {step.audioKey && (
                      <button 
                        onClick={() => speakVoice(step.audioKey || "")}
                        className="p-1 hover:bg-[#37464F] rounded-full text-brand-green transition-all"
                        title="Play Phonetics"
                      >
                        <Volume2 className="w-3.5 h-3.5 animate-pulse" />
                      </button>
                    )}
                  </div>
                  <h4 className="text-sm font-black text-white uppercase tracking-wide font-sans">{step.conceptTitle}</h4>
                  <div 
                    className="text-xs text-zinc-200 leading-relaxed font-sans"
                    dangerouslySetInnerHTML={{ __html: text }}
                  />
                </>
              ) : (
                <p className="text-xs text-white leading-relaxed font-sans font-medium italic">
                  "{text}"
                </p>
              )}
            </div>
          </div>
        </div>

        {isTeach && step.narrative && (
          <div className="p-3 bg-[#131F24] border border-[#21323A] rounded-xl flex items-start space-x-2.5">
            <Info className="w-4 h-4 text-[#84D8FF] flex-shrink-0 mt-0.5" />
            <p className="text-[10px] text-zinc-400 leading-relaxed italic">{step.narrative}</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-[#0B1519] z-50 flex flex-col justify-between font-sans text-white select-none">
      
      {/* Top Header */}
      <div className="px-5 py-4 border-b border-[#1F2E35] bg-[#0C191E] flex items-center justify-between space-x-4 z-10">
        <button
          onClick={onClose}
          className="p-1 text-zinc-400 hover:text-white rounded-lg transition-colors"
        >
          <X className="w-6 h-6 stroke-[2.5]" />
        </button>

        {/* Premium Smooth Progress Bar */}
        <div className="flex-1 h-3.5 bg-[#1F2E35] rounded-full overflow-hidden p-[2px] border border-[#2B3B43]">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            className="h-full bg-brand-green rounded-full shadow-[inset_0_2px_2px_rgba(255,255,255,0.4)]"
            transition={{ duration: 0.3, ease: "easeOut" }}
          />
        </div>

        {/* Heart Counter Block */}
        <div className="flex items-center space-x-1.5 bg-[#1F2E35] border border-[#2B3B43] px-3 py-1 rounded-full shadow-sm">
          <Heart className={`w-4 h-4 fill-brand-red text-brand-red ${hearts === 0 ? "animate-bounce" : ""}`} />
          <span className="text-xs font-black text-brand-red font-mono">{hearts}</span>
        </div>
      </div>

      {/* Main Content Stage */}
      <div className="flex-1 flex flex-col justify-center max-w-md mx-auto w-full px-6 py-4 overflow-y-auto">
        <AnimatePresence mode="wait">
          {!lessonFinished ? (
            <motion.div
              key={currentStepIdx}
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.2 }}
              className="space-y-6 py-2"
            >
              {/* STEP TYPE 1: TEACHING SLIDE */}
              {step.type === "teaching" && step.character && (
                renderCharacterCutscene(step.character, step.conceptExplanation || "", true)
              )}

              {/* STEP TYPE 2: QUIZ COMPONENT */}
              {step.type !== "teaching" && (
                <div className="space-y-6">
                  {/* Speech Bubble Header representing questions spoken by a companion */}
                  {renderCharacterCutscene(
                    step.character || { name: "Elder Kwame", avatar: "👴🏿", role: "Oral Archivist" },
                    step.question || "Translate this phrase:",
                    false
                  )}

                  {/* Audio Speaker Pronunciation trigger */}
                  {step.audioKey && (
                    <div className="flex items-center space-x-2.5 bg-[#1F2E35] border border-[#2F3E46] p-2.5 rounded-xl w-fit">
                      <button
                        onClick={() => speakVoice(step.audioKey || "")}
                        className="p-2 bg-brand-green text-zinc-950 rounded-lg shadow-md active:scale-95"
                        title="Speak Phrase"
                      >
                        <Volume2 className="w-4 h-4" />
                      </button>
                      <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">Click to listen to voice</span>
                    </div>
                  )}

                  {/* INPUT CHOICE GRID */}
                  {step.type === "choice" && step.options && (
                    <div className="space-y-2.5 pt-2">
                      {step.options.map((option, idx) => {
                        const isSelected = selectedOption === option;
                        return (
                          <button
                            key={idx}
                            onClick={() => handleOptionSelect(option)}
                            disabled={isAnswered}
                            className={`w-full text-left p-4 rounded-xl border-2 transition-all flex items-center justify-between ${
                              isSelected
                                ? "bg-[#182F35] border-brand-green shadow-[0_3px_0_0_#009E49] translate-y-[-1px]"
                                : "bg-[#1F2E35]/60 border-[#2B3B43] hover:border-[#37464F] shadow-[0_3px_0_0_rgba(0,0,0,0.3)]"
                            } ${isAnswered ? "opacity-60 cursor-not-allowed" : ""}`}
                          >
                            <span className="text-xs font-bold text-zinc-100">{option}</span>
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                              isSelected ? "border-brand-green bg-brand-green text-zinc-950" : "border-zinc-600"
                            }`}>
                              {isSelected && <CheckCircle2 className="w-3.5 h-3.5 fill-zinc-950 stroke-white" />}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* INPUT TRANSLATE / WORD BANK CHIPS */}
                  {step.type === "translate" && step.options && (
                    <div className="space-y-4 pt-2">
                      {/* Target Assembly Board */}
                      <div className="min-h-[84px] p-4 bg-[#1F2E35]/40 border-2 border-dashed border-[#2B3B43] rounded-2xl flex flex-wrap gap-2 items-center justify-center shadow-[inset_0_2px_4px_rgba(0,0,0,0.2)]">
                        {selectedWordBank.length === 0 ? (
                          <div className="text-center text-[10px] text-zinc-500 font-mono uppercase tracking-wider space-y-1">
                            <span>Tap word chips below to translate</span>
                          </div>
                        ) : (
                          selectedWordBank.map((word, idx) => (
                            <motion.button
                              layoutId={`word-${word}`}
                              key={idx}
                              onClick={() => handleWordBankToggle(word)}
                              disabled={isAnswered}
                              className="px-3.5 py-2 bg-brand-green text-zinc-950 border border-zinc-950 rounded-xl font-black text-xs shadow-[0_3px_0_0_#FCD116] hover:translate-y-[1px] hover:shadow-[0_2px_0_0_#FCD116] transition-all"
                            >
                              {word}
                            </motion.button>
                          ))
                        )}
                      </div>

                      {/* Tactile 3D Word Pool */}
                      <div className="flex flex-wrap gap-2.5 justify-center pt-2">
                        {step.options.map((word, idx) => {
                          const isUsed = selectedWordBank.includes(word);
                          return (
                            <motion.button
                              layoutId={`word-${word}`}
                              key={idx}
                              onClick={() => handleWordBankToggle(word)}
                              disabled={isUsed || isAnswered}
                              className={`px-3.5 py-2 rounded-xl font-bold text-xs border-2 transition-all ${
                                isUsed
                                  ? "bg-[#1F2E35]/20 border-[#1F2E35] text-zinc-700 cursor-not-allowed opacity-30 shadow-none"
                                  : "bg-[#1F2E35] border-[#2B3B43] text-zinc-200 hover:border-brand-gold shadow-[0_3px_0_0_rgba(0,0,0,0.4)] active:translate-y-[2px] active:shadow-none"
                              }`}
                            >
                              {word}
                            </motion.button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          ) : (
            /* LESSON COMPLETE SHOWCASE SCREEN */
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center space-y-6 py-6"
            >
              {/* Gorgeous 3D Blocky Trophy Card */}
              <div className="relative w-36 h-36 mx-auto bg-[#1F2E35] border-2 border-brand-gold rounded-3xl flex items-center justify-center p-4 shadow-[5px_5px_0px_0px_#CE1126]">
                <Trophy className="w-18 h-18 text-brand-gold animate-bounce" />
                <div className="absolute -top-3 -right-3 bg-brand-green text-zinc-950 text-[9px] font-black font-mono px-2 py-1 rounded-md border-2 border-zinc-950 shadow-[1.5px_1.5px_0px_0px_#FCD116]">
                  PRESERVED
                </div>
              </div>

              <div className="space-y-1.5">
                <h3 className="text-2xl font-black uppercase tracking-wide text-zinc-100">LESSON COMPLETE!</h3>
                <p className="text-xs text-zinc-400 max-w-xs mx-auto leading-relaxed font-sans">
                  You are making an active stand for linguistic preservation. Every lesson helps safeguard ancestral oral dialects!
                </p>
              </div>

              {/* Stats block */}
              <div className="grid grid-cols-2 gap-3.5 max-w-xs mx-auto">
                <div className="bg-[#1F2E35] border-2 border-[#2B3B43] p-4 rounded-2xl text-center space-y-1 shadow-[3px_3px_0px_0px_rgba(0,0,0,0.5)]">
                  <span className="text-[8px] font-mono font-bold text-zinc-500 uppercase tracking-widest block">XP EARNED</span>
                  <p className="text-2xl font-black text-brand-gold">+{xpGained} XP</p>
                </div>
                <div className="bg-[#1F2E35] border-2 border-[#2B3B43] p-4 rounded-2xl text-center space-y-1 shadow-[3px_3px_0px_0px_rgba(0,0,0,0.5)]">
                  <span className="text-[8px] font-mono font-bold text-zinc-500 uppercase tracking-widest block">DIALECT status</span>
                  <p className="text-2xl font-black text-brand-green">ACTIVE</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom Check / Drawer Bar Panel - Duolingo Styled Fixed Strip */}
      <div className="relative z-20 border-t border-[#1F2E35] bg-[#0C191E] p-4 flex flex-col items-center">
        <div className="max-w-md w-full relative">
          {!lessonFinished ? (
            <div className="space-y-4 w-full">
              
              {/* Expandable Feedback Overlay with precise Duolingo colors */}
              <AnimatePresence>
                {isAnswered && (
                  <motion.div
                    initial={{ height: 0, opacity: 0, y: 15 }}
                    animate={{ height: "auto", opacity: 1, y: 0 }}
                    exit={{ height: 0, opacity: 0, y: 15 }}
                    className={`p-4 rounded-2xl flex flex-col space-y-3 border-2 ${
                      isCorrect 
                        ? "bg-[#1B2D1B] border-brand-green text-zinc-100 shadow-[4px_4px_0px_0px_rgba(0,158,73,0.3)]" 
                        : "bg-[#3B1F1F] border-brand-red text-zinc-100 shadow-[4px_4px_0px_0px_rgba(206,17,38,0.3)]"
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      {isCorrect ? (
                        <CheckCircle2 className="w-5.5 h-5.5 text-brand-green flex-shrink-0 mt-0.5" />
                      ) : (
                        <AlertCircle className="w-5.5 h-5.5 text-brand-red flex-shrink-0 mt-0.5" />
                      )}
                      <div className="space-y-1 flex-1">
                        <h4 className={`text-xs uppercase font-black tracking-wider ${isCorrect ? "text-brand-green" : "text-brand-red"}`}>
                          {isCorrect ? "Awesome! You got it right!" : "Incorrect Response"}
                        </h4>
                        {!isCorrect && step.correctAnswer && (
                          <div className="space-y-1">
                            <p className="text-[10px] text-zinc-400 font-mono uppercase tracking-wider">Correct Answer:</p>
                            <p className="text-sm text-white font-bold">{step.correctAnswer.replace(/,/g, " ")}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Explainer / Action Buttons in Drawer */}
                    <div className="flex items-center space-x-3 pt-1">
                      {!isCorrect && (
                        <button
                          onClick={() => setShowExplanationDrawer(!showExplanationDrawer)}
                          className="px-3 py-1.5 bg-[#4F2B2B] hover:bg-[#5F3535] text-brand-gold text-[10px] font-bold rounded-lg border border-[#CE1126] transition-all flex items-center space-x-1 uppercase font-mono tracking-wider"
                        >
                          <HelpCircle className="w-3.5 h-3.5" />
                          <span>Explain my mistake</span>
                        </button>
                      )}
                      {step.explanation && isCorrect && (
                        <div className="text-[10px] text-zinc-400 leading-normal italic bg-[#1E3321] border border-brand-green/20 p-2.5 rounded-lg w-full">
                          💡 {step.explanation}
                        </div>
                      )}
                    </div>

                    {/* Sliding explanation text block inside feedback */}
                    {showExplanationDrawer && (
                      <motion.div
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-3 bg-zinc-950/60 border border-[#3C2E2E] rounded-xl text-xs text-zinc-300 leading-relaxed font-sans mt-2 shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)]"
                      >
                        <div className="flex items-center space-x-1.5 text-brand-gold text-[10px] font-bold font-mono uppercase tracking-widest mb-1">
                          <BookOpen className="w-3.5 h-3.5" />
                          <span>Diaspora Grammar Key</span>
                        </div>
                        <p>{getLinguisticMistakeExplanation()}</p>
                      </motion.div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Action Buttons Strip */}
              {hearts === 0 && !isCorrect && isAnswered ? (
                <div className="flex space-x-3">
                  <button
                    onClick={onRestoreHearts}
                    className="flex-1 bg-brand-gold text-zinc-950 font-black py-4 px-4 rounded-xl text-xs uppercase tracking-widest border border-zinc-950 shadow-[0_4px_0_0_#CE1126] hover:translate-y-[1px] hover:shadow-[0_3px_0_0_#CE1126] active:translate-y-[4px] active:shadow-none transition-all flex items-center justify-center space-x-1.5"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>RESTORE HEARTS</span>
                  </button>
                  <button
                    onClick={onClose}
                    className="flex-1 bg-[#1F2E35] text-zinc-400 border border-[#2B3B43] font-bold py-4 px-4 rounded-xl text-xs uppercase tracking-widest hover:text-white transition-all shadow-[0_4px_0_0_rgba(0,0,0,0.2)]"
                  >
                    QUIT
                  </button>
                </div>
              ) : (
                <button
                  id="btn-quiz-check"
                  disabled={step.type === "teaching" ? false : step.type === "choice" ? !selectedOption && !isAnswered : selectedWordBank.length === 0 && !isAnswered}
                  onClick={isAnswered ? handleNextStep : (step.type === "teaching" ? handleNextStep : handleCheckAnswer)}
                  className={`w-full font-black py-4 px-6 rounded-xl text-xs flex items-center justify-center space-x-2 transition-all ${
                    isAnswered
                      ? "bg-brand-green text-zinc-950 shadow-[0_4px_0_0_#009E49] active:translate-y-[2px] active:shadow-none hover:bg-emerald-400"
                      : (step.type === "teaching" || (step.type === "choice" ? selectedOption : selectedWordBank.length > 0))
                      ? "bg-brand-gold text-zinc-950 shadow-[0_4px_0_0_#CE1126] active:translate-y-[2px] active:shadow-none hover:bg-yellow-400"
                      : "bg-[#1F2E35] text-zinc-600 border border-[#2B3B43] cursor-not-allowed shadow-none"
                  }`}
                >
                  <span className="uppercase tracking-widest">
                    {step.type === "teaching" ? "CONTINUE" : isAnswered ? "CONTINUE" : "CHECK ANSWER"}
                  </span>
                  <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                </button>
              )}
            </div>
          ) : (
            <button
              onClick={handleFinish}
              className="w-full bg-brand-green text-zinc-950 border border-zinc-950 font-black py-4 px-6 rounded-xl text-xs shadow-[0_4px_0_0_#009E49] hover:bg-emerald-400 active:translate-y-[2px] active:shadow-none transition-all flex items-center justify-center space-x-2 uppercase tracking-widest"
            >
              <span>FINISH & SAVE</span>
              <Trophy className="w-4.5 h-4.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
