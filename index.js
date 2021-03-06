//  TODO: • Store images in a database, and replace them as needed. Save them clientside using service workers.
//        • Generate session/local count on the index to refresh the cache for users who are consistent with visits. They are probably
//        looking for more recent data.

import path from "path";
import fs from "fs";
import express from "express";
import axios from "axios";
import cron from "node-cron";
import https from "https";

if (!fs.existsSync("./api_access_files/json")) {
  fs.mkdirSync("./api_access_files/json", { recursive: true });
}

let production = true;

const app = express();
app.use(express.static(path.join(__dirname + "/public_files/")));

/*
    The purpose of this call is to periodically update behind the scenes, and let the JavaScript + HTML do the work
    Justification: The wordpress API can be slow.
*/

/*
    APPLICATION: This website serves as a proxy with minimal external load times, at the cost of being slightly
                 behind its API endpoints.
*/

var wordpress_posts;

async function server_backlog() {
  await axios
    .get("https://ericdee.blog/?rest_route=/wp/v2/posts&_embed")
    .then((response) => {
      fs.writeFileSync(
        "./api_access_files/json/wordpress_posts.json",
        JSON.stringify(response.data)
      );
    })
    .catch((error) => {
      console.log(error);
    });
  wordpress_posts = fs.readFileSync(
    "./api_access_files/json/wordpress_posts.json",
    "utf-8"
  );
}

server_backlog();

/*
  * * * * * *
  | | | | | |
  | | | | | day of week
  | | | | month
  | | | day of month
  | | hour
  | minute
  second ( optional )

  5 Asterisks will run a task once a minute.
*/
cron.schedule("* * * * *", function () {
  server_backlog();
});

/**************************************************************************************************************************/

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname + "/public_files/html/index.html"));
});

app.get("/wordpress_all_posts", (req, res) => {
  res.send(wordpress_posts);
  console.log(
    `A get request has been received/sent for wordpress posts from ${
      req.header("x-forwarded-for") || req.socket.remoteAddress
    }.`
  );
});

if (production) {
  const port = 443;
  const { key, cert } = {
    cert: fs.readFileSync(
      `/etc/letsencrypt/live/${__dirname.replace(/root/, "")}/fullchain.pem`
    ),
    key: fs.readFileSync(
      `/etc/letsencrypt/live/${__dirname.replace(/root/, "")}/privkey.pem`
    ),
  };
  const https_server = https
    .createServer({ key, cert }, app)
    .listen(port, () => {
      console.log(`This https server is available on port ${port}.`);
    });
} else {
  const port = 80;
  app.listen(port, () => {
    console.log(`This https server is available on port ${port}.`);
  });
}

/*
 *
 *
 */ // Endpoints for a clientside class:

let animalsJSON = fs.readFileSync(
  "./public_files/json/school/animals.json",
  "utf-8"
);

app.get("/school-api/class-animal-data", (req, res) => {
  // Allowing endpoint access from external networks
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );
  res.header("Access-Control-Allow-Methods", "GET");
  // res.header("Access-Control-Allow-Methods", "PUT, POST, GET, DELETE, OPTIONS");
  res.json(animalsJSON);
  console.log(
    `A get request has been received/sent for animal data from ${
      req.header("x-forwarded-for") || req.socket.remoteAddress
    }.`
  );
});
