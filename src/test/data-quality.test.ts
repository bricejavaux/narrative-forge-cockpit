import { describe, it, expect } from 'vitest';
import {
  chapters, characters, arcs, canonRules, agents, audioNotes, indexes,
} from '@/data/dummyData';

describe('data-quality · canon stabilization', () => {
  it('every chapter has a main arc', () => {
    chapters.forEach((c) => {
      expect(c.mainArc, `Ch.${c.number} missing mainArc`).toBeTruthy();
    });
  });

  it('no chapter has empty scale', () => {
    chapters.forEach((c) => {
      expect(['macro', 'micro', 'mixte']).toContain(c.scale);
    });

  it('every critical canon rule has an index', () => {
    canonRules.filter((r) => r.criticality === 'haute').forEach((r) => {
      expect(r.indexAssociated, `${r.id} missing index`).toBeTruthy();
    });
  });

  it('every character has role, function, trajectory and linked chapters', () => {
    characters.forEach((c) => {
      expect(c.role).toBeTruthy();
      expect(c.function).toBeTruthy();
      expect(c.emotionalTrajectory).toBeTruthy();
      expect(c.linkedChapterIds && c.linkedChapterIds.length, `${c.name} missing linkedChapterIds`).toBeGreaterThan(0);
    });
  });

  it('every agent references existing future indexes', () => {
    const known = new Set(indexes.map((i) => i.id));
    agents.forEach((a) => {
      a.futureIndexes.forEach((idx) => {
        expect(known.has(idx), `${a.name} references unknown index ${idx}`).toBe(true);
      });
    });
  });

  it('every audio note has a target', () => {
    audioNotes.forEach((a) => {
      expect(a.target).toBeTruthy();
      expect(a.targetType).toBeTruthy();
    });
  });

  it('every explicit linked ID points to an existing object', () => {
    const chapterIds = new Set(chapters.map((c) => c.id));
    const characterIds = new Set(characters.map((c) => c.id));
    const arcIds = new Set(arcs.map((a) => a.id));
    const canonIds = new Set(canonRules.map((r) => r.id));

    canonRules.forEach((r) => {
      r.linkedChapterIds?.forEach((id) => expect(chapterIds.has(id), `${r.id} → ${id}`).toBe(true));
      r.linkedCharacterIds?.forEach((id) => expect(characterIds.has(id), `${r.id} → ${id}`).toBe(true));
      r.linkedArcIds?.forEach((id) => expect(arcIds.has(id), `${r.id} → ${id}`).toBe(true));
    });
    characters.forEach((c) => {
      c.linkedChapterIds?.forEach((id) => expect(chapterIds.has(id), `${c.name} → ${id}`).toBe(true));
      c.linkedArcIds?.forEach((id) => expect(arcIds.has(id), `${c.name} → ${id}`).toBe(true));
    });
    audioNotes.forEach((a) => {
      a.linkedChapterIds?.forEach((id) => expect(chapterIds.has(id), `${a.id} → ${id}`).toBe(true));
      a.linkedCharacterIds?.forEach((id) => expect(characterIds.has(id), `${a.id} → ${id}`).toBe(true));
      a.linkedCanonIds?.forEach((id) => expect(canonIds.has(id), `${a.id} → ${id}`).toBe(true));
    });
  });
});
