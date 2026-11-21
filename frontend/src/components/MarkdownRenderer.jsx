import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

export default function MarkdownRenderer({ content }) {
  const [copiedIndex, setCopiedIndex] = useState(null);

  const copyToClipboard = (text, index) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  if (!content) return null;

  // Split by code blocks
  const parts = content.split(/(```[\s\S]*?```)/g);

  return (
    <div className="space-y-2 text-sm leading-relaxed text-slate-100">
      {parts.map((part, index) => {
        if (part.startsWith('```')) {
          // Extract language and code
          const match = part.match(/```([a-zA-Z0-9_-]*)\n?([\s\S]*?)```/);
          const lang = match ? match[1] || 'code' : 'code';
          const code = match ? match[2].trim() : part.slice(3, -3).trim();

          return (
            <div key={index} className="my-3 rounded-lg overflow-hidden border border-slate-700 bg-slate-950 font-mono text-xs">
              <div className="flex items-center justify-between px-3.5 py-1.5 bg-slate-900 border-b border-slate-800 text-slate-400">
                <span className="font-semibold uppercase tracking-wider text-[10px] text-emerald-400">{lang}</span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(code, index)}
                  className="flex items-center gap-1 hover:text-slate-200 transition text-[11px] cursor-pointer"
                >
                  {copiedIndex === index ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span className="text-emerald-400">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
              <pre className="p-3.5 overflow-x-auto text-slate-200">
                <code>{code}</code>
              </pre>
            </div>
          );
        }

        // Render formatted text with bold, inline code, and paragraphs
        return (
          <div key={index} className="whitespace-pre-wrap">
            {part.split('\n\n').map((para, pIdx) => (
              <p key={pIdx} className="mb-2 last:mb-0">
                {renderFormattedInline(para)}
              </p>
            ))}
          </div>
        );
      })}
    </div>
  );
}

function renderFormattedInline(text) {
  // Simple inline formatting for bold (**text**) and code (`text`)
  const tokens = text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g);
  return tokens.map((tok, i) => {
    if (tok.startsWith('`') && tok.endsWith('`')) {
      return (
        <code key={i} className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-emerald-300 font-mono text-xs">
          {tok.slice(1, -1)}
        </code>
      );
    }
    if (tok.startsWith('**') && tok.endsWith('**')) {
      return (
        <strong key={i} className="font-semibold text-white">
          {tok.slice(2, -2)}
        </strong>
      );
    }
    return tok;
  });
}
