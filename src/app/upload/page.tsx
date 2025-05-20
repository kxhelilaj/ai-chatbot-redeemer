'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function Upload() {
  const [files, setFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (files.length === 0) return;
    
    setIsUploading(true);
    setUploadStatus('Uploading...');
    
    const formData = new FormData();
    files.forEach(file => {
      formData.append('pdfs', file);
    });
    
    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setUploadStatus(`Successfully uploaded ${files.length} files!`);
        setFiles([]);
      } else {
        setUploadStatus(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Upload error:', error);
      setUploadStatus('Upload failed due to a network error');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center p-4 sm:p-24 pt-8">
      <div className="z-10 w-full max-w-3xl">
        <h1 className="text-2xl font-bold mb-4">Upload PDF Documents</h1>
        
        <form onSubmit={handleSubmit} className="mb-8">
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center mb-4">
            <input
              type="file"
              multiple
              accept=".pdf"
              onChange={handleFileChange}
              className="hidden"
              id="file-upload"
              disabled={isUploading}
            />
            <label
              htmlFor="file-upload"
              className="cursor-pointer bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600"
            >
              Select PDF files
            </label>
            
            {files.length > 0 && (
              <div className="mt-4">
                <p className="mb-2">{files.length} files selected:</p>
                <ul className="text-left">
                  {files.map((file, index) => (
                    <li key={index} className="text-sm">
                      {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          
          <button
            type="submit"
            className={`w-full py-2 rounded ${
              isUploading || files.length === 0
                ? 'bg-gray-300 cursor-not-allowed'
                : 'bg-green-500 text-white hover:bg-green-600'
            }`}
            disabled={isUploading || files.length === 0}
          >
            {isUploading ? 'Uploading...' : 'Upload Files'}
          </button>
        </form>
        
        {uploadStatus && (
          <div className={`p-4 mb-4 rounded ${
            uploadStatus.startsWith('Error') 
              ? 'bg-red-100 text-red-700' 
              : uploadStatus === 'Uploading...'
              ? 'bg-blue-100 text-blue-700'
              : 'bg-green-100 text-green-700'
          }`}>
            {uploadStatus}
          </div>
        )}
        
        <div className="text-center">
          <Link href="/" className="text-blue-500 hover:underline">
            Return to Chat
          </Link>
        </div>
      </div>
    </main>
  );
}