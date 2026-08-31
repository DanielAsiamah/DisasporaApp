const fs = require('fs');
const path = require('path');

const srcPath = 'C:\\Users\\china\\Downloads\\diaspora-dialect-learner (2)\\src\\data\\courses.ts';
const outputPath = path.resolve(__dirname, '..', 'src', 'data', 'generatedCourses.js');

function generateFallbackSteps(lesson) {
  const steps = [];
  const questions = lesson.questions || [];

  questions.forEach((q, idx) => {
    // 1. Add introductory teaching slide
    steps.push({
      id: `${lesson.id}-teach-${idx}`,
      type: 'teaching',
      conceptTitle: `${lesson.title} - Intro`,
      conceptExplanation: q.explanation || `Let's explore this linguistic concept. Pay attention to how it's phrased!`,
      narrative: `Linguistic preservation node for ${lesson.title}. Tap to hear phonetic pronunciation or review grammatical tips.`,
      audioKey: q.audioMock || undefined,
      character: {
        name: 'Diaspora Elder',
        avatar: '👵🏾',
        role: 'Heritage Companion',
      },
    });

    // 2. Add the actual quiz step
    steps.push({
      id: `${lesson.id}-quiz-${idx}`,
      type: q.type || 'choice',
      question: q.question,
      options: q.options || [],
      correctAnswer: q.correctAnswer,
      explanation: q.explanation,
      audioKey: q.audioMock || undefined,
    });
  });

  return steps;
}

function main() {
  if (!fs.existsSync(srcPath)) {
    console.error(`Downloaded courses.ts not found at: ${srcPath}`);
    process.exit(1);
  }

  console.log(`Reading downloaded courses.ts from: ${srcPath}`);
  let content = fs.readFileSync(srcPath, 'utf8');

  // Strip typescript typings and annotations so we can parse it as standard JS
  content = content
    .replace(/\/\*\*[\s\S]*?\*\//g, '') // remove license headers
    .replace(/: Record<[^>]+>/g, '') // remove typings
    .replace(/: DialectCourse\[]/g, '')
    .replace(/: Unit\[]/g, '')
    .replace(/: LessonNode\[]/g, '')
    .replace(/: LessonStep\[]/g, '')
    .replace(/: QuizQuestion\[]/g, '')
    .replace(/import {[^}]+} from "[^"]+";/g, '') // remove typescript imports
    .replace(/import {[^}]+} from '\.\.\/types';/g, '')
    .replace(/\[BaseLanguage\.English]/g, '"english"') // replace BaseLanguage enum keys
    .replace(/\[BaseLanguage\.French]/g, '"french"')
    .replace(/\[BaseLanguage\.Arabic]/g, '"arabic"')
    .replace(/export const/g, 'const'); // change to local variables for evaluation

  // Add module.exports at the bottom
  content += `\n\nmodule.exports = { COURSES_BY_BASE_LANG, COURSE_CONTENT, KOJO_CHAT_RESPONSES };`;

  // Write to a temporary file in the workspace
  const tempPath = path.resolve(__dirname, 'temp-courses.js');
  fs.writeFileSync(tempPath, content, 'utf8');

  try {
    // Require the evaluated JS module
    const { COURSES_BY_BASE_LANG, COURSE_CONTENT, KOJO_CHAT_RESPONSES } = require(tempPath);

    // Now, let's restructure the courses to match the existing Expo coursesData format
    const coursesData = {};

    // Base colors for our courses
    const palette = ['#7B61A8', '#6CCBFF', '#F4B942', '#FF6EA9', '#6FD6B5', '#B88CFF'];
    let colorIdx = 0;

    // Loop through English, French, Arabic courses
    Object.entries(COURSES_BY_BASE_LANG).forEach(([baseLang, courseList]) => {
      courseList.forEach((course) => {
        // Map downloaded IDs to the exact keys defined in CourseSelectScreen
        let courseId = course.id;
        if (courseId === 'en-patois') courseId = 'patois';
        else if (courseId === 'en-gullah') courseId = 'gullah';
        else if (courseId === 'en-belizean') courseId = 'belizean';
        else if (courseId === 'en-swahili') courseId = 'swahili';
        else if (courseId === 'en-igbo') courseId = 'igbo';
        else if (courseId === 'en-yoruba') courseId = 'yoruba';
        else if (courseId === 'fr-haitian') courseId = 'haitian';
        else if (courseId === 'fr-nouchi') courseId = 'nouchi';
        else if (courseId === 'fr-wolof') courseId = 'wolof';
        else if (courseId === 'fr-swahili') courseId = 'fr-swahili';
        else if (courseId === 'ar-swahili') courseId = 'ar-swahili';
        else if (courseId === 'ar-sudanese') courseId = 'sudanese';
        else if (courseId === 'ar-nubian') courseId = 'nubian';
        
        // Find units and lessons for this course
        const units = COURSE_CONTENT[course.id] || [];

        coursesData[courseId] = {
          id: courseId,
          title: course.name,
          flag: course.flag,
          themeColor: palette[colorIdx % palette.length],
          accentColor: '#F4B942',
          units: units.map((unit, unitIdx) => {
            return {
              id: unit.id,
              order: unit.number || (unitIdx + 1),
              status: 'published',
              title: `SECTION 1, UNIT ${unit.number || (unitIdx + 1)}`,
              description: unit.title,
              goal: unit.description,
              themeColor: palette[colorIdx % palette.length],
              borderColor: unit.borderColor || 'border-emerald-600',
              lessons: unit.lessons.map((lesson, lessonIdx) => {
                // Generate steps using fallback generator if none exist
                const rawSteps = lesson.steps && lesson.steps.length > 0
                  ? lesson.steps
                  : generateFallbackSteps(lesson);

                // Map steps to the format expected by the app
                const steps = rawSteps.map((step) => {
                  return {
                    id: step.id,
                    type: step.type,
                    conceptTitle: step.conceptTitle || undefined,
                    conceptExplanation: step.conceptExplanation || undefined,
                    narrative: step.narrative || undefined,
                    audioKey: step.audioKey || undefined,
                    question: step.question || undefined,
                    options: step.options || undefined,
                    correctAnswer: step.correctAnswer || undefined,
                    explanation: step.explanation || undefined,
                    character: step.character ? {
                      name: step.character.name,
                      avatar: step.character.avatar,
                      role: step.character.role,
                    } : undefined,
                  };
                });

                // Pick the first vocabulary word for top-level display
                const firstQuestion = lesson.questions && lesson.questions[0];
                const phrase = firstQuestion ? firstQuestion.question.replace(/.*?["']([^"']+)["'].*?/, '$1') : lesson.title;
                const meaning = firstQuestion ? firstQuestion.correctAnswer : lesson.description;

                return {
                  id: lesson.id,
                  order: lessonIdx + 1,
                  status: 'published',
                  version: 1,
                  title: lesson.title,
                  subtitle: lesson.description,
                  phrase: phrase,
                  meaning: meaning,
                  category: lesson.type || 'vocab',
                  note: firstQuestion ? firstQuestion.explanation || '' : '',
                  type: lesson.type === 'milestone' ? 'trophy' : 'star',
                  lessonType: 'translate_sentence',
                  exerciseType: 'tap_reveal',
                  xp: 10,
                  audioKey: firstQuestion ? (firstQuestion.audioMock || undefined) : undefined,
                  imageKey: 'hello.png',
                  steps: steps,
                };
              }),
            };
          }),
        };

        colorIdx++;
      });
    });

    // Write generatedCourses.js
    const fileContent = `// Compiled from downloaded courses.ts at ${new Date().toISOString()}\n\nexport const coursesData = ${JSON.stringify(coursesData, null, 2)};\n`;
    fs.writeFileSync(outputPath, fileContent, 'utf8');
    console.log(`Successfully compiled and wrote 13 courses with rich diaspora questions to: ${outputPath}`);

  } catch (err) {
    console.error('Error parsing/compiling downloaded courses:', err);
  } finally {
    // Cleanup temporary file
    if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
  }
}

main();
