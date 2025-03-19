const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    validate: {
      validator: function(str){
        return !str.includes(" ")
      },
      message: "Username cannot have blank spaces"
    },
    unique: true,
    required: [true, 'Please tell us your name!'],
  },
  email: {
    type: String,
    validate: [validator.isEmail, 'Email malformed'],
    lowercase: true,
  },
  password: {
    type: String,
    required: [true, 'Please enter the password'],
    minlength: 8,
    select: false,
  },
  passwordConfirm: {
    type: String,
    required: [true, 'Please confirm your password'],
    validate: {
      validator: function (val) {
        return val === this.password;
      },
      message: 'Confirm password should be same as password',
    },
  },
  passwordChangedAt: Date,
  passwordResetToken: String,
  passwordResetExpires: Number,
  status: {
    type: String,
    enum: ["online", "offline"],
  }
});

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  this.password = await bcrypt.hash(this.password, 1);
  this.passwordConfirm = undefined;
  next();
});

userSchema.pre("save", function(next){
  if(!this.isModified("password") || this.isNew) return next()

  this.passwordChangedAt = Date.now()
  next()
})

userSchema.methods.correctPassword = async function (
  candidatePassword,
  userPassword
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  const changedTimestamp = parseInt(this.passwordChangedAt.getTime() / 1000);
  if (this.passwordChangedAt) {
    return JWTTimestamp < changedTimestamp;
  }
  return false;
};

userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString('hex');

  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  this.passwordResetExpires = Date.now() + 10*60*1000

  return resetToken
};

module.exports = mongoose.model('User', userSchema, "users");