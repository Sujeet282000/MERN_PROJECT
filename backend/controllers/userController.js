const ErrorHander = require("../utils/errorhander");
const catchAsyncErrors = require("../middleware/catchAsyncErrors");

const User = require("../models/userModel");
const sendToken = require("../utils/jwtToken");
const sendEmail = require("../utils/sendEmail");

//-----Register a user
exports.registerUser = catchAsyncErrors(async (req, res, next) => {
    const { name, email, password } = req.body;

    const user = await User.create({
        name,
        email,
        password,
        avatar: {
            public_id: "this is a simple id",
            url: "this is a simple url",
        }
    });

    // const token = user.getJWTToken();
    sendToken(user, 201, res);

});




// ----=----Login User

exports.loginUser = catchAsyncErrors(async (req, res, next) => {
    const { email, password } = req.body;

    //checking if user has given password and email both

    if (!email || !password) {
        return next(new ErrorHander("Please Enter Email & Password", 400));
    }

    const user = await User.findOne({ email: email }).select("+password"); // sirf email bhi likh sakte he //selct use kiya kyuki password ko select:false kiya tha

    if (!user) {
        return next(new ErrorHander("Invalid email or password", 401));
    }

    const isPasswordMatched = user.comparePassword(password);
    if (!isPasswordMatched) {
        return next(new ErrorHander("Invalid email or password", 401));
    }

    // const token = user.getJWTToken();
    sendToken(user, 200, res);

});


//-------------Logout User
// Middleware for logging out a user (clearing the authentication token cookie)

exports.logoutUser = catchAsyncErrors(async (req, res, next) => {
    // Clear the "token" cookie by setting its value to null and expiring it
    res.cookie("token", null, {
        expires: new Date(Date.now()),
        httpOnly: true,
    })

    // Send a success response indicating successful logout
    res.status(200).json({
        success: true,
        message: "Logged Out",
    })
});




// ---------------------Forgot Password

// Define the route handler for the "forgot password" functionality

exports.forgotPassword = catchAsyncErrors(async (req, res, next) => {

    // Find the user by their email address
    const user = await User.findOne({ email: req.body.email });

    if (!user) {
        return next(new ErrorHander("User not found", 404));
    }

    // Get ResetPassword Token
    const resetToken = user.getResetPasswordToken();

    // Save the user with the reset token (turn off validation for this save)
    await user.save({ validateBeforeSave: false });

    // Construct the URL for password reset
    const resetPasswordUrl = `${req.protocol}://${req.get("host")}/api/v1/password/reset/${resetToken}`;

    // Create the message that will be sent in the email
    const message = `Your password reset token is :- \n\n ${resetPasswordUrl}  \n\n If you have not requested this email then, Please ignore it`;


    // sab kuch tyaar ab mail send karna he so we use try catch block
    // Use a try-catch block to handle potential errors when sending the email

    try {
        // Send the password reset email
        await sendEmail({
            email: user.email,
            subject: `Ecommerce User Password Recovery`,
            message,
        });

        // Send a success response if the email is sent successfully
        res.status(200).json({
            success: true,
            message: `Email sent to ${user.email} successfully`,
        });
    } catch (error) {
        // If there's an error, clear the reset token and its expiration in the user model
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;

        // Save the user (turn off validation for this save)
        await user.save({ validateBeforeSave: false });

        // Return an error response
        console.log(error.message);

        return next(new ErrorHander(`There was an error sending the email${error.message}`, 500));
        // return next(new ErrorHander(error.message, 500));
    }

});