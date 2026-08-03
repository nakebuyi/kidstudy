"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { selectVoice } from "@/lib/speech-voices";

export function useSpeech() {
  const [speaking, setSpeaking] = useState(false);
  const supported =
    typeof window !== "undefined" && "speechSynthesis" in window;
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);
  const pendingRef = useRef<{ text: string; lang: string } | null>(null);

  const buildUtterance = useCallback(
    (text: string, lang: string): SpeechSynthesisUtterance | null => {
      if (!supported) return null;
      const utterance = new SpeechSynthesisUtterance(text);
      // Explicitly pick a matching voice: Chrome silently drops utterances
      // when the requested lang has no available voice (e.g. en-US on a
      // Chinese-only TTS environment).
      const voice = selectVoice(voicesRef.current, lang);
      if (voice) {
        utterance.voice = voice;
        utterance.lang = voice.lang;
      } else {
        utterance.lang = lang;
      }
      utterance.rate = 0.8;
      utterance.pitch = 1;

      utterance.onstart = () => setSpeaking(true);
      utterance.onend = () => setSpeaking(false);
      utterance.onerror = () => {
        setSpeaking(false);
        pendingRef.current = null;
      };

      return utterance;
    },
    [supported]
  );

  // Voices load asynchronously in some browsers. Refresh on 'voiceschanged'
  // and replay a pending utterance that failed to find a voice.
  useEffect(() => {
    if (!supported) return;
    const load = () => {
      const hadVoices = voicesRef.current.length > 0;
      voicesRef.current = window.speechSynthesis.getVoices();
      if (!hadVoices && voicesRef.current.length > 0 && pendingRef.current) {
        const { text, lang } = pendingRef.current;
        pendingRef.current = null;
        const utterance = buildUtterance(text, lang);
        if (utterance) window.speechSynthesis.speak(utterance);
      }
    };
    load();
    window.speechSynthesis.addEventListener("voiceschanged", load);
    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", load);
    };
  }, [supported, buildUtterance]);

  const speak = useCallback(
    (text: string, lang: string = "zh-CN") => {
      if (!supported) return;

      window.speechSynthesis.cancel();

      // If voices haven't loaded yet, remember this request and replay it
      // when 'voiceschanged' fires, otherwise Chrome may silently drop it.
      if (voicesRef.current.length === 0) {
        pendingRef.current = { text, lang };
        // Force Chrome to start loading voices.
        window.speechSynthesis.getVoices();
        return;
      }

      const utterance = buildUtterance(text, lang);
      if (!utterance) return;
      utteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    },
    [supported, buildUtterance]
  );

  const stop = useCallback(() => {
    if (!supported) return;
    window.speechSynthesis.cancel();
    pendingRef.current = null;
    setSpeaking(false);
  }, [supported]);

  return { speak, stop, speaking, supported };
}
