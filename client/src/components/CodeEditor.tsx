"use client";

import { useEffect, useRef } from "react";
import Editor, { OnMount } from "@monaco-editor/react";
import { MonacoBinding } from "y-monaco";
import type * as Y from "yjs";
import type { Awareness } from "y-protocols/awareness";

interface CodeEditorProps {
  ytext: Y.Text | null;
  awareness: Awareness | null;
  language: string;
  synced: boolean;
}

export default function CodeEditor({
  ytext,
  awareness,
  language,
  synced,
}: CodeEditorProps) {
  const editorRef = useRef<Parameters<OnMount>[0] | null>(null);
  const bindingRef = useRef<MonacoBinding | null>(null);

  const handleEditorMount: OnMount = (editor) => {
    editorRef.current = editor;

    // Bind Yjs to Monaco when ready
    if (ytext && synced) {
      createBinding(editor);
    }
  };

  const createBinding = (editor: Parameters<OnMount>[0]) => {
    if (!ytext || !editor) return;

    // Destroy previous binding
    if (bindingRef.current) {
      bindingRef.current.destroy();
    }

    const model = editor.getModel();
    if (!model) return;

    const binding = new MonacoBinding(
      ytext,
      model,
      new Set([editor]),
      awareness || undefined
    );

    bindingRef.current = binding;
  };

  // Create binding when synced state changes
  useEffect(() => {
    if (synced && editorRef.current && ytext) {
      createBinding(editorRef.current);
    }

    return () => {
      if (bindingRef.current) {
        bindingRef.current.destroy();
        bindingRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [synced, ytext]);

  if (!synced) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[var(--color-bg-secondary)]">
        <div className="text-center animate-fade-in">
          <div className="w-10 h-10 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-[var(--color-text-secondary)] text-sm">
            Connecting to room...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 editor-container overflow-hidden">
      <Editor
        height="100%"
        language={language}
        theme="vs-dark"
        onMount={handleEditorMount}
        options={{
          fontSize: 14,
          fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
          fontLigatures: true,
          minimap: { enabled: true, scale: 1 },
          scrollBeyondLastLine: false,
          padding: { top: 12 },
          lineNumbers: "on",
          renderWhitespace: "selection",
          bracketPairColorization: { enabled: true },
          autoIndent: "full",
          formatOnPaste: true,
          cursorBlinking: "smooth",
          cursorSmoothCaretAnimation: "on",
          smoothScrolling: true,
          wordWrap: "on",
          tabSize: 2,
          automaticLayout: true,
        }}
        loading={
          <div className="flex items-center justify-center h-full bg-[var(--color-bg-secondary)]">
            <div className="w-8 h-8 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin" />
          </div>
        }
      />
    </div>
  );
}
