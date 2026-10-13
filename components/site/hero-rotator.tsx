"use client";

import { useEffect, useState } from "react";

const HOLD_MS = 3000;
const DELETE_MS = 55;
const TYPE_MS = 95;

/**
 * "FUSION" followed by a word that is deleted and retyped every few seconds
 * (ESPORTS → PRODUCTION → BROADCAST → …), with a typing cursor.
 *
 * The typing runs for everyone: letters appearing in place is not the kind of
 * movement "reduce motion" asks to avoid. For those visitors the CSS keeps the
 * cursor steady instead of blinking.
 *
 * The first word is what the server renders, so the HTML is complete and
 * hydration matches. Screen readers get one stable sentence instead of a
 * stream of letters.
 */
export function HeroRotator({ prefix, words }: { prefix: string; words: string[] }) {
  const list = words.length ? words : [""];
  const [index, setIndex] = useState(0);
  const [text, setText] = useState(list[0]);
  const [phase, setPhase] = useState<"hold" | "delete" | "type">("hold");

  useEffect(() => {
    if (list.length < 2) return;
    const word = list[index];
    let timer: ReturnType<typeof setTimeout>;

    if (phase === "hold") {
      timer = setTimeout(() => setPhase("delete"), HOLD_MS);
    } else if (phase === "delete") {
      timer = setTimeout(() => {
        if (text.length) {
          setText(text.slice(0, -1));
        } else {
          setIndex((index + 1) % list.length);
          setPhase("type");
        }
      }, DELETE_MS);
    } else {
      timer = setTimeout(() => {
        if (text.length < word.length) setText(word.slice(0, text.length + 1));
        else setPhase("hold");
      }, TYPE_MS);
    }
    return () => clearTimeout(timer);
    // `list` is rebuilt each render from the same props; its contents are what matter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, text, phase, words.join("\n")]);

  const longest = list.reduce((a, b) => (b.length > a.length ? b : a), "");

  return (
    <>
      <span className="sr-only">
        {prefix} {list.join(", ")}
      </span>
      <span aria-hidden="true" className="block">
        <span className="heading-display block text-6xl sm:text-7xl xl:text-8xl">
          {prefix}
        </span>
        {/* The invisible longest word reserves the space, so nothing below moves. */}
        <span className="heading-display relative mt-1 block text-6xl sm:text-7xl xl:text-8xl">
          <span className="invisible">{longest}</span>
          <span className="absolute inset-0 whitespace-nowrap">
            <span className="text-brand">{text}</span>
            <span className="hero-caret" />
          </span>
        </span>
      </span>
    </>
  );
}
