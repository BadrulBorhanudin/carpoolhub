require('dotenv').config();
const { User, Ride } = require('../models');
const { signToken } = require('../utils/auth');
const CustomAuthenticationError = require('../utils/CustomAuthenticationError');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const resolvers = {
  Query: {
    // Retrieve all users and their rides with comments
    users: async () => {
      return User.find()
        .select('-password')
        .populate({
          path: 'rides',
          populate: 'comments',
        });
    },
    // Retrieve a single user by username with their rides and comments
    user: async (parent, { username }) => {
      return User.findOne({ username })
        .select('-password')
        .populate({
          path: 'rides',
          populate: 'comments',
        });
    },
    // Retrieve all rides, optionally filtered by username, sorted by creation date
    rides: async (parent, { username }) => {
      const params = username ? { username } : {};
      return Ride.find(params).sort({ createdAt: -1 }).populate('comments');
    },
    // Retrieve a single ride by its ID with comments
    ride: async (parent, { rideId }) => {
      return Ride.findOne({ _id: rideId }).populate('comments');
    },
    // Retrieve the logged-in user's data with their rides and comments
    me: async (parent, args, context) => {
      if (context.user) {
        return User.findOne({ _id: context.user._id })
          .select('-password')
          .populate({
            path: 'rides',
            populate: 'comments',
          });
      }
      throw new CustomAuthenticationError('Could not authenticate user');
    },
  },

  Mutation: {
    // Register a new user and return an authentication token
    addUser: async (parent, { username, email, password }) => {
      if (!username || !email || !password) {
        throw new CustomAuthenticationError(
          'Username, email, and password are required'
        );
      }
      if (password.length < 8 || password.length > 128) {
        throw new CustomAuthenticationError(
          'Password must be between 8 and 128 characters long'
        );
      }
      const user = await User.create({ username, email, password });
      const token = signToken(user);
      return { token, user };
    },
    // Authenticate a user and return an authentication token
    login: async (parent, { email, password }) => {
      if (!email || !password) {
        throw new CustomAuthenticationError('Invalid email or password');
      }

      const user = await User.findOne({ email });

      if (!user) {
        throw new CustomAuthenticationError('Invalid email or password');
      }

      const correctPw = await user.isCorrectPassword(password);

      if (!correctPw) {
        throw new CustomAuthenticationError('Invalid email or password');
      }

      const token = signToken(user);

      return { token, user };
    },
    // Add a new ride for the logged-in user
    addRide: async (
      parent,
      { origin, destination, date, time, isDriver },
      context
    ) => {
      if (!context.user) {
        throw new CustomAuthenticationError(
          'You need to be logged in to add a ride'
        );
      }

      const cleanOrigin = typeof origin === 'string' ? origin.trim() : '';
      const cleanDestination =
        typeof destination === 'string' ? destination.trim() : '';
      const cleanDate = typeof date === 'string' ? date.trim() : '';
      const cleanTime = typeof time === 'string' ? time.trim() : '';

      if (!cleanOrigin || !cleanDestination || !cleanDate || !cleanTime) {
        throw new CustomAuthenticationError('All ride fields are required');
      }

      const ride = await Ride.create({
        origin: cleanOrigin,
        destination: cleanDestination,
        date: cleanDate,
        time: cleanTime,
        isDriver: Boolean(isDriver),
        rideAuthor: context.user.username,
      });

      await User.findOneAndUpdate(
        { _id: context.user._id },
        { $addToSet: { rides: ride._id } }
      );

      return ride;
    },
    // Add a comment to a ride
    addComment: async (parent, { rideId, commentText }, context) => {
      if (!context.user) {
        throw new CustomAuthenticationError(
          'You need to be logged in to add a comment'
        );
      }

      const trimmedText =
        typeof commentText === 'string' ? commentText.trim() : '';
      if (!trimmedText || trimmedText.length > 280) {
        throw new CustomAuthenticationError(
          'Comment must be between 1 and 280 characters'
        );
      }

      return Ride.findOneAndUpdate(
        { _id: rideId },
        {
          $addToSet: {
            comments: {
              commentText: trimmedText,
              commentAuthor: context.user.username,
            },
          },
        },
        {
          new: true,
          runValidators: true,
        }
      );
    },
    // Remove a ride created by the logged-in user
    removeRide: async (parent, { rideId }, context) => {
      if (context.user) {
        const ride = await Ride.findOneAndDelete({
          _id: rideId,
          rideAuthor: context.user.username,
        });

        await User.findOneAndUpdate(
          { _id: context.user._id },
          { $pull: { rides: ride._id } }
        );

        return ride;
      }
      throw new CustomAuthenticationError(
        'You need to be logged in to remove a ride'
      );
    },
    // Remove a comment from a ride created by the logged-in user
    removeComment: async (parent, { rideId, commentId }, context) => {
      if (context.user) {
        return Ride.findOneAndUpdate(
          { _id: rideId },
          {
            $pull: {
              comments: {
                _id: commentId,
                commentAuthor: context.user.username,
              },
            },
          },
          { new: true }
        );
      }
      throw new CustomAuthenticationError(
        'You need to be logged in to remove a comment'
      );
    },
    // Edit a comment on a ride created by the logged-in user
    editComment: async (
      parent,
      { rideId, commentId, commentText },
      context
    ) => {
      if (!context.user) {
        throw new CustomAuthenticationError(
          'You need to be logged in to edit a comment'
        );
      }

      const trimmedText =
        typeof commentText === 'string' ? commentText.trim() : '';
      if (!trimmedText || trimmedText.length > 280) {
        throw new CustomAuthenticationError(
          'Comment must be between 1 and 280 characters'
        );
      }

      const ride = await Ride.findOneAndUpdate(
        {
          _id: rideId,
          comments: {
            $elemMatch: {
              _id: commentId,
              commentAuthor: context.user.username,
            },
          },
        },
        { $set: { 'comments.$.commentText': trimmedText } },
        { new: true }
      );

      if (!ride) {
        throw new CustomAuthenticationError(
          'Comment not found or you are not authorized to edit this comment'
        );
      }

      return ride;
    },
    // Create a Stripe checkout session for donations
    createCheckoutSession: async (parent, { donationAmount }, context) => {
      if (!context.user) {
        throw new CustomAuthenticationError(
          'You need to be logged in to create a checkout session'
        );
      }

      const amount = Number(donationAmount);
      if (isNaN(amount) || amount < 1 || amount > 10000) {
        throw new CustomAuthenticationError(
          'Donation amount must be between $1 and $10,000'
        );
      }

      const successUrl =
        process.env.SUCCESS_URL || 'http://localhost:3000/success';
      const cancelUrl =
        process.env.CANCEL_URL ||
        process.env.SUCCESS_URL ||
        'http://localhost:3000/support';

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'aud',
              product_data: {
                name: 'Donation to CarPoolHub',
              },
              unit_amount: Math.round(amount * 100),
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: cancelUrl,
      });

      return { id: session.id };
    },
  },
};

module.exports = resolvers;
