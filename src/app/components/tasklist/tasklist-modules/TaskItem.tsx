'use client';

import React, { useState } from 'react';
import { Task } from '../../../../types/task';
import { TaskDisplay } from './TaskDisplay';
import { TaskEditForm } from './TaskEditForm';

interface TaskItemProps {
  task: Task;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (id: string, text: string, codeBlock?: { language: string; code: string }, richText?: string, optional?: boolean) => void;
  onDuplicate: (id: string) => void;
  onCheckAllSubTasks?: (headlineId: string) => void;
  tasks: Task[];
  isSelected?: boolean;
  onSelect?: (id: string) => void;
}

export function TaskItem({ task, onToggle, onDelete, onEdit, onDuplicate, onCheckAllSubTasks, tasks, isSelected, onSelect }: TaskItemProps) {
  const [isEditing, setIsEditing] = useState(false);

  if (isEditing) {
    return (
      <TaskEditForm
        task={task}
        onSave={(text, codeBlock, richText, optional) => {
          onEdit(task.id, text, codeBlock, richText, optional);
          setIsEditing(false);
        }}
        onCancel={() => setIsEditing(false)}
      />
    );
  }

  return (
    <TaskDisplay
      task={task}
      onToggle={onToggle}
      onEdit={() => setIsEditing(true)}
      onDelete={onDelete}
      onDuplicate={onDuplicate}
      onCheckAllSubTasks={onCheckAllSubTasks}
      tasks={tasks}
      isSelected={isSelected}
      onSelect={onSelect}
    />
  );
}