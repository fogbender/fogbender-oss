"use client";
import { useState } from "react";
import classNames from "classnames";
import FogbenderSimpleRoomyWidget from "./FogbenderSimpleRoomyWidget";
import FogbenderRoomyWidget from "./FogbenderRoomyWidget";
import FogbenderFloatyWidget from "./FogbenderFloatyWidget";
import FogbenderUnreadBadgeWidget from "./FogbenderUnreadBadgeWidget";

const navButtonClass = (id: string, current: string) =>
  classNames("cursor-pointer text-left px-4 py-2 rounded w-full font-medium transition", {
    "bg-sky-600 text-white": current === id,
    "bg-white text-gray-700 hover:bg-gray-200": current !== id,
  });

export default function Home() {
  const [widget, setWidget] = useState<"simple-roomy" | "roomy" | "simple-floaty" | "unread-badge">(
    "simple-roomy"
  );

  return (
    <div className="flex min-h-screen">
      <nav className="flex flex-col px-2 py-12 bg-gray-300 border-r border-dashed gap-2">
        <button
          onClick={() => setWidget("simple-roomy")}
          className={navButtonClass("simple-roomy", widget)}
        >
          FogbenderSimpleRoomyWidget
        </button>
        <button onClick={() => setWidget("roomy")} className={navButtonClass("roomy", widget)}>
          FogbenderRoomyWidget
        </button>
        <button
          onClick={() => setWidget("simple-floaty")}
          className={navButtonClass("simple-floaty", widget)}
        >
          FogbenderFloatyWidget
        </button>
        <button
          onClick={() => setWidget("unread-badge")}
          className={navButtonClass("unread-badge", widget)}
        >
          FogbenderUnreadBadge
        </button>
      </nav>

      <main className="flex flex-1">
        {widget === "simple-roomy" && <FogbenderSimpleRoomyWidget />}
        {widget === "roomy" && <FogbenderRoomyWidget />}
        {widget === "simple-floaty" && <FogbenderFloatyWidget />}
        {widget === "unread-badge" && <FogbenderUnreadBadgeWidget />}
      </main>
    </div>
  );
}
