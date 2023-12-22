const env = require('env-var')

const REDIS_HOST = env.get('REDIS_HOST').required().asString()
const REDIS_PORT = env.get('REDIS_PORT').required().asPortNumber()

const MONGO_HOST = env.get('MONGO_HOST').required().asString()
const MONGO_PORT = env.get('MONGO_PORT').required().asPortNumber()
const MONGO_DB = env.get('MONGO_DB').required().asString()
const MONGO_USER = env.get('MONGO_USER').required().asString()
const MONGO_PASSWORD = env.get('MONGO_PASSWORD').required().asString()

const TWITTER_ACCESS_TOKEN = env.get('TWITTER_ACCESS_TOKEN').required().asString()
const TWITTER_ACCESS_TOKEN_SECRET = env.get('TWITTER_ACCESS_TOKEN_SECRET').required().asString()

const SESSION_SECRET = env.get('SESSION_SECRET').required().asString()

module.exports = {
  sessionSecret: SESSION_SECRET,
  redis: {
    url: `redis://${REDIS_HOST}:${REDIS_PORT}`,
  },
  mongo: {
    connectionString: `mongodb://${MONGO_USER}:${MONGO_PASSWORD}@${MONGO_HOST}:${MONGO_PORT}/${MONGO_DB}?authSource=admin`,
  },
  twitter: {
    consumerKey: TWITTER_ACCESS_TOKEN,
    consumerSecret: TWITTER_ACCESS_TOKEN_SECRET,
  },
}
