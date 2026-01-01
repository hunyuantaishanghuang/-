
import React, { useState, useEffect, useRef } from 'react';
import { CloudFile } from './types';
import FileIcon from './components/FileIcon';
import { analyzeFile } from './services/geminiService';

const App: React.FC = () => {
  const [files, setFiles] = useState<CloudFile[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  
  const maxSizeMB = 2048; // 显示用的虚拟上限
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 从服务器获取文件列表
  const fetchFiles = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/files');
      if (response.ok) {
        const data = await response.json();
        setFiles(data);
      }
    } catch (e) {
      console.error("无法连接到服务器", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  const handleFileSelection = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      Array.from(e.target.files).forEach(uploadFile);
    }
  };

  const uploadFile = async (file: File) => {
    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      if (response.ok) {
        const newFile = await response.json();
        setFiles(prev => [newFile, ...prev]);
      }
    } catch (e) {
      alert('上传失败，请检查服务器连接');
    } finally {
      setIsUploading(false);
    }
  };

  const deleteFile = async (id: string) => {
    if (!window.confirm('确定要从服务器彻底删除这个文件吗？')) return;
    
    try {
      const response = await fetch(`/api/files/${id}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        setFiles((prev) => prev.filter((f) => f.id !== id));
      }
    } catch (e) {
      alert('删除失败');
    }
  };

  const downloadFile = (file: any) => {
    // 后端会返回 serverPath，直接通过该路径下载
    const link = document.createElement('a');
    link.href = file.serverPath;
    link.download = file.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleAIAnalyze = async (file: CloudFile) => {
    if (isAnalyzing) return;
    setIsAnalyzing(file.id);
    const description = await analyzeFile(file.name, file.type);
    // 这里我们仅更新前端显示，不持久化到服务器（除非增加后端接口）
    setFiles((prev) =>
      prev.map((f) => (f.id === file.id ? { ...f, aiDescription: description } : f))
    );
    setIsAnalyzing(null);
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      Array.from(e.dataTransfer.files).forEach(uploadFile);
    }
  };

  const totalSize = files.reduce((acc, f) => acc + f.size, 0);
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  const storagePercentage = Math.min((totalSize / maxSizeBytes) * 100, 100);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* 侧边栏 */}
      <aside className="w-full md:w-64 bg-white border-r border-slate-200 p-6 flex flex-col">
        <div className="flex items-center gap-3 mb-10">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-100">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2 1 3 3 3h10c2 0 3-1 3-3V7c0-2-1-3-3-3H7c-2 0-3 1-3 3zM9 11h6m-6 4h6" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-slate-800">极简云U盘</h1>
        </div>

        <nav className="flex-1 space-y-2">
          <button className="w-full flex items-center gap-3 px-4 py-2 text-indigo-600 bg-indigo-50 rounded-lg font-medium transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
            服务器文件
          </button>
          <button onClick={fetchFiles} className="w-full flex items-center gap-3 px-4 py-2 text-slate-500 hover:bg-slate-50 rounded-lg transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            刷新列表
          </button>
        </nav>

        <div className="mt-auto pt-6 border-t border-slate-100">
          <div className="flex justify-between items-center text-sm text-slate-500 mb-2">
            <span>存储空间 ({storagePercentage.toFixed(1)}%)</span>
          </div>
          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-500 ${storagePercentage > 90 ? 'bg-red-500' : 'bg-indigo-600'}`} 
              style={{ width: `${storagePercentage}%` }}
            ></div>
          </div>
          <p className="text-xs text-slate-400 mt-2">
            已占用 {formatSize(totalSize)} / 2.0 GB
          </p>
        </div>
      </aside>

      {/* 主内容区 */}
      <main className="flex-1 p-4 md:p-8 flex flex-col h-screen overflow-hidden">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              文件管理中心
              {isUploading && (
                <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded animate-pulse">
                  正在上传...
                </span>
              )}
            </h2>
            <p className="text-slate-500 text-sm">云端存储已就绪，所有设备即时同步</p>
          </div>
          <div className="flex gap-3">
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileSelection} 
              className="hidden" 
              multiple 
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white px-5 py-2.5 rounded-xl font-medium transition-all shadow-lg shadow-indigo-100"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              上传到服务器
            </button>
          </div>
        </header>

        {/* 列表区域 */}
        <div 
          onDragEnter={handleDrag} 
          onDragOver={handleDrag} 
          onDragLeave={handleDrag} 
          onDrop={handleDrop}
          className={`relative flex-1 bg-white rounded-2xl border-2 border-dashed transition-all overflow-hidden flex flex-col ${
            dragActive ? 'border-indigo-500 bg-indigo-50/50' : 'border-slate-200'
          }`}
        >
          {isLoading ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8">
              <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-slate-500">正在同步服务器数据...</p>
            </div>
          ) : files.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                <svg className="w-10 h-10 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-slate-700">服务器上还没有文件</h3>
              <p className="text-slate-400 max-w-xs mt-2">
                拖拽文件到这里开始真正的跨设备同步
              </p>
            </div>
          ) : (
            <div className="flex-1 overflow-auto">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-white border-b border-slate-100 z-10">
                  <tr>
                    <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">文件名</th>
                    <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">大小</th>
                    <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">上传时间</th>
                    <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">AI 智能</th>
                    <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider text-right">管理</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {files.map((file) => (
                    <tr key={file.id} className="hover:bg-slate-50/80 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          <FileIcon type={file.type} />
                          <span className="font-medium text-slate-700 truncate max-w-[200px]" title={file.name}>
                            {file.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-500 text-sm whitespace-nowrap">
                        {formatSize(file.size)}
                      </td>
                      <td className="px-6 py-4 text-slate-500 text-sm whitespace-nowrap">
                        {new Date(file.uploadDate).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                      </td>
                      <td className="px-6 py-4">
                        {file.aiDescription ? (
                          <div className="text-[11px] leading-relaxed bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg border border-indigo-100 max-w-[200px]">
                            {file.aiDescription}
                          </div>
                        ) : (
                          <button 
                            onClick={() => handleAIAnalyze(file)}
                            disabled={isAnalyzing === file.id}
                            className={`text-xs flex items-center gap-1 px-3 py-1 rounded-full border transition-all ${
                              isAnalyzing === file.id 
                                ? 'bg-slate-50 text-slate-400 border-slate-200' 
                                : 'bg-white text-indigo-600 border-indigo-200 hover:bg-indigo-50'
                            }`}
                          >
                            <svg className={`w-3 h-3 ${isAnalyzing === file.id ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                            {isAnalyzing === file.id ? '分析中' : 'AI 分析'}
                          </button>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => downloadFile(file)}
                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                            title="下载"
                          >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                          </button>
                          <button 
                            onClick={() => deleteFile(file.id)}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                            title="删除"
                          >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* 拖拽浮层 */}
          {dragActive && (
            <div className="absolute inset-0 bg-indigo-600/10 backdrop-blur-[2px] border-4 border-indigo-500 flex items-center justify-center z-20 pointer-events-none">
              <div className="bg-white px-8 py-6 rounded-2xl shadow-2xl flex flex-col items-center gap-3">
                <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center animate-bounce">
                  <svg className="w-8 h-8 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <p className="text-xl font-bold text-indigo-600">释放鼠标上传到服务器</p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default App;
