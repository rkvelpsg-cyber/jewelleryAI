"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, Sparkles } from "lucide-react";
import type { AssistantAction, JewelleryProduct } from "@/types";
import {
  handleAssistantInput,
  speakShort,
} from "@/lib/assistant/interactionEngine";

interface Props {
  currentProduct?: JewelleryProduct;
  onAction: (action: AssistantAction) => void;
}

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult:
    | ((event: {
        results: ArrayLike<ArrayLike<{ transcript: string }>>;
      }) => void)
    | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

type SpeechWindow = Window & {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
};

export default function AIAssistantPanel({ currentProduct, onAction }: Props) {
  const [listening, setListening] = useState(false);
  const [text, setText] = useState("");
  const [response, setResponse] = useState(
    "Try saying “next”, “lighter”, or “under one lakh”.",
  );
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  useEffect(() => () => recognitionRef.current?.stop(), []);

  const runCommand = async (input: string) => {
    setText(input);
    const action = handleAssistantInput(input, currentProduct);
    if (!action) {
      setResponse("Let me think of a suitable option…");
      if (process.env.NEXT_PUBLIC_ENABLE_LLM !== "true") {
        setResponse(
          "I can help with next, previous, categories, lighter, cheaper, price, weight, and saving this look.",
        );
        return;
      }

      try {
        const result = await fetch("/api/assistant", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ input, currentProduct }),
        });
        const fallback = (await result.json()) as { message?: string };
        setResponse(
          fallback.message ?? "I can help you explore the collection.",
        );
        if (fallback.message) speakShort(fallback.message);
      } catch {
        setResponse(
          "I can still help you explore the collection using local options.",
        );
      }
      return;
    }

    if (action.action === "ANSWER") {
      setResponse(action.text);
      speakShort(action.text);
    } else {
      setResponse(action.action.replaceAll("_", " ").toLowerCase());
      onAction(action);
    }
  };

  const toggleListening = () => {
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }

    const speechWindow = window as SpeechWindow;
    const Recognition =
      speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
    if (!Recognition) {
      setResponse(
        "Voice input is not supported in this browser. Use the suggestion buttons instead.",
      );
      return;
    }

    const recognition = new Recognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-IN";
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript ?? "";
      runCommand(transcript);
    };
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    setListening(true);
    recognition.start();
  };

  return (
    <section className="assistantPanel" aria-label="AI assistant">
      <div className="assistantHeader">
        <span className="assistantIcon">
          <Sparkles size={16} />
        </span>
        <div>
          <strong>Try-on assistant</strong>
          <small>{response}</small>
        </div>
        <button
          className="assistantMic"
          onClick={toggleListening}
          aria-label={listening ? "Stop listening" : "Talk to assistant"}
        >
          {listening ? <MicOff size={18} /> : <Mic size={18} />}
        </button>
      </div>
      <div className="assistantChips">
        {["Next", "Previous", "Lighter", "Under one lakh", "Save"].map(
          (command) => (
            <button key={command} onClick={() => runCommand(command)}>
              {command}
            </button>
          ),
        )}
      </div>
      {text && <div className="assistantTranscript">“{text}”</div>}
    </section>
  );
}
