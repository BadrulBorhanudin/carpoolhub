require('dotenv').config();
const express = require('express');
const { ApolloServer } = require('@apollo/server');
const { expressMiddleware } = require('@apollo/server/express4');
const path = require('path');
const axios = require('axios');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { authMiddleware } = require('./utils/auth');

const { typeDefs, resolvers } = require('./schemas');
const db = require('./config/connection');

const PORT = process.env.PORT || 3001;
const app = express();

app.disable('x-powered-by');

app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  })
);

const clientOrigin = process.env.CLIENT_URL || 'http://localhost:3000';
app.use(
  cors({
    origin: clientOrigin,
    credentials: true,
  })
);
app.use(express.urlencoded({ extended: false, limit: '100kb' }));
app.use(express.json({ limit: '100kb' }));

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});

const graphqlLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});

app.use('/api', apiLimiter);
app.use('/graphql', graphqlLimiter);

const server = new ApolloServer({
  typeDefs,
  resolvers,
});

const startServer = async () => {
  await server.start();
  app.use(
    '/graphql',
    expressMiddleware(server, {
      context: authMiddleware,
    })
  );

  app.get('/api/autocomplete', async (req, res) => {
    try {
      const query = req.query.q;
      if (typeof query !== 'string' || !query.trim() || query.length > 100) {
        return res
          .status(400)
          .json({ error: 'Invalid or missing query parameter' });
      }

      const apiKey = process.env.LOCATIONIQ_API_KEY;
      if (!apiKey) {
        return res
          .status(500)
          .json({ error: 'Location autocomplete is currently unavailable' });
      }

      const response = await axios.get(
        'https://us1.locationiq.com/v1/autocomplete.php',
        {
          params: {
            key: apiKey,
            q: query.trim(),
            format: 'json',
          },
          timeout: 5000,
        }
      );

      if (!Array.isArray(response.data) || response.data.length === 0) {
        return res
          .status(404)
          .json({ error: 'No results found for this query.' });
      }

      const formattedAddresses = response.data.map((item) => item.display_name);
      res.json(formattedAddresses);
    } catch (err) {
      console.error('LocationIQ API Error occurred');
      if (err.response && err.response.status === 404) {
        return res
          .status(404)
          .json({ error: 'No results found for this query.' });
      }
      res
        .status(500)
        .json({ error: 'Failed to fetch location autocomplete suggestions' });
    }
  });

  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, '../client/dist')));

    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, '../client/dist/index.html'));
    });
  }

  db.once('open', () => {
    app.listen(PORT, () => {
      console.log(`API server running on port ${PORT}!`);
      console.log(`Use GraphQL at http://localhost:${PORT}/graphql`);
    });
  });
};

startServer();
