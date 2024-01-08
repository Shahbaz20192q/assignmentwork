// Import required modules
var express = require('express');
var router = express.Router();
const userModole = require("./users");
const localStrategy = require("passport-local").Strategy;
const upload = require("./multer");
const assignmentUpload = require("./assignment");
const postModel = require("./post");
const depositModel = require("./deposit");
const depositssup = require("./deposit Upload");
const withdrawModel = require("./withdraw");
const passport = require('passport');
const shortid = require('shortid');
const mongoose = require("mongoose")
const nodemailer = require("nodemailer");
const crypto = require("crypto");

// const admainModel = require("./admain");
passport.use(new localStrategy(userModole.authenticate()));
// passport.use('admain', new localStrategy(admainModel.authenticate()));

// ---------- User Authentication ----------
router.get('/', function (req, res, next) {
  const userReferralCode = req.user ? req.user.referralCode : '';
  const referralLink = `${req.protocol}://${req.get('local')}/register?ref=${userReferralCode}`;
  res.render('index', { title: "Register", referralLink, navDinamic: req.user });
});


router.post('/register', async function (req, res, next) {
  try {
    // Check if email or mobile number or username already exists
    const existingUser = await userModole.findOne({
      $or: [
        { email: req.body.email },
        { mobileNumber: req.body.mobileNumber },
        { username: req.body.username }
      ]
    });

    if (existingUser) {
      // User with the provided email, mobile number, or username already exists
      let errorMessage;
      if (existingUser.email === req.body.email) {
        errorMessage = 'User with this email already exists';
      } else if (existingUser.mobileNumber === req.body.mobileNumber) {
        errorMessage = 'User with this mobile number already exists';
      } else if (existingUser.username === req.body.username) {
        errorMessage = 'User with this username already exists';
      }
      return res.render('error', { error: errorMessage, message: errorMessage });
    }
    const referralCode = req.body.referralCode;
    const referringUser = await userModole.findOne({ referralCode });

    const newUserReferralCode = shortid.generate();
    const newUser = new userModole({
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      username: req.body.username,
      email: req.body.email,
      mobileNumber: req.body.mobileNumber,
      gender: req.body.gender,
      referralCode: newUserReferralCode,
    });

    userModole.register(newUser, req.body.password, async function (err, user) {
      if (err) {
        console.error(err);
        return res.render('error', { error: err });
      }

      // If a referring user exists, add the new user to their members
      if (referringUser) {
        referringUser.members.push(user._id);
        await referringUser.save();
      }

      // Authenticate the new user
      passport.authenticate('local')(req, res, function () {
        res.redirect('/profile');
      });
    });

  } catch (error) {
    console.error(error);
    res.render('error', { error, message: 'An error occurred during registration.' });
  }
});

router.get('/login', function (req, res, next) {
  res.render('login', { title: "Login", navDinamic: req.user });
});

router.post('/login', function (req, res, next) {
  passport.authenticate('local', function (err, user, info) {
    if (err) {
      return next(err);
    }
    if (!user) {
      // Authentication failed
      req.flash('error', 'Invalid username or password'); // Custom error message
      return res.redirect('/login');
    }
    req.logIn(user, function (err) {
      if (err) {
        return next(err);
      }
      // Authentication successful, redirect to profile
      return res.redirect('/profile');
    });
  })(req, res, next);
});


router.get('/logout', function (req, res, next) {
  // Handle user logout
  req.logout(function (err) {
    if (err) { return next(err); }
    res.redirect('/');
  });
});


//---------- Forget Password------------


router.get("/forgot", function (req, res) {
  res.render("forgot", { title: "Forgot Password", navDinamic:req.user });
});

router.post("/forgot", function (req, res, next) {
  crypto.randomBytes(20, function (err, buf) {
    const token = buf.toString("hex");
    userModole.findOne({ email: req.body.email })
      .then(user => {
        if (!user) {
          req.flash("error", "No account with that email address exists.");
          return res.redirect("/forgot");
        }

        user.resetPasswordToken = token;
        user.resetPasswordExpires = Date.now() + 3600000; // 1 hour

        return user.save();
      })
      .then(() => {
        const transporter = nodemailer.createTransport({
          // configure your email service here
          // For example, using Gmail:
          service: "Gmail",
          auth: {
            user: "shahbazghaffar00@gmail.com",
            pass: "dkaj rbhk krvw bwpg",
          },
        });

        const mailOptions = {
          to: req.body.email,
          from: "shahbazghaffar00@gmail.com",
          subject: "Password Reset",
          text:
            "You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n" +
            "Please click on the following link, or paste this into your browser to complete the process:\n\n" +
            `http://${req.headers.host}/reset/${token}\n\n` +
            "If you did not request this, please ignore this email and your password will remain unchanged.\n",
        };

        return transporter.sendMail(mailOptions);
      })
      .then(() => {
        req.flash("info", "An email has been sent with further instructions.");
        res.redirect("/");
      })
      .catch(err => {
        // Handle errors
        console.error(err);
        req.flash("error", "An error occurred.");
        res.redirect("/forgot");
      });
  });
});

router.get("/reset/:token", function (req, res) {
  userModole.findOne({
    resetPasswordToken: req.params.token,
    resetPasswordExpires: { $gt: Date.now() },
  })
    .then(user => {
      if (!user) {
        req.flash("error", "Password reset token is invalid or has expired.");
        return res.redirect("/forgot");
      }
      res.render("reset", { title: "Reset Password", token: req.params.token,navDinamic:req.user });
    })
    .catch(err => {
      // Handle errors
      console.error(err);
      req.flash("error", "An error occurred.");
      res.redirect("/forgot");
    });
});

router.post("/reset/:token", function (req, res) {
  userModole.findOne({
    resetPasswordToken: req.params.token,
    resetPasswordExpires: { $gt: Date.now() },
  })
    .then(user => {
      if (!user) {
        req.flash("error", "Password reset token is invalid or has expired.");
        return res.redirect("back");
      }

      user.setPassword(req.body.password, function () {
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;

        return user.save();
      });
    })
    .then(() => {
      req.logIn(user, function (err) {
        res.redirect("/");
      });
    })
    .catch(err => {
      // Handle errors
      console.error(err);
      req.flash("error", "An error occurred.");
      res.redirect("/forgot");
    });
});


//---------- Home --------

router.get('/home', async function (req, res, next) {
  res.render("other_pages/home", { title: "Home", navDinamic: req.user })
});


// ---------- Profile Management ----------
router.get('/profile', isLoggedIn, async function (req, res, next) {
  // Render user profile
  const user = await userModole.findOne({ username: req.session.passport.user }).populate("members");
  res.render('profile', { title: "Profile", user , navDinamic:req.user });
});

router.post('/edit/:username', async function (req, res, next) {
  // Handle profile editing
  try {
    const user = await userModole.findOneAndUpdate(
      { username: req.params.username },
      {
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        email: req.body.email,
        gender: req.body.gender,
        mobileNumber: req.body.mobileNumber,
        assignment: req.body.assignment,
        income: req.body.income,
        plane: req.body.plane,
        verified: req.body.verified
      },
      { new: true }
    );

    if (user) {
      res.redirect('/dashbord/members');
    } else {
      res.render('edit', { title: 'Edit', user, errorMessage: 'User not found' });
    }
  } catch (error) {
    console.error(error);
    res.render('error', { error });
  }
});

router.get('/editform/:username', async function (req, res, next) {
  const admain = userModole.findOne({ username: req.session.passport.user });
  const user = await userModole.findOne({ username: req.params.username });
  res.render('dashboard/edit', { title: "Edit", user, admain });
});

router.post('/upload', isLoggedIn, upload.single("image"), async function (req, res, next) {
  // Handle profile image upload
  const user = await userModole.findOne({ username: req.session.passport.user });
  user.profileImage = req.file.filename;
  await user.save();
  res.redirect("/profile");
});

router.get('/profile/members', async function (req, res, next) {
  const user = await userModole.findOne({ username: req.session.passport.user }).populate("members");
  res.render('members', { title: "Members", user });
});

// ---------- Assignment and Post Management ----------
router.get('/profile/assignment', isLoggedIn, isVerified, express.static('public/assignments'), async function (req, res, next) {
  const user = await userModole.findOne({ username: req.session.passport.user }).populate("posts");
  res.render('assignment', { title: "Assignment", user, navDinamic:req.user });
});

router.post("/post", isLoggedIn, assignmentUpload.single("file"), async function (req, res, next) {
  // Handle post submission
  const user = await userModole.findOne({ username: req.session.passport.user });
  const post = await postModel.create({
    file: req.file.filename,
    user: user._id,
    username: user.username,
    topic: req.body.topic
  });

  user.posts.push(post._id);
  await user.save();
  res.redirect("/profile/assignment");
});

// ---------- Finance Management ----------
router.get('/profile/finance', isLoggedIn, async function (req, res, next) {
  // Render finance page
  const user = await userModole.findOne({ username: req.session.passport.user });
  res.render('finance', { title: "Finance", user, navDinamic:req.user });
});

router.get('/profile/finance/withdraw', isVerified, isLoggedIn, async function (req, res, next) {
  // Render withdrawal page
  const user = await userModole.findOne({ username: req.session.passport.user });
  res.render('withdraw', { title: "Withdraw", user,navDinamic:req.user });
});

router.post('/withdraw', isLoggedIn, async function (req, res, next) {
  const user = await userModole.findOne({ username: req.session.passport.user });
  const withdraw = await withdrawModel.create({
    bankName: req.body.bankName,
    accountNo: req.body.accountNo,
    amount: req.body.amount,
    accountHolder: req.body.accountHolder,
    user: user._id
  });

  user.withdraw.push(withdraw._id);
  await user.save();
  res.redirect("/profile/finance/withdraw/history");
});

router.get('/profile/finance/withdraw/history', isLoggedIn, async function (req, res, next) {
  // Render withdrawal history
  const user = await userModole.findOne({ username: req.session.passport.user }).populate("withdraw");
  res.render('withdrawhistory', { title: "Withdrawal History", user,navDinamic:req.user });
});

router.post("/deposit", isLoggedIn, depositssup.single("secreenShot"), async function (req, res, next) {
  const user = await userModole.findOne({ username: req.session.passport.user });
  const depositDetals = await depositModel.create({
    depositNo: req.body.depositNo,
    method: req.body.method,
    bankName: req.body.bankName,
    accountNo: req.body.accountNo,
    accountHolder: req.body.accountHolder,
    tid: req.body.tid,
    plane: req.body.plane,
    user: user._id
  });

  user.deposit.push(depositDetals._id);
  await user.save();
  res.redirect("/profile/finance/deposit/depositdetails");
});

router.get('/profile/finance/deposit', isLoggedIn, async function (req, res, next) {
  // Render withdrawal page
  const user = await userModole.findOne({ username: req.session.passport.user });
  res.render('deposit', { title: "Deposit", user,navDinamic:req.user });
});

router.get('/profile/finance/deposit/depositdetails', isLoggedIn, async function (req, res, next) {
  // Render deposit details
  const user = await userModole.findOne({ username: req.session.passport.user }).populate("deposit");
  res.render('depositdetails', { title: "Deposit Details", user,navDinamic:req.user });
});

// ---------- Dashboard ----------

router.get('/dashbord', isAdmin, async function (req, res, next) {
  // Render dashboard
  const users = await userModole.find();
  const clas = "active";
  const admain = await userModole.findOne({ username: req.session.passport.user });
  const posts = await postModel.find();
  const verifiedUsers = await userModole.find({ verified: true })
  res.render('dashboard/dashbord', { title: "Dashboard", users, posts, verifiedUsers, admain, clas });
});

router.get('/dashbord/members', isAdmin, async function (req, res, next) {
  const posts = await postModel.find();
  const admain = await userModole.findOne({ username: req.session.passport.user });
  try {
    let search = req.query.search || ''; // Get the search term from the query parameters
    let users;

    if (search) {
      const isObjectId = mongoose.Types.ObjectId.isValid(search);

      if (isObjectId) {
        users = await userModole.find({ _id: search });
      } else {
        const searchRegex = new RegExp(search, 'i');
        users = await userModole.find({ username: searchRegex });
      }
    } else {
      users = await userModole.find();
    }

    res.render('dashboard/dashboard _members', { title: "Dashboard", users, search, posts, admain });
  } catch (error) {
    console.error(error);
    res.render('error', { error });
  }
});


router.get('/dashbord/deposit', isAdmin, async function (req, res, next) {
  let users = await userModole.find()
  let admain = await userModole.findOne({ username: req.session.passport.user });
  try {
    let search = req.query.search || ''; // Get the search term from the query parameters
    let users;

    if (search) {
      const isObjectId = mongoose.Types.ObjectId.isValid(search);

      if (isObjectId) {
        users = await depositModel.find({ _id: search }).populate("user");
      } else {
        const searchRegex = new RegExp(search, 'i');
        users = await depositModel.find({ tid: searchRegex });
      }
    } else {
      users = await depositModel.find().populate("user");
    }

    res.render('dashboard/dashboard_deposit', { title: "Dashboard Deposit Details", users, search, admain });
  } catch (error) {
    console.error(error);
    res.render('error', { error });
  }
});


router.get('/editdepositform/:id', isAdmin, async function (req, res, next) {
  let admain = await userModole.findOne({ username: req.session.passport.user });
  const user = await userModole.findOne({ _id: req.params.id }).populate("deposit");
  res.render('dashboard/editdeposit', { title: "Edit", user, admain });
});

router.post('/editdepositform/:id', isAdmin, async function (req, res, next) {
  // Handle edit deposit form submission
  try {
    let user = await depositModel.findOneAndUpdate(
      { _id: req.params.id },
      {
        status: req.body.status,
        reason: req.body.reason
      },
      { new: true }
    );

    if (user) {
      res.redirect('/dashbord/deposit');
    } else {
      res.render('editdeposit', { title: 'Edit', user, errorMessage: 'User not found' });
    }
  } catch (error) {
    console.error(error);
    res.render('error', { error });
  }
});

router.post('/editwithdrawform/:id', isAdmin, async function (req, res, next) {
  // Handle edit withdrawal form submission
  try {
    let user = await withdrawModel.findOneAndUpdate(
      { _id: req.params.id },
      {
        status: req.body.status,
        reason: req.body.reason
      },
      { new: true }
    );

    if (user) {
      res.redirect('/dashbord/withdraw');
    } else {
      res.render('dashboard/editdeposit', { title: 'Edit', user, errorMessage: 'User not found' });
    }
  } catch (error) {
    console.error(error);
    res.render('error', { error });
  }
});

router.get('/dashbord/withdraw', isAdmin, async function (req, res, next) {
  const admain = await userModole.findOne({ username: req.session.passport.user });
  try {
    let search = req.query.search || '';
    let withdraws;

    if (search) {
      const isObjectId = mongoose.Types.ObjectId.isValid(search);

      if (isObjectId) {
        withdraws = await withdrawModel.find({ _id: search }).populate("user");
      } else {
        const searchRegex = new RegExp(search, 'i');
        withdraws = await withdrawModel.find({ accountNo: searchRegex }).populate("user");
      }
    } else {
      withdraws = await withdrawModel.find().populate("user");
    }

    res.render("dashboard/dashboard_withdraw", { title: "Withdraw Details", withdraws, admain, search, class: "active" });
  } catch (error) {
    console.error(error);
    res.render('error', { error });
  }
});

router.get('/editwithdrawform/:id', isAdmin, async function (req, res, next) {
  // Render edit withdrawal form
  const admain = await userModole.findOne({ username: req.session.passport.user })
  const user = await userModole.findOne({ _id: req.params.id }).populate("withdraw");
  res.render('dashboard/editwithdraw', { title: "Edit Withdraw", user, admain });
});

router.get('/dashbord/assignments', isAdmin, async function (req, res, next) {
  const admain = await userModole.findOne({ username: req.session.passport.user });
  try {
    let search = req.query.search || ''; // Get the search term from the query parameters
    let posts;

    if (search) {
      const isObjectId = mongoose.Types.ObjectId.isValid(search);

      if (isObjectId) {
        // Search by post ID
        posts = await postModel.find({ "user._id": search }).populate('user');
      } else {
        // Search by username in the 'user' field
        const searchRegex = new RegExp(search, 'i');
        posts = await postModel.find({
          username: searchRegex
        }).populate('user');
      }
    } else {
      // No search term, fetch all posts
      posts = await postModel.find().populate('user');
    }

    res.render('dashboard/dashboard_assignments', { title: "dashboard_assignments", posts, admain, search });
  } catch (error) {
    console.error(error);
    res.render('error', { error, message: "error" });
  }
});


router.post("/deletePost/:id", async function (req, res, next) {
  try {
    const deletedPost = await postModel.findOneAndDelete({ _id: req.params.id });

    if (!deletedPost) {
      return res.render('error', { error: 'Post not found' });
    }

    const user = await userModole.findOneAndUpdate(
      { _id: deletedPost.user },
      { $pull: { posts: deletedPost._id } },
      { new: true }
    );

    res.redirect("/dashbord/assignments");
  } catch (error) {
    console.error(error);
    res.render('error', { error });
  }
});

router.get('/dashbord/refer_members', isAdmin, async function (req, res, next) {
  const posts = await postModel.find();
  const admain = await userModole.findOne({ username: req.session.passport.user });
  try {
    let search = req.query.search || ''; // Get the search term from the query parameters
    let users;

    if (search) {
      const searchRegex = new RegExp(search, 'i');
      users = await userModole.find({
        $or: [
          { _id: search },
          { username: search }
        ]
      })
    } else {
      users = await userModole.find();
    }

    res.render('dashboard/refer_members', { title: "Refer Members", users, search, posts, admain });
  } catch (error) {
    console.error(error);
    res.render('error', { error });
  }
});

router.get('/viewmembers/:username', isAdmin, async function (req, res, next) {
  // const users = await userModole.find().populate('members');
  const user = await userModole.findOne({ username: req.params.username }).populate('members');
  let allrefermembers = user.members.filter(member => member.verified === true);

  res.render('dashboard/allrefermember', { title: "dashboard Refer members", user, allrefermembers });
});

// Middleware to check if user is authenticated
function isLoggedIn(req, res, next) {
  if (req.isAuthenticated()) return next();
  res.redirect('/login');
}

function isVerified(req, res, next) {
  if (req.isAuthenticated() && req.user.verified) {
    return next();
  }
  res.redirect('/profile/finance/deposit');
}

function isAdmin(req, res, next) {
  if (req.isAuthenticated() && req.user.isAdmin) {
    return next();
  }
  res.redirect('/profile');
}

router.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render('error', { error: err });
});

module.exports = router;