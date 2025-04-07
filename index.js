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

console.log("🔗 DB URL:", process.env.DATABASE_URL);


// setting up your database connection
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false,
    },
  });
  

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

// Cleanup job: run every minute
cron.schedule('* * * * *', async () => {  // Runs every minute
    try {
        // Delete messages older than 30 minutes
        const result = await pool.query(
            'DELETE FROM messages WHERE sent_at < NOW() - INTERVAL \'30 MINUTES\''
        );
  
        if (result.rowCount > 0) {
            console.log(`${result.rowCount} message(s) deleted as they were older than 30 minutes.`);
        }
    } catch (err) {
        console.error('❌ Error deleting old messages:', err);
    }
});


  app.get('/init-db', async (req, res) => {
    try {
      await pool.query(`
        CREATE TABLE  boxes (
          id SERIAL PRIMARY KEY,
          username VARCHAR(255) UNIQUE NOT NULL,
          password TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
  
        CREATE TABLE  messages (
          id SERIAL PRIMARY KEY,
          box_id INTEGER REFERENCES boxes(id) ON DELETE CASCADE,
          content TEXT NOT NULL,
          sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      res.send('✅ Tables created!');
    } catch (err) {
      console.error('❌ SQL Error:', err.message); // log the actual error
      res.send(`❌ Error creating tables: ${err.message}`);
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

      // Format the `sent_at` field to just show the time (HH:mm:ss)
      const formattedMessages = messagesResult.rows.map(message => {
        // Convert the UTC string into a Date object
        const date = new Date(message.sent_at);
      
        // Format it to the local time (using 'en-US' for 12-hour time format, you can adjust this based on your needs)
        const time = date.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        });
      
        message.sent_at = time; // Update sent_at with the formatted time
        return message;
      });
  
      res.render('inbox', {
        username,
        messages: formattedMessages,
        messageCount: formattedMessages.length,
      });
  
    } catch (err) {
      console.error(err);
      res.send('Error loading inbox.');
    }
});

  

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});