/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import PhoneFrame from "./components/PhoneFrame";
import Onboarding from "./components/Onboarding";
import HomeScreen from "./components/HomeScreen";
import { BaseLanguage, DialectCourse, UserProgress } from "./types";
import { COURSES_BY_BASE_LANG } from "./data/courses";

export default function App() {
  // Load initial progress from localStorage
  const [progress, setProgress] = useState<UserProgress>(() => {
    const stored = localStorage.getItem("diaspora_dialect_progress");
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        // Fallback below
      }
    }
    return {
      baseLanguage: null,
      selectedCourseId: null,
      hearts: 5,
      xp: 0,
      streak: 0,
      completedLessons: [],
      unlockedUnits: ["patois-u1"],
      level: 1,
    };
  });

  // Sync state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("diaspora_dialect_progress", JSON.stringify(progress));
  }, [progress]);

  // Handle completion of onboarding
  const handleOnboardingComplete = (baseLang: BaseLanguage, courseId: string) => {
    setProgress((prev) => ({
      ...prev,
      baseLanguage: baseLang,
      selectedCourseId: courseId,
      // Keep other stats intact or initialize
      hearts: prev.hearts === 0 ? 5 : prev.hearts,
      streak: prev.streak === 0 ? 1 : prev.streak,
    }));
  };

  // Find active course metadata based on baseLanguage & selectedCourseId
  const getActiveCourse = (): DialectCourse | null => {
    if (!progress.baseLanguage || !progress.selectedCourseId) return null;
    const available = COURSES_BY_BASE_LANG[progress.baseLanguage] || [];
    return available.find((c) => c.id === progress.selectedCourseId) || null;
  };

  const activeCourse = getActiveCourse();

  // Reset progress callback
  const handleResetProgress = () => {
    if (window.confirm("Are you sure you want to reset all your progress? This will clear your completed lessons and XP.")) {
      setProgress((prev) => ({
        ...prev,
        xp: 0,
        completedLessons: [],
        hearts: 5,
        streak: 1,
      }));
    }
  };

  // Switch course callback (takes user back to onboarding)
  const handleSwitchCourse = () => {
    setProgress((prev) => ({
      ...prev,
      baseLanguage: null,
      selectedCourseId: null,
    }));
  };

  return (
    <PhoneFrame>
      {!activeCourse ? (
        <Onboarding onComplete={handleOnboardingComplete} />
      ) : (
        <HomeScreen
          course={activeCourse}
          userProgress={progress}
          onUpdateProgress={setProgress}
          onChangeCourse={handleSwitchCourse}
          onResetProgress={handleResetProgress}
        />
      )}
    </PhoneFrame>
  );
}
