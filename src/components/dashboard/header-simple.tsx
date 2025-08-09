"use client";

import { useSession } from "next-auth/react";

interface HeaderProps {
  title?: string;
}

export function HeaderSimple({ title }: HeaderProps) {
  const { data: session, status } = useSession();

  console.log(
    "HeaderSimple render - session status:",
    status,
    "session:",
    session
  );

  return (
    <div
      style={{
        backgroundColor: "red",
        minHeight: "80px",
        border: "5px solid blue",
        zIndex: 9999,
        position: "relative",
        width: "100%",
        display: "block",
      }}
    >
      <div style={{ padding: "20px", color: "white", fontSize: "18px" }}>
        🚨🚨🚨 DEBUG HEADER IS HERE 🚨🚨🚨
        <br />
        Title: {title || "Dashboard"}
        <br />
        Status: {status} | User: {session?.user?.name || "None"}
      </div>
    </div>
  );
}
