let express = require('express')
let session = require('express-session')
const { request } = require('http')
let app = express()
let server = require('http').createServer(app)
let io = require('socket.io')(server)
var cookieParser = require('cookie-parser')
let sessionMiddleware = session({
    secret: 'Hello',
    cookie: {maxAge: 60000},
    resave: false,
    saveUninitialized: false,
    cookieParser
})
let chats = []
let users = []
let numbUsers = 0
app.use(sessionMiddleware)
io.use((socket, next) => {
    sessionMiddleware(socket.request, {}, next)
})
io.on('connection', socket => {
    createSession(socket)
    io.emit('USER', socket.request.session.user)
    socket.emit('CHATS',  chats)
    socket.emit('USERS',  users)
    socket.emit('ME',   socket.request.session.user)
    socket.on('disconnect', () => {
        for(let i = 0; i < users.length; i++){
            if(users[i].id === socket.request.session.user.id){
                users.splice(i,1)
                numbUsers--
            }
        }
        io.emit('USERS',  users)
     });
    socket.on('MESSAGE', message => {
        //1. parse out cmd messages
        //2. otherwise emit message
        if(message.includes('/name ')){
            let name = message.split('/name ')
            for(let i = 0; i < users.length; i++){
                if(users[i].name  === name[1]){
                    return
                }
            }
        }
        if(checkName(message, socket.request.session.user.id)){
            io.emit('USERS',  users)
            io.emit('CHATS',  chats)
            let me  = users.find(user => user.id === socket.request.session.user.id)
            socket.emit('UPDATE', me)
        }else if(checkColor(message, socket.request.session.user.id)){
            io.emit('USERS',  users)
            io.emit('CHATS',  chats)
            let me  = users.find(user => user.id === socket.request.session.user.id)
            socket.emit('UPDATE', me)
        }
        else{
            let newMessage = checkEmoji(message)
            let date = new Date()
            chats.push({
                userId: socket.request.session.user.id,
                name: socket.request.session.user.name,
                color: socket.request.session.user.color,
                hours: date.getHours(),
                minutes: date.getMinutes(),
                payload: newMessage
            })
            io.emit('MESSAGE', {
                userId: socket.request.session.user.id,
                name: socket.request.session.user.name,
                color: socket.request.session.user.color,
                hours: date.getHours(),
                minutes: date.getMinutes(),
                payload: newMessage
            })
        }
    })
    socket.on('EXSIST', user => {
        for(let i = 0; i < users.length; i++){
            if(users[i].id === user.id){
                users[i] = user
                socket.request.session.user = user
            }
        }
        io.emit('USERS',  users)

    })
})

server.listen(1337, ()=>{
    console.log('server started on port 1337')
})

function createSession(socket) {
    let session = socket.request.session
    numbUsers++
    session.user = {
        id: socket.id,
        name: 'User ' + numbUsers,
        color: 'black'
    }
    users.push( session.user)
    session.save()
    
}
function checkEmoji(message){
    message = message.split(':)').join('😁')
    message = message.split(':(').join('🙁')
    message = message.split(':o').join('😲')
    return message
}
function checkName(message, userId){
    
    if(message.includes('/name ')){
        let name = message.split('/name ')
        for(let i = 0; i < users.length; i++){
            if(users[i].name  === name[1]){
                return 'exsists'
            }
        }
        for(let i = 0; i < users.length; i++){
            if(users[i].id === userId){
                for(let j = 0; j < chats.length; j++){
                    if(chats[j].name === users[i].name){
                        chats[j].name = name[1]
                    }
                }
                users[i].name = name[1]
                return true
            }
        }
    }else{
        return false
    }
}
function checkColor(message, userId){
    if(message.includes('/color ')){
        let color = message.split('/color ')
        for(let i = 0; i < users.length; i++){
            if(users[i].id === userId){
                for(let j = 0; j < chats.length; j++){
                    if(chats[j].name === users[i].name){
                        chats[j].color = color[1]
                    }
                }
                users[i].color = color[1]
                return true
            }
        }
    }else{
        return false
    }
}