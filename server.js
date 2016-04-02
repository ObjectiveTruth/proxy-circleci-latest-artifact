//Taken from https://github.com/nodejitsu/node-http-proxy

var http = require('http'),
    rp = require('request-promise'),
    httpProxy = require('http-proxy'),
    _ = require('lodash');

//
// Create a proxy server with custom application logic
//
var proxy = httpProxy.createProxyServer({});

//
// Create your custom server and just call `proxy.web()` to proxy
// a web request to the target passed in the options
// also you can use `proxy.ws()` to proxy a websockets request
//
var CIRCL_CI_URI = 'https://circleci.com/api/v1/project/ObjectiveTruth/UoitDCLibraryBooking/tree/beta';
function getArtifactsUsingBuildNum(buildNum) {
    return 'https://circleci.com/api/v1/project/ObjectiveTruth/UoitDCLibraryBooking/' + buildNum + '/artifacts';
}
var latestStableLinkToProxy;

var server = http.createServer(function(req, res) {
        console.log('Got a request looking for ' + req.url);
        if (req.url === '/') {req.url = '/index.html';}
    rp({
        uri: CIRCL_CI_URI,
        json: true
    }).then(function(response) {
        console.log('Went to ' + CIRCL_CI_URI + ' and got this response');
        if (response[0].status === 'running' || !response[0].has_artifacts) {
            if(!latestStableLinkToProxy) {
                res.end('No stable builds as yet')
            } else {
                proxy.web(req, res, { target: latestStableLinkToProxy });
            }
        }else {
            var latestBuildNum = response[0].build_num
            rp({uri: getArtifactsUsingBuildNum(latestBuildNum), json: true}).then(function(result) {
                var artifactObject = _.find(result, function(o) {return _.endsWith(o.url, 'index.html');});
                var artifactUrl = artifactObject.url.replace('index.html', '');
                console.log('Going to proxy ' + artifactUrl);
                latestStableLinkToProxy = artifactUrl
                proxy.web(req, res, { target: artifactUrl, secure: false });
                //res.end(artifactUrl.url);
            }, function(error) {
                res.end('Something aint right');
            });
        }
    }, function(error) {
        res.end('Something aint right');
    });


      //proxy.web(req, res, { target: 'http://127.0.0.1:5060' });
});

console.log("listening on port 5053")
server.listen(5053);
