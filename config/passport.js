const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');

module.exports = function(passport) {
    passport.use(new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: '/auth/google/callback'
    },
    async (accessToken, refreshToken, profile, done) => {
        try {
            let user = await User.findOne({ googleId: profile.id });

            if (user) {
                return done(null, user);
            }

            user = await User.findOne({ email: profile.emails[0].value });

            if (user) {
                user.googleId = profile.id;
                user.firstName = user.firstName || profile.name.givenName;
                user.lastName = user.lastName || profile.name.familyName;
                user.profilePicture = user.profilePicture || profile.photos[0].value;
                await user.save();
                return done(null, user);
            }

            const newUser = {
                googleId: profile.id,
                email: profile.emails[0].value,
                firstName: profile.name.givenName,
                lastName: profile.name.familyName || '',
                profilePicture: profile.photos[0].value,
                headline: 'New Member at ProNetwork'
            };

            user = await User.create(newUser);
            return done(null, user);
        } catch (err) {
            console.error('Google OAuth error:', err);
            return done(err, null);
        }
    }));

    passport.serializeUser((user, done) => {
        done(null, user._id);  // Use _id (Mongoose default), not user.id
    });

    passport.deserializeUser(async (id, done) => {
        try {
            const user = await User.findById(id);
            done(null, user);
        } catch (err) {
            console.error('Deserialize error:', err);
            done(err, null);
        }
    });
};