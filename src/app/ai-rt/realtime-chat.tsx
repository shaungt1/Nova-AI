'use client';

import React, { useEffect, useRef, useState } from 'react';

import Image from 'next/image';
import { useSearchParams } from 'next/navigation';

// Agent configs
import { allAgentSets, defaultAgentSetKey } from '@/app/agentConfigs';
import { useEvent } from '@/app/contexts/EventContext';
// Context providers & hooks
import { useTranscript } from '@/app/contexts/TranscriptContext';
// Types
import { AgentConfig, SessionStatus } from '@/app/types';

import { useHandleServerEvent } from '../hooks/useHandleServerEvent';
// Utilities
import { createRealtimeConnection } from '@/lib/realtimeConnection';
// Components
import BottomToolbar from './components/BottomToolbar';
import Events from './components/Events';
// UI components
import Transcript from './components/Transcript';
// @ts-ignore
import { truncate } from 'lodash';
import { v4 as uuidv4 } from 'uuid';

function RealTimeChat() {
    const searchParams = useSearchParams();

    const { transcriptItems, addTranscriptMessage, addTranscriptBreadcrumb } = useTranscript();
    const { logClientEvent, logServerEvent } = useEvent();

    const [selectedAgentName, setSelectedAgentName] = useState<string>('');
    const [selectedAgentConfigSet, setSelectedAgentConfigSet] = useState<AgentConfig[] | null>(null);

    const [dataChannel, setDataChannel] = useState<RTCDataChannel | null>(null);
    const pcRef = useRef<RTCPeerConnection | null>(null);
    const dcRef = useRef<RTCDataChannel | null>(null);
    const audioElementRef = useRef<HTMLAudioElement | null>(null);
    const [sessionStatus, setSessionStatus] = useState<SessionStatus>('DISCONNECTED');

    // Initialize with false, will be set properly in useEffect
    const [isEventsPaneExpanded, setIsEventsPaneExpanded] = useState<boolean>(false);
    const [userText, setUserText] = useState<string>('');
    const [isPTTActive, setIsPTTActive] = useState<boolean>(false);
    const [isPTTUserSpeaking, setIsPTTUserSpeaking] = useState<boolean>(false);
    const [isAudioPlaybackEnabled, setIsAudioPlaybackEnabled] = useState<boolean>(true);

    // Client-side only state initialization
    const [isClient, setIsClient] = useState(false);

    // Ensure component only runs on client side
    useEffect(() => {
        setIsClient(true);
        
        // Clear the localStorage value for logsExpanded to ensure it starts as false
        if (typeof window !== 'undefined') {
            localStorage.removeItem('logsExpanded');
        }
    }, []);

    const sendClientEvent = (eventObj: any, eventNameSuffix = '') => {
        if (dcRef.current && dcRef.current.readyState === 'open') {
            logClientEvent(eventObj, eventNameSuffix);
            dcRef.current.send(JSON.stringify(eventObj));
        } else {
            logClientEvent({ attemptedEvent: eventObj.type }, 'error.data_channel_not_open');
            console.error('Failed to send message - no data channel available', eventObj);
        }
    };

    const handleServerEventRef = useHandleServerEvent({
        setSessionStatus,
        selectedAgentName,
        selectedAgentConfigSet,
        sendClientEvent,
        setSelectedAgentName
    });

    useEffect(() => {
        if (!isClient) return;
        
        let finalAgentConfig = searchParams?.get('agentConfig') || null;
        if (!finalAgentConfig || !allAgentSets[finalAgentConfig]) {
            finalAgentConfig = defaultAgentSetKey;
            const url = new URL(window.location.toString());
            url.searchParams.set('agentConfig', finalAgentConfig);
            window.location.replace(url.toString());
            return;
        }

        const agents = allAgentSets[finalAgentConfig];
        const agentKeyToUse = agents[0]?.name || '';

        setSelectedAgentName(agentKeyToUse);
        // @ts-ignore
        setSelectedAgentConfigSet(agents);
    }, [searchParams, isClient]);

    useEffect(() => {
        if (selectedAgentName && sessionStatus === 'DISCONNECTED') {
            connectToRealtime();
        }
    }, [selectedAgentName]);

    useEffect(() => {
        if (sessionStatus === 'CONNECTED' && selectedAgentConfigSet && selectedAgentName) {
            const currentAgent = selectedAgentConfigSet.find((a) => a.name === selectedAgentName);
            addTranscriptBreadcrumb(`Agent: ${selectedAgentName}`, currentAgent);
            updateSession(true);
        }
    }, [selectedAgentConfigSet, selectedAgentName, sessionStatus]);

    useEffect(() => {
        if (sessionStatus === 'CONNECTED') {
            console.log(`updatingSession, isPTTACtive=${isPTTActive} sessionStatus=${sessionStatus}`);
            updateSession();
        }
    }, [isPTTActive]);

    const fetchEphemeralKey = async (): Promise<string | null> => {
        logClientEvent({ url: '/session' }, 'fetch_session_token_request');
        const tokenResponse = await fetch('/api/session');
        const data = await tokenResponse.json();
        logServerEvent(data, 'fetch_session_token_response');

        if (!data.client_secret?.value) {
            logClientEvent(data, 'error.no_ephemeral_key');
            console.error('No ephemeral key provided by the server');
            setSessionStatus('DISCONNECTED');
            return null;
        }

        return data.client_secret.value;
    };

    const connectToRealtime = async () => {
        if (sessionStatus !== 'DISCONNECTED') return;
        setSessionStatus('CONNECTING');

        try {
            const EPHEMERAL_KEY = await fetchEphemeralKey();
            if (!EPHEMERAL_KEY) {
                return;
            }

            if (!audioElementRef.current) {
                audioElementRef.current = document.createElement('audio');
            }
            audioElementRef.current.autoplay = isAudioPlaybackEnabled;

            const { pc, dc } = await createRealtimeConnection(EPHEMERAL_KEY, audioElementRef);
            pcRef.current = pc;
            dcRef.current = dc;

            dc.addEventListener('open', () => {
                logClientEvent({}, 'data_channel.open');
            });
            dc.addEventListener('close', () => {
                logClientEvent({}, 'data_channel.close');
            });
            dc.addEventListener('error', (err: any) => {
                logClientEvent({ error: err }, 'data_channel.error');
            });
            dc.addEventListener('message', (e: MessageEvent) => {
                handleServerEventRef.current(JSON.parse(e.data));
            });

            setDataChannel(dc);
        } catch (err) {
            console.error('Error connecting to realtime:', err);
            setSessionStatus('DISCONNECTED');
        }
    };

    const disconnectFromRealtime = () => {
        if (pcRef.current) {
            pcRef.current.getSenders().forEach((sender) => {
                if (sender.track) {
                    sender.track.stop();
                }
            });

            pcRef.current.close();
            pcRef.current = null;
        }
        setDataChannel(null);
        setSessionStatus('DISCONNECTED');
        setIsPTTUserSpeaking(false);

        logClientEvent({}, 'disconnected');
    };

    const sendSimulatedUserMessage = (text: string) => {
        const id = uuidv4().slice(0, 32);
        addTranscriptMessage(id, 'user', text, true);

        sendClientEvent(
            {
                type: 'conversation.item.create',
                item: {
                    id,
                    type: 'message',
                    role: 'user',
                    content: [{ type: 'input_text', text }]
                }
            },
            '(simulated user text message)'
        );
        sendClientEvent({ type: 'response.create' }, '(trigger response after simulated user text message)');
    };

    const updateSession = (shouldTriggerResponse: boolean = false) => {
        sendClientEvent({ type: 'input_audio_buffer.clear' }, 'clear audio buffer on session update');

        const currentAgent = selectedAgentConfigSet?.find((a) => a.name === selectedAgentName);

        // Check if PTT is active and set turn detection accordingly
        const turnDetection = isPTTActive
            ? null
            : {
                  type: 'server_vad',
                  threshold: 0.5,
                  prefix_padding_ms: 300,
                  silence_duration_ms: 200,
                  create_response: true
              };

        const instructions = currentAgent?.instructions || '';
        const tools = currentAgent?.tools || [];

        // Update session with the selected agent's instructions and tools
        const sessionUpdateEvent = {
            type: 'session.update',
            session: {
                modalities: ['text', 'audio'],
                instructions,
                voice: process.env.REACT_APP_VOICE || 'ash', // Default to 'coral'
                input_audio_format: process.env.REACT_APP_INPUT_AUDIO_FORMAT || 'pcm16', // Default to 'pcm16'
                output_audio_format: process.env.REACT_APP_OUTPUT_AUDIO_FORMAT || 'pcm16', // Default to 'pcm16'
                input_audio_transcription: {
                    model: process.env.REACT_APP_INPUT_AUDIO_TRANSCRIPTION_MODEL || 'whisper-1' // Default to 'whisper-1'
                },
                turn_detection: turnDetection,
                tools
            }
        };

        sendClientEvent(sessionUpdateEvent);

        if (shouldTriggerResponse) {
            sendSimulatedUserMessage('Tell me what you need?');
        }
    };

    // Cancel assistant speech if user interrupts
    // This is a workaround for the current implementation of the assistant's speech synthesis
    const cancelAssistantSpeech = async () => {
        const mostRecentAssistantMessage = [...transcriptItems].reverse().find((item) => item.role === 'assistant');

        if (!mostRecentAssistantMessage) {
            console.warn("can't cancel, no recent assistant message found");
            return;
        }
        if (mostRecentAssistantMessage.status === 'DONE') {
            console.log('No truncation needed, message is DONE');
            return;
        }

        sendClientEvent({
            type: 'conversation.item.truncate',
            item_id: mostRecentAssistantMessage?.itemId,
            content_index: 0,
            audio_end_ms: Date.now() - mostRecentAssistantMessage.createdAtMs
        });
        sendClientEvent({ type: 'response.cancel' }, '(cancel due to user interruption)');
    };

    // Handle sending text message
    const handleSendTextMessage = () => {
        if (!userText.trim()) return;
        cancelAssistantSpeech();

        sendClientEvent(
            {
                type: 'conversation.item.create',
                item: {
                    type: 'message',
                    role: 'user',
                    content: [{ type: 'input_text', text: userText.trim() }]
                }
            },
            '(send user text message)'
        );
        setUserText('');

        sendClientEvent({ type: 'response.create' }, 'trigger response');
    };

    const handleTalkButtonDown = () => {
        if (sessionStatus !== 'CONNECTED' || dataChannel?.readyState !== 'open') return;
        cancelAssistantSpeech();

        setIsPTTUserSpeaking(true);
        sendClientEvent({ type: 'input_audio_buffer.clear' }, 'clear PTT buffer');
    };

    const handleTalkButtonUp = () => {
        if (sessionStatus !== 'CONNECTED' || dataChannel?.readyState !== 'open' || !isPTTUserSpeaking) return;

        setIsPTTUserSpeaking(false);
        sendClientEvent({ type: 'input_audio_buffer.commit' }, 'commit PTT');
        sendClientEvent({ type: 'response.create' }, 'trigger response PTT');
    };

    const onToggleConnection = () => {
        if (sessionStatus === 'CONNECTED' || sessionStatus === 'CONNECTING') {
            disconnectFromRealtime();
            setSessionStatus('DISCONNECTED');
        } else {
            connectToRealtime();
        }
    };

    const handleAgentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newAgentConfig = e.target.value;
        const url = new URL(window.location.toString());
        url.searchParams.set('agentConfig', newAgentConfig);
        window.location.replace(url.toString());
    };

    const handleSelectedAgentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newAgentName = e.target.value;
        setSelectedAgentName(newAgentName);
    };

    // Client-side localStorage initialization
    useEffect(() => {
        if (!isClient) return;

        if (typeof window !== 'undefined') {
            const storedPushToTalkUI = localStorage.getItem('pushToTalkUI');
            if (storedPushToTalkUI) {
                setIsPTTActive(storedPushToTalkUI === 'true');
            }
            const storedAudioPlaybackEnabled = localStorage.getItem('audioPlaybackEnabled');
            if (storedAudioPlaybackEnabled) {
                setIsAudioPlaybackEnabled(storedAudioPlaybackEnabled === 'true');
            }
        }
    }, [isClient]);

    // Persist PTT state to localStorage
    useEffect(() => {
        if (!isClient) return;
        
        if (typeof window !== 'undefined') {
            localStorage.setItem('pushToTalkUI', isPTTActive.toString());
        }
    }, [isPTTActive, isClient]);

    // Persist events pane state to localStorage
    useEffect(() => {
        if (!isClient) return;
        
        if (typeof window !== 'undefined') {
            localStorage.setItem('logsExpanded', isEventsPaneExpanded.toString());
        }
    }, [isEventsPaneExpanded, isClient]);

    // Persist audio playback state to localStorage
    useEffect(() => {
        if (!isClient) return;
        
        if (typeof window !== 'undefined') {
            localStorage.setItem('audioPlaybackEnabled', isAudioPlaybackEnabled.toString());
        }
    }, [isAudioPlaybackEnabled, isClient]);

    useEffect(() => {
        if (audioElementRef.current) {
            if (isAudioPlaybackEnabled) {
                audioElementRef.current.play().catch((err) => {
                    console.warn('Autoplay may be blocked by browser:', err);
                });
            } else {
                audioElementRef.current.pause();
            }
        }
    }, [isAudioPlaybackEnabled]);

    // Don't render until client-side hydration is complete
    if (!isClient) {
        return (
            <div className="flex h-[95vh] flex-col bg-white dark:bg-zinc-900">
                <div className="p-5 border-b">
                    <div className="animate-pulse">
                        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
                    </div>
                </div>
                <div className="flex-1 p-4">
                    <div className="animate-pulse space-y-4">
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-64"></div>
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-48"></div>
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-56"></div>
                    </div>
                </div>
            </div>
        );
    }

    const agentSetKey = searchParams?.get('agentConfig') || 'default';

    return (
        <div className='relative flex h-[95vh] flex-col bg-white text-base text-foreground dark:bg-zinc-900'>
            <div className='flex items-center justify-between p-5 text-lg font-semibold'>
                <div className='flex items-center'>
                    <div onClick={() => window.location.reload()} style={{ cursor: 'pointer' }}>
                        <Image
                            src='/logo/neroflow-icon.png'
                            alt='NeuroFlo Logo'
                            width={24}
                            height={24}
                            className='mr-2'
                        />
                    </div>
                    <div>
                        NeuroFlo <span className='text-muted-foreground'>RealTime</span>
                    </div>
                </div>

                {/* Usecase and Agent Selection with Connection Status */}
                <div className='flex items-center'>
                    {/* Connection Status Dot and Label */}
                    <div className='flex items-center space-x-2'>
                        <span
                            className={`inline-block h-2 w-2 rounded-full ${
                                sessionStatus === 'CONNECTED'
                                    ? 'bg-green-500'
                                    : sessionStatus === 'CONNECTING'
                                      ? 'bg-yellow-500'
                                      : 'bg-red-500'
                            }`}
                            title={`Status: ${
                                sessionStatus === 'CONNECTED'
                                    ? 'Connected'
                                    : sessionStatus === 'CONNECTING'
                                      ? 'Connecting...'
                                      : 'Disconnected'
                            }`}></span>
                        <span className='text-xs text-gray-500'>
                            {sessionStatus === 'CONNECTED'
                                ? 'Connected'
                                : sessionStatus === 'CONNECTING'
                                  ? 'Connecting...'
                                  : 'Disconnected'}
                        </span>
                    </div>

                    {/* Use Case Dropdown */}
                    <label className='ml-4 mr-2 flex items-center gap-1 text-base font-medium'>Use Case</label>
                    <div className='relative inline-block'>
                        <select
                            value={agentSetKey}
                            onChange={handleAgentChange}
                            className='cursor-pointer appearance-none rounded-md border border-border bg-muted px-2 py-1 pr-8 text-base text-foreground focus:outline-none focus:ring-1 focus:ring-ring'>
                            {Object.keys(allAgentSets).map((agentKey) => (
                                <option key={agentKey} value={agentKey} className='bg-background text-foreground'>
                                    {agentKey}
                                </option>
                            ))}
                        </select>
                        <div className='pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2 text-muted-foreground'>
                            <svg className='h-4 w-4' viewBox='0 0 20 20' fill='currentColor'>
                                <path
                                    fillRule='evenodd'
                                    d='M5.23 7.21a.75.75 0 011.06.02L10 10.44l3.71-3.21a.75.75 0 111.04 1.08l-4.25 3.65a.75.75 0 01-1.04 0L5.21 8.27a.75.75 0 01.02-1.06z'
                                    clipRule='evenodd'
                                />
                            </svg>
                        </div>
                    </div>

                    {/* Agent Selection Dropdown */}
                    {agentSetKey && (
                        <div className='ml-6 flex items-center'>
                            <label className='mr-2 flex items-center gap-1 text-base font-medium'>Agent</label>
                            <div className='relative inline-block'>
                                <select
                                    value={selectedAgentName}
                                    onChange={handleSelectedAgentChange}
                                    className='cursor-pointer appearance-none rounded-md border border-border bg-muted px-2 py-1 pr-8 text-base text-foreground focus:outline-none focus:ring-1 focus:ring-ring'>
                                    {selectedAgentConfigSet?.map((agent) => (
                                        <option
                                            key={agent.name}
                                            value={agent.name}
                                            className='bg-background text-foreground'>
                                            {agent.name}
                                        </option>
                                    ))}
                                </select>
                                <div className='pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2 text-muted-foreground'>
                                    <svg className='h-4 w-4' viewBox='0 0 20 20' fill='currentColor'>
                                        <path
                                            fillRule='evenodd'
                                            d='M5.23 7.21a.75.75 0 011.06.02L10 10.44l3.71-3.21a.75.75 0 111.04 1.08l-4.25 3.65a.75.75 0 01-1.04 0L5.21 8.27a.75.75 0 01.02-1.06z'
                                            clipRule='evenodd'
                                        />
                                    </svg>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className='relative z-40 flex flex-1 gap-2 overflow-hidden px-2'>
                <div className='relative flex flex-1'>
                    {/* Pass props to Transcript */}
                    <Transcript
                        userText={userText}
                        setUserText={setUserText}
                        onSendMessage={handleSendTextMessage}
                        canSend={sessionStatus === 'CONNECTED' && dcRef.current?.readyState === 'open'}
                        isEventsPaneExpanded={isEventsPaneExpanded} // Pass state
                        setIsEventsPaneExpanded={setIsEventsPaneExpanded} // Pass toggle function
                    />
                </div>
                {/* Logs panel */}
                <Events isExpanded={isEventsPaneExpanded} />
            </div>

            <BottomToolbar
                sessionStatus={sessionStatus}
                onToggleConnection={onToggleConnection}
                isPTTActive={isPTTActive}
                setIsPTTActive={setIsPTTActive}
                isPTTUserSpeaking={isPTTUserSpeaking}
                handleTalkButtonDown={handleTalkButtonDown}
                handleTalkButtonUp={handleTalkButtonUp}
                isEventsPaneExpanded={isEventsPaneExpanded}
                setIsEventsPaneExpanded={setIsEventsPaneExpanded}
                isAudioPlaybackEnabled={isAudioPlaybackEnabled}
                setIsAudioPlaybackEnabled={setIsAudioPlaybackEnabled}
            />
        </div>
    );
}

export default RealTimeChat;
