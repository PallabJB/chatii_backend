// import 'dotenv/config';
// import http from 'http';
// import app from './app.js';
// import { Server } from 'socket.io';
// import jwt from 'jsonwebtoken';
// import mongoose from 'mongoose';
// import projectModel from './models/project.model.js';
// import { generateResult } from './services/ai.service.js';

// const port = process.env.PORT || 3000;



// const server = http.createServer(app);
// const io = new Server(server, {
//     cors: {
//         origin: '*'
//     }
// });


// io.use(async (socket, next) => {

//     try {

//         const token = socket.handshake.auth?.token || socket.handshake.headers.authorization?.split(' ')[ 1 ];
//         const projectId = socket.handshake.query.projectId;

//         if (!mongoose.Types.ObjectId.isValid(projectId)) {
//             return next(new Error('Invalid projectId'));
//         }


//         socket.project = await projectModel.findById(projectId);


//         if (!token) {
//             return next(new Error('Authentication error'))
//         }

//         const decoded = jwt.verify(token, process.env.JWT_SECRET);

//         if (!decoded) {
//             return next(new Error('Authentication error'))
//         }


//         socket.user = decoded;

//         next();

//     } catch (error) {
//         next(error)
//     }

// })


// io.on('connection', socket => {
//     socket.roomId = socket.project._id.toString()


//     console.log('a user connected');



//     socket.join(socket.roomId);

//     socket.on('project-message', async data => {

//         const message = data.message;

//         const aiIsPresentInMessage = message.includes('@ai');
//         socket.broadcast.to(socket.roomId).emit('project-message', data)

//         if (aiIsPresentInMessage) {


//             const prompt = message.replace('@ai', '');

//             const result = await generateResult(prompt);


//             io.to(socket.roomId).emit('project-message', {
//                 message: result,
//                 sender: {
//                     _id: 'ai',
//                     email: 'AI'
//                 }
//             })


//             return
//         }


//     })

//     socket.on('disconnect', () => {
//         console.log('user disconnected');
//         socket.leave(socket.roomId)
//     });
// });




// server.listen(port, () => {
//     console.log(`Server is running on port ${port}`);
// })






/////////////////////////////////////////////////////








import 'dotenv/config';
import http from 'http';
import app from './app.js';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import projectModel from './models/project.model.js';
import { generateResult } from './services/ai.service.js';

const port = process.env.PORT || 3000;

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: 'https://chatiibypj.netlify.app/'
    }
});

io.use(async (socket, next) => {
    try {
        const token =
            socket.handshake.auth?.token ||
            socket.handshake.headers.authorization?.split(' ')[1];
        const projectId = socket.handshake.query.projectId;

        if (!mongoose.Types.ObjectId.isValid(projectId)) {
            return next(new Error('Invalid projectId'));
        }

        const project = await projectModel.findById(projectId);
        if (!project) {
            return next(new Error('Project not found'));
        }
        socket.project = project;

        if (!token) {
            return next(new Error('Authentication error'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (!decoded) {
            return next(new Error('Authentication error'));
        }

        socket.user = decoded;

        next();
    } catch (error) {
        console.error("Socket auth error:", error.message);
        next(error);
    }
});

io.on('connection', socket => {
    if (!socket.project) {
        console.error("Connection without project:", socket.id);
        socket.disconnect(true);
        return;
    }

    socket.roomId = socket.project._id.toString();

    console.log(`User connected to room: ${socket.roomId}`);
    socket.join(socket.roomId);

    socket.on('project-message', async data => {
        if (!data?.message) return;

        const message = data.message;
        const aiIsPresentInMessage = message.includes('@ai');

        // Broadcast to other clients
        socket.broadcast.to(socket.roomId).emit('project-message', data);

        if (aiIsPresentInMessage) {
            try {
                const prompt = message.replace('@ai', '').trim();
                const result = await generateResult(prompt);

                io.to(socket.roomId).emit('project-message', {
                    message: result,
                    sender: {
                        _id: 'ai',
                        email: 'AI'
                    }
                });
            } catch (err) {
                console.error("AI generation error:", err.message);
                socket.emit('project-message', {
                    message: "⚠️ AI could not process your request.",
                    sender: {
                        _id: 'ai',
                        email: 'AI'
                    }
                });
            }
        }
    });

    socket.on('disconnect', () => {
        console.log(`User disconnected from room: ${socket.roomId}`);
        socket.leave(socket.roomId);
    });
});

server.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
