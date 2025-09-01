import { Metadata } from 'next';
import AIAssistantApp from "./AIAssistantApp";
// import AIChatPage from './ai-chat-page';
import React, { Suspense } from "react";
import { TranscriptProvider } from "@/app/contexts/TranscriptContext";
import { EventProvider } from "@/app/contexts/EventContext";


export const metadata: Metadata = {
    title: 'N.O.V.A. AI',
    description: ''
};

export default function Chat() {
    return (
        <>
        <Suspense fallback={<div>Loading...</div>}>
        <TranscriptProvider>
            <EventProvider>
            <AIAssistantApp />
            </EventProvider>
        </TranscriptProvider>
        </Suspense>
        </>
    );
}