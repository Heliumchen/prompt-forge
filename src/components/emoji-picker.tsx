import React, { useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverAnchor,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface EmojiPickerProps {
  value: string;
  onChange: (emoji: string) => void;
  children: React.ReactNode;
}

const PRESET_EMOJIS = ["⚪", "🟡", "🟢", "🔴", "🟠", "🔵", "🟣", "🟤"];

export function EmojiPicker({ value, onChange, children }: EmojiPickerProps) {
  const [customEmoji, setCustomEmoji] = useState("");
  const [open, setOpen] = useState(false);

  const handleEmojiSelect = (emoji: string) => {
    onChange(emoji);
    setOpen(false);
    setCustomEmoji("");
  };

  const handleTriggerClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setOpen(!open);
  };

  const handleCustomEmojiSubmit = (
    e: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (e.key === "Enter" && customEmoji.trim()) {
      onChange(customEmoji.trim());
      setOpen(false);
      setCustomEmoji("");
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        {React.cloneElement(children as React.ReactElement<{ onClick?: (e: React.MouseEvent) => void }>, {
          onClick: handleTriggerClick,
        })}
      </PopoverAnchor>
      <PopoverContent
        className="w-56 p-4"
        align="start"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="space-y-4">
          <div>
            <Label className="text-sm font-medium mb-2 block">
              Select Icon
            </Label>
            <div className="flex gap-2 flex-wrap">
              {PRESET_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => handleEmojiSelect(emoji)}
                  className={`text-2xl p-2 rounded hover:bg-accent transition-colors ${
                    value === emoji ? "bg-accent ring-2 ring-primary" : ""
                  }`}
                  type="button"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Input
              id="custom-emoji"
              value={customEmoji}
              onChange={(e) => setCustomEmoji(e.target.value)}
              onKeyDown={handleCustomEmojiSubmit}
              placeholder="Enter any Emoji"
              className="text-center text-xl"
              maxLength={4}
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
