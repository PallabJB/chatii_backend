import mongoose from "mongoose";

function connect() {
    mongoose.connect(process.env.MONGODB_URI, {
        serverSelectionTimeoutMS: 5000, // Fail fast if no connection
        socketTimeoutMS: 45000,         // Close sockets after 45s inactivity
        family: 4                       // Force IPv4
    })
    .then(() => console.log("✅ Connected to MongoDB"))
    .catch(err => {
        console.error("❌ MongoDB connection error:", err);
        process.exit(1); // Exit if DB connection fails
    });
}

export default connect;
