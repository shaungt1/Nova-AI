import React, { Suspense } from "react";
import { TranscriptProvider } from "@/app/contexts/TranscriptContext";
import { EventProvider } from "@/app/contexts/EventContext";
import AIAssistantApp from "./AIAssistantApp";

export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <TranscriptProvider>
        <EventProvider>
          <AIAssistantApp />
        </EventProvider>
      </TranscriptProvider>
    </Suspense>
  );
}