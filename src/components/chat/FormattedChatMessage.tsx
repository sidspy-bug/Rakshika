import React from "react";

interface FormattedChatMessageProps {
  content: string;
  isUser?: boolean;
}

/**
 * Parses inline markdown:
 * - **bold** -> <strong>
 * - *italic* -> <em>
 * - `code`   -> <code>
 */
function renderInline(text: string): React.ReactNode {
  // First split by **bold**
  const boldParts = text.split(/(\*\*[^*]+?\*\*)/g);

  return boldParts.map((boldPart, bIdx) => {
    if (boldPart.startsWith("**") && boldPart.endsWith("**") && boldPart.length >= 4) {
      return (
        <strong key={`b-${bIdx}`} className="font-bold text-white tracking-wide">
          {boldPart.slice(2, -2)}
        </strong>
      );
    }

    // Inside non-bold segments, parse italics (*...* or _..._) and code (`...`)
    const subParts = boldPart.split(/(\*[^*]+?\*|_[^_]+?_|`[^`]+?`)/g);
    return (
      <React.Fragment key={`frag-${bIdx}`}>
        {subParts.map((subPart, sIdx) => {
          if (
            (subPart.startsWith("*") && subPart.endsWith("*") && subPart.length >= 2) ||
            (subPart.startsWith("_") && subPart.endsWith("_") && subPart.length >= 2)
          ) {
            return (
              <em key={`it-${bIdx}-${sIdx}`} className="italic text-gray-300">
                {subPart.slice(1, -1)}
              </em>
            );
          }
          if (subPart.startsWith("`") && subPart.endsWith("`") && subPart.length >= 2) {
            return (
              <code
                key={`c-${bIdx}-${sIdx}`}
                className="px-1.5 py-0.5 rounded bg-black/40 text-rose-300 text-[11px] font-mono border border-white/10"
              >
                {subPart.slice(1, -1)}
              </code>
            );
          }
          return subPart;
        })}
      </React.Fragment>
    );
  });
}

/**
 * Rich formatted chat message renderer for Rakshika AI Guardian.
 * Supports:
 * - Clean numbered lists with badges (1., 2., 3.)
 * - Bullet lists (-, *, •)
 * - Markdown bold / italic / code formatting
 * - Section headers (###, ⚠️, 🚨, 👮, 📍)
 */
export const FormattedChatMessage: React.FC<FormattedChatMessageProps> = ({
  content,
  isUser = false,
}) => {
  if (isUser) {
    return <div className="text-xs leading-relaxed whitespace-pre-wrap font-medium">{content}</div>;
  }

  // Split into lines while preserving empty lines for paragraph separation
  const rawLines = content.split("\n");
  const renderedElements: React.ReactNode[] = [];

  let i = 0;
  while (i < rawLines.length) {
    const line = rawLines[i].trim();

    if (!line) {
      // Empty line spacer
      renderedElements.push(<div key={`spacer-${i}`} className="h-2" />);
      i++;
      continue;
    }

    // Numbered List: 1. or 2.
    const numberedMatch = line.match(/^(\d+)\.\s+(.*)$/);
    if (numberedMatch) {
      const num = numberedMatch[1];
      const rest = numberedMatch[2];
      renderedElements.push(
        <div key={`num-${i}`} className="flex items-start gap-2.5 my-1.5">
          <span className="w-5 h-5 rounded-full bg-rose-500/20 text-rose-400 text-[10px] font-bold flex items-center justify-center shrink-0 border border-rose-500/40 mt-0.5 shadow-sm">
            {num}
          </span>
          <div className="flex-1 min-w-0 text-xs leading-relaxed text-gray-200">
            {renderInline(rest)}
          </div>
        </div>
      );
      i++;
      continue;
    }

    // Bullet List: - or * or •
    const bulletMatch = line.match(/^[-*•]\s+(.*)$/);
    if (bulletMatch) {
      const rest = bulletMatch[1];
      renderedElements.push(
        <div key={`bullet-${i}`} className="flex items-start gap-2.5 my-1">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-400 mt-1.5 shrink-0 shadow-[0_0_8px_rgba(244,63,94,0.6)]" />
          <div className="flex-1 min-w-0 text-xs leading-relaxed text-gray-200">
            {renderInline(rest)}
          </div>
        </div>
      );
      i++;
      continue;
    }

    // Header Lines (starting with ### or containing alert emojis at start)
    const isHeading =
      line.startsWith("###") ||
      line.startsWith("##") ||
      line.startsWith("#") ||
      line.startsWith("⚠️") ||
      line.startsWith("🚨") ||
      line.startsWith("🛡️") ||
      line.startsWith("📍") ||
      line.startsWith("👮") ||
      line.startsWith("🏥") ||
      line.startsWith("🚗");

    if (isHeading) {
      const cleanHeader = line.replace(/^#{1,4}\s*/, "");
      renderedElements.push(
        <div key={`head-${i}`} className="text-xs font-bold text-white tracking-wide mt-2 mb-1 flex items-center gap-1.5">
          {renderInline(cleanHeader)}
        </div>
      );
      i++;
      continue;
    }

    // Standard Paragraph
    renderedElements.push(
      <p key={`p-${i}`} className="text-xs leading-relaxed text-gray-200 mb-1 last:mb-0">
        {renderInline(line)}
      </p>
    );
    i++;
  }

  return <div className="space-y-0.5">{renderedElements}</div>;
};
