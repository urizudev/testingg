const fs = require('fs');
const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const app = express();

app.use(express.static('public'));
app.set('view engine', 'ejs');

app.use(session({ secret: 'keyboard cat', resave: false, saveUninitialized: true }));
app.use(bodyParser.urlencoded({ extended: true }));

let threads = [];

// Load threads from the database.txt file
fs.readFile('database.txt', 'utf8', (err, data) => {
  if (err) {
    console.error('Error loading threads from database:', err);
  } else {
    try {
      threads = JSON.parse(data);
      console.log('Threads loaded from the database.');
    } catch (error) {
      console.error('Error parsing threads data:', error);
    }
  }
});

// Save threads to the database.txt file
function saveThreads() {
  fs.writeFile('database.txt', JSON.stringify(threads), 'utf8', (err) => {
    if (err) {
      console.error('Error writing to the database:', err);
    } else {
      console.log('Threads saved to the database.');
    }
  });
}

// Sign up route
app.get('/signup', (req, res) => {
  res.render('signup');
});

// Sign up form submission
app.post('/signup', (req, res) => {
  const { username, password } = req.body;
  // Validate username and password
  // Add your own validation logic here
  
  // Save user data in users.txt file
  const user = `${username}:${password}\n`;
  fs.appendFile('users.txt', user, (err) => {
    if (err) throw err;
    console.log('User registered successfully!');
  });

  // Redirect to login page after successful sign-up
  res.redirect('/login');
});



// Create a new thread
app.post('/thread/create', (req, res) => {
  const { title, content } = req.body;
  const thread = {
    id: Date.now().toString(),
    title,
    content,
    username: req.session.username,
  };

  threads.push(thread);
  saveThreads();

  res.redirect(`/thread/${thread.id}`);
});

// Get the list of threads
function getThreads() {
  return threads.slice().reverse();
}

// Forum route (GET)
app.get('/forum', authenticateUser, (req, res) => {
  const username = req.session.username;
  res.render('forum', { username, threads: getThreads() });
});


// Thread route (GET)
app.get('/thread/:id', (req, res) => {
  const { id } = req.params;
  const thread = threads.find(t => t.id === id);

  if (!thread) {
    res.status(404).send('Thread not found');
  } else {
    const repliesFilePath = 'replies.txt';
    fs.readFile(repliesFilePath, 'utf8', (err, replyData) => {
      if (err) throw err;
      const replies = replyData
        .trim()
        .split('\n')
        .map(line => {
          const [replyThreadId, replyContent] = line.split(':');
          return { threadId: replyThreadId, content: replyContent };
        })
        .filter(reply => reply.threadId === id);

      res.render('thread', { thread, replies });
    });
  }
});

// Create Reply route (POST)
app.post('/thread/:id/reply', (req, res) => {
  const { id } = req.params;
  const { content } = req.body;
  const username = req.session.username;

  if (username) {
    const reply = `${id}:${content}\n`;
    fs.appendFile('replies.txt', reply, (err) => {
      if (err) throw err;
      console.log('Reply saved successfully!');
    });
    res.redirect(`/thread/${id}`);
  } else {
    res.redirect('/login');
  }
});

// Logout route
app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/login');
});

// Change Name route (POST)
app.post('/profile/change-name', (req, res) => {
  const { newName } = req.body;
  const username = req.session.username;
  if (username) {
    req.session.username = newName;
    res.redirect('/profile');
  } else {
    res.redirect('/login');
  }
});

app.get('/profile', authenticateUser, (req, res) => {
  const username = req.session.username;
  res.render('profile', { username });
});

// Middleware to authenticate user
function authenticateUser(req, res, next) {
  const username = req.session.username;

  if (username) {
    next(); // User is authenticated, continue to the next middleware or route handler
  } else {
    res.redirect('/login'); // User is not authenticated, redirect to the login page
  }
}

// Login route (GET)
app.get('/login', (req, res) => {
  res.render('login', { noCSS: true });
});

// Login route (POST)
app.post('/login', (req, res) => {
  const { username } = req.body;
  req.session.username = username;
  res.redirect('/forum');
});

// Admin login route (GET)
app.get('/admin-login', (req, res) => {
  res.render('admin-login', { noCSS: true });
});  

// Change Bio route (POST)
app.post('/profile/add-bio', (req, res) => {
  const { bio } = req.body;
  const username = req.session.username;

  if (username) {
    // Update the user's bio in the session or database
    // For example, if you have a user object in the session, you can update the bio like this:
    req.session.user = req.session.user || {}; // Initialize the user object if it doesn't exist
    req.session.user.bio = bio;

    res.redirect('/profile');
  } else {
    res.redirect('/login');
  }
});


// Admin login route (POST)
app.post('/admin/login', (req, res) => {
  // Handle the form submission
  // Validate the login credentials
  // Perform authentication logic
  
  // Redirect the user to the admin dashboard or display an error message
});

// Redirect root URL to login page
app.get('/', (req, res) => {
  res.redirect('/login');
});

app.get('*', function(req, res){
  res.status(404).send('404 Not Found');
});

// Server listening
app.listen(3000, () => {
  console.log('Server listening on port 3000');
});
