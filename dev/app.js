const express = require('express');
const path = require('path');
const app = express();

const PORT = 8080;

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.sendFile('public/index.html');
});

app.listen(PORT, () => {console.log("Starting static web server on port " + PORT);});