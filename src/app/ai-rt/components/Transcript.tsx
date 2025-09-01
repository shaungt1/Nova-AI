'use-client';

import React, { useEffect, useRef, useState } from 'react';

import Image from 'next/image';

import { useTranscript } from '@/app/contexts/TranscriptContext';
import { TranscriptItem } from '@/app/types';
import NeurofloVisualizer, { NeurofloVisualizerHandle } from '@/app/components/fx/NeurofloVisualizer';
// import NeurofloVisualizer from '@/components/fx/NeurofloVisualizer'; // Removed duplicate import
import ShaderOrb from '@/app/components/fx/ShaderOrb';
import AudioWaveIcon from '@/app/components/fx/ui-fx/AudioWaveIcon';
import { BorderBeam } from '@/app/components/magicui/border-beam';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/app/components/ui/card';
import { ChatInput } from '@/app/components/ui/chat/chat-input';

import RealTimeChatInput from './realtime-chat-input';
import { ClipboardCheck, Copy } from 'lucide-react';
import { AudioLines } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
// Adjust the path as needed
// @ts-ignore
import { NullValue } from 'services/supabase/apps/studio/components/grid/components/common/NullValue';

// Import FontAwesome icon

export interface TranscriptProps {
    userText: string;
    setUserText: (val: string) => void;
    onSendMessage: () => void;
    canSend: boolean;
    isHumanMicOn?: boolean;
    isEventsPaneExpanded: boolean; // Added state
    setIsEventsPaneExpanded: (val: boolean) => void; // Added toggle function
}

function Transcript({
    userText,
    setUserText,
    onSendMessage,
    canSend,
    isHumanMicOn,
    isEventsPaneExpanded, // Receive state
    setIsEventsPaneExpanded // Receive toggle function
}: TranscriptProps) {
    const { transcriptItems, toggleTranscriptItemExpand } = useTranscript();
    const transcriptRef = useRef<HTMLDivElement | null>(null);
    const visualizerRef = useRef<NeurofloVisualizerHandle>(null);
    const [prevLogs, setPrevLogs] = useState<TranscriptItem[]>([]);
    const [justCopied, setJustCopied] = useState(false);

    // State to control visualizer activation
    const [isBotSpeaking, setIsBotSpeaking] = useState(false);

    function scrollToBottom() {
        if (transcriptRef.current) {
            transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
        }
    }

    useEffect(() => {
        const hasNewMessage = transcriptItems.length > prevLogs.length;
        const hasUpdatedMessage = transcriptItems.some((newItem, index) => {
            const oldItem = prevLogs[index];
            return oldItem && (newItem.title !== oldItem.title || newItem.data !== oldItem.data);
        });

        if (hasNewMessage || hasUpdatedMessage) {
            scrollToBottom();
        }

        setPrevLogs(transcriptItems);
    }, [transcriptItems]);

    useEffect(() => {
        const botSpeaking = transcriptItems.some(
            (item) =>
                item.role === 'assistant' && (item.type === 'MESSAGE' || item.type === ('AUDIO' as typeof item.type))
        );
        setIsBotSpeaking(botSpeaking);

        if (botSpeaking || isHumanMicOn) {
            visualizerRef.current?.trigger();
        }
    }, [transcriptItems, isHumanMicOn]);

    const handleCopyTranscript = async () => {
        if (!transcriptRef.current) return;
        try {
            await navigator.clipboard.writeText(transcriptRef.current.innerText);
            setJustCopied(true);
            setTimeout(() => setJustCopied(false), 1500);
        } catch (error) {
            console.error('Failed to copy transcript:', error);
        }
    };

    return (
        <div className='relative z-20 mx-2 flex min-h-0 flex-1 flex-col rounded-xl bg-zinc-100 dark:bg-zinc-950'>
            <div className='relative min-h-0 flex-1 overflow-hidden rounded-xl'>
                {/* Chat messages */}
                <div ref={transcriptRef} className='flex h-full flex-col gap-y-4 overflow-auto p-4'>
                    {transcriptItems.map((item) => {
                        const { itemId, type, role, data, expanded, timestamp, title = '', isHidden } = item;

                        if (isHidden) {
                            return null;
                        }

                        if (type === 'MESSAGE') {
                            const isUser = role === 'user';
                            const baseContainer = 'flex justify-end flex-col';
                            const containerClasses = `${baseContainer} ${isUser ? 'items-end' : 'items-start'}`;
                            const bubbleBase = `max-w-lg p-3 rounded-xl ${isUser ? 'bg-zinc-900 text-zinc-300' : 'bg-zinc-200 text-zinc-900'}`; // Adjusted bubble color for user messages
                            const isBracketedMessage = title.startsWith('[') && title.endsWith(']');
                            const messageStyle = isBracketedMessage ? 'italic text-zinc-400' : '';
                            const displayTitle = isBracketedMessage ? title.slice(1, -1) : title;

                            return (
                                <div key={itemId} className={containerClasses}>
                                    <div className={bubbleBase}>
                                        <div
                                            // Time stamp inside of the bubble {light :}
                                            className={`text-xs ${isUser ? 'text-zinc-400' : 'text-zinc-500'} font-mono`}>
                                            {timestamp}
                                        </div>
                                        <div className={`whitespace-pre-wrap ${messageStyle}`}>
                                            <ReactMarkdown>{displayTitle}</ReactMarkdown>
                                        </div>
                                    </div>
                                </div>
                            );
                        } else if (type === 'BREADCRUMB') {
                            return (
                                <div
                                    key={itemId}
                                    className='flex flex-col items-start justify-start text-sm text-zinc-500'>
                                    <span className='font-mono text-xs'>{timestamp}</span>
                                    <div
                                        className={`flex items-center whitespace-pre-wrap font-mono text-sm text-zinc-800 dark:text-zinc-700 ${
                                            data ? 'cursor-pointer' : ''
                                        }`}
                                        onClick={() => data && toggleTranscriptItemExpand(itemId)}>
                                        {data && (
                                            // Arrow icon for expanded state
                                            <span
                                                className={`mr-1 transform select-none font-mono text-zinc-400 transition-transform duration-200 ${
                                                    expanded ? 'rotate-90' : 'rotate-0'
                                                }`}>
                                                ▶
                                            </span>
                                        )}
                                        {title}
                                    </div>
                                    {/* Expanded state data reposnse */}
                                    {expanded && data && (
                                        <div className='text-left text-zinc-800 dark:bg-zinc-900 dark:text-zinc-400'>
                                            <pre className='mb-2 ml-1 mt-2 whitespace-pre-wrap break-words border-l-2 border-zinc-200 pl-2 font-mono text-xs'>
                                                {JSON.stringify(data, null, 2)}
                                            </pre>
                                        </div>
                                    )}
                                </div>
                            );
                        } else {
                            // Fallback if type is neither MESSAGE nor BREADCRUMB
                            return (
                                <div
                                    key={itemId}
                                    className='flex justify-center font-mono text-sm italic text-zinc-500'>
                                    Unknown item type: {type} <span className='ml-2 text-xs'>{timestamp}</span>
                                </div>
                            );
                        }
                    })}
                </div>
            </div>

            {/* RealTimeChatInput positioned dynamically */}
            <div
                className={`${
                    isEventsPaneExpanded
                        ? 'absolute bottom-0 left-0 right-0'
                        : 'fixed bottom-0 mb-[105px] left-0 right-0'
                } z-50`}
            >
                <RealTimeChatInput
                    userText={userText}
                    setUserText={setUserText}
                    onSendMessage={onSendMessage}
                    canSend={canSend}
                    isBotSpeaking={isBotSpeaking}
                    isHumanMicOn={isHumanMicOn}
                />
            </div>
             {/* Neuroflo Visualizer */}
            <div className='absolute mx-6 bottom-0 left-0 right-0 flex justify-center items-center'>
            <NeurofloVisualizer
                ref={visualizerRef}
                options={{
                    color1: [0, 80, 255],
                    color2: [20, 10, 200],
                    color3: [0, 60, 255],
                    amp: 0.07,
                    height:80,
                    scale: 0.07
                }}
                isActive={isBotSpeaking || isHumanMicOn} 
                className=' pointer-events-none  mb-[-38] w-full'
                style={{ mixBlendMode: 'normal' }}
            />
            </div>
        </div>
        
    );
}

export default Transcript;
