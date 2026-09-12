import type { ChatMessage } from "./aiProxyClient";

interface TranscriptViewProps {
  transcript: ChatMessage[];
  personaName: string;
  isTyping?: boolean;
}

export function TranscriptView({ transcript, personaName, isTyping = false }: TranscriptViewProps) {
  return (
    <ul className="chat-screen__messages">
      {transcript.map((turn, index) => (
        <li key={`${turn.role}-${index}`} className={`chat-message chat-message--${turn.role}`}>
          <span className="chat-message__author">{turn.role === "user" ? "You" : personaName}</span>
          <p>{turn.content}</p>
        </li>
      ))}
      {isTyping && (
        <li
          className="chat-message chat-message--assistant chat-message--typing"
          role="status"
          aria-label={`${personaName} is typing`}
        >
          <span className="chat-message__author">{personaName}</span>
          <span className="typing-indicator" aria-hidden="true">
            <span className="typing-indicator__dot" />
            <span className="typing-indicator__dot" />
            <span className="typing-indicator__dot" />
          </span>
        </li>
      )}
    </ul>
  );
}
