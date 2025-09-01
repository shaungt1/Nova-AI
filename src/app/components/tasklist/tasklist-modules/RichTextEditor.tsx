'use client';

import React, { useRef, useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import ReactQuill to avoid SSR issues
const ReactQuill = dynamic(() => import('react-quill'), { 
  ssr: false,
  loading: () => <div className="h-32 bg-gray-100 rounded-md animate-pulse" />
});

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
}

export function RichTextEditor({ value, onChange }: RichTextEditorProps) {
  // ReactQuill is a dynamically imported component, so useRef should use type 'any' or 'unknown'
  const quillRef = useRef<any>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    // Dynamically load the Quill CSS only in the browser
    if (typeof window !== 'undefined') {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.type = 'text/css';
      link.href = 'https://cdn.jsdelivr.net/npm/react-quill@2.0.0/dist/quill.snow.css';
      document.head.appendChild(link);
    }
  }, []);

  return (
    <div className="rich-text-editor">
      <ReactQuill
        value={value}
        onChange={onChange}
        theme="snow"
        className="bg-white rounded-md border border-gray-200"
        modules={{
          toolbar: [
            ['bold', 'italic', 'underline', 'strike'],
            [{ 'header': [2, 3, false] }],
            [{ 'list': 'ordered'}, { 'list': 'bullet' }],
            ['link', 'image'],
            ['clean']
          ],
        }}
      />
      <style dangerouslySetInnerHTML={{
        __html: `
          .rich-text-editor .ql-container {
            min-height: 120px;
            max-height: 400px;
            overflow-y: auto;
          }
          .rich-text-editor .ql-editor {
            min-height: 120px;
          }
        `
      }} />
    </div>
  );
}
