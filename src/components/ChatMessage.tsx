
import React from 'react';
import { Message as MessageType } from '../types';
import { format, parseISO } from 'date-fns';

interface ChatMessageProps {
  message: MessageType;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isUser = message.role === 'user';
  const formattedTime = format(parseISO(message.timestamp), 'h:mm a');
  
  return (
    <div className={`flex mb-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div 
        className={`max-w-[80%] p-3 rounded-xl ${
          isUser 
            ? 'bg-brand-primary text-white rounded-tr-none' 
            : 'bg-gray-100 text-gray-800 rounded-tl-none'
        }`}
      >
        <p>{message.content}</p>
        <span className={`text-xs mt-1 block ${isUser ? 'text-brand-primary-foreground opacity-80' : 'text-gray-500'}`}>
          {formattedTime}
        </span>
      </div>
    </div>
  );
};

export default ChatMessage;
