"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { useCollaboration } from "@/hooks/useCollaboration";
import { useChat } from "@/hooks/useChat";
import { useVersionHistory } from "@/hooks/useVersionHistory";
import Toolbar from "@/components/Toolbar";
import ChatPanel from "@/components/ChatPanel";
import VersionHistory from "@/components/VersionHistory";

// Dynamic import Monaco to prevent SSR issues
const CodeEditor = dynamic(() => import("@/components/CodeEditor"), {
  ssr: false,
  loading: () => (
    <div className="flex-1 flex items-center justify-center bg-[var(--color-bg-secondary)]">
      <div className="text-center">
        <div className="w-10 h-10 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-[var(--color-text-secondary)] text-sm">
          Loading editor...
        </p>
      </div>
    </div>
  ),
});

export default function RoomPage() {
  const params = useParams();
  const router = useRouter();
  const roomId = params.roomId as string;

  const [username, setUsername] = useState<string>("");
  const [chatOpen, setChatOpen] = useState(false);
  const [versionHistoryOpen, setVersionHistoryOpen] = useState(false);

  // Redirect to home if no username in sessionStorage
  useEffect(() => {
    const stored = sessionStorage.getItem("rtce-username");
    if (!stored) {
      router.push("/");
      return;
    }
    setUsername(stored);
  }, [router]);

  // Hooks
  const collaboration = useCollaboration(roomId, username);
  const chat = useChat(roomId, username);
  const versionHistory = useVersionHistory(roomId, username);

  // Load initial chat messages from the join-room response
  useEffect(() => {
    if (collaboration.synced && collaboration.initialMessages.length > 0) {
      chat.setInitialMessages(collaboration.initialMessages);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collaboration.synced]);

  // Load versions when panel opens
  useEffect(() => {
    if (versionHistoryOpen) {
      versionHistory.fetchVersions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [versionHistoryOpen]);

  if (!username) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <Toolbar
        roomId={roomId}
        language={collaboration.language}
        onLanguageChange={collaboration.setLanguage}
        users={collaboration.users}
        currentUser={collaboration.currentUser}
        connected={collaboration.connected}
        onToggleChat={() => setChatOpen(!chatOpen)}
        onToggleVersionHistory={() =>
          setVersionHistoryOpen(!versionHistoryOpen)
        }
        chatOpen={chatOpen}
        messageCount={chat.messages.length}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Editor */}
        <CodeEditor
          ytext={collaboration.ytext}
          awareness={collaboration.provider?.awareness ?? null}
          language={collaboration.language}
          synced={collaboration.synced}
        />

        {/* Chat sidebar */}
        <ChatPanel
          messages={chat.messages}
          onSendMessage={chat.sendMessage}
          username={username}
          isOpen={chatOpen}
          onToggle={() => setChatOpen(!chatOpen)}
        />
      </div>

      {/* Version History Modal */}
      <VersionHistory
        versions={versionHistory.versions}
        loading={versionHistory.loading}
        onSaveVersion={versionHistory.saveVersion}
        onRevertToVersion={versionHistory.revertToVersion}
        isOpen={versionHistoryOpen}
        onToggle={() => setVersionHistoryOpen(!versionHistoryOpen)}
        onRefresh={versionHistory.fetchVersions}
      />
    </div>
  );
}
