const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware Configuration
app.use(cors({
  origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:5173'],
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Database Connection
const connectDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Database connected successfully');
  } catch (error) {
    console.error('Database connection failed:', error.message);
    process.exit(1);
  }
};

// Database Event Handlers
mongoose.connection.on('disconnected', () => {
  console.log('Database disconnected');
});

mongoose.connection.on('error', (error) => {
  console.error('Database error:', error);
});

// Task Schema
const taskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Task title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  completed: {
    type: Boolean,
    default: false
  },
  dueDate: {
    type: Date
  }
}, {
  timestamps: true
});

const Task = mongoose.model('Task', taskSchema);

// Utility Functions
const handleError = (res, error, defaultMessage = 'An error occurred') => {
  console.error('Error:', error);
  
  if (error.name === 'ValidationError') {
    const errors = Object.values(error.errors).map(err => err.message);
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors
    });
  }
  
  if (error.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: 'Invalid ID format'
    });
  }
  
  res.status(500).json({
    success: false,
    message: defaultMessage,
    error: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
};

const validateTaskData = (data) => {
  const errors = [];
  
  if (!data.title || data.title.trim().length === 0) {
    errors.push('Task title is required');
  }
  
  if (data.title && data.title.length > 200) {
    errors.push('Title cannot exceed 200 characters');
  }
  
  if (data.description && data.description.length > 1000) {
    errors.push('Description cannot exceed 1000 characters');
  }
  
  if (data.priority && !['low', 'medium', 'high'].includes(data.priority)) {
    errors.push('Priority must be low, medium, or high');
  }
  
  return errors;
};

// API Routes

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is healthy',
    timestamp: new Date().toISOString(),
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// Get all tasks
app.get('/api/tasks', async (req, res) => {
  try {
    const { completed, priority, sort = '-createdAt' } = req.query;
    
    let filter = {};
    if (completed !== undefined) filter.completed = completed === 'true';
    if (priority) filter.priority = priority;
    
    const tasks = await Task.find(filter).sort(sort);
    
    res.json({
      success: true,
      data: tasks,
      count: tasks.length
    });
  } catch (error) {
    handleError(res, error, 'Failed to fetch tasks');
  }
});

// Get single task
app.get('/api/tasks/:id', async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }
    
    res.json({
      success: true,
      data: task
    });
  } catch (error) {
    handleError(res, error, 'Failed to fetch task');
  }
});

// Create task
app.post('/api/tasks', async (req, res) => {
  try {
    const validationErrors = validateTaskData(req.body);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validationErrors
      });
    }
    
    const taskData = {
      title: req.body.title.trim(),
      description: req.body.description?.trim() || '',
      priority: req.body.priority || 'medium',
      dueDate: req.body.dueDate
    };
    
    const task = new Task(taskData);
    const savedTask = await task.save();
    
    res.status(201).json({
      success: true,
      message: 'Task created successfully',
      data: savedTask
    });
  } catch (error) {
    handleError(res, error, 'Failed to create task');
  }
});

// Update task
app.put('/api/tasks/:id', async (req, res) => {
  try {
    const validationErrors = validateTaskData(req.body);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validationErrors
      });
    }
    
    const task = await Task.findByIdAndUpdate(
      req.params.id,
      {
        title: req.body.title.trim(),
        description: req.body.description?.trim() || '',
        priority: req.body.priority,
        completed: req.body.completed,
        dueDate: req.body.dueDate
      },
      { new: true, runValidators: true }
    );
    
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Task updated successfully',
      data: task
    });
  } catch (error) {
    handleError(res, error, 'Failed to update task');
  }
});

// Delete task
app.delete('/api/tasks/:id', async (req, res) => {
  try {
    const task = await Task.findByIdAndDelete(req.params.id);
    
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Task deleted successfully'
    });
  } catch (error) {
    handleError(res, error, 'Failed to delete task');
  }
});

// AI Suggestions
app.post('/api/ai/suggest', async (req, res) => {
  try {
    const { prompt } = req.body;
    
    if (!prompt || prompt.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Prompt is required'
      });
    }
    
    // Simulate AI processing
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const suggestions = {
      prioritize: "Focus on high-priority tasks first. Use the Eisenhower Matrix to categorize tasks by urgency and importance.",
      overwhelmed: "Break large tasks into smaller steps. Use the Pomodoro technique (25min work, 5min break) to maintain focus.",
      schedule: "Time-block your calendar. Allocate specific hours for deep work and group similar tasks together.",
      procrastination: "Start with the easiest task to build momentum. Use the 2-minute rule - if it takes less than 2 minutes, do it now.",
      default: "Review your tasks regularly. Celebrate completed tasks and adjust priorities as needed."
    };
    
    const cleanPrompt = prompt.toLowerCase().trim();
    let response = suggestions.default;
    
    if (cleanPrompt.includes('prioritize') || cleanPrompt.includes('priority')) {
      response = suggestions.prioritize;
    } else if (cleanPrompt.includes('overwhelm') || cleanPrompt.includes('too much')) {
      response = suggestions.overwhelmed;
    } else if (cleanPrompt.includes('schedule') || cleanPrompt.includes('time')) {
      response = suggestions.schedule;
    } else if (cleanPrompt.includes('procrastinate') || cleanPrompt.includes('delay')) {
      response = suggestions.procrastination;
    }
    
    res.json({
      success: true,
      data: {
        suggestion: response,
        prompt: cleanPrompt
      }
    });
  } catch (error) {
    handleError(res, error, 'Failed to generate suggestion');
  }
});

// REMOVED ALL PROBLEMATIC ROUTE PATTERNS
// Express will handle 404 automatically

// Global Error Handler
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({
    success: false,
    message: 'Internal server error'
  });
});

// Start Server
const startServer = async () => {
  try {
    await connectDatabase();
    
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV}`);
      console.log(`Database: ${process.env.MONGODB_URI}`);
      console.log('API endpoints available at:');
      console.log('  GET  /api/health');
      console.log('  GET  /api/tasks');
      console.log('  POST /api/tasks');
      console.log('  PUT  /api/tasks/:id');
      console.log('  DELETE /api/tasks/:id');
      console.log('  POST /api/ai/suggest');
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  await mongoose.connection.close();
  process.exit(0);
});

startServer();