'use client';

import React, { useEffect, useRef } from 'react';

import useSpeechToText from '@/app/hooks/useSpeechRecognition';
import NeurofloInputVisualizer, { NeurofloInputVisualizerHandle } from '@/app/components/fx/NeurofloInputVisualizer';
import { BorderBeam } from '@/app/components/magicui/border-beam';
import { Button } from '@/app/components/ui/button';
import { ChatInput } from '@/app/components/ui/chat/chat-input';

import { Mic, SendHorizonal } from 'lucide-react';

interface RealTimeChatInputProps {
    userText: string;
    setUserText: (val: string) => void;
    onSendMessage: () => void;
    canSend: boolean;
    isBotSpeaking?: boolean;
    isHumanMicOn?: boolean;
}

export default function RealTimeChatInput({
    userText,
    setUserText,
    onSendMessage,
    canSend,
    isBotSpeaking = true,
    isHumanMicOn = true
}: RealTimeChatInputProps) {
    const inputRef = useRef<HTMLTextAreaElement | null>(null);
    const visualizerRef = useRef<NeurofloInputVisualizerHandle>(null);
    const { isListening, transcript, startListening, stopListening } = useSpeechToText({ continuous: true });

    const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            onSendMessage();
        }
    };

    const handleListenClick = () => {
        isListening ? stopListening() : startListening();
    };

    useEffect(() => {
        if (isListening && transcript) {
            setUserText(transcript);
        }
    }, [isListening, transcript, setUserText]);

    useEffect(() => {
        if ((userText.length > 0 && !isBotSpeaking) || isHumanMicOn) {
            visualizerRef.current?.trigger();
        }
    }, [userText, isBotSpeaking, isHumanMicOn]);

    return (
        <div className='pointer-events-auto w-1/3 absolute bottom-0 left-1/2 z-50 max-w-[90%] -translate-x-1/2 translate-y-8'>
            {/* Glowing shimmer border */}
            <div className='shimmer-border pointer-events-none absolute inset-0 z-0 rounded-t-2xl' />

            {/* Actual card */}
            <div className='relative h-full w-full rounded-3xl border border-zinc-300 bg-zinc-100 shadow-xl dark:border-zinc-500 dark:bg-zinc-900'>
                <div id='realtime_ai_input' className='flex h-full flex-col px-4 pt-2'>
                    {/* Chat Input */}
                    <div className='mb-4'>
                        <ChatInput
                            value={isListening ? (transcript.length ? transcript : '') : userText}
                            ref={inputRef}
                            onKeyDown={handleKeyPress}
                            onChange={(e) => setUserText(e.target.value)}
                            name='message'
                            placeholder={!isListening ? 'Enter your mental ping...' : 'Listening...'}
                            className='max-h-40 resize-none overflow-y-auto rounded-lg border-0 bg-zinc-100 px-6 pt-6 text-sm shadow-none placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-0 disabled:cursor-not-allowed dark:bg-zinc-900'
                            style={{
                                maxHeight: '6rem',
                                minHeight: '3rem'
                            }}
                        />
                    </div>

                    {/* Buttons */}
                    <div className='mt-auto flex items-center justify-end gap-2'>
                        <Button
                            onClick={handleListenClick}
                            variant='ghost'
                            size='icon'
                            className={`shrink-0 rounded-full ${isListening ? 'bg-blue-500/30' : ''}`}>
                            <Mic className='h-5 w-5' />
                        </Button>
                        <Button
                            onClick={onSendMessage}
                            disabled={!canSend || !userText.trim()}
                            variant='ghost'
                            size='icon'
                            className='shrink-0 rounded-full'>
                            <SendHorizonal className='h-5 w-5' />
                        </Button>
                    </div>
                </div>
                {/* Border Beam Animation */}
                <BorderBeam
                    duration={5}
                    size={250}
                    colorFrom='#0000FF'
                    colorTo='#333fff'
                    className='rounded-3xl bg-blue-500 from-transparent to-transparent'
                />
                <NeurofloInputVisualizer
                    ref={visualizerRef}
                    options={{
                        color1: [0, 80, 255],
                        color2: [20, 150, 200],
                        color3: [0, 120, 255],
                        amp: 0.07,
                        height: 80,
                        scale: 0.07
                    }}
                    className='pointer-events-none mb-[12] w-3/4'
                    style={{ mixBlendMode: 'normal' }}
                />
            </div>
        </div>
    );
}
