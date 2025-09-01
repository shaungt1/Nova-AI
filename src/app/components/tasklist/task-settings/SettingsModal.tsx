'use client';

import React, { useState } from 'react';
import { X, ExternalLink, LogIn, LogOut } from 'lucide-react';
import { ChatHistory } from './ChatHistory';
import { ImportExamplesButton } from '../admin-task/ImportExamplesButton';
import { User } from '@supabase/supabase-js';
import { supabase } from '../../../../lib/supabase';

interface SettingsModalProps {
  onClose: () => void;
  onSave: (settings: {
    service: string;
    model: string;
    googleApiKey: string;
  }) => void;
  initialSettings: {
    service: string;
    model: string;
    googleApiKey: string;
  };
  isAdmin?: boolean;
  user: User | null;
  onShowAuth: () => void;
}

export function SettingsModal({ onClose, onSave, initialSettings, isAdmin, user, onShowAuth }: SettingsModalProps) {
  const [settings, setSettings] = useState(initialSettings);
  const [clearing, setClearing] = useState(false);

  const clearSiteData = async () => {
    setClearing(true);
    try {
      if (typeof window !== 'undefined') {
        localStorage.clear();
        sessionStorage.clear();
        document.cookie.split(";").forEach(cookie => {
          document.cookie = cookie
            .replace(/^ +/, "")
            .replace(/=.*/, `=;expires=${new Date(0).toUTCString()};path=/`);
        });
        if (window.indexedDB && window.indexedDB.databases) {
          const databases = await window.indexedDB.databases();
          databases.forEach(db => {
            if (db.name) window.indexedDB.deleteDatabase(db.name);
          });
        }
        if ('caches' in window) {
          const cacheKeys = await caches.keys();
          await Promise.all(cacheKeys.map(key => caches.delete(key)));
        }
        window.location.reload();
      }
    } catch (error) {
      console.error('Error clearing site data:', error);
    } finally {
      setClearing(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      onClose();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] overflow-y-auto" style={{ zIndex: 9999 }}>
      <div className="flex min-h-screen items-center justify-center px-4 py-12">
        <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={onClose} />
        <div className="relative inline-block w-full max-w-lg transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Settings</h3>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
                <X size={20} />
              </button>
            </div>
            
            {/* Authentication Section */}
            <div className="mb-6 pb-6 border-b">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-gray-900">Account</h4>
                {user ? (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">{user.email}</span>
                    <button
                      onClick={handleSignOut}
                      className="flex items-center gap-1 px-3 py-1 text-sm text-red-600 hover:text-red-700"
                    >
                      <LogOut size={16} />
                      Sign Out
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={onShowAuth}
                    className="flex items-center gap-1 px-3 py-1 text-sm text-blue-600 hover:text-blue-700"
                  >
                    <LogIn size={16} />
                    Sign In
                  </button>
                )}
              </div>
            </div>

            {/* Google API Key Section */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Google API Key
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="password"
                  value={settings.googleApiKey || ''}
                  onChange={(e) => setSettings({ ...settings, googleApiKey: e.target.value })}
                  className="flex-1 px-3 py-2 border rounded-md"
                  placeholder="Enter your API key"
                />
                <button
                  onClick={() => window.open('https://makersuite.google.com/app/apikey', '_blank')}
                  className="modern-button bg-yellow-100 text-yellow-700 hover:bg-yellow-200 whitespace-nowrap w-fit flex items-center gap-1"
                  title="Get Google API Key"
                >
                  Get API Key
                  <ExternalLink size={14} />
                </button>
              </div>
            </div>

            {/* Admin Section */}
            {isAdmin && (
              <div className="mt-8 pt-6 border-t">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-medium text-gray-900">Admin Tools</h4>
                  <div className="text-xs text-gray-500">Admin Access</div>
                </div>
                <div className="space-y-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h5 className="text-sm font-medium text-gray-700 mb-2">Example Lists</h5>
                    <p className="text-xs text-gray-600 mb-3">
                      Import example task lists into the database. These lists will be available to all users.
                    </p>
                    <ImportExamplesButton
                      onSuccess={() => {
                        alert('Example lists imported successfully!');
                      }}
                      onError={(error) => {
                        alert(error);
                      }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Clear Site Data Section */}
            <div className="mt-8 pt-6 border-t">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Clear Site Data</h4>
              <p className="text-sm text-gray-500 mb-4">
                This will clear all saved settings, tasks, and cached data. This action cannot be undone.
              </p>
              <button
                onClick={clearSiteData}
                disabled={clearing}
                className="px-4 py-2 text-sm text-red-600 border border-red-600 rounded-md hover:bg-red-50 transition-colors"
              >
                {clearing ? 'Clearing...' : 'Clear All Data'}
              </button>
            </div>

            <ChatHistory onClose={onClose} />
          </div>

          <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
            <button
              type="button"
              onClick={() => onSave(settings)}
              className="inline-flex w-full justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none sm:ml-3 sm:w-auto sm:text-sm"
            >
              Save
            </button>
            <button
              type="button"
              onClick={onClose}
              className="mt-3 inline-flex w-full justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-base font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none sm:mt-0 sm:w-auto sm:text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}