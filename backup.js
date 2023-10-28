let fs = require('fs');
let express = require('express');
let session = require('express-session');
let bodyParser = require('body-parser');
let app = express();
app.use(express.static('public'));

app.set('view engine', 'ejs');

app.use(session({ secret: 'keyboard cat', resave: false, saveUninitialized: true }));
app.use(bodyParser.urlencoded({ extended: true }));

let threads;

// Load threads from the database.txt file
fs.readFile('database.txt', 'utf8', (err, data) => {
  if (err) {
    console.error('Error loading threads from database:', err);
    threads = [];
  } else {
    try {
      threads = JSON.parse(data);
      console.log('Threads loaded from database.');
    } catch (error) {
      console.error('Error parsing threads data:', error);
      threads = [];
    }
  }
});

// Save threads to the database.txt file
function saveThreads() {
  fs.writeFile('database.txt', JSON.stringify(threads), 'utf8', (err) => {
    if (err) {
      console.error('Error writing to database:', err);
    } else {
      console.log('Threads saved to database.');
    }
  });
}

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

// Get the list of threads with newer posts at the top
function getThreads() {
  return threads.slice().reverse();
}

// Forum route (GET)
app.get('/forum', (req, res) => {
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
      // Logic to change the user's name
      fs.readFile('users.txt', 'utf8', (err, data) => {
        if (err) {
          console.error('Error reading user data:', err);
          // Handle the error, e.g., render an error page
          res.render('error', { message: 'Error reading user data' });
          return;
        }
  
        let users = data.trim().split('\n').map(line => {
          const [existingUsername, password] = line.split(':');
          return { username: existingUsername, password };
        });
  
        const userIndex = users.findIndex(user => user.username === username);
  
        if (userIndex === -1) {
          console.error('User not found');
          // Handle the error, e.g., render an error page
          res.render('error', { message: 'User not found' });
          return;
        }
  
        // Update the user's name
        users[userIndex].username = newName;
  
        const updatedUserList = users.map(user => `${user.username}:${user.password}`).join('\n');
  
        fs.writeFile('users.txt', updatedUserList, 'utf8', err => {
          if (err) {
            console.error('Error updating user name:', err);
            // Handle the error, e.g., render an error page
            res.render('error', { message: 'Error updating user name' });
            return;
          }
  
          console.log('User name updated successfully');
          // Redirect to the profile page after name change
          res.redirect('/profile');
        });
      });
    } else {
      res.redirect('/login');
    }
  });
  
  
  
  // Change Password route (POST)
  app.post('/profile/change-password', (req, res) => {
    const { currentPassword, newPassword } = req.body;
    // Logic to change the user's password
    // Implement your password change logic here
    // Replace the following line with your code
    console.log('Changing password:', currentPassword, newPassword);
  
    // Redirect to the profile page after password change
    res.redirect('/profile');
  });
  
  // Add Bio route (POST)
  app.post('/profile/add-bio', (req, res) => {
    const { bio } = req.body;
    // Logic to add the user's bio
    // Implement your bio addition logic here
    // Replace the following line with your code
    console.log('Adding bio:', bio);
  
    // Redirect to the profile page after bio addition
    res.redirect('/profile');
  });
  
  // User Profile route (GET)
  app.get('/profile', (req, res) => {
    // Logic to fetch and render the user's profile data
    // Implement the logic to retrieve the user's profile data from your database or file
  
    // For example, you can return dummy data for testing
    const user = {
      username: 'john_doe',
      name: 'John Doe',
      bio: 'This is my bio.'
    };
  
    res.render('profile', { user });
  });  
  
// Login route
app.get('/login', (req, res) => {
  res.render('login');
});

// Login form submission
app.post('/login', (req, res) => {
    const { username, password } = req.body;
  
    // Read user data from users.txt file
    fs.readFile('users.txt', 'utf8', (err, data) => {
      if (err) {
        console.error('Error reading user data:', err);
        // Handle the error, e.g., render an error page
        res.render('error', { message: 'Error reading user data' });
        return;
      }
  
      const users = data.trim().split('\n').map(line => {
        const [existingUsername, existingPassword] = line.split(':');
        return { username: existingUsername, password: existingPassword };
      });
  
      const user = users.find(user => user.username === username && user.password === password);
  
      if (user) {
        // Store the username in the session
        req.session.username = username;
        // Redirect to home page after successful login
        res.redirect('/forum');
      } else {
        // Render an error page or display an error message
        res.render('error', { message: 'Invalid username or password' });
      }
    });
  });

// Admin route
app.get('/admin', isAdmin, (req, res) => {
    // Render the admin page
    res.render('admin');
  });
  
  // Middleware to check if the user is an admin
  function isAdmin(req, res, next) {
    // Check if the user is an admin
    const isAdmin = // Middleware to check if the user is an admin
    function isAdmin(req, res, next) {
      // Check if the user is an admin
      const isAdmin = req.user && req.user.isAdmin; // Assuming you have a user object with an `isAdmin` property
    
      if (isAdmin) {
        next(); // User is an admin, proceed to the next middleware/route handler
      } else {
        // User is not an admin, redirect to the login page or display an error message
        res.render('error', { message: 'Unauthorized access' });
      }
    }
    
    
    if (isAdmin) {
      next(); // User is an admin, proceed to the next middleware/route handler
    } else {
      // User is not an admin, redirect to the login page or display an error message
      res.render('error', { message: 'Unauthorized access' });
    }
  }
  
  
  

//ranks
// Assuming you have an array of ranks stored somewhere
const ranksData = ['Admin', 'Moderator', 'User'];

// Function to retrieve ranks
function getRanks() {
  return ranksData;
}

  // Define your users array or replace it with your actual data source
const users = [
    { id: 1, username: 'user1', role: 'user' },
    { id: 2, username: 'user2', role: 'user' },
    { id: 3, username: 'user3', role: 'user' }
  ];
  
  // Function to retrieve users
  function getUsers() {
    return users;
  }
  
  
  function isAdmin(req, res, next) {
    // Check if user is authenticated
    if (req.session && req.session.user && req.session.user.isAdmin) {
      return next(); // User is authenticated and has admin privileges
    }
  
    // User is not authenticated or does not have admin privileges
    res.redirect('/login'); // Redirect to login page or any other appropriate action
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

// Promote User route (POST)
app.post('/admin/user/promote/:username', (req, res) => {
    const { username } = req.params;
    
    // Check if the user is an admin (or has higher privileges)
    if (isAdminUser(req.session.username)) {
      // Logic to promote the user
      // Implement your own user promotion logic here based on the provided username
      // For example, you can update the user's rank in the users.txt file
      const userData = fs.readFileSync('users.txt', 'utf8');
      const users = userData.trim().split('\n').map(line => {
        const [existingUsername, existingPassword, existingRank] = line.split(':');
        return { username: existingUsername, password: existingPassword, rank: existingRank };
      });
  
      // Find the user by username
      const user = users.find(user => user.username === username);
  
      // Update the user's rank (e.g., promote to admin)
      if (user) {
        user.rank = 'admin'; // Replace 'admin' with the desired rank
        const updatedUserData = users.map(user => `${user.username}:${user.password}:${user.rank}`).join('\n');
        fs.writeFileSync('users.txt', updatedUserData, 'utf8');
      }
  
      // Redirect to the admin panel or display a success message
      res.redirect('/admin');
    } else {
      // Redirect to login page or display an error message
      res.render('error', { message: 'Unauthorized access' });
    }
  });

  // Create Rank route (POST)
app.post('/admin/rank/create', (req, res) => {
    const { rankName } = req.body;
    
    // Check if the user is an admin (or has higher privileges)
    if (isAdminUser(req.session.username)) {
      // Logic to create a new rank
      // Implement your own rank creation logic here based on the provided rank name
      // For example, you can update the ranks.txt file with the new rank
      fs.appendFileSync('ranks.txt', `${rankName}\n`, 'utf8');
  
      // Redirect to the admin panel or display a success message
      res.redirect('/admin');
    } else {
      // Redirect to login page or display an error message
      res.render('error', { message: 'Unauthorized access' });
    }
  });
  
// Delete Thread route (POST)
app.post('/admin/thread/delete/:id', (req, res) => {
    const { id } = req.params;
    
    // Check if the user is an admin (or has higher privileges)
    if (isAdminUser(req.session.username)) {
      // Logic to delete the thread
      // Implement your own thread deletion logic here based on the provided thread ID
      // For example, you can filter the threads array and remove the matching thread
      threads = threads.filter(thread => thread.id !== id);
      saveThreads();
  
      // Redirect to the admin panel or display a success message
      res.redirect('/admin');
    } else {
      // Redirect to login page or display an error message
      res.render('error', { message: 'Unauthorized access' });
    }
  });

// Start the server
app.listen(3000, () => {
  console.log('Server started on port 3000');
});
