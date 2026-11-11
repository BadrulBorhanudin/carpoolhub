const jwt = require('jsonwebtoken');
const CustomAuthenticationError = require('./CustomAuthenticationError');
require('dotenv').config();

const secret = process.env.JWT_SECRET;
const expiration = process.env.JWT_EXPIRATION;

if (!secret) {
  throw new Error('JWT_SECRET must be defined in .env file');
}

if (!expiration) {
  throw new Error('JWT_EXPIRATION must be defined in .env file');
}

module.exports = {
  AuthenticationError: CustomAuthenticationError,

  // Middleware to authenticate user by verifying JWT
  authMiddleware: function ({ req }) {
    let token = req.headers.authorization || req.body.token;

    if (req.headers.authorization) {
      token = token.split(' ').pop().trim();
    }

    if (!token) {
      return req;
    }

    try {
      const { data } = jwt.verify(token, secret, { maxAge: expiration });
      req.user = data;
    } catch {
      console.log('Invalid token');
    }

    return req;
  },

  // Function to sign a token with user data
  signToken: function ({ email, username, _id }) {
    const payload = { email, username, _id };
    return jwt.sign({ data: payload }, secret, { expiresIn: expiration });
  },
};
