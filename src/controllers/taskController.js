const pool = require('../config/database');

// Get all tasks
exports.getAllTasks = async (req, res) => {
  try {
    const { status, priority, projectId } = req.query;
    const userId = req.user.userId;
    
    let query = `
      SELECT t.*, u.first_name, u.last_name
      FROM tasks t
      LEFT JOIN users u ON t.assignee_id = u.id
      WHERE t.project_id IN (
        SELECT p.id FROM projects p
        WHERE p.owner_id = $1 OR p.id IN (
          SELECT project_id FROM project_members WHERE user_id = $1
        )
      )
    `;
    
    const params = [userId];
    let paramCount = 1;
    
    if (status) {
      paramCount++;
      query += ` AND t.status = $${paramCount}`;
      params.push(status);
    }
    
    if (priority) {
      paramCount++;
      query += ` AND t.priority = $${paramCount}`;
      params.push(priority);
    }
    
    if (projectId) {
      paramCount++;
      query += ` AND t.project_id = $${paramCount}`;
      params.push(projectId);
    }
    
    query += ` ORDER BY t.due_date ASC, t.created_at DESC`;
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Create task
exports.createTask = async (req, res) => {
  try {
    const { projectId, title, description, assigneeId, priority, dueDate } = req.body;
    const userId = req.user.userId;
    
    if (!projectId || !title) {
      return res.status(400).json({ error: 'Project ID and title are required' });
    }
    
    const query = `
      INSERT INTO tasks (project_id, title, description, assignee_id, priority, due_date, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    
    const result = await pool.query(query, [
      projectId,
      title,
      description || null,
      assigneeId || null,
      priority || 'medium',
      dueDate || null,
      userId
    ]);
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get task by ID
exports.getTaskById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const query = `
      SELECT t.*, u.first_name, u.last_name
      FROM tasks t
      LEFT JOIN users u ON t.assignee_id = u.id
      WHERE t.id = $1
    `;
    
    const result = await pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update task
exports.updateTask = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, assigneeId, priority, status, dueDate } = req.body;
    
    const query = `
      UPDATE tasks
      SET title = COALESCE($1, title),
          description = COALESCE($2, description),
          assignee_id = COALESCE($3, assignee_id),
          priority = COALESCE($4, priority),
          status = COALESCE($5, status),
          due_date = COALESCE($6, due_date),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $7
      RETURNING *
    `;
    
    const result = await pool.query(query, [
      title,
      description,
      assigneeId,
      priority,
      status,
      dueDate,
      id
    ]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Delete task
exports.deleteTask = async (req, res) => {
  try {
    const { id } = req.params;
    
    await pool.query('DELETE FROM tasks WHERE id = $1', [id]);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get tasks by status
exports.getTasksByStatus = async (req, res) => {
  try {
    const { status } = req.params;
    
    const query = `
      SELECT * FROM tasks
      WHERE status = $1
      ORDER BY due_date ASC
    `;
    
    const result = await pool.query(query, [status]);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get tasks by project
exports.getTasksByProject = async (req, res) => {
  try {
    const { projectId } = req.params;
    
    const query = `
      SELECT * FROM tasks
      WHERE project_id = $1
      ORDER BY priority DESC, due_date ASC
    `;
    
    const result = await pool.query(query, [projectId]);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get tasks by assignee
exports.getTasksByAssignee = async (req, res) => {
  try {
    const { userId } = req.params;
    
    const query = `
      SELECT * FROM tasks
      WHERE assignee_id = $1
      ORDER BY due_date ASC
    `;
    
    const result = await pool.query(query, [userId]);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Add comment to task
exports.addComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { commentText } = req.body;
    const userId = req.user.userId;
    
    if (!commentText) {
      return res.status(400).json({ error: 'Comment text is required' });
    }
    
    const query = `
      INSERT INTO task_comments (task_id, user_id, comment_text)
      VALUES ($1, $2, $3)
      RETURNING *
    `;
    
    const result = await pool.query(query, [id, userId, commentText]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get comments for task
exports.getComments = async (req, res) => {
  try {
    const { id } = req.params;
    
    const query = `
      SELECT tc.*, u.first_name, u.last_name, u.email
      FROM task_comments tc
      JOIN users u ON tc.user_id = u.id
      WHERE tc.task_id = $1
      ORDER BY tc.created_at DESC
    `;
    
    const result = await pool.query(query, [id]);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Delete comment
exports.deleteComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const userId = req.user.userId;
    
    // Check if user is the comment owner
    const checkQuery = 'SELECT user_id FROM task_comments WHERE id = $1';
    const checkResult = await pool.query(checkQuery, [commentId]);
    
    if (checkResult.rows.length === 0 || checkResult.rows[0].user_id !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    await pool.query('DELETE FROM task_comments WHERE id = $1', [commentId]);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
