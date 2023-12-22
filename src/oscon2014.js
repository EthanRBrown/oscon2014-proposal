const env = require('env-var')
const redis = require('redis')
const session = require('express-session')
const RedisStore = require('connect-redis').default

const config = require('./config.js')

const PORT = env.get('PORT').default('8080').asPortNumber()

var http = require('http')
var express = require('express')
var handlebars = require('express-handlebars').create({
  defaultLayout: 'main',
  helpers: {
    section: function (name, options) {
      if (!this._sections) this._sections = {}
      this._sections[name] = options.fn(this)
      return null
    },
  },
})
var fs = require('fs')
var Vote = require('./_models/vote.js')

var app = express()

app.set('port', PORT)

// redis client
const redisClient = redis.createClient({ url: config.redis.url })
if (app.get('env') === 'production')
  redisClient.connect().catch(err => console.error(`failure connecting redis client:`, err))

const redisStore = new RedisStore({
  client: redisClient,
  prefix: 'oscon2014:',
})

if (app.get('env') == 'development') app.use(require('morgan')('dev'))

app.use(
  session({
    secret: config.sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: { secure: app.get('env') === 'production' },
    store: app.get('env') === 'production' ? redisStore : undefined,
  })
)

var mongoose = require('mongoose')
mongoose.connect(config.mongo.connectionString)

require('./_lib/auth.js')(app, config)

app.engine('handlebars', handlebars.engine)
app.set('view engine', 'handlebars')

app.use(express.static(__dirname + '/public'))

app.get('/video/intro', function (req, res) {
  res.redirect('https://vimeo.com/85503200')
})

var VOTES_PER_USER = 3

app.use(async function (req, res, next) {
  var user = req.user
  if (!user) return next()
  const votes = await Vote.find({ userId: user._id })
  res.locals.user = {
    id: user.id,
    _id: user._id,
    votes: votes.map(vote => vote.proposal),
    votesAvailable: VOTES_PER_USER,
    votesRemaining: VOTES_PER_USER - votes.length,
  }
  res.locals.user.outOfVotes = res.locals.user.votesRemaining === 0
  res.locals.yesVote = votes.some(vote => vote.proposal === req.path.toLowerCase())
  next()
})

app.get('/', function (req, res) {
  res.render('title')
})

app.get('/vote', async function (req, res) {
  var user = res.locals.user
  if (!user) res.status(401).render('401')
  const votes = await Vote.find({ userId: user._id })
  if (votes.length < VOTES_PER_USER) {
    await new Vote({ userId: user._id, proposal: req.query.proposal.toLowerCase(), date: new Date() }).save()
    res.redirect(302, req.query.proposal)
  }
})

app.get('/unvote', async function (req, res) {
  var user = res.locals.user
  if (!user) return res.status(401).render('401')
  await Vote.deleteOne({ userId: user._id, proposal: req.query.proposal })
  res.redirect(302, req.query.proposal)
})

var proposals = {
  '/page4': 'BE THE COMPOSER',
  '/page5': 'DARE YOU ACCEPT THE CHALLENGE',
  '/page7': 'YOU CHOOSE THE ADVENTURE',
  '/page8': 'GOING VIRAL',
  '/page9': 'POSTMODERN POINTILLISM',
  '/page11': 'WHERE WILL YOU BE?',
  '/page12': 'DEGREES OF SEPARATION',
  '/page13': 'YOU ARE THE HEAT MAP',
  '/page28': 'OSCONOPHONE',
  '/page29': 'DIGITAL DANCING',
}

app.get('/results', async function (req, res) {
  // prevent this page from being indexed
  res.locals.noRobots = true
  // user not logged in -- show login dialog
  if (!req.user) return res.render('results')
  // display results
  const votes = await Vote.find()
  context = {
    votes: votes.reduce(function (c, v) {
      var x = c.find(y => y.path === y.proposal)
      if (!x) {
        x = {
          path: v.proposal,
          name: proposals[v.proposal],
          count: 0,
        }
        c.push(x)
      }
      x.count++
      return c
    }, []),
  }
  context.votes.sort((a, b) => b.count - a.count)
  Object.defineProperty(context.votes, 'total', {
    value: context.votes.reduce((c, v) => c + v.count, 0),
    enumerable: false,
  })
  return res.render('results', context)
})

app.get('/status', async function (req, res) {
  const votes = await Vote.find()
  return res.json({
    status: 'okay',
    votes: votes.length,
  })
})

var autoViews = {}

app.use(function (req, res, next) {
  var view = autoViews[req.path]
  if (!view) {
    view = __dirname + '/views/' + req.path + '.handlebars'
    if (!fs.existsSync(view)) return next()
    autoViews[req.path] = view
  }
  res.render(view)
})

app.use(function (req, res, next) {
  res.status(404).render('404')
})

app.use(function (err, req, res, next) {
  // TODO: Sentry
  console.error(err)
  res.status(500).render('500')
})

http.createServer(app).listen(app.get('port'), function () {
  console.log(`terror started on port ${app.get('port')} (env=${app.get('env')})`)
})
