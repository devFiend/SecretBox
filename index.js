import express from 'express';
import bodyParser from 'body-parser';
import pg from 'pg';
import pkg from 'pg';
import dotenv from 'dotenv';
import ejs from 'ejs';

const { Pool } = pkg;
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// setting up your database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

// setting up routes

app.get('/', (req, res) => {
    res.render('index');
});


app.post('/create-box', async (req, res) => {
    const { username } = req.body;

    try {
        // Check if the username already exists
        const checkResult = await pool.query('SELECT * FROM boxes WHERE username = $1', [username]);
        if (checkResult.rows.length > 0) {
            return res.send('❌ Box with this username already exists.');
        }

        // Insert the new box
        const result = await pool.query('INSERT INTO boxes (username) VALUES ($1) RETURNING *', [username]);

        // Redirect to the newly created box page
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

    try {
        const boxResult = await pool.query('SELECT * FROM boxes WHERE username = $1', [username]);
        if (boxResult.rows.length === 0) {
            return res.send('Box not found');   
        }
        const boxId = boxResult.rows[0].id;

        await pool.query('INSERT INTO messages (box_id, content) VALUES ($1, $2)', [boxId, content]);

        res.send('Message sent anonymously!');
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
  
      const boxId = boxResult.rows[0].id;
      const messagesResult = await pool.query(
        'SELECT * FROM messages WHERE box_id = $1 ORDER BY sent_at DESC',
        [boxId]
      );
  
      res.render('inbox', {
        username,
        messages: messagesResult.rows,
        messageCount: messagesResult.rows.length,
      });
    } catch (err) {
      console.error(err);
      res.send('Error loading messages.');
    }
  });  

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});