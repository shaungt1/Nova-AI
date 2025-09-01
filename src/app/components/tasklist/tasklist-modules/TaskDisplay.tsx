'use client';

import React, { useState } from 'react';
import { Check, Trash2, Edit2, CheckSquare, AlignLeft, Copy } from 'lucide-react';
import { Task } from '../../../../types/task';
import { CodeBlock } from '../code-block/CodeBlock';
import { TaskText } from './TaskText';
import { DescriptionModal } from '../task-modals/DescriptionModal';

interface TaskDisplayProps {
  task: Task;
  onToggle: (id: string) => void;
  onEdit: () => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onCheckAllSubTasks?: (headlineId: string) => void;
  tasks: Task[];
  isSelected?: boolean;
  onSelect?: (id: string) => void;
}

export function TaskDisplay({ task, onToggle, onEdit, onDelete, onDuplicate, onCheckAllSubTasks, tasks, isSelected, onSelect }: TaskDisplayProps) {
  const [showDescriptionModal, setShowDescriptionModal] = useState(false);

  if (task.isHeadline) {
    const isAllSubTasksCompleted = (tasks: Task[]) => {
      let allCompleted = true;
      for (let i = 0; i < tasks.length; i++) {
        const t = tasks[i];
        if (t.isHeadline) continue;
        let j = i - 1;
        while (j >= 0 && !tasks[j].isHeadline) {
          j--;
        }
        if (j >= 0 && tasks[j].id === task.id) {
          if (!t.completed) {
            allCompleted = false;
            break;
          }
        }
      }
      return allCompleted;
    };

    const handleClick = (e: React.MouseEvent) => {
      if (e.target === e.currentTarget || (e.target as Element).closest('.task-content')) {
        onSelect?.(isSelected ? '' : task.id);
      }
    };

    return (
      <div 
        className={`p-4 rounded-lg shadow-sm group cursor-pointer transition-colors ${
          isSelected ? 'bg-yellow-300' : 'bg-white hover:bg-gray-50'
        }`}
        onClick={handleClick}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => onCheckAllSubTasks?.(task.id)}
            className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
              onCheckAllSubTasks && isAllSubTasksCompleted(tasks) ? 'bg-green-500 border-green-500' : 'border-gray-300 hover:border-green-500'
            }`}
          >
            {onCheckAllSubTasks && isAllSubTasksCompleted(tasks) && <Check size={14} className="text-white" />}
          </button>
          <h2 className="flex-1 text-xl font-semibold text-gray-900 task-content">
            {task.text}
            {task.optional && (
              <span className="ml-2 px-2 py-1 text-xs font-semibold text-gray-600 bg-yellow-200 rounded-md optional-badge align-middle">
                Optional
              </span>
            )}
          </h2>
          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            {task.richText && (
              <button
                onClick={() => setShowDescriptionModal(true)}
                className="text-blue-400 hover:text-blue-500 transition-colors"
                title="Show detailed description"
              >
                <AlignLeft size={18} />
              </button>
            )}
            <button
              onClick={() => onDuplicate(task.id)}
              className="text-gray-400 hover:text-blue-500 transition-colors"
              title="Duplicate task"
            >
              <Copy size={18} />
            </button>
            <button
              onClick={() => onEdit()}
              className="text-gray-400 hover:text-blue-500 transition-colors"
            >
              <Edit2 size={18} />
            </button>
            <button
              onClick={() => onDelete(task.id)}
              className="text-gray-400 hover:text-red-500 transition-colors"
            >
              <Trash2 size={18} />
            </button>
            {onCheckAllSubTasks && (
              <button
                onClick={() => onCheckAllSubTasks(task.id)}
                className="text-gray-400 hover:text-green-500 transition-colors"
                title="Check all subtasks"
              >
                <CheckSquare size={18} />
              </button>
            )}
          </div>
        </div>
        {showDescriptionModal && (
          <DescriptionModal
            content={task.richText || ''}
            onClose={() => setShowDescriptionModal(false)}
          />
        )}
      </div>
    );
  }

  const handleClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget || (e.target as Element).closest('.task-content')) {
      onSelect?.(isSelected ? '' : task.id);
    }
  };

  return (
    <div 
      className={`p-4 rounded-lg shadow-sm group cursor-pointer transition-colors ${
        isSelected ? 'bg-yellow-300' : 'bg-white hover:bg-gray-50'
      }`}
      onClick={handleClick}
    >
      <div className="flex items-start gap-3">
        <button
          onClick={() => onToggle(task.id)}
          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
            task.completed ? 'bg-green-500 border-green-500' : 'border-gray-300 hover:border-green-500'
          }`}
        >
          {task.completed && <Check size={14} className="text-white" />}
        </button>
        <div className="flex-1 overflow-x-auto task-content">
          <div className="flex items-center gap-2">
            <TaskText text={task.text} completed={task.completed} />
            {task.optional && (
              <span className="ml-2 px-2 py-1 text-xs font-semibold text-gray-600 bg-yellow-200 rounded-md optional-badge align-middle">
                Optional
              </span>
            )}
            {task.richText && (
              <button
                onClick={() => setShowDescriptionModal(true)}
                className="text-blue-400 hover:text-blue-500 transition-colors"
                title="Show detailed description"
              >
                <AlignLeft size={18} />
              </button>
            )}
          </div>
          {task.codeBlock && task.codeBlock.code && (
            <div className="mt-2">
              <CodeBlock
                code={task.codeBlock.code}
                language={task.codeBlock.language}
              />
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onDuplicate(task.id)}
            className="text-gray-400 hover:text-blue-500 transition-colors"
            title="Duplicate task"
          >
            <Copy size={18} />
          </button>
          <button
            onClick={() => onEdit()}
            className="text-gray-400 hover:text-blue-500 transition-colors"
          >
            <Edit2 size={18} />
          </button>
          <button
            onClick={() => onDelete(task.id)}
            className="text-gray-400 hover:text-red-500 transition-colors"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>
      {showDescriptionModal && (
        <DescriptionModal
          content={task.richText || ''}
          onClose={() => setShowDescriptionModal(false)}
        />
      )}
    </div>
  );
}