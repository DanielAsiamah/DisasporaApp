import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, fonts } from '../../theme';
const { courses } = require('../../data/generatedCourseRoadmap.cjs');
const { getRoadmapLessonState } = require('../../lessonExperience/roadmapLessonState.cjs');

export default function CourseRoadmap({ courseId, topics = [], progressReady = false, onOpenTopic }) {
  const [expanded, setExpanded] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState(null);
  const course = courses.find((item) => item.id === courseId);
  if (!course) return null;
  const lessonCount = course.units.reduce((sum, unit) => sum + unit.lessons.length, 0);
  return (
    <View style={styles.container}>
      <Pressable accessibilityRole="button" accessibilityState={{ expanded }} accessibilityLabel={`${course.title} full course path, ${course.units.length} units, ${lessonCount} lessons`} onPress={() => setExpanded(!expanded)} style={styles.heading}>
        <View style={styles.headingCopy}>
          <Text style={styles.eyebrow}>WHAT COMES NEXT</Text>
          <Text style={styles.title}>Your full course path</Text>
          <Text style={styles.subtitle}>{course.units.length} units / {lessonCount} planned lessons</Text>
        </View>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={22} color={colors.ink} />
      </Pressable>
      {expanded ? (
        <View style={styles.units}>
          <Text style={styles.note}>Explore the planned course below. Playable drafts are marked; locked lessons are still being prepared or need an earlier lesson completed.</Text>
          {course.units.map((unit) => {
            const open = selectedUnit === unit.id;
            return (
              <View key={unit.id} style={styles.unit}>
                <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={() => setSelectedUnit(open ? null : unit.id)} style={styles.unitHeading}>
                  <View style={styles.number}><Text style={styles.numberText}>{unit.number}</Text></View>
                  <View style={styles.headingCopy}>
                    <Text style={styles.section}>{unit.section}</Text>
                    <Text style={styles.unitTitle}>{unit.title}</Text>
                    <Text style={styles.subtitle}>{unit.lessons.length} planned lessons</Text>
                  </View>
                  <Ionicons name={open ? 'remove' : 'add'} size={22} color={colors.ink} />
                </Pressable>
                {open ? <View style={styles.details}>
                  <Text style={styles.objective}>{unit.objective}</Text>
                  {unit.lessons.map((lesson) => {
                    const state = getRoadmapLessonState(lesson, topics, progressReady);
                    return <Pressable key={lesson.id} style={styles.lesson} accessibilityRole="button"
                      accessibilityLabel={`${lesson.title}, ${state.label}`}
                      accessibilityState={{ disabled: !state.canOpen }} disabled={!state.canOpen}
                      onPress={() => state.canOpen && onOpenTopic?.(state.topic)}>
                      <Ionicons accessible={false} name={state.icon} size={18} color={state.canOpen ? colors.sea : colors.inkMuted} />
                      <View style={styles.headingCopy}>
                        <Text style={styles.lessonTitle}>{lesson.title}</Text>
                        <Text style={styles.subtitle}>{lesson.type} / {lesson.wordCount} items</Text>
                        <Text style={styles.preparing}>{state.label}</Text>
                      </View>
                    </Pressable>;
                  })}
                </View> : null}
              </View>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: colors.paperDeep, borderColor: colors.ink, borderWidth: 1, borderRadius: 24, marginHorizontal: 16, marginTop: 24, overflow: 'hidden' },
  heading: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 20, minHeight: 80 },
  headingCopy: { flex: 1, minWidth: 0 },
  eyebrow: { fontFamily: fonts.bold, fontSize: 9, letterSpacing: 1.3, color: colors.sea, marginBottom: 6 },
  title: { fontFamily: fonts.display, fontSize: 27, color: colors.ink, textTransform: 'uppercase' },
  subtitle: { fontFamily: fonts.regular, fontSize: 12, color: colors.inkMuted, marginTop: 4 },
  units: { padding: 14, paddingTop: 0, gap: 10 },
  note: { fontFamily: fonts.editorial, fontSize: 15, lineHeight: 22, color: colors.inkMuted, padding: 6, marginBottom: 8 },
  unit: { borderRadius: 18, backgroundColor: colors.paper, borderColor: colors.border, borderWidth: 1 },
  unitHeading: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 80, padding: 14 },
  number: { width: 40, height: 40, borderRadius: 14, backgroundColor: colors.mango, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-3deg' }] },
  numberText: { color: colors.ink, fontFamily: fonts.display, fontSize: 21 },
  section: { fontFamily: fonts.bold, fontSize: 10, letterSpacing: 0.7, color: colors.inkMuted },
  unitTitle: { fontFamily: fonts.semiBold, fontSize: 16, color: colors.ink, marginTop: 3 },
  details: { padding: 14, paddingTop: 0, gap: 12 },
  objective: { color: colors.ink, fontFamily: fonts.editorial, fontSize: 15, lineHeight: 22 },
  lesson: { flexDirection: 'row', gap: 10, paddingTop: 12, borderTopColor: colors.border, borderTopWidth: 1 },
  lessonTitle: { fontFamily: fonts.semiBold, fontSize: 14, color: colors.ink },
  preparing: { fontFamily: fonts.regular, fontSize: 12, color: colors.inkMuted, marginTop: 5 },
});
