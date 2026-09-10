import type { ChatMessage } from "./aiProxyClient";

interface TranscriptViewProps {
  transcript: ChatMessage[];
  personaName: string;
}

export function TranscriptView({ transcript, personaName }: TranscriptViewProps) {
  return (
    <ul className="chat-screen__messages">
      {transcript.map((turn, index) => (
        <li key={`${turn.role}-${index}`} className={`chat-message chat-message--${turn.role}`}>
          <span className="chat-message__author">{turn.role === "user" ? "You" : personaName}</span>
          <p>{turn.content}</p>
        </li>
      ))}
    </ul>
  );
}
