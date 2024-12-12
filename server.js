/////////////////////////////////////////////////////////////////////
// This module is the starting point of the http server
/////////////////////////////////////////////////////////////////////
// Author : Nicolas Chourot
// Lionel-Groulx College
/////////////////////////////////////////////////////////////////////

import APIServer from "./APIServer.js";
import RouteRegister from './routeRegister.js';

RouteRegister.add('GET', 'Bookmarks', 'list');
RouteRegister.add('GET', 'accounts');
RouteRegister.add('POST', 'accounts', 'register');
RouteRegister.add('GET', 'accounts', 'verify');
RouteRegister.add('GET', 'accounts', 'logout');
RouteRegister.add('PUT', 'accounts', 'modify');
RouteRegister.add('GET', 'accounts', 'remove');
RouteRegister.add('GET', 'accounts', 'conflict');
RouteRegister.add('POST', 'accounts', 'block');
RouteRegister.add('POST', 'accounts', 'promote');
RouteRegister.add('GET', 'accounts', 'checktoken');
RouteRegister.add('GET', 'accounts', 'getusers');
RouteRegister.add('HEAD', 'accounts', 'head');
// Likes
RouteRegister.add('GET', 'likes', 'likes');
RouteRegister.add('GET', 'likes', 'likesofpost');
RouteRegister.add('POST', 'likes', 'postlike');
RouteRegister.add('POST', 'likes', 'removelike');

// Post 
RouteRegister.add('GET', 'posts', 'remove');

let server = new APIServer();
server.start();