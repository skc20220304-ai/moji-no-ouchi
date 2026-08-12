import { describe, expect, it } from 'vitest';
import { choicesFor, learningRows, pictures } from '../src/domain/kana';
import { courseKana, homeCourses, newSession } from '../src/domain/session';

describe('kana content', () => {
  it('contains every basic kana exactly once', () => {
    expect(pictures).toHaveLength(46);
    const kanaOrder = pictures.map((picture) => picture.kana);
    expect(new Set(kanaOrder).size).toBe(46);
    expect(kanaOrder).toContain('を');
    expect(kanaOrder).toContain('ん');
  });
  it('always includes the requested answer and two different choices', () => {
    pictures.map((picture) => picture.kana).forEach((kana) => {
      const choices = choicesFor(kana);
      expect(choices).toHaveLength(3);
      expect(choices.map((item) => item.kana)).toContain(kana);
      expect(new Set(choices.map((item) => item.kana)).size).toBe(3);
    });
  });
  it('starts in the あ行 and moves through rows in order', () => {
    expect(newSession([]).queue).toEqual(learningRows[0]);
    expect(newSession(learningRows[0]).queue).toEqual(learningRows[1]);
    const finalCourse = homeCourses[2];
    expect(newSession(courseKana(finalCourse).filter((kana) => !learningRows[9].includes(kana)), finalCourse).queue).toEqual(learningRows[9]);
  });
  it('keeps the three homes on non-overlapping kana courses', () => {
    const courses = homeCourses.map(courseKana);
    expect(new Set(courses.flat()).size).toBe(46);
    expect(courses[0]).not.toContain('た');
    expect(courses[1]).toContain('た');
    expect(courses[2]).toContain('ん');
    expect(newSession([], homeCourses[1]).queue).toEqual(['た', 'ち', 'つ', 'て', 'と']);
  });
});
