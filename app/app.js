import 'babel-polyfill';
import Express from 'express';
import Path from 'path';
import CookieParser from 'cookie-parser';
import BodyParser from 'body-parser';
import Cors from 'cors';
import MethodOverride from 'method-override';
import Morgan from 'morgan';
import Config from './configs/env.config';
import User from './routes/user/v1';

const app = Express();
app.use(BodyParser.json({ limit: '10mb', extended: false }));
app.use(BodyParser.urlencoded({ limit: '10mb', extended: true }));
app.use(Express.json());
// app.use(BodyParser.json());
// app.use(BodyParser.urlencoded({ extended: false }));
app.use(CookieParser());
app.use(Express.static(Path.join(__dirname, 'public')));
app.use(Cors());
app.use(MethodOverride('X-HTTP-Method-Override'));
app.use(Morgan('dev'));

app.use('/api/v1', User);

// Serve the static files from the Vue app
app.use(Express.static(Path.join(__dirname, 'dist')));

// Handle React routing, return all requests to the Vue app
app.get('*', (req, res) => {
  res.sendFile(Path.join(__dirname, 'dist', 'index.html'));
});


// catch 404 and forward to error handler
app.use((req, res) => {
  res.status(404).json({
    message: 'Not Found',
    requested_url: req.Path,
  });
});

// error handler
app.use((err, req, res) => {
  res.status(err.status).json({
    message: 'Something Went Terribly Wrong on Our Side :(',
    requested_url: req.Path,
  });
});

app.use((req, res) => {
  // res.header('Access-Control-Allow-Origin',
  //   `${Config.nginx.host}:${Config.nginx.port}`);
  res.header("Access-Control-Allow-Origin", "*");
  res.header('Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept, Secret, token');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
  res.header('Access-Control-Allow-Credentials', true);
  res.header('Content-Type', 'application/json');
});

module.exports = app;
