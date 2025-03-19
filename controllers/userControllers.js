const catchAsync = require("../utils/catchAsync");
const User = require("../models/userModel");
const Chats = require("../models/chatModel");
const createError = require("../utils/createError");
const jwt = require("jsonwebtoken");
const { promisify } = require("util");

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

exports.protect = catchAsync(async (req, res, next) => {

  if (!req.cookies["jwt"]) {
    return next(
      createError("You are not logged in, please log in to get access", 401)
    );
  } else token = req.cookies["jwt"];

  if (!token) {
    return next(
      createError("You are not logged in, please log in to get access", 401)
    );
  }

  //2) validate token
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  //3)check if user exists
  const currentUser = await User.findById(decoded.id);
  if (!currentUser) {
    return next(
      createError("The user belonging to this token no longer exists!", 401)
    );
  }

  //4)check if password changed after token issued
  if (currentUser.changedPasswordAfter(decoded.iat)) {
    return next(
      createError("The password has been changed! Please log in again", 401)
    );
  }

  req.user = currentUser;

  //Grant access to the protected route
  next();
});

exports.createUser = catchAsync(async (req, res) => {
  req.body.passwordChangedAt = parseInt(Date.now());
  const newUser = await User.create({...req.body, status: "online"});
  const chat_data = {
    username: req.body.username,
    chats: new Map()
  }
  await Chats.create(chat_data)

  const token = signToken(newUser._id);

  res.cookie("jwt", token, {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    secure: true,
    httpOnly: true,
    sameSite: "None"
  });

  res.status(201).json({
    status: "success",
    data: {
      user: newUser,
    },
  });
});

exports.loginUser = catchAsync(async (req, res, next) => {
  const { username, password } = req.body;
  console.log(username, password);

  if (!username || !password) {
    return next(createError("Write Credentials", 206));
  }

  const user = await User.findOne({ username }).select("+password");

  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(createError("Incorrect username or password", 406));
  }

  const token = signToken(user._id);
  res.cookie("jwt", token, {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    secure: true,
    httpOnly: true,
    sameSite: "None"
  });
  res.status(200).json({
    status: "success",
    token,
  });
});

exports.checker = catchAsync(async (req, res, next) => {
  const token = req.cookies["jwt"];

  //2) validate token
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  //3)check if user exists
  const currentUser = await User.findById(decoded.id);

  if (!currentUser) {
    res.json({
      status: "user absent",
    });
  }

  //4)check if password changed after token issued
  else if (currentUser.changedPasswordAfter(decoded.iat)) {
    res.json({
      status: "password changed",
    });
  }

  //redirect to home
  else {
    res.json({
      status: "success",
    });
  }
});

exports.isOnline = catchAsync(async (req, res) => {
  res.json({
    status: await User.findOne({ username: req.body.newUser }, { status: 1 }),
  });
})