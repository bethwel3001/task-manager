import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import {
  FaPlus,
  FaCheck,
  FaEdit,
  FaTrash,
  FaRobot,
  FaTasks,
  FaCalendarAlt,
  FaExclamationTriangle,
  FaSync,
  FaArrowUp,
  FaArrowDown,
  FaFilter,
  FaSearch,
  FaLightbulb,
  FaClock,
  FaListUl
} from 'react-icons/fa';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const APP_NAME = import.meta.env.VITE_APP_NAME || 'TaskFlow';

// Custom Hooks
const useApi = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const makeRequest = async (requestFn) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await requestFn();
      return response.data;
    } catch (err) {
      const message = err.response?.data?.message || err.message || 'An error occurred';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { loading, error, setError, makeRequest };
};

const useTasks = () => {
  const [tasks, setTasks] = useState([]);
  const { loading, error, setError, makeRequest } = useApi();

  const fetchTasks = async (filters = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, value);
      }
    });

    const data = await makeRequest(() => 
      axios.get(`${API_URL}/tasks?${params}`)
    );
    setTasks(data.data || []);
  };

  const createTask = async (taskData) => {
    const data = await makeRequest(() => 
      axios.post(`${API_URL}/tasks`, taskData)
    );
    await fetchTasks();
    return data;
  };

  const updateTask = async (id, updates) => {
    const data = await makeRequest(() => 
      axios.put(`${API_URL}/tasks/${id}`, updates)
    );
    await fetchTasks();
    return data;
  };

  const deleteTask = async (id) => {
    const data = await makeRequest(() => 
      axios.delete(`${API_URL}/tasks/${id}`)
    );
    await fetchTasks();
    return data;
  };

  const getAiSuggestion = async (prompt) => {
    const data = await makeRequest(() => 
      axios.post(`${API_URL}/ai/suggest`, { prompt })
    );
    return data.data;
  };

  return {
    tasks,
    loading,
    error,
    setError,
    fetchTasks,
    createTask,
    updateTask,
    deleteTask,
    getAiSuggestion
  };
};

// Components
const ConnectionStatus = ({ status }) => {
  const statusConfig = {
    connected: { color: 'bg-emerald-100 text-emerald-800 border-emerald-200', icon: FaCheck, text: 'Connected' },
    disconnected: { color: 'bg-rose-100 text-rose-800 border-rose-200', icon: FaExclamationTriangle, text: 'Disconnected' },
    checking: { color: 'bg-amber-100 text-amber-800 border-amber-200', icon: FaSync, text: 'Checking' }
  };

  const config = statusConfig[status] || statusConfig.checking;
  const Icon = config.icon;

  return (
    <div className={`flex items-center space-x-2 px-3 py-1.5 rounded-full text-sm font-medium border ${config.color}`}>
      <Icon className={status === 'checking' ? 'animate-spin' : ''} size={12} />
      <span>{config.text}</span>
    </div>
  );
};

const TaskForm = ({ onSubmit, loading, initialData = {} }) => {
  const [formData, setFormData] = useState({
    title: initialData.title || '',
    description: initialData.description || '',
    priority: initialData.priority || 'medium',
    dueDate: initialData.dueDate || ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (formData.title.trim()) {
      onSubmit(formData);
      setFormData({ title: '', description: '', priority: 'medium', dueDate: '' });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label className="block text-sm font-semibold text-slate-700">
          Task Title
        </label>
        <input
          type="text"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
          placeholder="What needs to be done?"
          required
          disabled={loading}
        />
      </div>
      
      <div className="space-y-2">
        <label className="block text-sm font-semibold text-slate-700">
          Description
        </label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 resize-none"
          placeholder="Add some details..."
          rows="3"
          disabled={loading}
        />
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-slate-700">
            Priority
          </label>
          <select
            value={formData.priority}
            onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
            className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
            disabled={loading}
          >
            <option value="low">Low Priority</option>
            <option value="medium">Medium Priority</option>
            <option value="high">High Priority</option>
          </select>
        </div>
        
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-slate-700">
            Due Date
          </label>
          <input
            type="date"
            value={formData.dueDate}
            onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
            className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
            disabled={loading}
          />
        </div>
      </div>
      
      <button
        type="submit"
        disabled={loading || !formData.title.trim()}
        className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 px-4 rounded-xl hover:from-indigo-700 hover:to-purple-700 disabled:from-slate-400 disabled:to-slate-500 disabled:cursor-not-allowed transition-all duration-200 font-semibold flex items-center justify-center shadow-lg shadow-indigo-500/25"
      >
        {loading ? (
          <>
            <FaSync className="animate-spin mr-2" />
            Creating Task...
          </>
        ) : (
          <>
            <FaPlus className="mr-2" />
            Add New Task
          </>
        )}
      </button>
    </form>
  );
};

const TaskItem = ({ task, onUpdate, onDelete, loading }) => {
  const priorityConfig = {
    high: { color: 'bg-rose-100 text-rose-800 border-rose-200', label: 'High Priority' },
    medium: { color: 'bg-amber-100 text-amber-800 border-amber-200', label: 'Medium Priority' },
    low: { color: 'bg-emerald-100 text-emerald-800 border-emerald-200', label: 'Low Priority' }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && !task.completed;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={`group border-2 rounded-2xl p-6 flex items-start justify-between transition-all duration-200 ${
        task.completed 
          ? 'bg-slate-50 border-slate-200' 
          : 'bg-white border-slate-100 hover:border-indigo-200 hover:shadow-lg'
      }`}
    >
      <div className="flex items-start space-x-4 flex-1">
        <button
          onClick={() => onUpdate(task._id, { completed: !task.completed })}
          disabled={loading}
          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center mt-1 transition-all duration-200 ${
            task.completed 
              ? 'bg-emerald-500 border-emerald-500 text-white' 
              : 'border-slate-300 hover:border-emerald-500 group-hover:border-slate-400'
          } disabled:opacity-50`}
        >
          {task.completed && <FaCheck className="text-xs" />}
        </button>
        
        <div className="flex-1 space-y-3">
          <div className="space-y-1">
            <h3 className={`font-semibold text-lg leading-tight ${
              task.completed ? 'text-slate-500 line-through' : 'text-slate-800'
            }`}>
              {task.title}
            </h3>
            
            {task.description && (
              <p className="text-slate-600 leading-relaxed">{task.description}</p>
            )}
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            <span className={`text-xs px-3 py-1.5 rounded-full border font-medium ${priorityConfig[task.priority].color}`}>
              {priorityConfig[task.priority].label}
            </span>
            
            {task.dueDate && (
              <span className={`text-xs px-3 py-1.5 rounded-full border font-medium flex items-center space-x-1 ${
                isOverdue 
                  ? 'bg-rose-50 text-rose-700 border-rose-200' 
                  : 'bg-blue-50 text-blue-700 border-blue-200'
              }`}>
                <FaClock size={10} />
                <span>Due: {formatDate(task.dueDate)}</span>
              </span>
            )}
            
            <span className="text-xs text-slate-500 px-2 py-1.5">
              Created: {formatDate(task.createdAt)}
            </span>
          </div>
        </div>
      </div>
      
      <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        {!task.completed && (
          <button
            onClick={() => onUpdate(task._id, { priority: task.priority === 'high' ? 'medium' : 'high' })}
            disabled={loading}
            className="p-2 text-slate-600 hover:bg-slate-100 rounded-xl transition-all duration-200 disabled:opacity-50"
            title="Change priority"
          >
            {task.priority === 'high' ? <FaArrowDown size={14} /> : <FaArrowUp size={14} />}
          </button>
        )}
        
        <button
          onClick={() => onDelete(task._id)}
          disabled={loading}
          className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl transition-all duration-200 disabled:opacity-50"
          title="Delete task"
        >
          <FaTrash size={14} />
        </button>
      </div>
    </motion.div>
  );
};

const AiAssistant = ({ onGetSuggestion, loading }) => {
  const [prompt, setPrompt] = useState('');
  const [suggestion, setSuggestion] = useState('');

  const handleSubmit = async () => {
    if (prompt.trim()) {
      const result = await onGetSuggestion(prompt);
      setSuggestion(result.suggestion);
      setPrompt('');
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="block text-sm font-semibold text-slate-700">
          Ask for Guidance
        </label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 resize-none"
          placeholder="How can I help with your tasks today?"
          rows="3"
          disabled={loading}
        />
      </div>
      
      <button
        onClick={handleSubmit}
        disabled={loading || !prompt.trim()}
        className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 px-4 rounded-xl hover:from-purple-700 hover:to-pink-700 disabled:from-slate-400 disabled:to-slate-500 disabled:cursor-not-allowed transition-all duration-200 font-semibold flex items-center justify-center shadow-lg shadow-purple-500/25"
      >
        {loading ? (
          <>
            <FaSync className="animate-spin mr-2" />
            Thinking...
          </>
        ) : (
          <>
            <FaLightbulb className="mr-2" />
            Get AI Insight
          </>
        )}
      </button>
      
      <AnimatePresence>
        {suggestion && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200 rounded-2xl p-5"
          >
            <div className="flex items-start space-x-3">
              <div className="bg-purple-100 p-2 rounded-full">
                <FaRobot className="text-purple-600" size={16} />
              </div>
              <p className="text-purple-800 leading-relaxed flex-1">{suggestion}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Main App Component
function App() {
  const [connectionStatus, setConnectionStatus] = useState('checking');
  const [filters, setFilters] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  
  const {
    tasks,
    loading,
    error,
    setError,
    fetchTasks,
    createTask,
    updateTask,
    deleteTask,
    getAiSuggestion
  } = useTasks();

  useEffect(() => {
    checkHealth();
    fetchTasks();
  }, []);

  const checkHealth = async () => {
    try {
      await axios.get(`${API_URL}/health`);
      setConnectionStatus('connected');
    } catch (error) {
      setConnectionStatus('disconnected');
      setError('Cannot connect to server. Please ensure backend is running.');
    }
  };

  const handleCreateTask = async (taskData) => {
    try {
      await createTask(taskData);
    } catch (error) {
      // Error handled by hook
    }
  };

  const handleUpdateTask = async (id, updates) => {
    try {
      await updateTask(id, updates);
    } catch (error) {
      // Error handled by hook
    }
  };

  const handleDeleteTask = async (id) => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      try {
        await deleteTask(id);
      } catch (error) {
        // Error handled by hook
      }
    }
  };

  const handleGetAiSuggestion = async (prompt) => {
    try {
      return await getAiSuggestion(prompt);
    } catch (error) {
      return { suggestion: 'Sorry, I encountered an error. Please try again.' };
    }
  };

  const filteredTasks = tasks.filter(task => 
    task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    task.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const completedCount = tasks.filter(task => task.completed).length;
  const totalCount = tasks.length;
  const progressPercentage = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-3 rounded-2xl shadow-lg">
                <FaTasks className="text-white text-xl" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                  {APP_NAME}
                </h1>
                <p className="text-slate-500 text-sm">Organize your work, amplify your productivity</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <ConnectionStatus status={connectionStatus} />
              <div className="text-right">
                <div className="text-sm font-semibold text-slate-700">
                  {completedCount} / {totalCount} completed
                </div>
                <div className="w-24 bg-slate-200 rounded-full h-2 mt-1">
                  <div 
                    className="bg-gradient-to-r from-emerald-500 to-green-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${progressPercentage}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Error Alert */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4"
          >
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <FaExclamationTriangle className="text-rose-600 flex-shrink-0" />
                <div>
                  <p className="text-rose-800 font-semibold">Connection Issue</p>
                  <p className="text-rose-700 text-sm">{error}</p>
                </div>
              </div>
              <button
                onClick={() => setError(null)}
                className="text-rose-600 hover:text-rose-800 text-lg font-semibold"
              >
                ×
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
          
          {/* Left Column - Task Input & AI Assistant */}
          <div className="xl:col-span-1 space-y-6">
            
            {/* Task Creation Card */}
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6"
            >
              <div className="flex items-center space-x-3 mb-6">
                <div className="bg-indigo-100 p-2 rounded-xl">
                  <FaPlus className="text-indigo-600" />
                </div>
                <h2 className="text-xl font-bold text-slate-800">Create Task</h2>
              </div>
              <TaskForm 
                onSubmit={handleCreateTask}
                loading={loading}
              />
            </motion.div>

            {/* AI Assistant Card */}
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6"
            >
              <div className="flex items-center space-x-3 mb-6">
                <div className="bg-purple-100 p-2 rounded-xl">
                  <FaRobot className="text-purple-600" />
                </div>
                <h2 className="text-xl font-bold text-slate-800">AI Assistant</h2>
              </div>
              <AiAssistant 
                onGetSuggestion={handleGetAiSuggestion}
                loading={loading}
              />
            </motion.div>
          </div>

          {/* Right Column - Task List */}
          <div className="xl:col-span-3">
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6"
            >
              {/* Task List Header */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-8 space-y-4 lg:space-y-0">
                <div className="flex items-center space-x-3">
                  <div className="bg-slate-100 p-2 rounded-xl">
                    <FaListUl className="text-slate-600" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-slate-800">Your Tasks</h2>
                    <p className="text-slate-500 text-sm">
                      {filteredTasks.length} task{filteredTasks.length !== 1 ? 's' : ''} found
                    </p>
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-3">
                  {/* Search */}
                  <div className="relative">
                    <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={14} />
                    <input
                      type="text"
                      placeholder="Search tasks..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent w-full sm:w-48"
                    />
                  </div>
                  
                  {/* Filters */}
                  <div className="flex space-x-2">
                    <select
                      value={filters.priority || ''}
                      onChange={(e) => setFilters({ ...filters, priority: e.target.value || undefined })}
                      className="px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                    >
                      <option value="">All Priorities</option>
                      <option value="high">High Priority</option>
                      <option value="medium">Medium Priority</option>
                      <option value="low">Low Priority</option>
                    </select>
                    
                    <select
                      value={filters.completed || ''}
                      onChange={(e) => setFilters({ ...filters, completed: e.target.value || undefined })}
                      className="px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                    >
                      <option value="">All Tasks</option>
                      <option value="false">Active</option>
                      <option value="true">Completed</option>
                    </select>
                    
                    <button
                      onClick={() => fetchTasks(filters)}
                      disabled={loading}
                      className="flex items-center space-x-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all duration-200 text-sm font-semibold text-slate-700 disabled:opacity-50"
                    >
                      <FaSync className={loading ? 'animate-spin' : ''} />
                      <span>Refresh</span>
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Task List */}
              <div className="space-y-4">
                <AnimatePresence mode="wait">
                  {loading && filteredTasks.length === 0 ? (
                    <motion.div
                      key="loading"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="text-center py-12"
                    >
                      <FaSync className="animate-spin text-3xl text-indigo-600 mx-auto mb-3" />
                      <p className="text-slate-500">Loading your tasks...</p>
                    </motion.div>
                  ) : connectionStatus === 'disconnected' ? (
                    <motion.div
                      key="disconnected"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="text-center py-12"
                    >
                      <FaExclamationTriangle className="text-3xl text-rose-400 mx-auto mb-3" />
                      <p className="text-slate-700 font-semibold">Cannot connect to server</p>
                      <p className="text-slate-500 text-sm mt-1">Please ensure the backend server is running</p>
                    </motion.div>
                  ) : filteredTasks.length === 0 ? (
                    <motion.div
                      key="empty"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="text-center py-12"
                    >
                      <FaCalendarAlt className="text-3xl text-slate-300 mx-auto mb-3" />
                      <p className="text-slate-500">No tasks found</p>
                      <p className="text-slate-400 text-sm mt-1">
                        {searchTerm ? 'Try adjusting your search' : 'Create your first task to get started'}
                      </p>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="tasks"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="space-y-4"
                    >
                      {filteredTasks.map((task) => (
                        <TaskItem
                          key={task._id}
                          task={task}
                          onUpdate={handleUpdateTask}
                          onDelete={handleDeleteTask}
                          loading={loading}
                        />
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;