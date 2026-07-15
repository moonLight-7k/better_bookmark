import React from 'react';
import { Command } from 'lucide-react';

interface KeyboardShortcutProps {
  shortcutKey: string;
  className?: string;
}

export const KeyboardShortcut: React.FC<KeyboardShortcutProps> = ({
  shortcutKey,
  className = ''
}) => {
  return (
    <div className={`flex items-center text-gray-400 opacity-90 gap-1 ${className}`}>
      <Command size={12} color="gray" />
      <span>+</span>
      <kbd className="px-1.5 py-0.5 bg-[#444] border border-gray-600 rounded hover:bg-[#555] transition-colors">
        {shortcutKey}
      </kbd>
    </div>
  );
};

export default KeyboardShortcut;