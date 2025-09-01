'use client';

import React from 'react';

import { SessionStatus } from '@/app/types';
import { Dock, DockIcon } from '@/app/components/magicui/dock';
import { Separator } from '@/app/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/app/components/ui/tooltip';
import { cn } from '@/lib/utils';

import { FileText, LogIn, LogOut, Mic, Mic2, MicOff, MicOffIcon, Volume2, VolumeX } from 'lucide-react';

interface BottomToolbarProps {
    sessionStatus: SessionStatus;
    onToggleConnection: () => void;
    isPTTActive: boolean;
    setIsPTTActive: (val: boolean) => void;
    isPTTUserSpeaking: boolean;
    handleTalkButtonDown: () => void;
    handleTalkButtonUp: () => void;
    isEventsPaneExpanded: boolean;
    setIsEventsPaneExpanded: (val: boolean) => void;
    isAudioPlaybackEnabled: boolean;
    setIsAudioPlaybackEnabled: (val: boolean) => void;
}

function BottomToolbar({
    sessionStatus,
    onToggleConnection,
    isPTTActive,
    setIsPTTActive,
    isPTTUserSpeaking,
    handleTalkButtonDown,
    handleTalkButtonUp,
    isEventsPaneExpanded,
    setIsEventsPaneExpanded,
    isAudioPlaybackEnabled,
    setIsAudioPlaybackEnabled
}: BottomToolbarProps) {
    const isConnected = sessionStatus === 'CONNECTED';
    const isConnecting = sessionStatus === 'CONNECTING';

    function getConnectionButtonLabel() {
        if (isConnected) return 'Disconnect';
        if (isConnecting) return 'Connecting...';
        return 'Connect';
    }

    function getConnectionIconClasses() {
        const baseClasses = 'size-6';
        const cursorClass = isConnecting ? 'cursor-not-allowed' : 'cursor-pointer';
        const colorClass = isConnected ? 'text-red-600' : 'text-green-600';

        return cn(baseClasses, cursorClass, colorClass);
    }

    return (
        <TooltipProvider>
            <div className='mx-auto realitive z-10 flex w-full max-w-min flex-col items-center justify-center p-2'>
                <Dock direction='middle' className='w-full max-w-3xl border-solid bg-zinc-50 dark:bg-zinc-900'>
                    {/* Connect/Disconnect Icon */}
                    <DockIcon>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                {isConnected ? (
                                    <LogOut
                                        className={getConnectionIconClasses()}
                                        onClick={isConnecting ? undefined : onToggleConnection}
                                        aria-label={getConnectionButtonLabel()}
                                    />
                                ) : (
                                    <LogIn
                                        className={getConnectionIconClasses()}
                                        onClick={isConnecting ? undefined : onToggleConnection}
                                        aria-label={getConnectionButtonLabel()}
                                    />
                                )}
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>{getConnectionButtonLabel()}</p>
                            </TooltipContent>
                        </Tooltip>
                    </DockIcon>

                    <Separator orientation='vertical' className='h-full py-2' />

                    {/* Push to Talk Toggle Icon */}
                    <DockIcon>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                {isPTTActive ? (
                                    <MicOffIcon
                                        className={cn(
                                            'size-6',
                                            isConnected ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'
                                        )}
                                        onClick={isConnected ? () => setIsPTTActive(false) : undefined}
                                        aria-label='Disable Push to Talk'
                                    />
                                ) : (
                                    <Mic2
                                        className={cn(
                                            'size-6',
                                            isConnected ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'
                                        )}
                                        onClick={isConnected ? () => setIsPTTActive(true) : undefined}
                                        aria-label='Enable Push to Talk'
                                    />
                                )}
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>{isPTTActive ? 'Disable Push to Talk' : 'Enable Push to Talk'}</p>
                            </TooltipContent>
                        </Tooltip>
                    </DockIcon>

                    {/* Talk Icon (Visible only when PTT is active) */}
                    {isPTTActive && (
                        <DockIcon>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Mic
                                        className={cn(
                                            'size-6',
                                            isPTTUserSpeaking ? 'text-gray-500' : 'text-current',
                                            'cursor-pointer'
                                        )}
                                        onMouseDown={handleTalkButtonDown}
                                        onMouseUp={handleTalkButtonUp}
                                        onTouchStart={handleTalkButtonDown}
                                        onTouchEnd={handleTalkButtonUp}
                                        aria-label='Hold to Talk'
                                    />
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Hold to Talk</p>
                                </TooltipContent>
                            </Tooltip>
                        </DockIcon>
                    )}

                    <Separator orientation='vertical' className='h-full py-2' />

                    {/* Audio Playback Toggle Icon */}
                    <DockIcon>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                {isAudioPlaybackEnabled ? (
                                    <Volume2
                                        className={cn(
                                            'size-6',
                                            isConnected ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'
                                        )}
                                        onClick={isConnected ? () => setIsAudioPlaybackEnabled(false) : undefined}
                                        aria-label='Disable Audio Playback'
                                    />
                                ) : (
                                    <VolumeX
                                        className={cn(
                                            'size-6',
                                            isConnected ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'
                                        )}
                                        onClick={isConnected ? () => setIsAudioPlaybackEnabled(true) : undefined}
                                        aria-label='Enable Audio Playback'
                                    />
                                )}
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>{isAudioPlaybackEnabled ? 'Disable Audio Playback' : 'Enable Audio Playback'}</p>
                            </TooltipContent>
                        </Tooltip>
                    </DockIcon>

                    <Separator orientation='vertical' className='h-full py-2' />

                    {/* Logs Toggle Icon */}
                    <DockIcon>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <FileText
                                    className='size-6 cursor-pointer'
                                    onClick={() => setIsEventsPaneExpanded(!isEventsPaneExpanded)} // Toggle logs
                                    aria-label={isEventsPaneExpanded ? 'Hide Logs' : 'Show Logs'}
                                />
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>{isEventsPaneExpanded ? 'Hide Logs' : 'Show Logs'}</p>
                            </TooltipContent>
                        </Tooltip>
                    </DockIcon>
                </Dock>
            </div>
        </TooltipProvider>
    );
}

export default BottomToolbar;