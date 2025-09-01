'use client';

import React, { useState } from 'react';
import { ArrowLeft, Save, Upload } from 'lucide-react';
import { TaskInput } from '../tasklist-modules/TaskInput';
import { TaskList } from '../tasklist-modules/TaskList';
import { Task } from '../../../../types/task';
import { saveTaskList } from '../../../../services/taskListService';

interface ListEditorProps {
  list?: {
    id?: string;
    name: string;
    data: Task[];
    is_example?: boolean;
  };
  onSave: () => void;
  onCancel: () => void;
  onError: (error: string) => void;
}

export function ListEditor({ list, onSave, onCancel, onError }: ListEditorProps) {
  const [name, setName] = useState(list?.name || '');
  const [tasks, setTasks] = useState<Task[]>(list?.data || []);
  const [isExample, setIsExample] = useState(list?.is_example || false);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      onError('Please enter a name for the list');
      return;
    }

    if (tasks.length === 0) {
      onError('Please add at least one task to the list');
      return;
    }

    setSaving(true);
    try {
      await saveTaskList(name, tasks, isExample);
      onSave();
    } catch (error) {
      console.error('Error saving list:', error);
      onError('Failed to save task list');
    } finally {
      setSaving(false);
    }
  };

  const addTask = (
    text: string,
    isHeadline: boolean,
    codeBlock?: { language: string; code: string },
    richText?: string,
    optional?: boolean
  ) => {
    const newTask: Task = {
      id: crypto.randomUUID(),
      text,
      completed: false,
      isHeadline,
      createdAt: new Date(),
      codeBlock,
      richText,
      optional
    };
    setTasks(prev => [...prev, newTask]);
  };

  const toggleTask = (id: string) => {
    setTasks(prev =>
      prev.map((task) =>
        task.id === id ? { ...task, completed: !task.completed } : task
      )
    );
  };

  const deleteTask = (id: string) => {
    setTasks(prev => prev.filter((task) => task.id !== id));
  };

  const editTask = (
    id: string,
    text: string,
    codeBlock?: { language: string; code: string },
    richText?: string,
    optional?: boolean
  ) => {
    setTasks(prev =>
      prev.map((task) =>
        task.id === id ? { ...task, text, codeBlock, richText, optional } : task
      )
    );
  };

  const duplicateTask = (id: string) => {
    const taskIndex = tasks.findIndex(task => task.id === id);
    if (taskIndex !== -1) {
      const taskToDuplicate = tasks[taskIndex];
      const duplicatedTask: Task = {
        ...taskToDuplicate,
        id: crypto.randomUUID(),
        completed: false,
        createdAt: new Date()
      };
      
      const newTasks = [...tasks];
      newTasks.splice(taskIndex + 1, 0, duplicatedTask);
      setTasks(newTasks);
    }
  };

  const reorderTasks = (newTasks: Task[]) => {
    setTasks(newTasks);
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const content = e.target?.result as string;
            const parsed = JSON.parse(content);
            if (parsed.data) {
              setTasks(parsed.data);
            }
          } catch (error) {
            console.error('Error parsing imported file:', error);
          }
        };
        reader.readAsText(file);
      }
    };
    
    input.click();
  };  

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={onCancel}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                  title="Back to list"
                >
                  <ArrowLeft size={24} />
                </button>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter list name"
                  className="text-2xl font-semibold text-gray-900 border-none focus:outline-none focus:ring-0 bg-transparent"
                />
              </div>
              <div className="flex items-center gap-4">
                <button
                  onClick={handleImport}
                  className="import-export-button flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
                  title="Import tasks"
                >
                  <Upload size={16} />
                  Import
                </button>                
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={isExample}
                    onChange={(e) => setIsExample(e.target.checked)}
                    className="w-4 h-4 text-blue-500 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Save as example</span>
                </label>
                <button
                  onClick={handleSave}
                  disabled={saving || !name.trim() || tasks.length === 0}
                  className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors disabled:opacity-50"
                >
                  <Save size={16} />
                  {saving ? 'Saving...' : 'Save List'}
                </button>
              </div>
            </div>
          </div>

          <div className="p-6">
            <TaskInput onAddTask={addTask} />
            
            {tasks.length > 0 && (
              <div className="mt-8">
                <TaskList
                  tasks={tasks}
                  onToggle={toggleTask}
                  onDelete={deleteTask}
                  onEdit={editTask}
                  onDuplicate={duplicateTask}
                  onReorder={reorderTasks}
                  onCheckAllSubTasks={() => {}}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}