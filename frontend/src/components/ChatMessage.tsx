import ReactMarkdown from "react-markdown";
import { ConversationMessage } from "../types";

interface Props {
  message: ConversationMessage;
}

export default function ChatMessage({ message }: Props) {
  const isAssistant = message.role === "assistant";
  return (
    <div className={`message ${isAssistant ? "message-assistant" : "message-student"}`}>
      <div className="message-avatar">
        {isAssistant ? "🎓" : "🙂"}
      </div>
      <div className="message-bubble">
        {isAssistant ? (
          <ReactMarkdown>{message.content}</ReactMarkdown>
        ) : (
          <p>{message.content}</p>
        )}
      </div>
    </div>
  );
}
