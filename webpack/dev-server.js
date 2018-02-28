const express = require("express");
const middleware = require("webpack-dev-middleware");
const webpack = require("webpack");

const config = require("./webpack.config-dev.js");

const port = 6675;

const compiler = webpack(config);
const app = express();


app.use(middleware(compiler, {
}));


app.listen(port, () => {
  console.log(`Listening on port ${port}...`);
});
