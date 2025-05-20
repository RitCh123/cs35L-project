import React from "react";
import { Image, Spacer } from "@heroui/react";

export default function PCDisplay() {
  return (
    <div style={{ padding: "20px", display: "flex", flexDirection: "column", alignItems: "center" }}>
    <h1 style={{ fontSize: "2rem"}}>List of PCS</h1>
    <Spacer y={2} />
    <p>Find a PC that you like in terms of positioning. Play right next to your friends!</p>
    <Spacer y={2} />
      <Image
        alt="HeroUI hero Image with delay"
        height={800*0.75}
        src="/pcsList.png"
        width={1000*0.75}
      />
    </div>
  );
}
