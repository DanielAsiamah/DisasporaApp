import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { fonts } from '../../theme';
const { courses } = require('../../data/generatedCourseRoadmap.cjs');

export default function CourseRoadmap({ courseId }) {
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
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={24} color="#0B245B" />
      </Pressable>
      {expanded ? (
        <View style={styles.units}>
          <Text style={styles.note}>Explore the planned course below. These lessons are being prepared; the starter collection above is available for testing.</Text>
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
                  <Ionicons name={open ? 'remove' : 'add'} size={22} color="#0B245B" />
                </Pressable>
                {open ? <View style={styles.details}>
                  <Text style={styles.objective}>{unit.objective}</Text>
                  {unit.lessons.map((lesson) => (
                    <View key={lesson.id} style={styles.lesson}>
                      <Ionicons accessible={false} name="lock-closed-outline" size={18} color="#586B7B" />
                      <View style={styles.headingCopy}>
                        <Text style={styles.lessonTitle}>{lesson.title}</Text>
                        <Text style={styles.subtitle}>{lesson.type} / {lesson.wordCount} items</Text>
                        <Text style={styles.preparing}>{lesson.status === 'translation-needed' ? 'Translation in preparation' : 'Language review pending'}</Text>
                      </View>
                    </View>
                  ))}
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
  container: { backgroundColor: '#F3FAFE', borderColor: '#D8E8F2', borderWidth: 1, borderRadius: 24, marginTop: 24, overflow: 'hidden' },
  heading: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 20, minHeight: 80 },
  headingCopy: { flex: 1, minWidth: 0 },
  eyebrow: { fontFamily: fonts.extraBold, fontSize: 10, letterSpacing: 1, color: '#0076B5', marginBottom: 6 },
  title: { fontFamily: fonts.extraBold, fontSize: 21, color: '#0B245B' },
  subtitle: { fontFamily: fonts.medium, fontSize: 12, color: '#586B7B', marginTop: 4 },
  units: { padding: 14, paddingTop: 0, gap: 10 },
  note: { fontFamily: fonts.medium, fontSize: 14, lineHeight: 21, color: '#586B7B', padding: 6, marginBottom: 8 },
  unit: { borderRadius: 18, backgroundColor: '#FFFFFF', borderColor: '#D8E8F2', borderWidth: 1 },
  unitHeading: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 80, padding: 14 },
  number: { width: 38, height: 38, borderRadius: 13, backgroundColor: '#EAF8FF', alignItems: 'center', justifyContent: 'center' },
  numberText: { color: '#0076B5', fontFamily: fonts.extraBold, fontSize: 17 },
  section: { fontFamily: fonts.bold, fontSize: 11, color: '#586B7B' },
  unitTitle: { fontFamily: fonts.extraBold, fontSize: 16, color: '#0B245B', marginTop: 3 },
  details: { padding: 14, paddingTop: 0, gap: 12 },
  objective: { color: '#0B245B', fontFamily: fonts.medium, fontSize: 14, lineHeight: 21 },
  lesson: { flexDirection: 'row', gap: 10, paddingTop: 12, borderTopColor: '#D8E8F2', borderTopWidth: 1 },
  lessonTitle: { fontFamily: fonts.bold, fontSize: 14, color: '#0B245B' },
  preparing: { fontFamily: fonts.medium, fontSize: 12, color: '#586B7B', marginTop: 5 },
});
