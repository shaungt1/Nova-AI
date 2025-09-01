'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { HelpCircle } from 'lucide-react';
import { useSettings } from '@/app/hooks/useSettings';
import { getExampleLists, getTaskLists } from '../../services/taskListService';
import { useTasks } from '@/app/hooks/useTasks';
import { useAuth } from '@/app/hooks/useAuth';
import { TaskHeader } from '@/app/components/tasklist/task-header/TaskHeader';
import { TaskInput } from '@/app/components/tasklist/tasklist-modules/TaskInput';
import { TaskListSection } from '@/app/components/tasklist/tasklist-modules/TaskListSection';
import { Footer } from '@/app/components/Footer';
import { ConfirmationModal } from '@/app/components/tasklist/task-modals/ConfirmationModal';
import { SettingsModal } from '@/app/components/tasklist/task-settings/SettingsModal';
import { HelpModal } from '@/app/components/tasklist/task-modals/HelpModal';
import { ErrorNotification } from '@/app/components/tasklist/task-modals/ErrorNotification';
// @ts-ignore
  import { IntroModal } from '@/app/components/intro-task-helper/IntroModal';
import { Tour } from '@/app/components/tasklist/tour-task-helper/Tour';
import { AuthModal } from '@/app/components/auth/AuthModal';
import { AdminDashboard } from '@/app/components/tasklist/admin-task/AdminDashboard';
import { supabase } from  '../../lib/supabase'; 
import { Task } from '../../types/task';

export default function TaskBuilderApp() {
  const [settings, setSettings] = useSettings();
  const { user, loading: authLoading, isAdmin } = useAuth();
  const { listName } = useParams<{ listName: string }>();
  const router = useRouter();
  const {
    tasks,
    setTasks,
    addTask,
    duplicateTask,
    toggleTask,
    deleteTask,
    editTask,
    reorderTasks,
    selectedTaskId,
    selectTask
  } = useTasks();

  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showAdminDashboard, setShowAdminDashboard] = useState(false);
  const [isFirstUser, setIsFirstUser] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showTour, setShowTour] = useState(false);

  // Initialize tour state after component mounts
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hasSeenTour = sessionStorage.getItem('hasSeenTour');
      setShowTour(!hasSeenTour && !settings.googleApiKey);
    }
  }, [settings.googleApiKey]);

  useEffect(() => {
    const loadListFromParams = async () => {
      if (listName) {
        try {
          // First try to get all task lists from Supabase
          const allLists = await getTaskLists();
          const normalizeForMatching = (str: string) => 
            str.toLowerCase().replace(/[-:+.]/g, ' ').replace(/\s+/g, ' ').trim();
          
          const normalizedUrlListName = normalizeForMatching(listName.replace(/-/g, ' '));
          let matchedList = allLists.find(
            (list: { name: string; }) => normalizeForMatching(list.name) === normalizedUrlListName
          );

          // If not found in all lists, fallback to example lists (which includes local files)
          if (!matchedList) {
            const exampleLists = await getExampleLists();
            matchedList = exampleLists.find(
              (list: { name: string; }) => normalizeForMatching(list.name) === normalizedUrlListName
            );
          }

          if (matchedList) {
            setTasks(matchedList.data);
          } else {
            console.error(`List not found: ${listName}`);
          }
        } catch (error) {
          console.error('Failed to load task lists:', error);
          // Fallback to example lists only
          try {
            const exampleLists = await getExampleLists();
            const normalizeForMatching = (str: string) => 
              str.toLowerCase().replace(/[-:+.]/g, ' ').replace(/\s+/g, ' ').trim();
            const normalizedUrlListName = normalizeForMatching(listName.replace(/-/g, ' '));
            const matchedList = exampleLists.find(
              (list: { name: string; }) => normalizeForMatching(list.name) === normalizedUrlListName
            );
            if (matchedList) {
              setTasks(matchedList.data);
            } else {
              console.error(`List not found in examples: ${listName}`);
            }
          } catch (fallbackError) {
            console.error('Failed to load example lists:', fallbackError);
          }
        }
      } else {
        // Optionally clear tasks if on root path, or handle as per desired default behavior
        // For now, let's clear if tasks exist and no listName is provided
        if (tasks.length > 0) {
           //setTasks([]); // Commented out for now, to avoid clearing tasks during HMR or other re-renders.
                          // Decide on a clear strategy for initial load vs. navigation.
        }
      }
    };

    loadListFromParams();
  }, [listName, setTasks]);

  useEffect(() => {
    // Check if this is the first user
    const checkFirstUser = async () => {
      try {
        const { count, error: countError } = await supabase
          .from('users')
          .select('*', { count: 'exact', head: true });

        if (countError) {
          if (countError.code === '42501') {
            setIsFirstUser(true);
          } else {
            console.error('Error checking user count:', countError);
          }
        } else {
          setIsFirstUser(!count || count === 0);
        }
      } catch (error) {
        console.error('Error checking first user:', error);
      }
    };

    if (!authLoading) {
      checkFirstUser();
    }
  }, [authLoading]);

  const handleLogoClick = () => {
    if (listName && tasks.length > 0) {
      // If on a specific list page with tasks, show confirmation
      setShowConfirmationModal(true);
    } else if (listName) {
      // If on a specific list page with no tasks, clear and navigate back
      setTasks([]);
      router.push('/');
    } else if (tasks.length > 0) {
      // If on main page with tasks, show confirmation
      setShowConfirmationModal(true);
    } else {
      // If on main page with no tasks, just reload
      window.location.reload();
    }
  };

  const handleConfirmReload = () => {
    // Close the modal first
    setShowConfirmationModal(false);
    
    if (listName) {
      // If on list page, clear tasks and navigate to main page
      setTasks([]);
      router.push('/');
    } else {
      // If on main page, reload after a short delay to ensure modal closes
      setTimeout(() => {
        window.location.reload();
      }, 100);
    }
  };

  const handleSettingsSave = (newSettings: typeof settings) => {
    setSettings(newSettings);
    setShowSettingsModal(false);
  };

  const handleTourComplete = () => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('hasSeenTour', 'true');
    }
    setShowTour(false);
  };

  const checkAllSubTasks = (headlineId: string) => {
    setTasks((prevTasks) => {
      const isAllCompleted = prevTasks.every(task => 
        task.isHeadline || task.completed || !isSubTaskOf(task, headlineId, prevTasks)
      );
      
      return prevTasks.map(task => {
        if (task.id === headlineId || isSubTaskOf(task, headlineId, prevTasks)) {
          return { ...task, completed: !isAllCompleted };
        }
        return task;
      });
    });
  };

  const isSubTaskOf = (task: Task, headlineId: string, tasks: Task[]) => {
    if (task.isHeadline) return false;
    const taskIndex = tasks.findIndex(t => t.id === task.id);
    for (let i = taskIndex; i >= 0; i--) {
      if (tasks[i].isHeadline) {
        return tasks[i].id === headlineId;
      }
    }
    return false;
  };

  if (showAdminDashboard && isAdmin) {
    return (
      <AdminDashboard 
        onClose={() => setShowAdminDashboard(false)}
        onError={setError}
      />
    );
  }

  return (
    <>
    <div className="min-h-screen bg-gray-50 relative">
      {error && <ErrorNotification message={error} onClose={() => setError(null)} />}

      <div className="max-w-4xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 mb-8">
          <TaskHeader
            onLogoClick={handleLogoClick}
            onSettingsClick={() => setShowSettingsModal(true)}
            onAdminClick={() => setShowAdminDashboard(true)}
            tasks={tasks}
            onImport={setTasks}
            isAdmin={isAdmin}
            onError={setError}
          />
          <TaskInput onAddTask={addTask} />
        </div>
        <TaskListSection
          tasks={tasks}
          onToggle={toggleTask}
          onDelete={deleteTask}
          onEdit={editTask}
          onDuplicate={duplicateTask}
          onReorder={reorderTasks}
          onCheckAllSubTasks={checkAllSubTasks}
          onImportTaskList={setTasks}
          googleApiKey={settings.googleApiKey}
          onError={setError}
          isAdmin={isAdmin}
          selectedTaskId={selectedTaskId}
          onSelectTask={selectTask}
        />
      </div>
    </div>
    <div className="bg-gray-50 relative">
      <Footer />
      <button
        onClick={() => setShowHelpModal(true)}
        className="fixed bottom-4 right-4 p-2 text-gray-400 hover:text-gray-600"
        title="Help"
      >
        <HelpCircle size={24} />
      </button>

      {showConfirmationModal && (
        <ConfirmationModal
          onConfirm={handleConfirmReload}
          onCancel={() => setShowConfirmationModal(false)}
          tasks={tasks}
        />
      )}
      {showSettingsModal && (
        <SettingsModal
          onClose={() => setShowSettingsModal(false)}
          onSave={handleSettingsSave}
          initialSettings={settings}
          isAdmin={isAdmin}
          user={user}
          onShowAuth={() => setShowAuthModal(true)}
        />
      )}
      {showHelpModal && (
        <HelpModal onClose={() => setShowHelpModal(false)} />
      )}
      {showTour && (
        <Tour onComplete={handleTourComplete} />
      )}
      {showAuthModal && (
        <AuthModal
          onClose={() => setShowAuthModal(false)}
          isFirstUser={isFirstUser}
        />
      )}
    </div>
    </>
  );
}