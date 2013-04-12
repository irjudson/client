# Nitrogen Client

Nitrogen is a platform for building connected devices and the applications that use them.  Nitrogen provides the authentication, authorization, event logging, device provisioning, discovery services, and real time message passing framework so that you can focus on your device and application.  All with a consistent development platform that leverages the ubiquity of Javascript.

This is the client library for developing applications and devices that communicate to the Nitrogen service.

## Device Development Model

Nitrogen at its heart uses messaging between principals (devices and users).  Principals in the system can create and consume messages.  Messages can follow a well known schema to enable interoperability between applications or use their own private custom message types.

For example, a thermometer that measures temperature once every 15 minutes could be implemented in Nitrogen like this:

``` javascript
var thermometer = new nitrogen.Device({ local_id: "thermometer",
                                        capabilities: [ "thermometer" ] });

var service = new nitrogen.Service(config);
service.connect(thermometer, function(err, session, thermometer) {

    // take temperature every 15 minutes.

    setInterval(function() {
        var message = new Nitrogen.Message();
        message.from = session.principal.id;
        message.message_type = "temperature";
        message.body.temperature = getTemp();

        message.save(session);
    }, 15 * 60 * 1000);

});
```

You can find a complete example for a device application of Nitrogen in the `chroma` project.

## Application Development Model

The development model for applications is similar.   A web application that displays these temperatures in real time as they are received would look like this:

var user = new nitrogen.User();

var service = new nitrogen.Service(config);
service.connect(user, function(err, session, user) {

    session.onMessage(function(message) {
        console.log("The temperature is now: " + message.body.temperature);

        // update the UI

        if (message.body.temperature < 15) {
            // emit a control message to the furnance to turn it on.
        }
    });
});

A great example for understanding the Nitrogen application model is the `admin` project.

## Getting Started

To get started with a Nitrogen client:

### Node.js application

1. `npm install nitrogen`

### Browser application

1. Add `<script src="/client/nitrogen.js" />` to your application.

### Contributing to the project.

1. Clone or fork this repo: `https://github.com/nitrogenjs/client`
2. Fetch and install its node.js dependencies: `npm install`
3. Install mocha so you can run tests:  `npm install -g mocha`
4. Run a Nitrogen server locally that the tests can run against.
5. Point test/config.js to this development environment.
6. Run the tests to make sure everything is setup correctly: `mocha`
7. Make your change as a clean commit for a pull request.
8. Make sure there is a test to cover new functionality so nobody can break it in the future without us knowing.
9. Submit it as a pull request to the project.

## How to contribute

1.  Feedback:  We'd love feedback on what problems you are using Nitrogen to solve.  Obviously, we'd also like to hear about where you ran into sharp edges and dead ends.   Drop me a message at timfpark@gmail.com or file an issue with us above.
2.  Pull requests:  If you'd like to tackle an issue, fork the repo, create a clean commit for the fix or enhancement with tests if necessary, and send us a pull request. This is also the path to becoming a core committer for the project for folks that are interested in contributing in more depth.
3.  Documentation:  Better technical documentation is key to broadening the use of the platform.   We'd love to have more help and this is one of the most valuable contributions you can make.

## Other Projects

Nitrogen has three subprojects that you should have a look at as well.

1. [service](https://github.com/Nitrogenjs/service): The core Nitrogen service responsible for managing users, devices, and messaging between them.
2. [admin](https://github.com/Nitrogenjs/admin): An administrative tool for managing the Nitrogen service.
3. [chroma](https://github.com/Nitrogenjs/chroma): A sample device application that connects a camera to the Nitrogen service.