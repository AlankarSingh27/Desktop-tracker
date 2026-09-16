import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";

export function useLiveSocket(onActivity: (payload: any) => void) {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("admin_token");
    if (!token) return;

    const socket = io(import.meta.env.VITE_SOCKET_URL, {
      auth: { token },
    });
    socketRef.current = socket;

    socket.on("agent:activity", onActivity);

    return () => {
      socket.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return socketRef;
}
