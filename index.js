import express from 'express';
import bodyParser from 'body-parser';
import pg from 'pg';
import pkg from 'pg';
import dotenv from 'dotenv';
import ejs from 'ejs';
import bcrypt from 'bcrypt';
import cron from 'node-cron'; 

const { Pool } = pkg;
dotenv.config();

const saltRounds = 10;
const app = express();
const port = process.env.PORT || 3000;

// setting up your database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

// Cleanup job: run every hour
cron.schedule('0 * * * *', async () => {  // Runs every hour
    try {
      // Check for boxes older than 24 hours
      const result = await pool.query(
        'SELECT * FROM boxes WHERE created_at < NOW() - INTERVAL \'24 HOURS\''
      );
  
      if (result.rows.length > 0) {
        // Loop through all expired boxes
        for (const box of result.rows) {
          // Delete messages
          await pool.query('DELETE FROM messages WHERE box_id = $1', [box.id]);
          
          // Delete the box itself
          await pool.query('DELETE FROM boxes WHERE id = $1', [box.id]);
          console.log(`Box ${box.username} deleted after 24 hours.`);
        }
      }
    } catch (err) {
      console.error('❌ Error deleting expired boxes:', err);
    }
  });

// setting up routes

app.get('/', (req, res) => {
    res.render('index');
});


app.post('/create-box', async (req, res) => {
    const { username, password } = req.body;
  
    try {
      // Check if the username already exists
      const checkResult = await pool.query('SELECT * FROM boxes WHERE username = $1', [username]);
      if (checkResult.rows.length > 0) {
        return res.send('❌ Box with this username already exists.');
      }
  
      // Hash the password
      const hashedPassword = await bcrypt.hash(password, saltRounds);
  
      // Insert the new box with hashed password
      await pool.query('INSERT INTO boxes (username, password) VALUES ($1, $2)', [username, hashedPassword]);
  
      // Redirect to inbox login page
      res.redirect(`/inbox/${username}`);
    } catch (err) {
      console.error('❌ Error creating box:', err);
      res.send('Error creating box. Please try again.');
    }
  });

app.get('/box/:username', async (req, res) => {
    const { username } = req.params;

    try {
        const result = await pool.query('SELECT * FROM boxes WHERE username = $1', [username]);

        if (result.rows.length === 0) {
            return res.send('Box not found');   
        }
        res.render('box', {username});
    } catch (err) {
        console.error(err);
        res.send('Error Loading box.');
    }
});

app.post('/box/:username', async (req, res) => {
    const { username } = req.params;
    const { content } = req.body;

    // Set the maximum character limit
    const MAX_CHAR_LIMIT = 500;

    if (content.length > MAX_CHAR_LIMIT) {
        return res.send(`❌ Message exceeds the ${MAX_CHAR_LIMIT} character limit.`);
    }

    try {
        const boxResult = await pool.query('SELECT * FROM boxes WHERE username = $1', [username]);
        if (boxResult.rows.length === 0) {
            return res.send('Box not found');
        }
        const boxId = boxResult.rows[0].id;

        await pool.query('INSERT INTO messages (box_id, content) VALUES ($1, $2)', [boxId, content]);

        res.render('success', { username, content });
    } catch (err) {
        console.error(err);
        res.send('Error sending message.');
    }
});  

app.get('/inbox/:username', async (req, res) => {
    const { username } = req.params;
  
    try {
      const boxResult = await pool.query(
        'SELECT * FROM boxes WHERE username = $1',
        [username]
      );
  
      if (boxResult.rows.length === 0) {
        return res.send('Box not found.');
      }
  
      // ✅ Show the login form instead of inbox
      res.render('inbox-login', { username, error: null });
  
    } catch (err) {
      console.error(err);
      res.send('Error loading login page.');
    }
  });

  app.post('/inbox/:username', async (req, res) => {
    const { username } = req.params;
    const { password } = req.body;
  
    try {
      const boxResult = await pool.query(
        'SELECT * FROM boxes WHERE username = $1',
        [username]
      );
  
      if (boxResult.rows.length === 0) {
        return res.send('Box not found.');
      }
  
      const box = boxResult.rows[0];
  
      const isMatch = await bcrypt.compare(password, box.password);
      if (!isMatch) {
        return res.render('inbox-login', {
          username,
          error: '❌ Incorrect password!',
        });
      }
  
      const messagesResult = await pool.query(
        'SELECT * FROM messages WHERE box_id = $1 ORDER BY sent_at DESC',
        [box.id]
      );
  
      res.render('inbox', {
        username,
        messages: messagesResult.rows,
        messageCount: messagesResult.rows.length,
      });
  
    } catch (err) {
      console.error(err);
      res.send('Error loading inbox.');
    }
  });
  

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});