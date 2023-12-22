var passport = require('passport')
var TwitterStrategy = require('passport-twitter')
var User = require('../_models/user.js')

passport.serializeUser(async function (id, done) {
  try {
    let user = await User.findOne({ id })
    if (user) return done(null, id)
    user = new User({ id: id, created: new Date() })
    await user.save()
    return done(null, user)
  } catch (err) {
    return done(err, null)
  }
})

passport.deserializeUser(async function (id, done) {
  if (typeof id === 'object') id = id.id
  try {
    const user = await User.findOne({ id: id })
    if (!user) return done('Unknown user: ' + id, null)
    done(null, user)
  } catch (err) {
    return done(err, null)
  }
})

module.exports = function (app, config) {
  passport.use(
    new TwitterStrategy(
      {
        consumerKey: config.twitter.consumerKey,
        consumerSecret: config.twitter.consumerSecret,
        callbackURL: '/auth/twitter/callback',
      },
      (_token, _tokenSecret, profile, done) => done(null, '@' + profile.username)
    )
  )

  app.use(passport.initialize())
  app.use(passport.session())

  app.get('/auth/twitter', (req, res, next) =>
    passport.authenticate('twitter', {
      callbackURL: '/auth/twitter/callback?redirect=' + encodeURIComponent(req.query.redirect),
    })(req, res, next)
  )

  app.get(
    '/auth/twitter/callback',
    passport.authenticate('twitter', { failureRedirect: '/auth/failed' }),
    function (req, res, next) {
      res.redirect(302, req.query.redirect || '/')
    }
  )

  app.get('/logout', function (req, res) {
    req.logout(() => res.redirect(303, req.query.redirect || '/'))
  })

  app.get('/auth/failed', function (req, res) {
    res.status(401).render('401')
  })
}
