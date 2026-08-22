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

# La piste longue descend a 11025 Hz : trois minutes a 22050 pesent 7,6 Mo, le
# double de tout le reste du depot reuni. Pour une sequence de tons purs la
# bande passante n'apporte rien, et 11025 Hz garde le motif net.
LONG_SAMPLE_RATE = 11025

AMPLITUDE = 0.28

# Motif de berceuse, en demi-tons depuis La3 (440 Hz). Volontairement simple
# et consonant : il s'agit d'entendre que quelque chose joue et s'arrete, pas
# de composer.
INTRO = [(-3, 0.55), (0, 0.55), (4, 0.55), (2, 0.80), (0, 1.10)]
COMPTINE = [(0, 0.45), (2, 0.45), (4, 0.45), (5, 0.45), (4, 0.60),
            (2, 0.60), (0, 0.75), (-5, 1.20)]

# Cycle de la piste longue : un tour dure ~15 s, repete jusqu'a depasser la
# duree visee. On ne cherche pas une composition, seulement une piste dont la
# duree soit assez longue pour eprouver la barre sur toute sa plage.
LONG_CYCLE = [(0, 0.9), (4, 0.9), (7, 0.9), (4, 0.9),
              (2, 0.9), (5, 0.9), (9, 0.9), (5, 0.9),
              (-3, 1.2), (0, 1.2), (4, 1.8), (0, 2.4)]
LONG_TARGET_SECONDS = 180.0


def frequency(semitones):
    return 440.0 * (2.0 ** (semitones / 12.0))


def render_note(semitones, seconds, rate=SAMPLE_RATE):
    """Sinus fondamental + octave discrete, enveloppe douce aux deux bouts."""
    total = int(rate * seconds)
    freq = frequency(semitones)
    attack = int(rate * 0.02)
    release = int(total * 0.45)
    samples = []

    for i in range(total):
        t = i / rate
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


def render_sequence(notes, rate=SAMPLE_RATE):
    samples = []
    for semitones, seconds in notes:
        samples.extend(render_note(semitones, seconds, rate))
    return samples


def encode(samples):
    frames = bytearray()
    for value in samples:
        clipped = max(-1.0, min(1.0, value))
        frames += struct.pack("<h", int(clipped * 32767))
    return bytes(frames)


def write_wav(path, samples, rate=SAMPLE_RATE):
    with wave.open(path, "wb") as handle:
        handle.setnchannels(1)
        handle.setsampwidth(2)
        handle.setframerate(rate)
        handle.writeframes(encode(samples))


def write_long_wav(path, notes, target_seconds, rate):
    """
    Ecrit cycle par cycle plutot que de tout garder en memoire : trois minutes
    d'echantillons en liste Python occupent bien plus que le fichier produit.
    """
    cycle = encode(render_sequence(notes, rate))
    cycle_seconds = len(cycle) / 2.0 / rate
    repeats = int(target_seconds / cycle_seconds) + 1

    with wave.open(path, "wb") as handle:
        handle.setnchannels(1)
        handle.setsampwidth(2)
        handle.setframerate(rate)
        for _ in range(repeats):
            handle.writeframes(cycle)

    return repeats * cycle_seconds


def main():
    here = os.path.dirname(os.path.abspath(__file__))
    out_dir = os.path.normpath(
        os.path.join(here, "..", "Resources", "packs", "audio-demo", "assets"))
    os.makedirs(out_dir, exist_ok=True)

    for name, notes in (("intro.wav", INTRO), ("comptine.wav", COMPTINE)):
        samples = render_sequence(notes)
        path = os.path.join(out_dir, name)
        write_wav(path, samples)
        print("  %-14s %6.2f s  %8d octets  %d Hz" % (
            name, len(samples) / SAMPLE_RATE, os.path.getsize(path), SAMPLE_RATE))

    # Piste longue : sert a eprouver la barre de progression et le glissement
    # sur une plage reelle, pas a etre ecoutee.
    path = os.path.join(out_dir, "longue.wav")
    seconds = write_long_wav(path, LONG_CYCLE, LONG_TARGET_SECONDS, LONG_SAMPLE_RATE)
    print("  %-14s %6.2f s  %8d octets  %d Hz" % (
        "longue.wav", seconds, os.path.getsize(path), LONG_SAMPLE_RATE))


if __name__ == "__main__":
    main()
