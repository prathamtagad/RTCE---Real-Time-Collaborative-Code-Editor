"use client";

import { useEffect, useState, useCallback } from "react";
import { getSocket } from "@/lib/socket";
import type { Version } from "@/lib/types";

interface VersionHistoryState {
  versions: Version[];
  loading: boolean;
  fetchVersions: () => void;
  saveVersion: (label?: string) => Promise<Version | null>;
  revertToVersion: (versionId: number) => Promise<boolean>;
}

export function useVersionHistory(
  roomId: string,
  username: string
): VersionHistoryState {
  const [versions, setVersions] = useState<Version[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchVersions = useCallback(() => {
    if (!roomId) return;
    setLoading(true);
    const socket = getSocket();

    // Add timeout so we don't hang forever if server doesn't respond
    const timeout = setTimeout(() => setLoading(false), 5000);

    socket.emit(
      "get-versions",
      { roomId },
      (res: { versions: Version[] }) => {
        clearTimeout(timeout);
        setVersions(res.versions || []);
        setLoading(false);
      }
    );
  }, [roomId]);

  // Listen for version-saved events from the server (broadcast to all clients)
  useEffect(() => {
    if (!roomId) return;
    const socket = getSocket();

    const handleVersionSaved = () => {
      fetchVersions();
    };

    socket.on("version-saved", handleVersionSaved);
    return () => {
      socket.off("version-saved", handleVersionSaved);
    };
  }, [roomId, fetchVersions]);

  const saveVersion = useCallback(
    (label?: string): Promise<Version | null> => {
      return new Promise((resolve) => {
        const socket = getSocket();

        // Timeout fallback
        const timeout = setTimeout(() => {
          fetchVersions();
          resolve(null);
        }, 5000);

        socket.emit(
          "save-version",
          { roomId, author: username, label },
          (version: Version) => {
            clearTimeout(timeout);
            fetchVersions();
            resolve(version);
          }
        );
      });
    },
    [roomId, username, fetchVersions]
  );

  const revertToVersion = useCallback(
    (versionId: number): Promise<boolean> => {
      return new Promise((resolve) => {
        const socket = getSocket();

        const timeout = setTimeout(() => resolve(false), 5000);

        socket.emit(
          "revert-version",
          { roomId, versionId },
          (res: { success?: boolean; error?: string }) => {
            clearTimeout(timeout);
            if (res.success) {
              fetchVersions();
              resolve(true);
            } else {
              resolve(false);
            }
          }
        );
      });
    },
    [roomId, fetchVersions]
  );

  return { versions, loading, fetchVersions, saveVersion, revertToVersion };
}
