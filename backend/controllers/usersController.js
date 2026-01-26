const User = require("../models/user");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const register = async (req, res) => {
  try {
    const { username, password } = req.body;
    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({ username, password: hash });
    res.json({ message: "User registered", userId: user.id });
  } catch (err) {
    res.status(400).json({ error: "Username taken" });
  }
};

const login = async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ where: { username } });
    if (!user) return res.status(404).json({ error: "User not found" });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ error: "Invalid password" });

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET);
    res.json({ message: "Login success", token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { register, login };
