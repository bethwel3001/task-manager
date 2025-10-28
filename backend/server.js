const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ai-taskmanager', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// User Schema
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
}, { timestamps: true });

// Task Schema
const taskSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  dueDate: { type: Date, required: true },
  priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  completed: { type: Boolean, default: false },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

const User = mongoose.model('User', userSchema);
const Task = mongoose.model('Task', taskSchema);

// Auth Middleware
const authMiddleware = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({ message: 'Invalid token' });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};

// Routes

// Auth Routes
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const user = new User({ name, email, password: hashedPassword });
    await user.save();

    // Generate token
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    res.status(201).json({
      token,
      user: { id: user._id, name: user.name, email: user.email }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Generate token
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: { id: user._id, name: user.name, email: user.email }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.get('/api/auth/me', authMiddleware, (req, res) => {
  res.json({ user: { id: req.user._id, name: req.user.name, email: req.user.email } });
});

// Task Routes
app.get('/api/tasks', authMiddleware, async (req, res) => {
  try {
    const tasks = await Task.find({ userId: req.user._id }).sort({ createdAt: -1 });
    res.json({ tasks });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.post('/api/tasks', authMiddleware, async (req, res) => {
  try {
    const { title, description, dueDate, priority } = req.body;

    const task = new Task({
      title,
      description,
      dueDate,
      priority,
      userId: req.user._id
    });

    await task.save();
    res.status(201).json({ task });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.put('/api/tasks/:id', authMiddleware, async (req, res) => {
  try {
    const task = await Task.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      req.body,
      { new: true }
    );

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    res.json({ task });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.delete('/api/tasks/:id', authMiddleware, async (req, res) => {
  try {
    const task = await Task.findOneAndDelete({ _id: req.params.id, userId: req.user._id });

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.get('/api/tasks/upcoming', authMiddleware, async (req, res) => {
  try {
    const now = new Date();
    const twentyFourHoursFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const upcomingTasks = await Task.find({
      userId: req.user._id,
      completed: false,
      dueDate: { $gte: now, $lte: twentyFourHoursFromNow }
    }).sort({ dueDate: 1 });

    res.json({ upcomingTasks });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// AI Suggestions Route
app.get('/api/tasks/ai-suggestions', authMiddleware, async (req, res) => {
  try {
    const tasks = await Task.find({ userId: req.user._id, completed: false });
    
    if (tasks.length === 0) {
      return res.json({ 
        suggestion: "You don't have any pending tasks. Great job! Consider adding some new tasks to stay productive." 
      });
    }

    const overdueTasks = tasks.filter(task => new Date(task.dueDate) < new Date());
    const highPriorityTasks = tasks.filter(task => task.priority === 'high' && !task.completed);
    
    let suggestion = "";
    
    if (overdueTasks.length > 0) {
      suggestion = `You have ${overdueTasks.length} overdue task(s). Focus on completing "${overdueTasks[0].title}" first to catch up.`;
    } else if (highPriorityTasks.length > 0) {
      suggestion = `You have ${highPriorityTasks.length} high-priority task(s). Consider working on "${highPriorityTasks[0].title}" next.`;
    } else {
      const nextTask = tasks.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))[0];
      suggestion = `Your next task "${nextTask.title}" is due on ${new Date(nextTask.dueDate).toLocaleDateString()}. Plan your time accordingly!`;
    }

    res.json({ suggestion });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});