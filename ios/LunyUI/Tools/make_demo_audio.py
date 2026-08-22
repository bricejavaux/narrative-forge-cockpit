#!/usr/bin/env python3
"""
Genere les pistes audio REELLES du pack de demonstration.

Pourquoi ce script existe : les assets audio des fixtures du moteur
(luny-engine/tests/packs/*/assets/*.ogg) font 0 octet — ce sont des
place-tenus, exactement comme l'etaient les images avant qu'on ne genere de
vraies couvertures. Et meme s'ils avaient du contenu, iOS ne decode pas
l'Ogg Vorbis nativement : rien n'aurait joue.

Ce script produit donc de vrais WAV PCM 16 bits, format que le moteur accepte
(ext_matches_kind reconnait .wav) et qu'iOS decode nativement via
AVAudioPlayer. Ils alimentent le pack `audio-demo`, seul pack embarque dont
la lecture est reelle — les quatre autres exercent le repli simule.

Pas de dependance : le module `wave` est dans la bibliotheque standard.

Usage :  python3 Tools/make_demo_audio.py
"""

import math
import os
import struct
import wave

SAMPLE_RATE = 22050
AMPLITUDE = 0.28

# Motif de berceuse, en demi-tons depuis La3 (440 Hz). Volontairement simple
# et consonant : il s'agit d'entendre que quelque chose joue et s'arrete, pas
# de composer.
INTRO = [(-3, 0.55), (0, 0.55), (4, 0.55), (2, 0.80), (0, 1.10)]
COMPTINE = [(0, 0.45), (2, 0.45), (4, 0.45), (5, 0.45), (4, 0.60),
            (2, 0.60), (0, 0.75), (-5, 1.20)]


def frequency(semitones):
    return 440.0 * (2.0 ** (semitones / 12.0))


def render_note(semitones, seconds):
    """Sinus fondamental + octave discrete, enveloppe douce aux deux bouts."""
    total = int(SAMPLE_RATE * seconds)
    freq = frequency(semitones)
    attack = int(SAMPLE_RATE * 0.02)
    release = int(total * 0.45)
    samples = []

    for i in range(total):
        t = i / SAMPLE_RATE
        value = math.sin(2.0 * math.pi * freq * t)
        value += 0.22 * math.sin(4.0 * math.pi * freq * t)

        # Enveloppe : attaque courte pour eviter le clic, longue extinction.
        if i < attack:
            envelope = i / attack
        elif i > total - release:
            envelope = (total - i) / release
        else:
            envelope = 1.0

        samples.append(value * envelope * AMPLITUDE)

    return samples


def render_sequence(notes):
    samples = []
    for semitones, seconds in notes:
        samples.extend(render_note(semitones, seconds))
    return samples


def write_wav(path, samples):
    frames = bytearray()
    for value in samples:
        clipped = max(-1.0, min(1.0, value))
        frames += struct.pack("<h", int(clipped * 32767))

    with wave.open(path, "wb") as handle:
        handle.setnchannels(1)
        handle.setsampwidth(2)
        handle.setframerate(SAMPLE_RATE)
        handle.writeframes(bytes(frames))


def main():
    here = os.path.dirname(os.path.abspath(__file__))
    out_dir = os.path.normpath(
        os.path.join(here, "..", "Resources", "packs", "audio-demo", "assets"))
    os.makedirs(out_dir, exist_ok=True)

    for name, notes in (("intro.wav", INTRO), ("comptine.wav", COMPTINE)):
        samples = render_sequence(notes)
        path = os.path.join(out_dir, name)
        write_wav(path, samples)
        print("  %-14s %5.2f s  %6d octets" % (
            name, len(samples) / SAMPLE_RATE, os.path.getsize(path)))


if __name__ == "__main__":
    main()
