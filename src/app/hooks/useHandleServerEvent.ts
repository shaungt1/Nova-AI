"use client";

import { useRef } from 'react';
import { useEvent } from '@/app/contexts/EventContext';
import { useTranscript } from '@/app/contexts/TranscriptContext';
import { AgentConfig, ServerEvent, SessionStatus } from '@/app/types';


/**
 * useHandleServerEvent.ts
 * 
 * Provides a custom React hook for handling server-sent events in a conversational AI application.
 * This hook processes various server event types, updates the application state, and interacts
 * with other parts of the system, such as the transcript and event contexts.
 * 
 * ## Imports:
 * - React: Core React APIs for managing state and refs.
 * - ServerEvent, SessionStatus, AgentConfig: Type definitions for server events, session status, and agent configurations.
 * - useTranscript: Context hook for managing conversation transcripts.
 * - useEvent: Context hook for logging server events.
 * 
 * ## Exports:
 * - useHandleServerEvent: Custom hook to process server events and update the application state.
 * 
 * ## Key Features:
 * - Handles server events such as session creation, conversation updates, and function calls.
 * - Updates the transcript with new messages, transcription updates, and statuses.
 * - Executes agent-specific logic for function calls and handles agent transfers.
 * - Provides a `useRef` object to ensure the latest event handler function is always used.
 * 
 * ## Usage:
 * This hook is designed to be used in components that need to process server events and update
 * the application state accordingly. It requires several parameters, including methods to update
 * session status, manage agent configurations, and send client events.
 * 
 * ## Example:
 * ```typescript
 * const handleServerEventRef = useHandleServerEvent({
 *   setSessionStatus,
 *   selectedAgentName,
 *   selectedAgentConfigSet,
 *   sendClientEvent,
 *   setSelectedAgentName,
 * });
 * 
 * handleServerEventRef.current(serverEvent);
 * ```
 */

/**
 * Parameters required by the `useHandleServerEvent` hook.
 * 
 * @interface UseHandleServerEventParams
 * @property {Function} setSessionStatus - Updates the session status (e.g., "CONNECTED").
 * @property {string} selectedAgentName - Name of the currently selected agent.
 * @property {AgentConfig[] | null} selectedAgentConfigSet - Configuration set for all available agents.
 * @property {Function} sendClientEvent - Sends events back to the server.
 * @property {Function} setSelectedAgentName - Updates the selected agent's name.
 * @property {boolean} [shouldForceResponse] - Optional flag for enforcing specific behavior.
 */

/**
 * Custom hook to handle server events and update the application state.
 * 
 * @param {UseHandleServerEventParams} params - Parameters required by the hook.
 * @returns {React.MutableRefObject<Function>} A ref pointing to the event handler function.
 */




/**
 * Parameters required by the `useHandleServerEvent` hook.
 */
export interface UseHandleServerEventParams {
  setSessionStatus: (status: SessionStatus) => void; // Updates the session status.
  selectedAgentName: string; // Name of the currently selected agent.
  selectedAgentConfigSet: AgentConfig[] | null; // Configuration set for all agents.
  sendClientEvent: (eventObj: any, eventNameSuffix?: string) => void; // Sends events to the server.
  setSelectedAgentName: (name: string) => void; // Updates the selected agent's name.
  shouldForceResponse?: boolean; // Optional flag for enforcing specific behavior.
}

/**
 * Custom hook to handle server events and update the application state.
 */
export function useHandleServerEvent({
  setSessionStatus,
  selectedAgentName,
  selectedAgentConfigSet,
  sendClientEvent,
  setSelectedAgentName,
}: UseHandleServerEventParams) {
  // Transcript context methods for managing conversation data.
  const {
    transcriptItems,
    addTranscriptBreadcrumb,
    addTranscriptMessage,
    updateTranscriptMessage,
    updateTranscriptItemStatus,
  } = useTranscript();

  // Event context method for logging server events.
  const { logServerEvent } = useEvent();

  /**
   * Handles server events related to function calls.
   * Executes agent-specific logic or handles special cases like transferring agents.
   */
  const handleFunctionCall = async (functionCallParams: {
    name: string;
    call_id?: string;
    arguments: string;
  }) => {
    const args = JSON.parse(functionCallParams.arguments); // Parse function call arguments.
    const currentAgent = selectedAgentConfigSet?.find(
      (a) => a.name === selectedAgentName
    );

    addTranscriptBreadcrumb(`function call: ${functionCallParams.name}`, args);

    if (currentAgent?.toolLogic?.[functionCallParams.name]) {
      // Execute agent-specific logic.
      const fn = currentAgent.toolLogic[functionCallParams.name];
      const fnResult = await fn(args, transcriptItems);
      addTranscriptBreadcrumb(
        `function call result: ${functionCallParams.name}`,
        fnResult
      );

      // Send the result back to the server.
      sendClientEvent({
        type: "conversation.item.create",
        item: {
          type: "function_call_output",
          call_id: functionCallParams.call_id,
          output: JSON.stringify(fnResult),
        },
      });
      sendClientEvent({ type: "response.create" });
    } else if (functionCallParams.name === "transferAgents") {
      // Handle agent transfer logic.
      const destinationAgent = args.destination_agent;
      const newAgentConfig =
        selectedAgentConfigSet?.find((a) => a.name === destinationAgent) || null;
      if (newAgentConfig) {
        setSelectedAgentName(destinationAgent);
      }
      const functionCallOutput = {
        destination_agent: destinationAgent,
        did_transfer: !!newAgentConfig,
      };
      sendClientEvent({
        type: "conversation.item.create",
        item: {
          type: "function_call_output",
          call_id: functionCallParams.call_id,
          output: JSON.stringify(functionCallOutput),
        },
      });
      addTranscriptBreadcrumb(
        `function call: ${functionCallParams.name} response`,
        functionCallOutput
      );
    } else {
      // Fallback for unrecognized function calls.
      const simulatedResult = { result: true };
      addTranscriptBreadcrumb(
        `function call fallback: ${functionCallParams.name}`,
        simulatedResult
      );

      sendClientEvent({
        type: "conversation.item.create",
        item: {
          type: "function_call_output",
          call_id: functionCallParams.call_id,
          output: JSON.stringify(simulatedResult),
        },
      });
      sendClientEvent({ type: "response.create" });
    }
  };

  /**
   * Handles various types of server events and updates the application state.
   */
  const handleServerEvent = (serverEvent: ServerEvent) => {
    logServerEvent(serverEvent); // Log the server event for debugging.

    switch (serverEvent.type) {
      case "session.created": {
        // Handle session creation event.
        if (serverEvent.session?.id) {
          setSessionStatus("CONNECTED");
          addTranscriptBreadcrumb(
            `session.id: ${
              serverEvent.session.id
            }\nStarted at: ${new Date().toLocaleString()}`
          );
        }
        break;
      }

      case "conversation.item.created": {
        // Handle new conversation item creation.
        let text =
          serverEvent.item?.content?.[0]?.text ||
          serverEvent.item?.content?.[0]?.transcript ||
          "";
        const role = serverEvent.item?.role as "user" | "assistant";
        const itemId = serverEvent.item?.id;

        if (itemId && transcriptItems.some((item) => item.itemId === itemId)) {
          break; // Skip if the item already exists.
        }

        if (itemId && role) {
          if (role === "user" && !text) {
            text = "[Transcribing...]"; // Placeholder for user input.
          }
          addTranscriptMessage(itemId, role, text);
        }
        break;
      }

      case "conversation.item.input_audio_transcription.completed": {
        // Handle completed audio transcription.
        const itemId = serverEvent.item_id;
        const finalTranscript =
          !serverEvent.transcript || serverEvent.transcript === "\n"
            ? "[inaudible]"
            : serverEvent.transcript;
        if (itemId) {
          updateTranscriptMessage(itemId, finalTranscript, false);
        }
        break;
      }

      case "response.audio_transcript.delta": {
        // Handle incremental audio transcription updates.
        const itemId = serverEvent.item_id;
        const deltaText = serverEvent.delta || "";
        if (itemId) {
          updateTranscriptMessage(itemId, deltaText, true);
        }
        break;
      }

      case "response.done": {
        // Handle completed server response.
        if (serverEvent.response?.output) {
          serverEvent.response.output.forEach((outputItem) => {
            if (
              outputItem.type === "function_call" &&
              outputItem.name &&
              outputItem.arguments
            ) {
              handleFunctionCall({
                name: outputItem.name,
                call_id: outputItem.call_id,
                arguments: outputItem.arguments,
              });
            }
          });
        }
        break;
      }

      case "response.output_item.done": {
        // Mark a transcript item as "DONE".
        const itemId = serverEvent.item?.id;
        if (itemId) {
          updateTranscriptItemStatus(itemId, "DONE");
        }
        break;
      }

      default:
        break; // Ignore unrecognized event types.
    }
  };

  // Use a ref to ensure the latest `handleServerEvent` function is always used.
  const handleServerEventRef = useRef(handleServerEvent);
  handleServerEventRef.current = handleServerEvent;

  return handleServerEventRef; // Return the ref to the event handler function.
}