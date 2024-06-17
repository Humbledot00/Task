const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(cors());
app.use(express.static('public'));

mongoose.connect('mongodb+srv://workforshreyas', { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('Error connecting to MongoDB', err));

const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  gender: String
});

const User = mongoose.model('User', userSchema);

const categorySchema = new mongoose.Schema({
  name: String,
  description: String
});

const Category = mongoose.model('Category', categorySchema);

const recordSchema = new mongoose.Schema({
    name: String,
    description: String,
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
    active: Boolean
  });
  
  const Record = mongoose.model('Record', recordSchema);
  

// User authentication routes
app.post('/register', async (req, res) => {
  const { name, email, password, gender } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  const user = new User({ name, email, password: hashedPassword, gender });
  try {
    await user.save();
    res.status(201).send({ message: 'User registered successfully' });
  } catch (err) {
    res.status(400).send({ message: 'Error registering user', error: err.message });
  }
});

app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).send({ message: 'User not found' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).send({ message: 'Invalid credentials' });

    const token = jwt.sign({ userId: user._id }, 'your_jwt_secret');
    res.send({ token });
  } catch (err) {
    res.status(500).send({ message: 'Server error', error: err.message });
  }
});

// Category routes
app.get('/categories', async (req, res) => {
  try {
    const categories = await Category.find();
    res.send(categories);
  } catch (err) {
    res.status(500).send({ message: 'Server error', error: err.message });
  }
});

app.get('/records', async (req, res) => {
    try {
      let filter = {};
  
      // Check if 'active' query parameter exists and is valid
      if (req.query.active !== undefined) {
        filter.active = req.query.active === 'true'; // Convert string to boolean
      }
  
      // Check if 'search' query parameter exists and perform name search
      if (req.query.search) {
        filter.name = { $regex: req.query.search, $options: 'i' }; // Case-insensitive regex search
      }
  
      const records = await Record.find(filter).populate('category');
      res.json(records);
    } catch (err) {
      res.status(500).send({ message: 'Server error', error: err.message });
    }
  });
  

app.post('/records', async (req, res) => {
  const { name, description, category, active } = req.body;
  try {
    const record = new Record({ name, description, category, active });
    await record.save();
    res.status(201).send({ message: 'Record created successfully' });
  } catch (err) {
    res.status(400).send({ message: 'Error creating record', error: err.message });
  }
});

// Delete multiple records by IDs
app.delete('/records', async (req, res) => {
    try {
      const { recordIds } = req.body;
      const result = await Record.deleteMany({ _id: { $in: recordIds } });
      res.json({ message: `${result.deletedCount} records deleted successfully` });
    } catch (err) {
      res.status(500).send({ message: 'Server error', error: err.message });
    }
  });

app.put('/records/:id', async (req, res) => {
  const { id } = req.params;
  const { name, description, category, active } = req.body;
  try {
    const record = await Record.findByIdAndUpdate(id, { name, description, category, active }, { new: true });
    if (!record) return res.status(404).send({ message: 'Record not found' });
    res.send({ message: 'Record updated successfully' });
  } catch (err) {
    res.status(400).send({ message: 'Error updating record', error: err.message });
  }
});

app.delete('/records/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const record = await Record.findByIdAndDelete(id);
    if (!record) return res.status(404).send({ message: 'Record not found' });
    res.send({ message: 'Record deleted successfully' });
  } catch (err) {
    res.status(500).send({ message: 'Server error', error: err.message });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
